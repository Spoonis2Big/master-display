const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/showroom.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create vignettes table
  db.run(`
    CREATE TABLE IF NOT EXISTS vignettes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      theme TEXT,
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `);

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

  // Create products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      category_id INTEGER,
      description TEXT,
      manufacturer TEXT,
      model_number TEXT,
      sku TEXT,
      price DECIMAL(10, 2),
      dimensions TEXT,
      material TEXT,
      color TEXT,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Create vignette_products junction table
  db.run(`
    CREATE TABLE IF NOT EXISTS vignette_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vignette_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      position INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (vignette_id) REFERENCES vignettes(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(vignette_id, product_id)
    )
  `);

  // Create images table
  db.run(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      vignette_id INTEGER,
      image_path TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      caption TEXT,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (vignette_id) REFERENCES vignettes(id) ON DELETE CASCADE
    )
  `);

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'admin',
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vignettes_active ON vignettes(is_active)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vignette_products ON vignette_products(vignette_id, product_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  console.log('✅ Database tables created successfully!');

  // Insert categories
  const mainCategories = [
    { code: '220', name: 'BEDROOM', order: 0 },
    { code: '250', name: 'DINING ROOM', order: 1 },
    { code: '360', name: 'OCCASIONAL TABLES', order: 2 },
    { code: '420', name: 'ACCESSORIES', order: 3 },
    { code: '540', name: 'UPHOLSTERY', order: 4 },
    { code: '550', name: 'LEATHER', order: 5 },
    { code: '570', name: 'RECLINING UPHOLSTERY', order: 6 },
    { code: '590', name: 'STATIONARY CHAIRS', order: 7 },
    { code: '620', name: 'FABRIC RECLINERS', order: 8 }
  ];

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
      { code: '251', name: 'FORMAL DINING' },
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

  // Insert main categories
  const insertMain = db.prepare(`INSERT OR IGNORE INTO categories (code, name, parent_id, display_order) VALUES (?, ?, NULL, ?)`);
  mainCategories.forEach(cat => {
    insertMain.run(cat.code, cat.name, cat.order);
  });
  insertMain.finalize(() => {
    console.log('✅ Main categories added!');

    // Insert subcategories
    Object.keys(subcategories).forEach(parentCode => {
      db.get('SELECT id FROM categories WHERE code = ? AND parent_id IS NULL', [parentCode], (err, parent) => {
        if (!err && parent) {
          const insertSub = db.prepare(`INSERT OR IGNORE INTO categories (code, name, parent_id, display_order) VALUES (?, ?, ?, ?)`);
          subcategories[parentCode].forEach((subcat, index) => {
            insertSub.run(subcat.code, subcat.name, parent.id, index);
          });
          insertSub.finalize();
        }
      });
    });
    console.log('✅ Subcategories added!');
  });

  // Insert sample data
  db.run(`
    INSERT INTO vignettes (name, description, location, theme)
    VALUES
      ('Modern Living', 'Contemporary living room setup with clean lines', 'Section A1', 'Modern'),
      ('Cozy Family Room', 'Warm and inviting family space', 'Section B2', 'Traditional')
  `, function(err) {
    if (err) {
      console.log('Sample data already exists or error:', err.message);
    } else {
      console.log('✅ Sample vignettes added!');
    }
  });

  db.run(`
    INSERT INTO products (name, category, description, manufacturer, price, color)
    VALUES
      ('Cloud Comfort Sofa', 'Sofa', 'Luxurious 3-seater sofa with deep cushions', 'ComfortCo', 1299.99, 'Charcoal Gray'),
      ('Elegance Armchair', 'Chair', 'Mid-century modern armchair with wooden legs', 'DesignPlus', 449.99, 'Navy Blue'),
      ('Geometric Area Rug', 'Rug', 'Hand-tufted wool rug with modern pattern', 'RugMasters', 599.99, 'Multi-color'),
      ('Glass-Top Coffee Table', 'Coffee Table', 'Tempered glass with chrome base', 'ModernHome', 329.99, 'Clear/Chrome'),
      ('Amber Table Lamp', 'Lamp', 'Ceramic base with fabric shade', 'LightUp', 89.99, 'Amber/White')
  `, function(err) {
    if (err) {
      console.log('Sample products already exist or error:', err.message);
    } else {
      console.log('✅ Sample products added!');

      // Link products to first vignette
      db.run(`
        INSERT INTO vignette_products (vignette_id, product_id, position)
        VALUES (1, 1, 1), (1, 2, 2), (1, 3, 3), (1, 4, 4), (1, 5, 5)
      `);
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('✅ Database initialization complete!');
  }
});
