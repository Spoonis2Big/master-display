const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required when behind NGINX
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'master-display-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Serve login page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Public routes (no auth required)
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));
app.use('/display.html', express.static(path.join(__dirname, 'public', 'display.html')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/uploads', express.static('uploads'));

// Database connection
const dbPath = path.join(__dirname, 'database/showroom.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

// Check if user is authenticated
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
}

// Protect admin.html
app.get('/admin.html', (req, res) => {
  if (req.session && req.session.userId) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.redirect('/login.html');
  }
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ? AND is_active = 1',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      try {
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Password comparison error:', error);
        res.status(500).json({ error: 'Authentication error' });
      }
    }
  );
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      username: req.session.username
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ============================================
// VIGNETTE ROUTES
// ============================================

// Get all vignettes
app.get('/api/vignettes', (req, res) => {
  const query = `
    SELECT v.*,
           COUNT(DISTINCT vp.product_id) as product_count,
           COUNT(DISTINCT i.id) as image_count
    FROM vignettes v
    LEFT JOIN vignette_products vp ON v.id = vp.vignette_id
    LEFT JOIN images i ON v.id = i.vignette_id
    WHERE v.is_active = 1
    GROUP BY v.id
    ORDER BY v.date_created DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ vignettes: rows });
  });
});

// Get single vignette with all details
app.get('/api/vignettes/:id', (req, res) => {
  const vignetteId = req.params.id;

  const vignetteQuery = `SELECT * FROM vignettes WHERE id = ? AND is_active = 1`;

  db.get(vignetteQuery, [vignetteId], (err, vignette) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!vignette) {
      res.status(404).json({ error: 'Vignette not found' });
      return;
    }

    // Get products in this vignette with category names from categories table
    const productsQuery = `
      SELECT p.*, vp.position, vp.notes,
             COALESCE(c.name, p.category) as category
      FROM products p
      JOIN vignette_products vp ON p.id = vp.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE vp.vignette_id = ? AND p.is_active = 1
      ORDER BY vp.position
    `;

    db.all(productsQuery, [vignetteId], (err, products) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Get images for this vignette
      const imagesQuery = `SELECT * FROM images WHERE vignette_id = ? ORDER BY is_primary DESC`;

      db.all(imagesQuery, [vignetteId], (err, images) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        res.json({
          vignette: vignette,
          products: products,
          images: images
        });
      });
    });
  });
});

// Create new vignette
app.post('/api/vignettes', requireAuth, (req, res) => {
  const { name, description, location, theme } = req.body;

  const query = `
    INSERT INTO vignettes (name, description, location, theme)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [name, description, location, theme], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Vignette created successfully' });
  });
});

// Update vignette
app.put('/api/vignettes/:id', requireAuth, (req, res) => {
  const { name, description, location, theme } = req.body;
  const vignetteId = req.params.id;

  const query = `
    UPDATE vignettes
    SET name = ?, description = ?, location = ?, theme = ?, date_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [name, description, location, theme, vignetteId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Vignette updated successfully', changes: this.changes });
  });
});

// Delete vignette (soft delete)
app.delete('/api/vignettes/:id', requireAuth, (req, res) => {
  const vignetteId = req.params.id;

  const query = `UPDATE vignettes SET is_active = 0 WHERE id = ?`;

  db.run(query, [vignetteId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Vignette deleted successfully', changes: this.changes });
  });
});

// ============================================
// PRODUCT ROUTES
// ============================================

// Get all products
app.get('/api/products', (req, res) => {
  const category = req.query.category;
  let query = `
    SELECT p.*, COALESCE(c.name, p.category) as category
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  let params = [];

  if (category) {
    query += ` AND (p.category = ? OR p.category_id = ?)`;
    params.push(category, category);
  }

  query += ` ORDER BY p.name`;

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ products: rows });
  });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  const query = `
    SELECT p.*, COALESCE(c.name, p.category) as category
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ? AND p.is_active = 1
  `;

  db.get(query, [productId], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Get images for this product
    const imagesQuery = `SELECT * FROM images WHERE product_id = ? ORDER BY is_primary DESC`;

    db.all(imagesQuery, [productId], (err, images) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({
        product: product,
        images: images
      });
    });
  });
});

