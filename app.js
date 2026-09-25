/* ===== لمسة أناقة — منطق المتجر ===== */

// ===== الإعدادات =====
// ضعي رقم واتساب الخاص بك هنا بصيغة دولية بدون + (مثال: 21651234567 لتونس، 212612345678 للمغرب)
const WHATSAPP_NUMBER = '212706760806';

const CART_KEY = 'lamssa_cart_v1';
const CURRENCY = 'درهم';
const CATEGORIES = ['الكل', 'قلادات', 'أقراط', 'أساور'];
const ORDER_STORAGE_KEY = 'lamssa_last_order_v1';
// استبدلي XXXXX برابط Web App المنشور من Google Apps Script.
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxjET2rrlDETizqQx7LvHjz5AvumML94Dzoi56WT1MKrnxIPEvEv_DED8bjNQkGlEac/exec';

async function sendCartOrderToGoogleSheet(fullName, city, phone, cartItemsDetails) {
  if (GOOGLE_SHEET_URL.includes('XXXXX')) {
    throw new Error('ضع رابط Google Apps Script الحقيقي أولاً');
  }
  const payload = JSON.stringify({ fullName, address: city, phone, notes: cartItemsDetails });
  const body = new Blob([payload], { type: 'text/plain;charset=utf-8' });

  if (navigator.sendBeacon && navigator.sendBeacon(GOOGLE_SHEET_URL, body)) return;

  await fetch(GOOGLE_SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: payload,
    keepalive: true
  });
}

// ضعي بيانات مشروع Supabase هنا من Project Settings > API
const SUPABASE_URL = 'https://lbdojwaqynzyzaupgmof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZG9qd2FxeW56eXphdXBnbW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTcyMTQsImV4cCI6MjEwNTQ5MzIxNH0.jVVpPzp9T3aOZZ9k6y6Zq7WYD6XUkcYYEvgfze7vmJw';
const supabaseClient = window.supabase && SUPABASE_URL.includes('.supabase.co') && !SUPABASE_URL.includes('YOUR-')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// فيديو الخلفية: ضعي الفيديو الخاص بك في assets/bg.mp4 وسيُستعمل تلقائياً
const VIDEO_LOCAL = 'assets/bg.mp4';
const VIDEO_DESKTOP = 'https://videos.pexels.com/video-files/11353206/11353206-hd_1920_1080_25fps.mp4';
const VIDEO_MOBILE = 'https://videos.pexels.com/video-files/9667666/9667666-hd_1080_1920_25fps.mp4';

// رابط صورة منتج من Pexels
const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;

// ===== منتجات Supabase =====
let products = [];
let offers = [];
let editingOfferId = null;
let editingProductId = null;
let currentUser = null;

async function loadProducts() {
  if (!supabaseClient) return products;
  const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  products = data || [];
  return products;
}

async function loadOffers(includeExpired = false) {
  if (!supabaseClient) return offers;
  let query = supabaseClient.from('offers').select('*').order('expires_at', { ascending: true });
  if (!includeExpired) query = query.eq('active', true).gt('expires_at', new Date().toISOString());
  const { data, error } = await query;
  if (error) throw error;
  offers = data || [];
  return offers;
}

function getActiveOffer() {
  const now = new Date();
  return offers.find(offer => offer.active && new Date(offer.starts_at || offer.created_at) <= now && new Date(offer.expires_at) > now);
}

function updateOfferBanner() {
  return getActiveOffer();
}

function getProducts() { return products; }

function getProductPrice(product) {
  return Number(product.new_price ?? product.price ?? 0);
}

function getProductImages(product) {
  if (!product) return [];
  let list = [];
  if (product.images) {
    try { const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images; if (Array.isArray(parsed)) list = parsed.filter(Boolean); } catch (e) {}
  }
  if (!list.length && product.image) list = [product.image];
  return list;
}

function firstProductImage(product) {
  return getProductImages(product)[0] || fallbackImage(product.name);
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

// معرّف عشوائي
function cryptoRandomId() {
  try {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  } catch (e) { return Math.random().toString(36).slice(2, 10); }
}

// حماية من إدخال HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function addImageFileInput() {
  const urlInput = document.getElementById('image');
  if (!urlInput || document.getElementById('imageFile')) return;
  const label = document.createElement('label');
  label.textContent = 'رفع صورة من الجهاز (اختياري)';
  const fileInput = document.createElement('input');
  fileInput.id = 'imageFile';
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/webp';
  label.appendChild(fileInput);
  urlInput.closest('label')?.before(label);
}

