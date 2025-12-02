const API_BASE = '/api';

let vignettes = [];
let currentSlideIndex = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadVignettes();
  setupViewToggles();
  setupFullscreen();
});

// Load vignettes
async function loadVignettes() {
  try {
    const response = await fetch(`${API_BASE}/vignettes`);
    const data = await response.json();
    vignettes = data.vignettes;

    displayGridView();
    displaySlideshow();
  } catch (error) {
    console.error('Error loading vignettes:', error);
    showEmptyState();
  }
}

// Display grid view
function displayGridView() {
  const grid = document.getElementById('vignettes-grid');

  if (vignettes.length === 0) {
    showEmptyState();
    return;
  }

  grid.innerHTML = vignettes.map((vignette, index) => `
    <div class="vignette-card" onclick="showVignetteDetail(${vignette.id})">
      <div class="vignette-image">
        ${vignette.image_count > 0 ? '🖼️' : '🎨'}
      </div>
      <div class="vignette-info">
        <div class="vignette-header">
          <h2>${vignette.name}</h2>
        </div>
        <div class="vignette-badges">
          ${vignette.location ? `<span class="badge">📍 ${vignette.location}</span>` : ''}
          ${vignette.theme ? `<span class="badge">🎨 ${vignette.theme}</span>` : ''}
        </div>
        <div class="vignette-meta">
          <span>🛋️ ${vignette.product_count || 0} Products</span>
          <span>🖼️ ${vignette.image_count || 0} Images</span>
        </div>
        ${vignette.description ? `<p class="vignette-description">${vignette.description}</p>` : ''}
        <div class="product-preview" id="products-preview-${vignette.id}">
          <span class="product-tag">Click to view details</span>
        </div>
      </div>
    </div>
  `).join('');

  // Load product previews for each vignette
  vignettes.forEach(vignette => {
    loadProductPreview(vignette.id);
  });
}

// Load product preview for a vignette
async function loadProductPreview(vignetteId) {
  try {
    const response = await fetch(`${API_BASE}/vignettes/${vignetteId}`);
    const data = await response.json();

    const previewContainer = document.getElementById(`products-preview-${vignetteId}`);
    if (previewContainer && data.products.length > 0) {
      previewContainer.innerHTML = data.products.slice(0, 5).map(product =>
        `<span class="product-tag">${product.category}</span>`
      ).join('');

      if (data.products.length > 5) {
        previewContainer.innerHTML += `<span class="product-tag">+${data.products.length - 5} more</span>`;
      }
    }
  } catch (error) {
    console.error('Error loading product preview:', error);
  }
}

// Display slideshow
function displaySlideshow() {
  const slideshowContent = document.getElementById('slideshow-content');
  const indicators = document.getElementById('slide-indicators');

  if (vignettes.length === 0) {
    slideshowContent.innerHTML = '<div class="empty-state"><h2>No vignettes to display</h2></div>';
    return;
  }

  slideshowContent.innerHTML = vignettes.map((vignette, index) => `
    <div class="slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
      <div class="slide-image-container">
        ${vignette.image_count > 0 ? '🖼️' : '🎨'}
      </div>
      <div class="slide-info">
        <h2>${vignette.name}</h2>
        <div class="vignette-badges">
          ${vignette.location ? `<span class="badge">📍 ${vignette.location}</span>` : ''}
          ${vignette.theme ? `<span class="badge">🎨 ${vignette.theme}</span>` : ''}
        </div>
        <div class="vignette-meta">
          <span>🛋️ ${vignette.product_count || 0} Products</span>
          <span>🖼️ ${vignette.image_count || 0} Images</span>
        </div>
        ${vignette.description ? `<p class="vignette-description">${vignette.description}</p>` : ''}
        <div id="slide-products-${vignette.id}" class="slide-products">
          <p style="color: #999;">Loading products...</p>
        </div>
      </div>
    </div>
  `).join('');

  // Create indicators
  indicators.innerHTML = vignettes.map((_, index) =>
    `<span class="indicator ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>`
  ).join('');

  // Load products for slideshow
  vignettes.forEach(vignette => {
    loadSlideProducts(vignette.id);
  });

  // Auto-play slideshow
  startAutoPlay();
}

// Load products for slideshow
async function loadSlideProducts(vignetteId) {
  try {
    const response = await fetch(`${API_BASE}/vignettes/${vignetteId}`);
    const data = await response.json();

    const productsContainer = document.getElementById(`slide-products-${vignetteId}`);
    if (productsContainer && data.products.length > 0) {
      productsContainer.innerHTML = data.products.map(product => `
        <div class="slide-product-card">
          <h4>${product.name}</h4>
          <p class="product-category">${product.category}</p>
          ${product.price ? `<p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>` : ''}
        </div>
      `).join('');
    } else if (productsContainer) {
      productsContainer.innerHTML = '<p style="color: #999;">No products in this vignette</p>';
    }
  } catch (error) {
    console.error('Error loading slide products:', error);
  }
}

// Slideshow controls
function changeSlide(direction) {
  currentSlideIndex += direction;

  if (currentSlideIndex >= vignettes.length) {
    currentSlideIndex = 0;
  } else if (currentSlideIndex < 0) {
    currentSlideIndex = vignettes.length - 1;
  }

  showSlide(currentSlideIndex);
}