// Create new product
app.post('/api/products', requireAuth, (req, res) => {
  const { name, category_id, description, manufacturer, model_number, sku, price, dimensions, material, color } = req.body;

  // Get category name from category_id for backward compatibility
  if (category_id) {
    db.get('SELECT name FROM categories WHERE id = ?', [category_id], (err, cat) => {
      const categoryName = cat ? cat.name : null;

      const query = `
        INSERT INTO products (name, category, category_id, description, manufacturer, model_number, sku, price, dimensions, material, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(query, [name, categoryName, category_id, description, manufacturer, model_number, sku, price, dimensions, material, color], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID, message: 'Product created successfully' });
      });
    });
  } else {
    const query = `
      INSERT INTO products (name, category, category_id, description, manufacturer, model_number, sku, price, dimensions, material, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [name, null, null, description, manufacturer, model_number, sku, price, dimensions, material, color], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Product created successfully' });
    });
  }
});

// Update product
app.put('/api/products/:id', requireAuth, (req, res) => {
  const { name, category_id, description, manufacturer, model_number, sku, price, dimensions, material, color } = req.body;
  const productId = req.params.id;

  // Get category name from category_id for backward compatibility
  if (category_id) {
    db.get('SELECT name FROM categories WHERE id = ?', [category_id], (err, cat) => {
      const categoryName = cat ? cat.name : null;

      const query = `
        UPDATE products
        SET name = ?, category = ?, category_id = ?, description = ?, manufacturer = ?, model_number = ?,
            sku = ?, price = ?, dimensions = ?, material = ?, color = ?, date_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(query, [name, categoryName, category_id, description, manufacturer, model_number, sku, price, dimensions, material, color, productId], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: 'Product updated successfully', changes: this.changes });
      });
    });
  } else {
    const query = `
      UPDATE products
      SET name = ?, category = ?, category_id = ?, description = ?, manufacturer = ?, model_number = ?,
          sku = ?, price = ?, dimensions = ?, material = ?, color = ?, date_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [name, null, null, description, manufacturer, model_number, sku, price, dimensions, material, color, productId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Product updated successfully', changes: this.changes });
    });
  }
});

// Delete product (soft delete)
app.delete('/api/products/:id', requireAuth, (req, res) => {
  const productId = req.params.id;

  const query = `UPDATE products SET is_active = 0 WHERE id = ?`;

  db.run(query, [productId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Product deleted successfully', changes: this.changes });
  });
});

// Get product categories (hierarchical)
app.get('/api/categories', (req, res) => {
  // Get all categories
  const query = `
    SELECT id, code, name, parent_id, display_order
    FROM categories
    WHERE is_active = 1
    ORDER BY display_order, name
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Organize into hierarchy
    const mainCategories = rows.filter(cat => cat.parent_id === null);
    const subcategories = rows.filter(cat => cat.parent_id !== null);

    const hierarchy = mainCategories.map(main => ({
      ...main,
      subcategories: subcategories.filter(sub => sub.parent_id === main.id)
    }));

    res.json({ categories: hierarchy });
  });
});

// Get flat list of categories (for backward compatibility)
app.get('/api/categories/flat', (req, res) => {
  const query = `SELECT id, code, name, parent_id FROM categories WHERE is_active = 1 ORDER BY display_order, name`;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ categories: rows });
  });
});

// ============================================
// VIGNETTE-PRODUCT ASSOCIATION ROUTES
// ============================================

// Add product to vignette
app.post('/api/vignettes/:vignetteId/products/:productId', requireAuth, (req, res) => {
  const { vignetteId, productId } = req.params;
  const { position, notes } = req.body;

  const query = `
    INSERT INTO vignette_products (vignette_id, product_id, position, notes)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [vignetteId, productId, position || 0, notes], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Product added to vignette successfully' });
  });
});

// Remove product from vignette
app.delete('/api/vignettes/:vignetteId/products/:productId', requireAuth, (req, res) => {
  const { vignetteId, productId } = req.params;

  const query = `DELETE FROM vignette_products WHERE vignette_id = ? AND product_id = ?`;

  db.run(query, [vignetteId, productId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Product removed from vignette successfully', changes: this.changes });
  });
});

// ============================================
// IMAGE ROUTES
// ============================================

// Upload image
app.post('/api/images/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { product_id, vignette_id, is_primary, caption } = req.body;
  const imagePath = '/uploads/' + req.file.filename;

  const query = `
    INSERT INTO images (product_id, vignette_id, image_path, is_primary, caption)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [product_id || null, vignette_id || null, imagePath, is_primary || 0, caption || null], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      id: this.lastID,
      message: 'Image uploaded successfully',
      image_path: imagePath
    });
  });
});

// Delete image
app.delete('/api/images/:id', requireAuth, (req, res) => {
  const imageId = req.params.id;

  // First get the image path to delete the file
  db.get(`SELECT image_path FROM images WHERE id = ?`, [imageId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row) {
      const filePath = path.join(__dirname, row.image_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const query = `DELETE FROM images WHERE id = ?`;

    db.run(query, [imageId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Image deleted successfully', changes: this.changes });
    });
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Master Display server running on http://localhost:${PORT}`);
  console.log(`📊 Admin interface: http://localhost:${PORT}/admin.html`);
  console.log(`🖥️  Master Display: http://localhost:${PORT}/display.html`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('\n✅ Database connection closed');
    process.exit(0);
  });
});