function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (file.size > 5 * 1024 * 1024) return reject(new Error('حجم الصورة يجب أن يكون أقل من 5 ميغابايت'));
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => reject(new Error('تعذر قراءة الصورة'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

// صورة بديلة أنيقة عند غياب الرابط
function fallbackImage(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4af6a"/><stop offset="1" stop-color="#9e3f52"/></linearGradient></defs><rect width="600" height="600" fill="#2b1f25"/><text x="300" y="290" font-size="90" text-anchor="middle" fill="url(#g)">&#10022;</text><text x="300" y="380" font-size="30" text-anchor="middle" fill="#f3e2ce" font-family="Tajawal, sans-serif">${escapeHtml(label)}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ===== فيديو الخلفية =====
let videoMode = null; // 'local' أو 'remote'
function pickVideo() {
  return (window.innerHeight > window.innerWidth) ? VIDEO_MOBILE : VIDEO_DESKTOP;
}
function applyRemoteVideo() {
  const video = document.getElementById('bg-video');
  const src = pickVideo();
  if (videoMode === 'remote' && video.src.includes(src)) return;
  video.src = src;
  videoMode = 'remote';
  video.play().catch(() => {});
}
function initVideo() {
  const video = document.getElementById('bg-video');
  // حاول استعمال الفيديو المحلي أولاً
  fetch(VIDEO_LOCAL, { method: 'HEAD', cache: 'no-store' })
    .then(r => {
      if (r.ok) { video.src = VIDEO_LOCAL; videoMode = 'local'; video.play().catch(() => {}); }
      else applyRemoteVideo();
    })
    .catch(() => applyRemoteVideo());
  // عند تدوير الجهاز بدّل بين الفيديو العمودي والأفقي
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { if (videoMode !== 'local') applyRemoteVideo(); }, 350);
  });
}

// ===== عرض المنتجات =====
let currentFilter = 'الكل';

function renderFilters() {
  const box = document.getElementById('filters');
  box.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (cat === currentFilter ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      currentFilter = cat;
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts();
    });
    box.appendChild(btn);
  });
}

