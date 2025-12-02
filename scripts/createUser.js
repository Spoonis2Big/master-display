const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, '../database/showroom.db');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createUser() {
  console.log('\n🔐 Master Display - Create User\n');

  try {
    const username = await question('Username: ');
    const password = await question('Password: ');
    const email = await question('Email (optional): ');

    if (!username || !password) {
      console.log('❌ Username and password are required!');
      rl.close();
      db.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            console.log(`❌ Username '${username}' already exists!`);
          } else {
            console.log('❌ Error creating user:', err.message);
          }
        } else {
          console.log(`\n✅ User '${username}' created successfully!`);
          console.log(`   User ID: ${this.lastID}`);
        }

        rl.close();
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    db.close();
  }
}

// Check if users table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
  if (err) {
    console.error('❌ Database error:', err.message);
    rl.close();
    db.close();
    return;
  }

  if (!row) {
    console.log('❌ Users table does not exist. Please run: npm run init-db');
    rl.close();
    db.close();
    return;
  }

  createUser();
});
