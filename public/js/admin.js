const API_BASE = '/api';

let currentVignetteId = null;
let currentProductId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadVignettes();
  loadProducts();
  loadCategories();
  setupNavigation();
  setupForms();
});

// Navigation
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;

      if (view === 'display-link') {
        window.open('/display.html', '_blank');
        return;
      }

      // Update active button
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active view
      document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(`${view}-view`).classList.add('active');
    });
  });
}

// ============================================
// VIGNETTES
// ============================================

async function loadVignettes() {
  try {
    const response = await fetch(`${API_BASE}/vignettes`);
    const data = await response.json();

    const vignettesList = document.getElementById('vignettes-list');

    if (data.vignettes.length === 0) {
      vignettesList.innerHTML = `
        <div class="empty-state">
          <h3>No vignettes yet</h3>
          <p>Create your first vignette to get started</p>
        </div>
      `;
      return;
    }

    vignettesList.innerHTML = data.vignettes.map(vignette => `
      <div class="card">
        <h3>${vignette.name}</h3>
        <div class="card-meta">
          ${vignette.location ? `<span>📍 ${vignette.location}</span>` : ''}
          ${vignette.theme ? `<span>🎨 ${vignette.theme}</span>` : ''}
        </div>
        <p>${vignette.description || 'No description'}</p>
        <div class="card-meta">
          <span>🛋️ ${vignette.product_count || 0} products</span>
          <span>🖼️ ${vignette.image_count || 0} images</span>
        </div>
        <div class="card-actions">
          <button class="btn-edit" onclick="editVignette(${vignette.id})">Edit</button>
          <button class="btn-danger" onclick="deleteVignette(${vignette.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading vignettes:', error);
    alert('Failed to load vignettes');
  }
}

function showVignetteForm() {
  currentVignetteId = null;
  document.getElementById('vignette-modal-title').textContent = 'Create New Vignette';
  document.getElementById('vignette-form').reset();
  document.getElementById('vignette-id').value = '';
  document.getElementById('vignette-products-section').style.display = 'none';
  document.getElementById('vignette-image-section').style.display = 'none';
  document.getElementById('vignette-modal').classList.add('active');
}

async function editVignette(id) {
  currentVignetteId = id;

  try {
    const response = await fetch(`${API_BASE}/vignettes/${id}`);
    const data = await response.json();

    document.getElementById('vignette-modal-title').textContent = 'Edit Vignette';
    document.getElementById('vignette-id').value = data.vignette.id;
    document.getElementById('vignette-name').value = data.vignette.name;
    document.getElementById('vignette-location').value = data.vignette.location || '';
    document.getElementById('vignette-theme').value = data.vignette.theme || '';
    document.getElementById('vignette-description').value = data.vignette.description || '';

    // Show products section
    document.getElementById('vignette-products-section').style.display = 'block';
    displayVignetteProducts(data.products);

    // Show image section
    document.getElementById('vignette-image-section').style.display = 'block';
    displayVignetteImages(data.images);

    document.getElementById('vignette-modal').classList.add('active');
  } catch (error) {
    console.error('Error loading vignette:', error);
    alert('Failed to load vignette details');
  }
}

function displayVignetteProducts(products) {
  const productsList = document.getElementById('vignette-products-list');

  if (products.length === 0) {
    productsList.innerHTML = '<p style="color: #95a5a6;">No products added yet</p>';
    return;
  }

  productsList.innerHTML = products.map(product => `
    <div class="product-item">
      <div class="product-item-info">
        <h4>${product.name}</h4>
        <p>${product.category} ${product.price ? `• $${product.price}` : ''}</p>
      </div>
      <button class="btn-danger" onclick="removeProductFromVignette(${currentVignetteId}, ${product.id})">Remove</button>
    </div>
  `).join('');
}

function displayVignetteImages(images) {
  const imagesList = document.getElementById('vignette-images-list');

  if (images.length === 0) {
    imagesList.innerHTML = '<p style="color: #95a5a6;">No images uploaded yet</p>';
    return;
  }

  imagesList.innerHTML = images.map(image => `
    <div class="image-item">
      <img src="${image.image_path}" alt="${image.caption || 'Vignette image'}">
      ${image.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
      <div class="image-item-actions">
        <button onclick="deleteImage(${image.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function closeVignetteModal() {
  document.getElementById('vignette-modal').classList.remove('active');
  currentVignetteId = null;
}

async function deleteVignette(id) {
  if (!confirm('Are you sure you want to delete this vignette?')) return;

  try {
    await fetch(`${API_BASE}/vignettes/${id}`, { method: 'DELETE' });
    loadVignettes();
  } catch (error) {
    console.error('Error deleting vignette:', error);
    alert('Failed to delete vignette');
  }
}

async function showAddProductToVignette() {
  // Load all products for selection
  try {
    const response = await fetch(`${API_BASE}/products`);
    const data = await response.json();

    const selectProduct = document.getElementById('select-product');
    selectProduct.innerHTML = '<option value="">Choose a product...</option>' +
      data.products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');

    document.getElementById('add-product-modal').classList.add('active');
  } catch (error) {
    console.error('Error loading products:', error);
    alert('Failed to load products');
  }
}

function closeAddProductModal() {
  document.getElementById('add-product-modal').classList.remove('active');
}

async function removeProductFromVignette(vignetteId, productId) {
  if (!confirm('Remove this product from the vignette?')) return;

  try {
    await fetch(`${API_BASE}/vignettes/${vignetteId}/products/${productId}`, {
      method: 'DELETE'
    });

    // Reload vignette details
    editVignette(vignetteId);
  } catch (error) {
    console.error('Error removing product:', error);
    alert('Failed to remove product');
  }
}

// ============================================
// PRODUCTS
// ============================================

async function loadProducts() {
  const category = document.getElementById('category-filter')?.value || '';

  try {
    const url = category ? `${API_BASE}/products?category=${category}` : `${API_BASE}/products`;
    const response = await fetch(url);
    const data = await response.json();

    const productsList = document.getElementById('products-list');

    if (data.products.length === 0) {
      productsList.innerHTML = `
        <div class="empty-state">
          <h3>No products found</h3>
          <p>Create your first product to get started</p>
        </div>
      `;
      return;
    }

    productsList.innerHTML = data.products.map(product => `
      <div class="card">
        <span class="badge">${product.category}</span>
        <h3>${product.name}</h3>
        ${product.price ? `<div class="price">$${parseFloat(product.price).toFixed(2)}</div>` : ''}
        <p>${product.description || 'No description'}</p>
        <div class="card-meta">
          ${product.manufacturer ? `<span>🏭 ${product.manufacturer}</span>` : ''}
          ${product.color ? `<span>🎨 ${product.color}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
          <button class="btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading products:', error);
    alert('Failed to load products');
  }
}

// Store categories globally for easier access
let categoriesData = [];

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    const data = await response.json();
    categoriesData = data.categories;

    console.log('[Categories] Loaded', data.categories.length, 'main categories');

    // Update main category dropdown
    const mainCategorySelect = document.getElementById('product-main-category');
    console.log('[Categories] Main select element:', mainCategorySelect ? 'FOUND' : 'NOT FOUND');

    if (mainCategorySelect) {
      let mainOptionsHTML = '<option value="">Select Main Category</option>';

      data.categories.forEach(mainCat => {
        mainOptionsHTML += `<option value="${mainCat.id}">${mainCat.code} - ${mainCat.name}</option>`;
      });

      mainCategorySelect.innerHTML = mainOptionsHTML;
      console.log('[Categories] Main dropdown populated with', data.categories.length, 'options');
    }

    // Update category filter dropdown (flat list of main categories)
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      const currentValue = categoryFilter.value;
      let filterHTML = '<option value="">All Categories</option>';

      data.categories.forEach(mainCat => {
        filterHTML += `<option value="${mainCat.id}">${mainCat.code} - ${mainCat.name}</option>`;
      });

      categoryFilter.innerHTML = filterHTML;
      if (currentValue) categoryFilter.value = currentValue;
    }

    // Setup event listener for main category change
    setupCategoryListeners();
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Track if listener has been set up to avoid duplicates
let categoryListenerSetup = false;

function setupCategoryListeners() {
  if (categoryListenerSetup) return; // Already set up

  const mainCategorySelect = document.getElementById('product-main-category');
  const subcategorySelect = document.getElementById('product-subcategory');

  if (mainCategorySelect && subcategorySelect) {
    mainCategorySelect.addEventListener('change', function() {
      const selectedMainId = parseInt(this.value);

      if (!selectedMainId) {
        subcategorySelect.disabled = true;
        subcategorySelect.innerHTML = '<option value="">Select Main Category First</option>';
        return;
      }

      // Find the selected main category and its subcategories
      const mainCategory = categoriesData.find(cat => cat.id === selectedMainId);

      if (mainCategory && mainCategory.subcategories && mainCategory.subcategories.length > 0) {
        subcategorySelect.disabled = false;
        let subOptionsHTML = '<option value="">Select Subcategory</option>';

        mainCategory.subcategories.forEach(subCat => {
          subOptionsHTML += `<option value="${subCat.id}">${subCat.code} - ${subCat.name}</option>`;
        });

        subcategorySelect.innerHTML = subOptionsHTML;
      } else {
        subcategorySelect.disabled = true;
        subcategorySelect.innerHTML = '<option value="">No subcategories available</option>';
      }
    });

    categoryListenerSetup = true;
  }
}

function showProductForm() {
  currentProductId = null;
  document.getElementById('product-modal-title').textContent = 'Create New Product';
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';

  // Reset category dropdowns
  const subcategorySelect = document.getElementById('product-subcategory');
  if (subcategorySelect) {
    subcategorySelect.disabled = true;
    subcategorySelect.innerHTML = '<option value="">Select Main Category First</option>';
  }

  document.getElementById('product-image-section').style.display = 'none';
  document.getElementById('product-modal').classList.add('active');
}

async function editProduct(id) {
  currentProductId = id;

  try {
    const response = await fetch(`${API_BASE}/products/${id}`);
    const data = await response.json();

    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = data.product.id;
    document.getElementById('product-name').value = data.product.name;
    document.getElementById('product-description').value = data.product.description || '';
    document.getElementById('product-manufacturer').value = data.product.manufacturer || '';
    document.getElementById('product-model-number').value = data.product.model_number || '';
    document.getElementById('product-sku').value = data.product.sku || '';
    document.getElementById('product-price').value = data.product.price || '';
    document.getElementById('product-color').value = data.product.color || '';
    document.getElementById('product-material').value = data.product.material || '';
    document.getElementById('product-dimensions').value = data.product.dimensions || '';

    // Set category values
    if (data.product.category_id) {
      // Find which main category this subcategory belongs to
      let parentCategoryId = null;
      let subcategoryId = data.product.category_id;

      categoriesData.forEach(mainCat => {
        if (mainCat.subcategories && mainCat.subcategories.length > 0) {
          const foundSub = mainCat.subcategories.find(sub => sub.id === subcategoryId);
          if (foundSub) {
            parentCategoryId = mainCat.id;
          }
        }
      });

      // Set main category first
      if (parentCategoryId) {
        document.getElementById('product-main-category').value = parentCategoryId;
        // Trigger change event to populate subcategories
        document.getElementById('product-main-category').dispatchEvent(new Event('change'));
        // Then set subcategory after a small delay to ensure subcategories are loaded
        setTimeout(() => {
          document.getElementById('product-subcategory').value = subcategoryId;
        }, 50);
      }
    }

    // Show image section
    document.getElementById('product-image-section').style.display = 'block';
    displayProductImages(data.images);

    document.getElementById('product-modal').classList.add('active');
  } catch (error) {
    console.error('Error loading product:', error);
    alert('Failed to load product details');
  }
}

function displayProductImages(images) {
  const imagesList = document.getElementById('product-images-list');

  if (images.length === 0) {
    imagesList.innerHTML = '<p style="color: #95a5a6;">No images uploaded yet</p>';
    return;
  }

  imagesList.innerHTML = images.map(image => `
    <div class="image-item">
      <img src="${image.image_path}" alt="${image.caption || 'Product image'}">
      ${image.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
      <div class="image-item-actions">
        <button onclick="deleteImage(${image.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
  currentProductId = null;
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    loadProducts();
    loadCategories();
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Failed to delete product');
  }
}

// ============================================
// IMAGE UPLOAD
// ============================================

async function deleteImage(imageId) {
  if (!confirm('Are you sure you want to delete this image?')) return;

  try {
    await fetch(`${API_BASE}/images/${imageId}`, { method: 'DELETE' });

    // Reload current modal
    if (currentVignetteId) {
      editVignette(currentVignetteId);
    } else if (currentProductId) {
      editProduct(currentProductId);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    alert('Failed to delete image');
  }
}

// ============================================
// FORM SUBMISSIONS
// ============================================

function setupForms() {
  // Vignette form
  document.getElementById('vignette-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('vignette-id').value;
    const formData = {
      name: document.getElementById('vignette-name').value,
      location: document.getElementById('vignette-location').value,
      theme: document.getElementById('vignette-theme').value,
      description: document.getElementById('vignette-description').value
    };

    try {
      const url = id ? `${API_BASE}/vignettes/${id}` : `${API_BASE}/vignettes`;
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        closeVignetteModal();
        loadVignettes();
        alert(id ? 'Vignette updated successfully!' : 'Vignette created successfully!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving vignette:', error);
      alert('Failed to save vignette');
    }
  });

  // Product form
  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('product-id').value;
    const subcategoryId = document.getElementById('product-subcategory').value;

    if (!subcategoryId) {
      alert('Please select both a main category and subcategory');
      return;
    }

    const formData = {
      name: document.getElementById('product-name').value,
      category_id: parseInt(subcategoryId),
      description: document.getElementById('product-description').value,
      manufacturer: document.getElementById('product-manufacturer').value,
      model_number: document.getElementById('product-model-number').value,
      sku: document.getElementById('product-sku').value,
      price: document.getElementById('product-price').value,
      color: document.getElementById('product-color').value,
      material: document.getElementById('product-material').value,
      dimensions: document.getElementById('product-dimensions').value
    };

    try {
      const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        closeProductModal();
        loadProducts();
        loadCategories();
        alert(id ? 'Product updated successfully!' : 'Product created successfully!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  });

  // Add product to vignette form
  document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('select-product').value;
    const position = document.getElementById('product-position').value;
    const notes = document.getElementById('product-notes').value;

    if (!productId) {
      alert('Please select a product');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/vignettes/${currentVignetteId}/products/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, notes })
      });

      if (response.ok) {
        closeAddProductModal();
        editVignette(currentVignetteId);
        alert('Product added to vignette successfully!');
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding product to vignette:', error);
      alert('Failed to add product to vignette');
    }
  });

  // Vignette image upload
  document.getElementById('vignette-image-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('vignette-image-file');
    const caption = document.getElementById('vignette-image-caption').value;

    if (!fileInput.files[0]) {
      alert('Please select an image');
      return;
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('vignette_id', currentVignetteId);
    formData.append('caption', caption);

    try {
      const response = await fetch(`${API_BASE}/images/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        fileInput.value = '';
        document.getElementById('vignette-image-caption').value = '';
        editVignette(currentVignetteId);
        alert('Image uploaded successfully!');
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  });

  // Product image upload
  document.getElementById('product-image-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('product-image-file');
    const caption = document.getElementById('product-image-caption').value;
    const isPrimary = document.getElementById('product-image-primary').checked;

    if (!fileInput.files[0]) {
      alert('Please select an image');
      return;
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('product_id', currentProductId);
    formData.append('caption', caption);
    formData.append('is_primary', isPrimary ? '1' : '0');

    try {
      const response = await fetch(`${API_BASE}/images/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        fileInput.value = '';
        document.getElementById('product-image-caption').value = '';
        document.getElementById('product-image-primary').checked = false;
        editProduct(currentProductId);
        alert('Image uploaded successfully!');
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  });
}