function renderProducts() {
  const container = document.getElementById('products');
  container.innerHTML = '';
  const visibleProducts = getProducts().filter(p => currentFilter === 'الكل' || (p.category || 'أخرى') === currentFilter);

  if (visibleProducts.length === 0) {
    container.innerHTML = '<div class="empty-state">لا توجد منتجات هنا بعد — أضف أول منتج ليظهر أمام عملائنا <span style="color:var(--gold)">✦</span></div>';
    return;
  }

  visibleProducts.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${escapeHtml(firstProductImage(p))}" alt="${escapeHtml(p.name)}" loading="lazy">
        <span class="badge">${escapeHtml(p.category || 'أخرى')}</span>
        <span class="stock-badge ${p.stock_status === 'low_stock' ? 'low' : ''}">${p.stock_status === 'low_stock' ? 'كمية محدودة' : 'متوفر'}</span>
        ${currentUser ? `<button class="card-del" title="حذف المنتج" aria-label="حذف المنتج" onclick="removeProduct('${p.id}')">حذف</button>` : ''}
      </div>
      <div class="card-body">
        <h4>${escapeHtml(p.name)}</h4>
        <p class="desc">${escapeHtml(p.description || '')}</p>
        <div class="card-foot">
          <div class="price">${getProductPrice(p).toFixed(2)} ${CURRENCY}</div>
          ${p.original_price != null && Number(p.original_price) > getProductPrice(p) ? `<div class="old-price">${Number(p.original_price).toFixed(2)} ${CURRENCY}</div>` : ''}
          <button class="btn btn-grad btn-sm" onclick="addToCart('${p.id}', 1)">شراء الآن</button>
        </div>
      </div>`;
    // استبدال الصورة البديلة في حال فشل تحميل الصورة
    const img = card.querySelector('img');
    if (!img.src) img.src = fallbackImage(p.name);
    img.onerror = () => { img.onerror = null; img.src = fallbackImage(p.name); };
    card.addEventListener('click', event => {
      if (event.target.closest('button')) return;
      window.location.href = 'product.html?id=' + encodeURIComponent(p.id);
    });
    container.appendChild(card);
  });
}

// ===== تفاصيل المنتج =====
let currentProductId = null;
let currentQty = 1;

function viewProduct(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return toast('المنتج غير موجود');
  currentProductId = id;
  currentQty = 1;
  const images = getProductImages(p);
  const img = document.getElementById('pmImage');
  img.src = images[0] || fallbackImage(p.name);
  img.onerror = () => { img.onerror = null; img.src = fallbackImage(p.name); };
  renderProductGallery(images);
  document.getElementById('pmCategory').textContent = p.category || 'أخرى';
  document.getElementById('pmName').textContent = p.name;
  document.getElementById('pmDesc').textContent = p.description || '';
  const stock = document.getElementById('pmStock');
  if (stock) {
    stock.textContent = p.stock_status === 'low_stock' ? 'الكمية محدودة' : 'متوفر حالياً';
    stock.className = 'pm-stock' + (p.stock_status === 'low_stock' ? ' low' : '');
  }
  document.getElementById('pmPrice').textContent = getProductPrice(p).toFixed(2) + ' ' + CURRENCY;
  document.getElementById('pmOldPrice').textContent = p.original_price != null && Number(p.original_price) > getProductPrice(p)
    ? Number(p.original_price).toFixed(2) + ' ' + CURRENCY : '';
  document.getElementById('pmQty').textContent = '1';
  openModal('productModal');
}

function renderProductGallery(images) {
  const container = document.getElementById('pmThumbs');
  if (!container) return;
  if (!images || images.length < 2) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = images.map((src, index) =>
    `<button class="pm-thumb${index === 0 ? ' active' : ''}" type="button" data-src="${escapeHtml(src)}" aria-label="صورة المنتج ${index + 1}"><img src="${escapeHtml(src)}" alt=""></button>`
  ).join('');
  container.querySelectorAll('.pm-thumb').forEach(button => {
    const thumbImg = button.querySelector('img');
    thumbImg.onerror = () => { thumbImg.onerror = null; thumbImg.src = fallbackImage(''); };
    button.addEventListener('click', () => {
      container.querySelectorAll('.pm-thumb').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      const main = document.getElementById('pmImage');
      main.src = button.dataset.src;
      main.onerror = null;
    });
  });
}

function updateQty(delta) {
  currentQty = Math.max(1, currentQty + delta);
  document.getElementById('pmQty').textContent = currentQty;
}

// ===== فتح وإغلاق السلة =====
function openDrawer() {
  updateCartUI();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartBackdrop').classList.remove('hidden');
}
function closeDrawer() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartBackdrop').classList.add('hidden');
}

function showCheckoutStep() {
  document.getElementById('showCheckout')?.classList.add('hidden');
  document.getElementById('checkoutFields')?.classList.remove('hidden');
  document.getElementById('checkoutBtn')?.classList.remove('hidden');
}

// ===== سلة التسوق =====
function addToCart(id, qty) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;
  const cart = loadCart();
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
  updateCartUI();
  openDrawer();
  toast('تمت الإضافة إلى السلة — ' + p.name);
}

function removeFromCart(id) {
  const cart = loadCart();
  delete cart[id];
  saveCart(cart);
  updateCartUI();
}

function changeQty(id, delta) {
  const cart = loadCart();
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
  if (cart[id] === 0) delete cart[id];
  saveCart(cart);
  updateCartUI();
}

function clearCart() {
  if (!Object.keys(loadCart()).length) return;
  if (!confirm('هل تريد إفراغ السلة؟')) return;
  saveCart({});
  updateCartUI();
  toast('تم إفراغ السلة');
}

function updateCartUI() {
  const cart = loadCart();
  const ids = Object.keys(cart).filter(id => cart[id] > 0 && getProducts().some(p => p.id === id));
  const box = document.getElementById('cartItems');
  const count = ids.reduce((s, id) => s + cart[id], 0);
  document.getElementById('cartCount').textContent = count;

  if (!ids.length) {
    box.innerHTML = '<div class="cart-empty"><span class="big">✦</span>سلتك فارغة حالياً — أضف منتجاً للبدء.</div>';
    document.getElementById('cartTotal').textContent = '0.00 ' + CURRENCY;
    document.getElementById('cartNextActions')?.classList.add('hidden');
    document.getElementById('checkoutFields')?.classList.add('hidden');
    document.getElementById('checkoutBtn').classList.add('hidden');
    document.getElementById('checkoutBtn').disabled = true;
    return;
  }

  document.getElementById('cartNextActions')?.classList.remove('hidden');
  document.getElementById('checkoutFields')?.classList.remove('hidden');
  document.getElementById('checkoutBtn').disabled = false;
  document.getElementById('checkoutBtn').classList.remove('hidden');

  let total = 0;
  box.innerHTML = '';
  ids.forEach(id => {
    const p = getProducts().find(x => x.id === id);
    total += getProductPrice(p) * cart[id];
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${escapeHtml(firstProductImage(p))}" alt="${escapeHtml(p.name)}">
      <div class="cart-item-info">
        <h5>${escapeHtml(p.name)}</h5>
        <div class="price">${getProductPrice(p).toFixed(2)} ${CURRENCY}</div>
        <div class="mini-qty">
          <button onclick="changeQty('${id}', -1)">−</button>
          <span>${cart[id]}</span>
          <button onclick="changeQty('${id}', 1)">+</button>
        </div>
      </div>
      <button class="rm" title="حذف المنتج من السلة" onclick="removeFromCart('${id}')">حذف</button>`;
    row.querySelector('img').onerror = function () { this.onerror = null; this.src = fallbackImage(p.name); };
    box.appendChild(row);
  });
  document.getElementById('cartTotal').textContent = total.toFixed(2) + ' ' + CURRENCY;
}

