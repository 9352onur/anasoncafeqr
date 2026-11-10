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
  const newItemImage = document.getElementById('newItemImage');
  const newItemImageFile = document.getElementById('newItemImageFile');
  const newItemImagePreview = document.getElementById('newItemImagePreview');

  // Edit Modal Elements
  const editItemModal = document.getElementById('editItemModal');
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const editItemForm = document.getElementById('editItemForm');
  const editItemId = document.getElementById('editItemId');
  const editItemName = document.getElementById('editItemName');
  const editItemPrice = document.getElementById('editItemPrice');
  const editItemCategory = document.getElementById('editItemCategory');
  const editItemSubcategory = document.getElementById('editItemSubcategory');
  const editItemDesc = document.getElementById('editItemDesc');
  const editItemImage = document.getElementById('editItemImage');
  const editItemImageFile = document.getElementById('editItemImageFile');
  const editImagePreview = document.getElementById('editImagePreview');
  const editRemoveImgBtn = document.getElementById('editRemoveImgBtn');
  const editItemBadge = document.getElementById('editItemBadge');
  const editItemStock = document.getElementById('editItemStock');

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

  // Image compressor helper (max 800px, 0.82 jpeg)
  function compressImageFile(file, maxWidth = 800, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function updatePreview(container, src) {
    if (!container) return;
    if (src && src.trim() !== '') {
      container.innerHTML = `<img src="${src}" alt="Önizleme" onerror="this.remove()">`;
      container.classList.remove('hidden');
    } else {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  }

  // Bind New Item File Upload
  if (newItemImageFile) {
    newItemImageFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await compressImageFile(file);
        if (newItemImage) newItemImage.value = dataUrl;
        updatePreview(newItemImagePreview, dataUrl);
        showToast('Fotoğraf başarıyla yüklendi!');
      } catch (err) {
        showToast('Fotoğraf işlenemedi.');
      }
    });
  }

  if (newItemImage) {
    newItemImage.addEventListener('input', () => {
      updatePreview(newItemImagePreview, newItemImage.value.trim());
    });
  }

  // Check initial PIN
  if (currentPin) {
    verifyStoredPin(currentPin);
  }

  // PIN Form Submit
  pinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = pinInput.value.trim();
    if (!pin) return;

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
  });

  async function verifyStoredPin(pin) {
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        pinOverlay.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        loadDashboard();
      } else {
        sessionStorage.removeItem('anason_admin_pin');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Logout
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('anason_admin_pin');
    window.location.reload();
  });

  // Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');

      if (tabId === 'qrTab') {
        generateMenuQr();
      }
    });
  });

  // Load Dashboard Data
  async function loadDashboard() {
    try {
      const [menuRes, ratesRes] = await Promise.all([
        fetch('/api/menu').then(r => r.json()),
        fetch('/api/rates').then(r => r.json()).catch(() => null)
      ]);

      menuData = menuRes;
      updateStats(ratesRes);
      populateCategoryFilters();
      renderItemsTable();
    } catch (err) {
      console.error('Error loading dashboard:', err);
      showToast('Menü verileri yüklenemedi.');
    }
  }

  // Update Stats & Rate Summary
  function updateStats(ratesData) {
    const total = menuData.items ? menuData.items.length : 0;
    const hookah = menuData.items ? menuData.items.filter(i => i.isHookah).length : 0;

    if (totalItemsCount) totalItemsCount.textContent = total;
    if (hookahItemsCount) hookahItemsCount.textContent = hookah;

    if (liveRatesSummary && ratesData && ratesData.rates) {
      const r = ratesData.rates;
      const usdTry = r.USD ? (1 / r.USD).toFixed(2) : '--';
      const eurTry = r.EUR ? (1 / r.EUR).toFixed(2) : '--';
      liveRatesSummary.innerHTML = `<strong>1$</strong>: ${usdTry}₺ | <strong>1€</strong>: ${eurTry}₺`;
    }
  }

  // Populate Categories
  function populateCategoryFilters() {
    if (!menuData.categories) return;

    // Filter Dropdown
    adminCategoryFilter.innerHTML = '<option value="all">Tüm Kategoriler</option>';
    menuData.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.name} (${menuData.items.filter(i => i.categoryId === cat.id).length})`;
      adminCategoryFilter.appendChild(opt);
    });

    // Add Item Category Select
    newItemCategory.innerHTML = '';
    menuData.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      newItemCategory.appendChild(opt);
    });
  }

  // Render Items Table
  function renderItemsTable() {
    const q = adminSearchInput.value.trim().toLowerCase();
    const cat = adminCategoryFilter.value;

    let filtered = menuData.items || [];

    filtered = filtered.filter(it => {
      if (cat !== 'all' && it.categoryId !== cat) return false;
      if (q) {
        const nameMatch = it.name && it.name.toLowerCase().includes(q);
        const subcatMatch = it.subcategory && it.subcategory.toLowerCase().includes(q);
        return nameMatch || subcatMatch;
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
          <img src="${it.image || '/static/assets/4.jpeg'}" class="item-thumb" data-id="${it.id}" alt="${it.name}" title="Fotoğrafı düzenlemek için tıkla">
        </td>
        <td>
          <strong>${it.name}</strong>
          ${it.isHookah && it.icons ? `<div style="font-size:0.75rem; color:#ff7d54;">${it.icons.join(' ')}</div>` : ''}
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
          <button class="action-btn edit-item" data-id="${it.id}" title="Ürünü ve Fotoğrafı Düzenle">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="action-btn delete" data-id="${it.id}" title="Ürünü Sil">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;

      adminTableBody.appendChild(tr);
    });

    // Edit Item Modal triggers
    adminTableBody.querySelectorAll('.action-btn.edit-item').forEach(btn => {
      btn.addEventListener('click', () => {
        openEditModal(btn.getAttribute('data-id'));
      });
    });

    adminTableBody.querySelectorAll('.item-thumb').forEach(img => {
      img.addEventListener('click', () => {
        openEditModal(img.getAttribute('data-id'));
      });
    });

    // Delete buttons
    adminTableBody.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
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

  // Open Edit Item Modal
  function openEditModal(itemId) {
    const item = menuData.items.find(i => i.id === itemId);
    if (!item) return;

    if (editItemId) editItemId.value = item.id;
    if (editItemName) editItemName.value = item.name || '';
    if (editItemPrice) editItemPrice.value = item.price || '';
    if (editItemSubcategory) editItemSubcategory.value = item.subcategory || '';
    if (editItemDesc) editItemDesc.value = item.description || '';
    if (editItemImage) editItemImage.value = item.image || '';
    if (editItemBadge) editItemBadge.value = item.badge || '';
    if (editItemStock) editItemStock.value = String(item.isAvailable !== false);

    // Populate category dropdown
    if (editItemCategory) {
      editItemCategory.innerHTML = menuData.categories.map(c => 
        `<option value="${c.id}" ${c.id === item.categoryId ? 'selected' : ''}>${c.name}</option>`
      ).join('');
    }

    updatePreview(editImagePreview, item.image);
    if (editItemModal) editItemModal.classList.remove('hidden');
  }

  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', () => {
      editItemModal.classList.add('hidden');
    });
  }

  if (editItemModal) {
    editItemModal.addEventListener('click', (e) => {
      if (e.target === editItemModal) {
        editItemModal.classList.add('hidden');
      }
    });
  }

  // Edit Item File Upload
  if (editItemImageFile) {
    editItemImageFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await compressImageFile(file);
        if (editItemImage) editItemImage.value = dataUrl;
        updatePreview(editImagePreview, dataUrl);
        showToast('Fotoğraf güncellendi!');
      } catch (err) {
        showToast('Fotoğraf işlenemedi.');
      }
    });
  }

  if (editRemoveImgBtn) {
    editRemoveImgBtn.addEventListener('click', () => {
      if (editItemImage) editItemImage.value = '';
      updatePreview(editImagePreview, '');
      showToast('Fotoğraf kaldırıldı.');
    });
  }

  if (editItemImage) {
    editItemImage.addEventListener('input', () => {
      updatePreview(editImagePreview, editItemImage.value.trim());
    });
  }

  // Submit Edit Item Form
  if (editItemForm) {
    editItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editItemId.value;
      const item = menuData.items.find(i => i.id === id);
      if (!item) return;

      item.name = editItemName.value.trim();
      item.price = editItemPrice.value.trim();
      item.categoryId = editItemCategory.value;
      item.subcategory = editItemSubcategory.value.trim();
      item.description = editItemDesc.value.trim();
      item.image = editItemImage.value.trim();
      item.badge = editItemBadge.value;
      item.isAvailable = editItemStock.value === 'true';

      await saveItemUpdate(item);
      editItemModal.classList.add('hidden');
      loadDashboard();
      showToast('Ürün ve fotoğraf başarıyla güncellendi!');
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

      if (!res.ok) {
        showToast('Güncelleme başarısız!');
      }
    } catch (err) {
      console.error(err);
      showToast('Bağlantı hatası.');
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
        showToast('Ürün başarıyla silindi.');
        loadDashboard();
      } else {
        showToast('Silme işlemi başarısız.');
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
        if (newItemImagePreview) updatePreview(newItemImagePreview, '');
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

  // Search & Filter Listeners
  adminSearchInput.addEventListener('input', renderItemsTable);
  adminCategoryFilter.addEventListener('change', renderItemsTable);

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
