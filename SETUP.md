# Master Display Setup Guide

## Overview

Master Display is a comprehensive database and display system for managing showroom vignettes. It allows you to store products (sofas, chairs, rugs, tables, lamps, decor) along with images and product information, then display them beautifully on your showroom floor.

## Features

- **Product Management**: Store detailed product information including:
  - Name, category, description
  - Manufacturer, model number, SKU
  - Price, dimensions, material, color
  - Multiple product images

- **Vignette Management**: Create and manage showroom vignettes:
  - Group multiple products together
  - Add vignette images
  - Specify location and theme
  - Add descriptions

- **Master Display**: Multiple viewing options:
  - Grid view for browsing all vignettes
  - Slideshow mode with auto-play
  - Detailed view with all product information
  - Fullscreen support

- **Admin Panel**: Easy-to-use interface for:
  - Adding/editing products and vignettes
  - Uploading images
  - Managing relationships
  - Filtering by category

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```

   This creates the SQLite database with tables and sample data.

3. **Start the Server**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Admin Panel: http://localhost:3000/admin.html
   - Master Display: http://localhost:3000/display.html

## Quick Start Guide

### 1. Create Products

1. Go to the Admin Panel (http://localhost:3000/admin.html)
2. Click the "Products" tab
3. Click "+ New Product"
4. Fill in product details:
   - **Required**: Name, Category
   - **Optional**: Description, manufacturer, price, dimensions, etc.
5. Click "Save Product"
6. After saving, you can upload product images

### 2. Create Vignettes

1. In the Admin Panel, click the "Vignettes" tab
2. Click "+ New Vignette"
3. Fill in vignette details:
   - **Required**: Name
   - **Optional**: Location (e.g., "Section A1"), Theme, Description
4. Click "Save Vignette"

### 3. Add Products to Vignettes

1. Edit an existing vignette by clicking "Edit"
2. Scroll down to "Products in this Vignette"
3. Click "+ Add Product"
4. Select a product from the dropdown
5. Optionally set position/order and notes
6. Click "Add Product"

### 4. Upload Images

**For Products:**
1. Edit a product
2. Scroll to "Product Images" section
3. Select an image file
4. Add optional caption
5. Check "Set as primary image" if desired
6. Click "Upload Image"

**For Vignettes:**
1. Edit a vignette
2. Scroll to "Vignette Images" section
3. Select an image file
4. Add optional caption
5. Click "Upload Image"

### 5. Display on Showroom Floor

1. Open http://localhost:3000/display.html
2. Choose viewing mode:
   - **Grid View**: See all vignettes at once
   - **Slideshow**: Auto-rotating display (changes every 8 seconds)
3. Click on any vignette to see detailed information
4. Use "Fullscreen" button for showroom displays

## Product Categories

The system comes with pre-defined categories:
- Sofa
- Chair
- Loveseat
- Rug
- Coffee Table
- End Table
- Chair Side Table
- Lamp
- Decor

You can add custom categories by simply typing a new category name when creating a product.

## Database Location

The SQLite database is stored at:
```
database/showroom.db
```

To backup your data, simply copy this file to a safe location.

## Image Storage

Uploaded images are stored in:
```
uploads/
```

Make sure to backup this folder along with your database.

## Port Configuration

By default, the server runs on port 3000. To change this, set the PORT environment variable:

```bash
PORT=8080 npm start
```

## Troubleshooting

### Database Not Found
If you get a database error, run:
```bash
npm run init-db
```

### Port Already in Use
If port 3000 is busy, either:
1. Stop the other application using port 3000, or
2. Set a different port: `PORT=3001 npm start`

### Images Not Displaying
Make sure the `uploads/` directory exists and has write permissions.

### Can't Upload Images
Check that:
1. Image file is under 10MB
2. Image format is JPG, PNG, GIF, or WebP
3. The uploads directory has write permissions

## Tips for Showroom Use

1. **Use High-Quality Images**: Upload clear, well-lit photos of products and vignettes
2. **Set Primary Images**: Mark one product image as primary for better display
3. **Organize by Location**: Use the location field (e.g., "Section A1", "North Wall") to help locate vignettes
4. **Use Themes**: Tag vignettes with themes (Modern, Traditional, Coastal, etc.) for easier browsing
5. **Keep Descriptions Short**: In display mode, concise descriptions work best
6. **Use Slideshow Mode**: Perfect for unattended displays on TVs or monitors
7. **Fullscreen on Display Devices**: Use the fullscreen button for dedicated showroom displays

## Advanced Usage

### Custom Styling
You can customize the appearance by editing:
- `public/css/admin.css` - Admin panel styling
- `public/css/display.css` - Display view styling

### API Endpoints
The system provides a REST API at `http://localhost:3000/api`:

- `GET /api/vignettes` - List all vignettes
- `GET /api/vignettes/:id` - Get vignette details
- `POST /api/vignettes` - Create vignette
- `PUT /api/vignettes/:id` - Update vignette
- `DELETE /api/vignettes/:id` - Delete vignette
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/vignettes/:vignetteId/products/:productId` - Add product to vignette
- `DELETE /api/vignettes/:vignetteId/products/:productId` - Remove product from vignette
- `POST /api/images/upload` - Upload image
- `DELETE /api/images/:id` - Delete image

## Support

For issues or questions, refer to the README.md file or check the source code comments.