// إرسال الطلب إلى Google Sheets
async function checkout() {
  const cart = loadCart();
  const ids = Object.keys(cart).filter(id => cart[id] > 0 && getProducts().some(p => p.id === id));
  if (!ids.length) return toast('سلتك فارغة');

  // بيانات العميل
  const name = document.getElementById('custName').value.trim();
  const city = document.getElementById('custCity').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  if (!name) { toast('يرجى إدخال الاسم الكامل'); document.getElementById('custName').focus(); return; }
  if (!city) { toast('يرجى إدخال المدينة'); document.getElementById('custCity').focus(); return; }
  if (!phone) { toast('يرجى إدخال رقم الهاتف'); document.getElementById('custPhone').focus(); return; }
  if (!/^\d{9,15}$/.test(phone)) { toast('رقم الهاتف يجب أن يحتوي على أرقام فقط، من 9 إلى 15 رقمًا'); document.getElementById('custPhone').focus(); return; }

  const lines = ids.map(id => {
    const p = getProducts().find(x => x.id === id);
    return '• ' + p.name + ' — ' + getProductPrice(p).toFixed(2) + ' ' + CURRENCY + ' (×' + cart[id] + ')';
  });
  const total = ids.reduce((s, id) => {
    const p = getProducts().find(x => x.id === id);
    return s + getProductPrice(p) * cart[id];
  }, 0);
  const button = document.getElementById('checkoutBtn');
  button.disabled = true;
  button.textContent = 'جاري إرسال الطلب...';
  try {
    const cartItemsDetails = lines.join('\n') + '\nالمجموع: ' + total.toFixed(2) + ' ' + CURRENCY;
    await sendCartOrderToGoogleSheet(name, city, phone, cartItemsDetails);
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({
      customer: { name, city, phone },
      items: ids.map(id => {
        const product = getProducts().find(item => item.id === id);
        return { name: product.name, image: product.image || '', price: getProductPrice(product), quantity: cart[id] };
      }),
      total: total.toFixed(2) + ' ' + CURRENCY,
      createdAt: new Date().toISOString()
    }));
    saveCart({});
    window.location.href = 'thank-you.html';
  } catch (error) {
    toast('تعذر إرسال الطلب. حاول مرة أخرى');
  } finally {
    button.disabled = false;
    button.textContent = 'تأكيد الطلب';
  }
}

// تواصل مباشر عبر واتساب
function openWhatsApp() {
  const msg = 'مرحباً، أريد الاستفسار عن منتجاتكم ✦';
  window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
}