function goToSlide(index) {
  currentSlideIndex = index;
  showSlide(currentSlideIndex);
}

function showSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const indicators = document.querySelectorAll('.indicator');

  slides.forEach(slide => slide.classList.remove('active'));
  indicators.forEach(indicator => indicator.classList.remove('active'));

  if (slides[index]) {
    slides[index].classList.add('active');
  }
  if (indicators[index]) {
    indicators[index].classList.add('active');
  }
}

// Auto-play slideshow
let autoPlayInterval;

function startAutoPlay() {
  stopAutoPlay();
  autoPlayInterval = setInterval(() => {
    changeSlide(1);
  }, 8000); // Change slide every 8 seconds
}

function stopAutoPlay() {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
  }
}

// View toggles
function setupViewToggles() {
  const gridViewBtn = document.getElementById('grid-view-btn');
  const slideshowBtn = document.getElementById('slideshow-btn');
  const gridView = document.getElementById('grid-view');
  const slideshowView = document.getElementById('slideshow-view');

  gridViewBtn.addEventListener('click', () => {
    gridViewBtn.classList.add('active');
    slideshowBtn.classList.remove('active');
    gridView.classList.add('active');
    slideshowView.classList.remove('active');
    stopAutoPlay();
  });

  slideshowBtn.addEventListener('click', () => {
    slideshowBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
    slideshowView.classList.add('active');
    gridView.classList.remove('active');
    startAutoPlay();
  });
}

// Fullscreen
function setupFullscreen() {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const container = document.querySelector('.display-container');

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
      fullscreenBtn.textContent = '⛶ Exit Fullscreen';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      fullscreenBtn.textContent = '⛶ Fullscreen';
    }
  });

  // Update button text on fullscreen change
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      fullscreenBtn.textContent = '⛶ Fullscreen';
    }
  });
}

// Show vignette detail
async function showVignetteDetail(vignetteId) {
  try {
    const response = await fetch(`${API_BASE}/vignettes/${vignetteId}`);
    const data = await response.json();

    const detailBody = document.getElementById('detail-body');

    detailBody.innerHTML = `
      <h1 style="font-size: 42px; margin-bottom: 20px;">${data.vignette.name}</h1>

      <div class="vignette-badges" style="margin-bottom: 25px;">
        ${data.vignette.location ? `<span class="badge">📍 ${data.vignette.location}</span>` : ''}
        ${data.vignette.theme ? `<span class="badge">🎨 ${data.vignette.theme}</span>` : ''}
      </div>

      ${data.vignette.description ? `
        <p style="font-size: 18px; line-height: 1.8; color: #ccc; margin-bottom: 30px;">
          ${data.vignette.description}
        </p>
      ` : ''}

      ${data.images.length > 0 ? `
        <h3 style="font-size: 24px; margin-bottom: 20px;">Images</h3>
        <div class="detail-images">
          ${data.images.map(image => `
            <img src="${image.image_path}" alt="${image.caption || 'Vignette image'}" class="detail-image">
          `).join('')}
        </div>
      ` : ''}

      <h3 style="font-size: 24px; margin: 30px 0 20px 0;">Products (${data.products.length})</h3>

      ${data.products.length > 0 ? `
        <div class="detail-products">
          ${data.products.map(product => `
            <div class="detail-product-card">
              <span class="badge" style="display: inline-block; margin-bottom: 10px;">${product.category}</span>
              <h3>${product.name}</h3>
              ${product.description ? `<p class="product-detail">${product.description}</p>` : ''}
              ${product.price ? `<p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>` : ''}
              ${product.manufacturer ? `<p class="product-detail"><strong>Manufacturer:</strong> ${product.manufacturer}</p>` : ''}
              ${product.model_number ? `<p class="product-detail"><strong>Model:</strong> ${product.model_number}</p>` : ''}
              ${product.sku ? `<p class="product-detail"><strong>SKU:</strong> ${product.sku}</p>` : ''}
              ${product.color ? `<p class="product-detail"><strong>Color:</strong> ${product.color}</p>` : ''}
              ${product.material ? `<p class="product-detail"><strong>Material:</strong> ${product.material}</p>` : ''}
              ${product.dimensions ? `<p class="product-detail"><strong>Dimensions:</strong> ${product.dimensions}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: #999;">No products in this vignette</p>'}
    `;

    document.getElementById('detail-modal').classList.add('active');
  } catch (error) {
    console.error('Error loading vignette details:', error);
    alert('Failed to load vignette details');
  }
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('active');
}

// Show empty state
function showEmptyState() {
  const grid = document.getElementById('vignettes-grid');
  grid.innerHTML = `
    <div class="empty-state">
      <h2>No Vignettes Available</h2>
      <p>Create vignettes in the admin panel to display them here</p>
    </div>
  `;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (document.getElementById('slideshow-view').classList.contains('active')) {
    if (e.key === 'ArrowLeft') {
      changeSlide(-1);
    } else if (e.key === 'ArrowRight') {
      changeSlide(1);
    }
  }

  // Close detail with Escape
  if (e.key === 'Escape') {
    closeDetail();
  }
});
