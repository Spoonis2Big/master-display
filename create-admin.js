const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database/showroom.db');
const db = new sqlite3.Database(dbPath);

async function createUser() {
  const username = 'admin';
  const password = 'admin123';
  const email = 'admin@prengerfurniture.com';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            console.log(`✅ User '${username}' already exists!`);
          } else {
            console.log('❌ Error creating user:', err.message);
          }
        } else {
          console.log(`✅ User '${username}' created successfully!`);
          console.log(`   Username: ${username}`);
          console.log(`   Password: ${password}`);
          console.log(`   User ID: ${this.lastID}`);
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
  }
}

createUser();
