const SUPABASE_URL = 'https://lbdojwaqynzyzaupgmof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZG9qd2FxeW56eXphdXBnbW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTcyMTQsImV4cCI6MjEwNTQ5MzIxNH0.jVVpPzp9T3aOZZ9k6y6Zq7WYD6XUkcYYEvgfze7vmJw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let products = [];
let offers = [];
let editingProductId = null;
let editingOfferId = null;
let adminPageReady = false;

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
function addImageFileInput() {
  const urlInput = $('imagePage');
  if (!urlInput || $('imageFilePage')) return;
  const label = document.createElement('label');
  label.textContent = 'رفع صورة من الجهاز (اختياري)';
  const fileInput = document.createElement('input');
  fileInput.id = 'imageFilePage';
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
const toDateTimeLocal = value => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function toast(message) {
  const element = $('adminToastPage');
  element.textContent = message;
  element.classList.remove('hidden');
  clearTimeout(window.adminToastTimer);
  window.adminToastTimer = setTimeout(() => element.classList.add('hidden'), 2800);
}

function setAuthenticated(user) {
  const isAdmin = adminPageReady && Boolean(user && user.user_metadata?.is_admin === true);
  $('adminLoginPage').classList.toggle('hidden', isAdmin);
  $('adminWorkspace').classList.toggle('hidden', !isAdmin);
  $('logoutBtn').classList.toggle('hidden', !isAdmin);
  if (isAdmin) loadAdminData();
}

async function handleAdminLogin(event) {
  event.preventDefault();
  $('adminLoginErrorPage').textContent = '';
  const email = $('adminEmailPage').value.trim();
  const password = $('adminPasswordPage').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    $('adminLoginErrorPage').textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    return;
  }
  if (data.user.user_metadata?.is_admin !== true) {
    await supabaseClient.auth.signOut();
    $('adminLoginErrorPage').textContent = 'هذا الحساب لا يملك صلاحيات الإدارة.';
    return;
  }
  $('adminLoginFormPage').reset();
  setAuthenticated(data.user);
}

async function loadAdminData() {
  const [productsResult, offersResult] = await Promise.all([
    supabaseClient.from('products').select('*').order('created_at', { ascending: false }),
    supabaseClient.from('offers').select('*').order('expires_at', { ascending: true })
  ]);
  if (productsResult.error) return toast('تعذر تحميل المنتجات: ' + productsResult.error.message);
  if (offersResult.error) return toast('تعذر تحميل العروض: ' + offersResult.error.message);
  products = productsResult.data || [];
  offers = offersResult.data || [];
  renderProducts();
  renderOffers();
}

function renderProducts() {
  $('productCount').textContent = products.length + ' منتج';
  $('adminStatProducts').textContent = products.length;
  $('adminProductsPage').innerHTML = products.map(product => `<div class="admin-product-row"><div><strong>${escapeHtml(product.name)}</strong><small>${product.is_offer ? 'عرض' + (product.offer_discount ? ' · ' + escapeHtml(product.offer_discount) : '') : 'بدون عرض'} · ${product.stock_status === 'low_stock' ? 'كمية محدودة' : 'متوفر'}</small></div><div class="admin-row-actions"><button class="btn btn-outline btn-sm" onclick="editProduct('${product.id}')">تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">حذف</button></div></div>`).join('') || '<p class="admin-empty">لا توجد منتجات بعد.</p>';
}