function initConversionElements() {
  const main = document.querySelector('main');
  const collection = document.getElementById('collection');
  if (!main || !collection) return;

  document.querySelector('.features')?.remove();

  const productTrust = document.createElement('div');
  productTrust.className = 'product-trust';
  productTrust.innerHTML = '<span>توصيل مجاني 100%</span><span>فتح العبوة قبل الدفع</span><span>ضمان الجودة</span><span>24-48 ساعة</span>';
  document.querySelector('.pm-body')?.appendChild(productTrust);
  const productStock = document.createElement('span');
  productStock.id = 'pmStock';
  productStock.className = 'pm-stock';
  document.querySelector('.pm-body')?.insertBefore(productStock, productTrust);

  const reviews = document.createElement('section');
  const whyUs = document.createElement('section');
  whyUs.className = 'why-us container';
  whyUs.innerHTML = '<div class="why-heading"><p class="section-overline">تجربة تستحق الثقة</p><h2 class="section-title">لماذا تشتري من <span>لمسة أناقة؟</span></h2><p>نختار كل قطعة بعناية لتصل إليك بجودة تليق بك وتجربة شراء واضحة ومريحة.</p></div><div class="why-grid"><article class="why-card"><span class="why-icon">◇</span><div><h3>جودة مختارة بعناية</h3><p>منتجات نراجعها قبل عرضها.</p></div></article><article class="why-card"><span class="why-icon">⌁</span><div><h3>توصيل مجاني</h3><p>إلى جميع مدن المغرب.</p></div></article><article class="why-card"><span class="why-icon">◌</span><div><h3>حق المعاينة</h3><p>افحص طلبك قبل الدفع.</p></div></article><article class="why-card"><span class="why-icon">▣</span><div><h3>علبة فاخرة</h3><p>مع كل منتج تختاره.</p></div></article></div>';
  main.appendChild(whyUs);
  reviews.className = 'reviews container';
  reviews.innerHTML = '<div class="section-head"><h2 class="section-title">آراء <span>عملائنا</span></h2><span class="rating-summary">★★★★★ 5.0</span></div><div class="review-grid"><article class="review"><div class="stars">★★★★★</div><h3>Sanae <small>الدار البيضاء</small></h3><p>بصراحة المنتج وصل كيفما بان فالتصويرة، الجودة زوينة بزاف والتوصيل كان سريع، غير جوج أيام... شكراً!</p></article><article class="review"><div class="stars">★★★★★</div><h3>Imane <small>الرباط</small></h3><p>عجبني التعامل بزاف، المنتج ممتاز ومغلف مزيان. والأحسن التوصيل مجاني وقدرت نشوفو قبل ما نخلص.</p></article><article class="review"><div class="stars">★★★★★</div><h3>Maryam <small>مراكش</small></h3><p>كنت خايفة شوية حيث أول مرة نشري من الموقع، ولكن الخدمة احترافية والجودة ممتازة. غادي نعاود نطلب أكيد.</p></article><article class="review"><div class="stars">★★★★★</div><h3>Fatima-Zahra <small>فاس</small></h3><p>المنتج وصل كيفما توصف بالضبط. شكراً للبنت اللي عيطات ليا، كانت زوينة فالتعامل وجاوبات بسرعة.</p></article><article class="review"><div class="stars">★★★★★</div><h3>Zineb <small>طنجة</small></h3><p>التوصيل سريع، توصلت بالمنتج فـ 24 ساعة. الجودة زوينة ويستاهل كل درهم.</p></article></div>';
  main.appendChild(reviews);

  const addressField = document.getElementById('custAddress');
  if (addressField) addressField.closest('label')?.classList.add('hidden');
  const quickNote = document.createElement('p');
  quickNote.className = 'quick-checkout-note';
  quickNote.textContent = 'إتمام سريع: الاسم، الهاتف والمدينة فقط';
  document.querySelector('.checkout-fields')?.prepend(quickNote);

}

// ===== إدارة المنتجات =====
async function removeProduct(id) {
  if (!currentUser || !supabaseClient) return toast('يجب تسجيل الدخول كأدمن أولاً');
  if (!confirm('هل تريد حذف هذا المنتج؟')) return;
  const { error } = await supabaseClient.from('products').delete().eq('id', id);
  if (error) return toast('تعذر حذف المنتج: ' + error.message);
  products = products.filter(x => x.id !== id);
  const cart = loadCart();
  delete cart[id];
  saveCart(cart);
  closeModal('productModal');
  renderProducts();
  updateCartUI();
  renderAdminProducts();
  toast('تم حذف المنتج');
}

// ===== إشعارات =====
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

// ===== نوافذ =====
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function showAdminState() {
  const loggedIn = Boolean(currentUser && currentUser.user_metadata?.is_admin === true);
  document.getElementById('adminLogin').classList.toggle('hidden', loggedIn);
  document.getElementById('adminPanel').classList.toggle('hidden', !loggedIn);
  document.getElementById('logoutBtn').classList.toggle('hidden', !loggedIn);
  document.getElementById('pmDelete').classList.toggle('hidden', !loggedIn);
  if (loggedIn) renderAdminProducts();
}

