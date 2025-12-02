const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/showroom.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      parent_id INTEGER,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)`);

  console.log('✅ Categories table created successfully!');

  // Insert main categories
  const mainCategories = [
    { code: '220', name: 'BEDROOM' },
    { code: '250', name: 'DINING ROOM' },
    { code: '360', name: 'OCCASIONAL TABLES' },
    { code: '420', name: 'ACCESSORIES' },
    { code: '540', name: 'UPHOLSTERY' },
    { code: '550', name: 'LEATHER' },
    { code: '570', name: 'RECLINING UPHOLSTERY' },
    { code: '590', name: 'STATIONARY CHAIRS' },
    { code: '620', name: 'FABRIC RECLINERS' }
  ];

  // Subcategories mapped to their parent codes
  const subcategories = {
    '220': [
      { code: '220', name: 'MASTER BEDROOM' },
      { code: '221', name: 'YOUTH BEDROOM' },
      { code: '222', name: 'DAYBEDS' },
      { code: '223', name: 'BUNKBEDS' },
      { code: '224', name: 'METAL BEDS' },
      { code: '225', name: 'WOOD HEADBOARDS/NON CASEGOODS' }
    ],
    '250': [
      { code: '250', name: 'CASUAL DINING' },
      { code: '250', name: 'FORMAL DINING' },
      { code: '252', name: 'DINING UNIQUE PIECE' },
      { code: '253', name: 'STOOLS' }
    ],
    '420': [
      { code: '420', name: 'LAMPS' },
      { code: '430', name: 'WALL ITEMS' },
      { code: '440', name: 'PLANTS AND TREES' },
      { code: '450', name: 'TEXTILES AND SEASONAL ITEMS' },
      { code: '460', name: 'SMALL - TABLE TOPS' },
      { code: '470', name: 'LARGE - FLOOR STANDING' },
      { code: '480', name: 'AREA RUGS' }
    ],
    '540': [
      { code: '540', name: 'STATIONARY UPHOLSTERY' },
      { code: '541', name: 'LEATHER/FABRIC COMBO' },
      { code: '543', name: 'FABRIC & MISC FOR STATIONARY GROUP' },
      { code: '544', name: 'SECTIONALS' }
    ],
    '550': [
      { code: '550', name: 'LEATHER' },
      { code: '553', name: 'LEATHER / VINYL' }
    ],
    '570': [
      { code: '570', name: 'RECLINING UPHOLSTERY' },
      { code: '571', name: 'RECLINING LEATHER' },
      { code: '579', name: 'RECLINING SECTIONALS' },
      { code: '580', name: 'STATIONARY FOR MOTION UPHOLSTERY' }
    ],
    '590': [
      { code: '590', name: 'STATIONARY CHAIRS' },
      { code: '593', name: 'SWIVEL ROCKER' },
      { code: '596', name: 'LEATHER ACCENT CHAIRS' }
    ],
    '620': [
      { code: '620', name: 'FABRIC RECLINERS' },
      { code: '622', name: 'LEATHER RECLINERS' },
      { code: '623', name: 'LIFT CHAIRS' }
    ]
  };

  // Insert main categories first
  const insertMainCategories = db.prepare(`
    INSERT OR IGNORE INTO categories (code, name, parent_id, display_order)
    VALUES (?, ?, NULL, ?)
  `);

  mainCategories.forEach((cat, index) => {
    insertMainCategories.run(cat.code, cat.name, index);
  });
  insertMainCategories.finalize();

  // Wait a bit for main categories to be inserted, then insert subcategories
  setTimeout(() => {
    Object.keys(subcategories).forEach(parentCode => {
      db.get('SELECT id FROM categories WHERE code = ? AND parent_id IS NULL', [parentCode], (err, parent) => {
        if (err || !parent) {
          console.log(`Parent category ${parentCode} not found`);
          return;
        }

        const insertSubcategories = db.prepare(`
          INSERT OR IGNORE INTO categories (code, name, parent_id, display_order)
          VALUES (?, ?, ?, ?)
        `);

        subcategories[parentCode].forEach((subcat, index) => {
          insertSubcategories.run(subcat.code, subcat.name, parent.id, index);
        });
        insertSubcategories.finalize();
      });
    });

    setTimeout(() => {
      console.log('✅ Categories populated successfully!');
      db.close();
    }, 1000);
  }, 500);
});