function renderOffers() {
  $('adminStatOffers').textContent = offers.length;
  $('offersListPage').innerHTML = offers.map(offer => {
    const now = new Date();
    const status = !offer.active ? 'متوقف' : new Date(offer.expires_at) <= now ? 'منتهي' : 'نشط';
    const statusClass = status === 'نشط' ? 'active' : status === 'منتهي' ? 'expired' : 'paused';
    return `<div class="offer-row"><div class="offer-row-info"><div class="offer-row-title"><strong>${escapeHtml(offer.title)}</strong><span class="offer-status ${statusClass}">${status}</span></div><small>${escapeHtml(offer.discount || 'بدون خصم')} · من ${new Date(offer.starts_at || offer.created_at).toLocaleString()} إلى ${new Date(offer.expires_at).toLocaleString()}</small><p>${escapeHtml(offer.description || 'لا يوجد وصف')}</p></div><div class="offer-row-actions"><button class="btn btn-outline btn-sm" onclick="editOffer('${offer.id}')">تعديل</button><button class="btn btn-outline btn-sm" onclick="toggleOffer('${offer.id}', ${!offer.active})">${offer.active ? 'إيقاف' : 'تفعيل'}</button><button class="btn btn-danger btn-sm" onclick="deleteOffer('${offer.id}')">حذف</button></div></div>`;
  }).join('') || '<p class="admin-empty">لا توجد عروض محفوظة.</p>';
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

function resetProductForm() {
  editingProductId = null;
  $('productFormPage').reset();
  $('extraImagesPage') && ($('extraImagesPage').value = '');
  $('extraImageFilesPage') && ($('extraImageFilesPage').value = '');
  $('productModalTitlePage').textContent = 'إضافة منتج';
  $('productSubmitPage').textContent = 'نشر المنتج';
  $('productOfferFieldsPage').classList.add('hidden');
}

function editProduct(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  editingProductId = id;
  $('namePage').value = product.name || '';
  $('categoryPage').value = product.category || 'قلادات';
  $('descriptionPage').value = product.description || '';
  $('originalPricePage').value = product.original_price ?? product.price ?? '';
  $('newPricePage').value = product.new_price ?? product.price ?? '';
  $('imagePage').value = product.image || '';
  const allImages = getProductImages(product);
  $('extraImagesPage').value = allImages.slice(1).join('\n');
  $('stockStatusPage').value = product.stock_status || 'in_stock';
  $('productIsOfferPage').checked = Boolean(product.is_offer);
  $('productOfferDiscountPage').value = product.offer_discount || '';
  $('productOfferExpiresPage').value = product.offer_expires_at ? toDateTimeLocal(product.offer_expires_at) : '';
  $('productOfferFieldsPage').classList.toggle('hidden', !product.is_offer);
  $('productModalTitlePage').textContent = 'تعديل المنتج';
  $('productSubmitPage').textContent = 'حفظ التعديل';
  $('productModalPage').classList.remove('hidden');
}

async function saveProduct(event) {
  event.preventDefault();
  const isOffer = $('productIsOfferPage').checked;
  const originalPrice = Number($('originalPricePage').value);
  const newPrice = Number($('newPricePage').value);
  const offerExpires = $('productOfferExpiresPage').value;
  if (!Number.isFinite(originalPrice) || !Number.isFinite(newPrice) || newPrice > originalPrice) return toast('تحقق من الأسعار المدخلة');
  if (isOffer && (!$('productOfferDiscountPage').value.trim() || !offerExpires || new Date(offerExpires) <= new Date())) return toast('أكملي قيمة وتاريخ انتهاء العرض');
  let image = $('imagePage').value.trim();
  const extraImages = [];
  try {
    const selectedFile = $('imageFilePage')?.files[0];
    if (selectedFile) image = await imageFileToDataUrl(selectedFile);
    const extraFiles = Array.from($('extraImageFilesPage')?.files || []);
    for (const file of extraFiles) extraImages.push(await imageFileToDataUrl(file));
  } catch (error) {
    return toast(error.message);
  }
  const extraUrls = ($('extraImagesPage')?.value || '').split('\n').map(line => line.trim()).filter(Boolean);
  const allImages = [image, ...extraUrls, ...extraImages].filter(Boolean);
  const payload = { name: $('namePage').value.trim(), category: $('categoryPage').value, description: $('descriptionPage').value.trim(), original_price: originalPrice, new_price: newPrice, image: allImages[0] || image, images: JSON.stringify(allImages), stock_status: $('stockStatusPage').value, is_offer: isOffer, offer_discount: isOffer ? $('productOfferDiscountPage').value.trim() : null, offer_expires_at: isOffer ? new Date(offerExpires).toISOString() : null };
  const result = editingProductId
    ? await supabaseClient.from('products').update(payload).eq('id', editingProductId).select().single()
    : await supabaseClient.from('products').insert(payload).select().single();
  if (result.error) return toast('تعذر حفظ المنتج: ' + result.error.message);
  $('productModalPage').classList.add('hidden');
  resetProductForm();
  await loadAdminData();
  toast('تم حفظ المنتج بنجاح');
}

async function deleteProduct(id) {
  if (!confirm('هل تريدين حذف هذا المنتج؟')) return;
  const { error } = await supabaseClient.from('products').delete().eq('id', id);
  if (error) return toast('تعذر حذف المنتج: ' + error.message);
  await loadAdminData();
}

function resetOfferForm() {
  editingOfferId = null;
  $('offerFormPage').reset();
  $('offerSubmitPage').textContent = 'نشر العرض';
  $('offerCancelPage').classList.add('hidden');
}

function editOffer(id) {
  const offer = offers.find(item => item.id === id);
  if (!offer) return;
  editingOfferId = id;
  $('offerTitlePage').value = offer.title;
  $('offerDiscountPage').value = offer.discount || '';
  $('offerDescriptionPage').value = offer.description || '';
  $('offerStartsPage').value = toDateTimeLocal(offer.starts_at || offer.created_at);
  $('offerExpiresPage').value = toDateTimeLocal(offer.expires_at);
  $('offerSubmitPage').textContent = 'حفظ التعديل';
  $('offerCancelPage').classList.remove('hidden');
  $('offerTitlePage').focus();
}

async function saveOffer(event) {
  event.preventDefault();
  const startsAt = $('offerStartsPage').value;
  const expiresAt = $('offerExpiresPage').value;
  if (!startsAt || !expiresAt || new Date(expiresAt) <= new Date(startsAt)) return toast('تحقق من تواريخ العرض');
  const payload = { title: $('offerTitlePage').value.trim(), discount: $('offerDiscountPage').value.trim(), description: $('offerDescriptionPage').value.trim(), starts_at: new Date(startsAt).toISOString(), expires_at: new Date(expiresAt).toISOString() };
  const result = editingOfferId
    ? await supabaseClient.from('offers').update(payload).eq('id', editingOfferId)
    : await supabaseClient.from('offers').insert({ ...payload, active: true });
  if (result.error) return toast('تعذر حفظ العرض: ' + result.error.message);
  resetOfferForm();
  await loadAdminData();
  toast('تم حفظ العرض بنجاح');
}

async function toggleOffer(id, active) {
  const { error } = await supabaseClient.from('offers').update({ active }).eq('id', id);
  if (error) return toast('تعذر تحديث حالة العرض: ' + error.message);
  await loadAdminData();
}

async function deleteOffer(id) {
  if (!confirm('هل تريدين حذف هذا العرض؟')) return;
  const { error } = await supabaseClient.from('offers').delete().eq('id', id);
  if (error) return toast('تعذر حذف العرض: ' + error.message);
  await loadAdminData();
}

document.addEventListener('DOMContentLoaded', async () => {
  $('adminLoginPage').querySelector('p')?.replaceChildren(document.createTextNode('أدخل بيانات حساب الإدارة للوصول إلى لوحة التحكم.'));
  document.querySelector('.offer-manager-head > div > p:last-child')?.replaceChildren(document.createTextNode('حدد الخصم والمدة ثم تابع الحالة من القائمة.'));
  document.querySelector('.modal-heading > p')?.replaceChildren(document.createTextNode('أدخل المعلومات الأساسية للمنتج ثم احفظه ليظهر في المتجر.'));
  addImageFileInput();
  $('adminLoginFormPage').addEventListener('submit', handleAdminLogin);
  $('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    setAuthenticated(null);
  });
  $('adminAddProduct').addEventListener('click', () => { resetProductForm(); $('productModalPage').classList.remove('hidden'); });
  $('closeProductModalPage').addEventListener('click', () => $('productModalPage').classList.add('hidden'));
  $('productModalPage').addEventListener('click', event => { if (event.target.id === 'productModalPage') event.currentTarget.classList.add('hidden'); });
  $('productIsOfferPage').addEventListener('change', event => $('productOfferFieldsPage').classList.toggle('hidden', !event.target.checked));
  $('productFormPage').addEventListener('submit', saveProduct);
  $('offerFormPage').addEventListener('submit', saveOffer);
  $('offerCancelPage').addEventListener('click', resetOfferForm);
  setAuthenticated(null);
  supabaseClient.auth.onAuthStateChange((_event, session) => setAuthenticated(session?.user || null));
  await supabaseClient.auth.signOut();
  adminPageReady = true;
  setAuthenticated(null);
});
