const SUPABASE_URL = 'https://lbdojwaqynzyzaupgmof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZG9qd2FxeW56eXphdXBnbW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTcyMTQsImV4cCI6MjEwNTQ5MzIxNH0.jVVpPzp9T3aOZZ9k6y6Zq7WYD6XUkcYYEvgfze7vmJw';
const CART_KEY = 'lamssa_cart_v1';
const CURRENCY = 'درهم';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const detail = document.getElementById('productDetail');
const productId = new URLSearchParams(window.location.search).get('id');
let product;
let quantity = 1;

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function fallbackImage(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#2b1f25"/><text x="400" y="390" font-size="100" text-anchor="middle" fill="#d4af6a">✦</text><text x="400" y="490" font-size="34" text-anchor="middle" fill="#f3e2ce" font-family="Tajawal, sans-serif">${escapeHtml(label)}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function getImages(item) {
  let images = [];
  const storedImages = item?.additional_images ?? item?.images;
  if (storedImages) {
    try {
      const parsed = typeof storedImages === 'string' ? JSON.parse(storedImages) : storedImages;
      if (Array.isArray(parsed)) images = parsed.filter(Boolean);
    } catch (error) {}
  }
  if (!images.length && item?.image) images = [item.image];
  return images.length ? images : [fallbackImage(item?.name || 'منتج')];
}

function getPrice(item) {
  return Number(item.new_price ?? item.price ?? 0);
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (error) { return {}; }
}

function showToast(message) {
  const toast = document.getElementById('productToast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2600);
}

function renderProduct(item) {
  product = item;
  const images = getImages(item);
  document.title = `${item.name} | لمسة أناقة`;
  detail.innerHTML = `
    <div class="product-gallery">
      <div class="product-main-image"><img id="detailImage" alt="${escapeHtml(item.name)}"></div>
      <div id="detailThumbs" class="product-thumbs"></div>
    </div>
    <div class="product-info">
      <span class="product-category">${escapeHtml(item.category || 'منتج مميز')}</span>
      <h1>${escapeHtml(item.name)}</h1>
      <p class="product-lead">تفاصيل أنيقة مختارة بعناية لتمنحك جودة موثوقة وتجربة شراء واضحة.</p>
      <p class="product-description">${escapeHtml(item.description || 'منتج أنيق بجودة مختارة بعناية، مناسب للاستخدام اليومي وللهدايا.')}</p>
      <div class="product-price-row"><span class="product-page-price">${getPrice(item).toFixed(2)} ${CURRENCY}</span>${Number(item.original_price) > getPrice(item) ? `<del>${Number(item.original_price).toFixed(2)} ${CURRENCY}</del>` : ''}</div>
      <div class="product-points"><span>توصيل مجاني</span><span>معاينة قبل الدفع</span><span>جودة موثوقة</span></div>
      <div class="product-order-box">
        <div class="product-quantity"><span>الكمية</span><div><button id="minus" type="button">−</button><strong id="quantity">1</strong><button id="plus" type="button">+</button></div></div>
        <button id="addProduct" class="btn btn-grad btn-block" type="button">شراء الآن</button>
        <a class="product-back-link" href="index.html">متابعة تصفح المنتجات</a>
      </div>
    </div>`;

  const mainImage = document.getElementById('detailImage');
  mainImage.src = images[0];
  mainImage.onerror = () => { mainImage.onerror = null; mainImage.src = fallbackImage(item.name); };
  const thumbs = document.getElementById('detailThumbs');
  thumbs.innerHTML = images.map((src, index) => `<button class="product-thumb${index === 0 ? ' active' : ''}" type="button"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.name)} - صورة ${index + 1}"></button>`).join('');
  thumbs.querySelectorAll('.product-thumb').forEach((button, index) => {
    button.addEventListener('click', () => {
      mainImage.src = images[index];
      thumbs.querySelectorAll('.product-thumb').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
    });
  });
  document.getElementById('minus').addEventListener('click', () => updateQuantity(-1));
  document.getElementById('plus').addEventListener('click', () => updateQuantity(1));
  document.getElementById('addProduct').addEventListener('click', addToCart);
}

function updateQuantity(delta) {
  quantity = Math.max(1, quantity + delta);
  document.getElementById('quantity').textContent = quantity;
}

function addToCart() {
  const cart = loadCart();
  cart[product.id] = (cart[product.id] || 0) + quantity;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  localStorage.setItem('lamssa_open_cart', '1');
  window.location.href = 'index.html#cart';
}

async function loadProduct() {
  if (!productId || !supabaseClient) {
    detail.innerHTML = '<div class="product-detail-error">تعذر العثور على المنتج. <a href="index.html">العودة إلى المتجر</a></div>';
    return;
  }
  const { data, error } = await supabaseClient.from('products').select('*').eq('id', productId).single();
  if (error || !data) {
    detail.innerHTML = '<div class="product-detail-error">هذا المنتج غير متوفر حاليًا. <a href="index.html">العودة إلى المتجر</a></div>';
    return;
  }
  renderProduct(data);
}

loadProduct();