function setupAdminFeatures() {
  const productForm = document.getElementById('productForm');
  const productCategory = document.getElementById('category');
  if (productForm && productCategory && !document.getElementById('stockStatus')) {
    const fields = document.createElement('div');
    fields.className = 'admin-extra-fields';
    fields.innerHTML = '<label>حالة المخزون<select id="stockStatus"><option value="in_stock">متوفر</option><option value="low_stock">كمية محدودة</option></select></label>';
    productCategory.closest('label').after(fields);
  }

  const panel = document.getElementById('adminPanel');
  if (!panel || document.getElementById('adminProductTools')) return;
  const productTools = document.createElement('div');
  productTools.id = 'adminProductTools';
  productTools.className = 'admin-product-tools';
  productTools.innerHTML = '<div><h3>إدارة المنتجات</h3><p>انشري أو عدّلي حالة المنتج من هنا.</p></div><button id="adminAddProduct" class="btn btn-grad btn-sm" type="button">إضافة منتج</button>';
  panel.insertBefore(productTools, panel.firstChild);
  document.getElementById('adminAddProduct').addEventListener('click', () => { resetProductForm(); openModal('modal'); });
}

function resetProductForm() {
  editingProductId = null;
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('extraImages') && (document.getElementById('extraImages').value = '');
  document.getElementById('extraImageFiles') && (document.getElementById('extraImageFiles').value = '');
  document.querySelector('#modal .modal-title').textContent = 'إضافة منتج';
  form.querySelector('button[type="submit"]').textContent = 'نشر المنتج';
}

function editProduct(id) {
  const product = getProducts().find(item => item.id === id);
  if (!product) return;
  editingProductId = id;
  document.getElementById('name').value = product.name || '';
  document.getElementById('category').value = product.category || 'قلادات';
  document.getElementById('description').value = product.description || '';
  document.getElementById('originalPrice').value = product.original_price ?? product.price ?? '';
  document.getElementById('newPrice').value = product.new_price ?? product.price ?? '';
  document.getElementById('image').value = product.image || '';
  const allImages = getProductImages(product);
  document.getElementById('extraImages').value = allImages.slice(1).join('\n');
  document.getElementById('stockStatus').value = product.stock_status || 'in_stock';
  document.querySelector('#modal .modal-title').textContent = 'تعديل المنتج';
  document.querySelector('#productForm button[type="submit"]').textContent = 'حفظ التعديل';
  openModal('modal');
}

function renderOffers() {
  const list = document.getElementById('offersList');
  if (!list) return;
  list.innerHTML = offers.map(offer => {
    const now = new Date();
    const status = !offer.active ? 'متوقف' : new Date(offer.expires_at) <= now ? 'منتهي' : 'نشط';
    const statusClass = status === 'نشط' ? 'active' : status === 'منتهي' ? 'expired' : 'paused';
    return `<div class="offer-row"><div class="offer-row-info"><div class="offer-row-title"><strong>${escapeHtml(offer.title)}</strong><span class="offer-status ${statusClass}">${status}</span></div><small>${escapeHtml(offer.discount || 'بدون خصم محدد')} · من ${new Date(offer.starts_at || offer.created_at).toLocaleString()} إلى ${new Date(offer.expires_at).toLocaleString()}</small><p>${escapeHtml(offer.description || 'لا يوجد وصف')}</p></div><div class="offer-row-actions"><button class="btn btn-outline btn-sm" onclick="editOffer('${offer.id}')">تعديل</button><button class="btn btn-outline btn-sm" onclick="toggleOffer('${offer.id}', ${!offer.active})">${offer.active ? 'إيقاف' : 'تفعيل'}</button><button class="btn btn-danger btn-sm" onclick="removeOffer('${offer.id}')">حذف</button></div></div>`;
  }).join('') || '<p class="admin-empty">لا توجد عروض محفوظة.</p>';
}

async function saveOffer(event) {
  event.preventDefault();
  if (!currentUser || !supabaseClient) return toast('يجب تسجيل الدخول كأدمن أولاً');
  const title = document.getElementById('offerTitle').value.trim();
  const discount = document.getElementById('offerDiscount').value.trim();
  const description = document.getElementById('offerDescription').value.trim();
  const startsAt = document.getElementById('offerStarts').value;
  const expiresAt = document.getElementById('offerExpires').value;
  if (!title || !discount || !startsAt || !expiresAt || new Date(expiresAt) <= new Date(startsAt)) return toast('تحقق من العنوان والخصم وتواريخ العرض');
  const payload = { title, discount, description, starts_at: new Date(startsAt).toISOString(), expires_at: new Date(expiresAt).toISOString() };
  const query = editingOfferId
    ? supabaseClient.from('offers').update(payload).eq('id', editingOfferId)
    : supabaseClient.from('offers').insert({ ...payload, active: true });
  const { error } = await query;
  if (error) return toast('تعذر حفظ العرض: ' + error.message);
  resetOfferForm();
  await loadOffers(true);
  renderOffers();
  updateOfferBanner();
  toast('تم نشر العرض');
}

