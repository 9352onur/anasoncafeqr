/**
 * Anason Cafe Admin Dashboard Logic
 */

(function () {
  'use strict';

  let currentPin = sessionStorage.getItem('anason_admin_pin') || '';
  let menuData = { categories: [], items: [] };

  // DOM Elements
  const pinOverlay = document.getElementById('pinOverlay');
  const dashboardApp = document.getElementById('dashboardApp');
  const pinForm = document.getElementById('pinForm');
  const pinInput = document.getElementById('pinInput');
  const pinError = document.getElementById('pinError');
  const logoutBtn = document.getElementById('logoutBtn');

  const totalItemsCount = document.getElementById('totalItemsCount');
  const hookahItemsCount = document.getElementById('hookahItemsCount');
  const liveRatesSummary = document.getElementById('liveRatesSummary');

  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminCategoryFilter = document.getElementById('adminCategoryFilter');
  const adminTableBody = document.getElementById('adminTableBody');
  const saveAllPricesBtn = document.getElementById('saveAllPricesBtn');

  const addItemForm = document.getElementById('addItemForm');
  const newItemCategory = document.getElementById('newItemCategory');

  const changePinForm = document.getElementById('changePinForm');
  const qrImage = document.getElementById('qrImage');
  const qrUrlDisplay = document.getElementById('qrUrlDisplay');
  const downloadQrBtn = document.getElementById('downloadQrBtn');
  const printQrBtn = document.getElementById('printQrBtn');
  const toastContainer = document.getElementById('toastContainer');

  function showToast(msg) {
    if (!toastContainer) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 2500);
  }

  // Check initial PIN
  if (currentPin) {
    verifyAndUnlock(currentPin);
  } else {
    pinOverlay.classList.remove('hidden');
    dashboardApp.classList.add('hidden');
  }

  // PIN Form Submission
  pinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPin = pinInput.value.trim();
    if (!enteredPin) return;
    await verifyAndUnlock(enteredPin);
  });

  async function verifyAndUnlock(pin) {
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        currentPin = pin;
        sessionStorage.setItem('anason_admin_pin', pin);
        pinOverlay.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        pinError.classList.add('hidden');
        loadDashboard();
      } else {
        pinError.classList.remove('hidden');
        pinInput.value = '';
        pinInput.focus();
      }
    } catch (err) {
      console.error(err);
      pinError.textContent = 'Bağlantı hatası oluştu.';
      pinError.classList.remove('hidden');
    }
  }

  // Logout
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('anason_admin_pin');
    currentPin = '';
    pinOverlay.classList.remove('hidden');
    dashboardApp.classList.add('hidden');
    pinInput.value = '';
  });

  // Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');

      if (targetId === 'qrTab') {
        generateMenuQr();
      }
    });
  });

  // Load Dashboard Data
  async function loadDashboard() {
    try {
      const [menuRes, ratesRes] = await Promise.all([
        fetch('/api/menu').then(r => r.json()),
        fetch('/api/rates').then(r => r.json())
      ]);

      menuData = menuRes;
      updateStats(ratesRes);
      populateCategoryDropdowns();
      renderTable();
    } catch (err) {
      console.error(err);
      showToast('Veriler yüklenirken hata oluştu.');
    }
  }

  function updateStats(ratesRes) {
    totalItemsCount.textContent = menuData.items.length;
    const hookahCount = menuData.items.filter(i => i.categoryId === 'nargile' || i.isHookah).length;
    hookahItemsCount.textContent = hookahCount;

    if (ratesRes && ratesRes.rates) {
      const usd = (1 / ratesRes.rates.USD).toFixed(2);
      const eur = (1 / ratesRes.rates.EUR).toFixed(2);
      liveRatesSummary.textContent = `1$ ≈ ${usd}₺ | 1€ ≈ ${eur}₺`;
    }
  }

  function populateCategoryDropdowns() {
    // Admin filter
    adminCategoryFilter.innerHTML = '<option value="all">Tüm Kategoriler</option>';
    newItemCategory.innerHTML = '';

    menuData.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.icon || ''} ${cat.name}`;
      adminCategoryFilter.appendChild(opt);

      const addOpt = opt.cloneNode(true);
      newItemCategory.appendChild(addOpt);
    });
  }

  // Filter & Search Events
  adminSearchInput.addEventListener('input', renderTable);
  adminCategoryFilter.addEventListener('change', renderTable);

  function renderTable() {
    const q = adminSearchInput.value.toLowerCase();
    const selCat = adminCategoryFilter.value;

    const filtered = menuData.items.filter(it => {
      if (selCat !== 'all' && it.categoryId !== selCat) return false;
      if (q) {
        const match = (it.name && it.name.toLowerCase().includes(q)) ||
                      (it.subcategory && it.subcategory.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    adminTableBody.innerHTML = '';

    if (filtered.length === 0) {
      adminTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#888;">Eşleşen ürün bulunamadı.</td></tr>`;
      return;
    }

    filtered.forEach(it => {
      const tr = document.createElement('tr');
      const categoryObj = menuData.categories.find(c => c.id === it.categoryId) || { name: it.categoryId };

      tr.innerHTML = `
        <td>
          <img src="${it.image || '/static/assets/4.jpeg'}" class="item-thumb" alt="${it.name}">
        </td>
        <td>
          <strong>${it.name}</strong>
          ${it.isHookah && it.icons ? `<div style="font-size:0.75rem; color:#d4af37;">${it.icons.join(' ')}</div>` : ''}
        </td>
        <td>${categoryObj.name}</td>
        <td><small style="color:#aaa;">${it.subcategory || '-'}</small></td>
        <td>
          <input type="text" class="price-input" data-id="${it.id}" value="${it.price || ''}" placeholder="0"> ₺
        </td>
        <td>
          ${it.badge ? `<span class="badge-tag">${it.badge}</span>` : '<span style="color:#666;">-</span>'}
        </td>
        <td>
          <button class="action-btn toggle-stock" data-id="${it.id}" title="${it.isAvailable !== false ? 'Stokta Var (Tıkla: Tükendi yap)' : 'Tükendi (Tıkla: Stokta yap)'}">
            <i class="fa-solid ${it.isAvailable !== false ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color:${it.isAvailable !== false ? '#10b981' : '#ef4444'};"></i>
          </button>
        </td>
        <td>
          <button class="action-btn delete" data-id="${it.id}" title="Ürünü Sil">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;

      adminTableBody.appendChild(tr);
    });

    // Delete buttons
    adminTableBody.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
        await deleteItem(id);
      });
    });

    // Stock toggle
    adminTableBody.querySelectorAll('.action-btn.toggle-stock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const item = menuData.items.find(i => i.id === id);
        if (!item) return;
        item.isAvailable = !(item.isAvailable !== false);
        await saveItemUpdate(item);
      });
    });
  }

  // Save All Prices Batch
  saveAllPricesBtn.addEventListener('click', async () => {
    const inputs = adminTableBody.querySelectorAll('.price-input');
    let updatedCount = 0;

    for (let inp of inputs) {
      const id = inp.getAttribute('data-id');
      const val = inp.value.trim();
      const item = menuData.items.find(i => i.id === id);
      if (item && item.price !== val) {
        item.price = val;
        await fetch(`/api/admin/item/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item, pin: currentPin })
        });
        updatedCount++;
      }
    }

    showToast(`${updatedCount} adet ürünün fiyatı güncellendi!`);
    loadDashboard();
  });

  async function saveItemUpdate(item) {
    try {
      const res = await fetch(`/api/admin/item/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, pin: currentPin })
      });
      if (res.ok) {
        showToast('Ürün durumu güncellendi.');
        renderTable();
      }
    } catch (err) {
      console.error(err);
      showToast('Güncelleme sırasında hata oluştu.');
    }
  }

  async function deleteItem(id) {
    try {
      const res = await fetch(`/api/admin/item/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin })
      });
      if (res.ok) {
        showToast('Ürün silindi.');
        menuData.items = menuData.items.filter(i => i.id !== id);
        renderTable();
        totalItemsCount.textContent = menuData.items.length;
      }
    } catch (err) {
      console.error(err);
      showToast('Silme işlemi başarısız.');
    }
  }

  // Add Item Form
  addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('newItemName').value.trim();
    const nameEn = document.getElementById('newItemNameEn').value.trim();
    const categoryId = document.getElementById('newItemCategory').value;
    const subcategory = document.getElementById('newItemSubcategory').value.trim();
    const price = document.getElementById('newItemPrice').value.trim();
    const desc = document.getElementById('newItemDesc').value.trim();
    const image = document.getElementById('newItemImage').value.trim();
    const badge = document.getElementById('newItemBadge').value;
    const iconsRaw = document.getElementById('newItemIcons').value.trim();

    const icons = iconsRaw ? iconsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const checkedAllergens = Array.from(document.querySelectorAll('input[name="allergens"]:checked')).map(c => c.value);

    const isHookah = categoryId === 'nargile' || icons.length > 0;

    const newItem = {
      categoryId,
      subcategory,
      name,
      name_en: nameEn,
      description: desc,
      description_en: desc,
      price,
      badge,
      image,
      icons,
      allergens: checkedAllergens,
      isAvailable: true,
      isHookah
    };

    try {
      const res = await fetch('/api/admin/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: newItem, pin: currentPin })
      });

      if (res.ok) {
        showToast('Yeni ürün menüye başarıyla eklendi!');
        addItemForm.reset();
        // Switch to menu tab
        document.querySelector('.tab-btn[data-tab="menuTab"]').click();
        loadDashboard();
      } else {
        showToast('Ürün eklenemedi.');
      }
    } catch (err) {
      console.error(err);
      showToast('Bağlantı hatası.');
    }
  });

  // Change PIN Form
  changePinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPin = document.getElementById('oldPin').value.trim();
    const newPin = document.getElementById('newPin').value.trim();
    const newPinConfirm = document.getElementById('newPinConfirm').value.trim();

    if (newPin !== newPinConfirm) {
      alert('Yeni PIN kodları birbiriyle eşleşmiyor!');
      return;
    }

    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_pin: oldPin, new_pin: newPin })
      });

      const data = await res.json();
      if (res.ok) {
        currentPin = newPin;
        sessionStorage.setItem('anason_admin_pin', newPin);
        showToast('PIN başarıyla güncellendi!');
        changePinForm.reset();
      } else {
        alert(data.detail || 'PIN değiştirilemedi!');
      }
    } catch (err) {
      console.error(err);
      alert('Bağlantı hatası.');
    }
  });

  // Generate Menu QR Code
  function generateMenuQr() {
    const currentUrl = window.location.origin;
    qrUrlDisplay.textContent = currentUrl;

    if (window.QRCode) {
      QRCode.toDataURL(currentUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0c0d11',
          light: '#ffffff'
        }
      }, (err, url) => {
        if (!err && url) {
          qrImage.src = url;
        }
      });
    }
  }

  downloadQrBtn.addEventListener('click', () => {
    if (!qrImage.src) return;
    const a = document.createElement('a');
    a.href = qrImage.src;
    a.download = 'anason-cafe-qr-menu.png';
    a.click();
  });

  printQrBtn.addEventListener('click', () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Anason Cafe QR Menü</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 26px; margin-bottom: 5px; color: #111; }
            p { font-size: 16px; color: #555; margin-bottom: 25px; }
            img { width: 260px; height: 260px; border: 2px solid #333; padding: 10px; border-radius: 12px; }
          </style>
        </head>
        <body onload="window.print()">
          <h1>ANASON CAFE & BİSTRO</h1>
          <p>Kameranız ile QR kodu okutarak menümüzü inceleyebilirsiniz</p>
          <img src="${qrImage.src}">
          <p style="margin-top:20px; font-weight:bold;">anasoncafefethiye</p>
        </body>
      </html>
    `);
    win.document.close();
  });

})();