function editOffer(id) {
  const offer = offers.find(item => item.id === id);
  if (!offer) return;
  editingOfferId = id;
  document.getElementById('offerTitle').value = offer.title;
  document.getElementById('offerDiscount').value = offer.discount || '';
  document.getElementById('offerDescription').value = offer.description || '';
  document.getElementById('offerStarts').value = toDateTimeLocal(offer.starts_at || offer.created_at);
  document.getElementById('offerExpires').value = toDateTimeLocal(offer.expires_at);
  document.getElementById('offerSubmit').textContent = 'حفظ التعديل';
  document.getElementById('offerCancel').classList.remove('hidden');
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function resetOfferForm() {
  editingOfferId = null;
  document.getElementById('offerForm')?.reset();
  document.getElementById('offerSubmit').textContent = 'نشر العرض';
  document.getElementById('offerCancel').classList.add('hidden');
}

async function toggleOffer(id, active) {
  if (!currentUser || !supabaseClient) return toast('يجب تسجيل الدخول كأدمن أولاً');
  const { error } = await supabaseClient.from('offers').update({ active }).eq('id', id);
  if (error) return toast('تعذر تحديث حالة العرض: ' + error.message);
  const offer = offers.find(item => item.id === id);
  if (offer) offer.active = active;
  renderOffers();
  toast(active ? 'تم تفعيل العرض' : 'تم إيقاف العرض');
}

async function removeOffer(id) {
  if (!currentUser || !supabaseClient) return toast('يجب تسجيل الدخول كأدمن أولاً');
  const { error } = await supabaseClient.from('offers').delete().eq('id', id);
  if (error) return toast('تعذر حذف العرض: ' + error.message);
  offers = offers.filter(offer => offer.id !== id);
  renderOffers();
  updateOfferBanner();
  toast('تم حذف العرض');
}

function renderAdminProducts() {
  const list = document.getElementById('adminProducts');
  if (!list) return;
  list.innerHTML = getProducts().map(p => `
    <div class="admin-product-row">
      <div><strong>${escapeHtml(p.name)}</strong><small>${p.is_offer ? 'عرض' + (p.offer_discount ? ' · ' + escapeHtml(p.offer_discount) : '') : 'بدون عرض'} · ${p.stock_status === 'low_stock' ? 'كمية محدودة' : 'متوفر'}</small></div>
      <div class="admin-row-actions"><button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">تعديل</button><button class="btn btn-danger btn-sm" onclick="removeProduct('${p.id}')">حذف</button></div>
    </div>`).join('') || '<p class="admin-empty">لا توجد منتجات. أضف أول منتج الآن.</p>';
}

async function refreshProducts() {
  try {
    await loadProducts();
    renderProducts();
    updateCartUI();
    renderAdminProducts();
    await loadOffers(Boolean(currentUser));
    updateOfferBanner();
    renderOffers();
  } catch (error) {
    document.getElementById('products').innerHTML = '<div class="empty-state">تعذر الاتصال بقاعدة المنتجات. تحقق من إعدادات Supabase.</div>';
    toast(error.message || 'تعذر تحميل المنتجات');
  }
}

// ===== تشغيل الموقع =====
document.addEventListener('DOMContentLoaded', () => {
  const adminNote = document.querySelector('.admin-note');
  if (adminNote) adminNote.textContent = 'استخدم بريدك الإلكتروني وكلمة المرور.';
  addImageFileInput();
  initVideo();
  initConversionElements();
  setupAdminFeatures();
  document.getElementById('checkoutBtn').textContent = 'تأكيد الطلب';
  renderFilters();
  refreshProducts();
  updateCartUI();
  showAdminState();

  if (localStorage.getItem('lamssa_open_cart') === '1') {
    localStorage.removeItem('lamssa_open_cart');
    openDrawer();
  }

  // رقم الهاتف في قسم معلومات الاتصال
  const phoneEl = document.getElementById('contactPhone');
  if (phoneEl) {
    phoneEl.textContent = '+' + WHATSAPP_NUMBER.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
  }
  const phoneInput = document.getElementById('custPhone');
  phoneInput?.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 15);
  });

  // فتح/إغلاق نوافذ
  document.getElementById('closeModal').addEventListener('click', () => closeModal('modal'));
  document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal('modal'); });

  document.getElementById('closeProduct').addEventListener('click', () => closeModal('productModal'));
  document.getElementById('productModal').addEventListener('click', e => { if (e.target.id === 'productModal') closeModal('productModal'); });

  // سلة التسوق
  const backdrop = document.getElementById('cartBackdrop');
  document.getElementById('cartBtn').addEventListener('click', openDrawer);
  document.getElementById('closeCart').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  const continueShopping = document.getElementById('continueShopping');
  if (continueShopping) {
    continueShopping.addEventListener('click', () => {
      closeDrawer();
      document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
    });
  }
  document.getElementById('showCheckout')?.addEventListener('click', showCheckoutStep);
  document.getElementById('clearCart').addEventListener('click', clearCart);
  document.getElementById('checkoutBtn').addEventListener('click', checkout);

  // كمية في نافذة المنتج
  document.getElementById('qtyMinus').addEventListener('click', () => updateQty(-1));
  document.getElementById('qtyPlus').addEventListener('click', () => updateQty(1));
  document.getElementById('pmAdd').addEventListener('click', () => {
    if (!currentProductId) return;
    addToCart(currentProductId, currentQty);
    closeModal('productModal');
  });
  document.getElementById('pmDelete').addEventListener('click', () => {
    if (currentProductId) removeProduct(currentProductId);
  });

  // نموذج إضافة منتج
  document.getElementById('productForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser || !supabaseClient) return toast('يجب تسجيل الدخول كأدمن أولاً');
    const name = document.getElementById('name').value.trim();
    const originalPrice = parseFloat(document.getElementById('originalPrice').value);
    const newPrice = parseFloat(document.getElementById('newPrice').value);
    const category = document.getElementById('category').value;
    let image = document.getElementById('image').value.trim();
    const extraImages = [];
    try {
      const selectedFile = document.getElementById('imageFile')?.files[0];
      if (selectedFile) image = await imageFileToDataUrl(selectedFile);
      const extraFiles = Array.from(document.getElementById('extraImageFiles')?.files || []);
      for (const file of extraFiles) extraImages.push(await imageFileToDataUrl(file));
    } catch (error) {
      return toast(error.message);
    }
    const extraUrls = (document.getElementById('extraImages')?.value || '').split('\n').map(line => line.trim()).filter(Boolean);
    const allImages = [image, ...extraUrls, ...extraImages].filter(Boolean);
    const description = document.getElementById('description').value.trim();
    const stockStatus = document.getElementById('stockStatus').value;
    if (!name || !Number.isFinite(originalPrice) || !Number.isFinite(newPrice) || newPrice < 0 || originalPrice < 0) {
      return toast('يرجى إدخال اسم وأسعار صحيحة للمنتج');
    }
    if (newPrice > originalPrice) return toast('السعر الجديد لا يمكن أن يتجاوز السعر الأصلي');
    const productPayload = {
      name, category, image: allImages[0] || image, images: JSON.stringify(allImages), description, original_price: originalPrice, new_price: newPrice,
      stock_status: stockStatus
    };
    const isEditingProduct = Boolean(editingProductId);
    const query = isEditingProduct
      ? supabaseClient.from('products').update(productPayload).eq('id', editingProductId).select().single()
      : supabaseClient.from('products').insert(productPayload).select().single();
    const { data, error } = await query;
    if (error) return toast('تعذر حفظ المنتج: ' + error.message);
    if (isEditingProduct) {
      products = products.map(product => product.id === editingProductId ? data : product);
    } else {
      products.unshift(data);
    }
    renderProducts();
    renderAdminProducts();
    resetProductForm();
    closeModal('modal');
    toast(isEditingProduct ? 'تم تعديل المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
  });

  document.getElementById('adminLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!supabaseClient) return toast('أضف بيانات Supabase داخل app.js أولاً');
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return toast('بيانات الدخول غير صحيحة');
    if (data.user.user_metadata?.is_admin !== true) {
      await supabaseClient.auth.signOut();
      return toast('هذا الحساب لا يملك صلاحيات الأدمن');
    }
    currentUser = data.user;
    showAdminState();
    closeModal('adminModal');
    toast('تم تسجيل الدخول بنجاح');
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient?.auth.signOut();
    currentUser = null;
    showAdminState();
    closeModal('adminModal');
    toast('تم تسجيل الخروج');
  });

  if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
      currentUser = data.session?.user || null;
      showAdminState();
      if (currentUser) loadOffers(true).then(renderOffers);
    });
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      showAdminState();
      if (currentUser) loadOffers(true).then(renderOffers);
    });
  }

});
