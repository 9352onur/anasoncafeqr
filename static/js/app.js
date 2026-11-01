/**
 * Anason Cafe & Bistro - Dual-Theme Fine-Dining QR Menu (V4)
 * Editorial Standard, FontAwesome Icons & Light/Dark Theme Switcher
 */

(function () {
  'use strict';

  // State Management
  const state = {
    menu: { categories: [], items: [] },
    config: {},
    translations: {},
    currentLang: 'tr',
    currentCurrency: 'TRY',
    currentTheme: 'dark',
    currentPalette: 'flame',
    exchangeRates: { TRY: 1.0, USD: 0.02, EUR: 0.018, GBP: 0.015 },
    currencySymbols: { TRY: '₺', USD: '$', EUR: '€', GBP: '£' },
    activeCategory: 'all',
    searchQuery: '',
    selectedAllergens: new Set(),
    isProgrammaticScroll: false
  };

  // DOM Elements
  const elements = {
    mainContent: document.getElementById('mainContent'),
    categoryNav: document.getElementById('categoryNav'),
    currencySelect: document.getElementById('currencySelect'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    langButtons: document.querySelectorAll('.lang-btn'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterAllergenToggle: document.getElementById('filterAllergenToggle'),
    allergenDropdown: document.getElementById('allergenDropdown'),
    allergenChips: document.querySelectorAll('.allergen-chip'),
    allergenGuideBtn: document.getElementById('allergenGuideBtn'),
    allergenGuideModal: document.getElementById('allergenGuideModal'),
    closeAllergenModalBtn: document.getElementById('closeAllergenModalBtn'),
    viewOriginalMenuBtn: document.getElementById('viewOriginalMenuBtn'),
    originalMenuModal: document.getElementById('originalMenuModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Allergen Labels & Vector FontAwesome Icons
  const allergenInfo = {
    gluten: { icon: 'fa-solid fa-wheat-awn', label: 'Gluten' },
    lactose: { icon: 'fa-solid fa-cow', label: 'Laktoz' },
    egg: { icon: 'fa-solid fa-egg', label: 'Yumurta' },
    nuts: { icon: 'fa-solid fa-seedling', label: 'Kuruyemiş' },
    fish: { icon: 'fa-solid fa-fish', label: 'Balık' },
    sesame: { icon: 'fa-solid fa-jar', label: 'Susam' }
  };

  function showToast(message) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Fetch Initial Data
  async function init() {
    try {
      const [menuRes, configRes, transRes, ratesRes] = await Promise.all([
        fetch('/api/menu').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
        fetch('/api/translations').then(r => r.json()),
        fetch('/api/rates').then(r => r.json())
      ]);

      state.menu = menuRes;
      state.config = configRes;
      state.translations = transRes;
      if (ratesRes && ratesRes.rates) {
        state.exchangeRates = ratesRes.rates;
      }
      if (configRes.currencySymbols) {
        state.currencySymbols = configRes.currencySymbols;
      }

      // Restore stored Theme (Always Dark Lounge by default)
      const savedTheme = localStorage.getItem('anason_theme');
      if (savedTheme && ['dark', 'light'].includes(savedTheme)) {
        state.currentTheme = savedTheme;
      } else {
        state.currentTheme = 'dark';
      }
      applyTheme(state.currentTheme);

      // Restore stored palette
      const savedPalette = localStorage.getItem('anason_palette') || 'flame';
      applyPalette(savedPalette);

      // Restore stored language & currency
      const savedLang = localStorage.getItem('anason_lang');
      if (savedLang && ['tr', 'en', 'de', 'ru', 'ar'].includes(savedLang)) {
        state.currentLang = savedLang;
      }
      const savedCurr = localStorage.getItem('anason_curr');
      if (savedCurr && state.currencySymbols[savedCurr]) {
        state.currentCurrency = savedCurr;
        if (elements.currencySelect) elements.currencySelect.value = savedCurr;
      }

      setupEventListeners();
      applyLanguage(state.currentLang);
      renderCategoryNav();
      renderMenu();
      setupScrollspy();
    } catch (err) {
      console.error('Initialization error:', err);
      elements.mainContent.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #ef4444;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:10px;"></i>
          <p>Menü yüklenirken bir hata oluştu. Lütfen sayfayı yenileyiniz.</p>
        </div>
      `;
    }
  }

  // Theme Toggler
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    state.currentTheme = theme;
    localStorage.setItem('anason_theme', theme);
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.innerHTML = theme === 'dark' 
        ? '<i class="fa-solid fa-sun"></i>' 
        : '<i class="fa-solid fa-moon"></i>';
      elements.themeToggleBtn.title = theme === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç';
    }
  }

  // Accent Color Palette Switcher
  function applyPalette(palette) {
    state.currentPalette = palette;
    if (palette === 'flame') {
      document.body.removeAttribute('data-palette');
    } else {
      document.body.setAttribute('data-palette', palette);
    }
    localStorage.setItem('anason_palette', palette);
    document.querySelectorAll('.palette-dot').forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-palette') === palette);
    });
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Theme Toggle Button
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.addEventListener('click', () => {
        const nextTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        showToast(nextTheme === 'dark' ? 'Gece Modu Aktif 🌙' : 'Gündüz Modu Aktif ☀️');
      });
    }

    // Palette Dots
    document.querySelectorAll('.palette-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const p = dot.getAttribute('data-palette');
        applyPalette(p);
        const names = {
          flame: 'Ateş & Köz Turuncusu Aktif 🔥',
          mint: 'Taze Anason Zümrüt Yeşili Aktif 🌿',
          ocean: 'Fethiye Turkuazı Aktif 🌊'
        };
        showToast(names[p] || 'Palet Değiştirildi');
      });
    });

    // Currency Switcher
    if (elements.currencySelect) {
      elements.currencySelect.addEventListener('change', (e) => {
        state.currentCurrency = e.target.value;
        localStorage.setItem('anason_curr', state.currentCurrency);
        renderMenu();
        showToast(`${state.currentCurrency} kuru uygulandı`);
      });
    }

    // Language Buttons
    elements.langButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (lang === state.currentLang) return;
        state.currentLang = lang;
        localStorage.setItem('anason_lang', lang);
        applyLanguage(lang);
        renderCategoryNav();
        renderMenu();
      });
    });

    // Search Input
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        if (elements.clearSearchBtn) {
          elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        }
        renderMenu();
      });
    }

    // Clear Search
    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        renderMenu();
      });
    }

    // Allergen Dropdown Toggle
    if (elements.filterAllergenToggle) {
      elements.filterAllergenToggle.addEventListener('click', () => {
        elements.allergenDropdown.classList.toggle('hidden');
      });
    }

    // Allergen Chips Filter
    elements.allergenChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const allergen = chip.getAttribute('data-allergen');
        if (state.selectedAllergens.has(allergen)) {
          state.selectedAllergens.delete(allergen);
          chip.classList.remove('active');
        } else {
          state.selectedAllergens.add(allergen);
          chip.classList.add('active');
        }
        renderMenu();
      });
    });

    // Allergen Guide Modal
    if (elements.allergenGuideBtn && elements.allergenGuideModal) {
      elements.allergenGuideBtn.addEventListener('click', () => {
        elements.allergenGuideModal.classList.remove('hidden');
      });
    }
    if (elements.closeAllergenModalBtn && elements.allergenGuideModal) {
      elements.closeAllergenModalBtn.addEventListener('click', () => {
        elements.allergenGuideModal.classList.add('hidden');
      });
    }
    if (elements.allergenGuideModal) {
      elements.allergenGuideModal.addEventListener('click', (e) => {
        if (e.target === elements.allergenGuideModal) {
          elements.allergenGuideModal.classList.add('hidden');
        }
      });
    }

    // Original Menu Modal
    if (elements.viewOriginalMenuBtn && elements.originalMenuModal) {
      elements.viewOriginalMenuBtn.addEventListener('click', () => {
        elements.originalMenuModal.classList.remove('hidden');
      });
    }
    if (elements.closeModalBtn && elements.originalMenuModal) {
      elements.closeModalBtn.addEventListener('click', () => {
        elements.originalMenuModal.classList.add('hidden');
      });
    }
    if (elements.originalMenuModal) {
      elements.originalMenuModal.addEventListener('click', (e) => {
        if (e.target === elements.originalMenuModal) {
          elements.originalMenuModal.classList.add('hidden');
        }
      });
    }
  }

  // Apply Language & Translations
  function applyLanguage(lang) {
    const t = state.translations[lang] || state.translations['tr'] || {};
    
    // RTL handling
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = lang;
    }

    elements.langButtons.forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (t[key]) {
        el.setAttribute('placeholder', t[key]);
      }
    });
  }

  // Localized Text Helper
  function getLocalizedText(obj, fieldBase) {
    if (!obj) return '';
    const lang = state.currentLang;
    if (lang !== 'tr') {
      const localizedField = `${fieldBase}_${lang}`;
      if (obj[localizedField]) return obj[localizedField];
      const enField = `${fieldBase}_en`;
      if (obj[enField]) return obj[enField];
    }
    return obj[fieldBase] || '';
  }

  // Format Price with Selected Currency
  function formatPrice(tryPriceStr) {
    const symbol = state.currencySymbols[state.currentCurrency] || '₺';
    if (!tryPriceStr || tryPriceStr.trim() === '' || tryPriceStr === '-') {
      return `${symbol} --`;
    }

    const numericPrice = parseFloat(tryPriceStr.toString().replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return `${symbol} --`;
    }

    if (state.currentCurrency === 'TRY') {
      return `${numericPrice.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
    }

    const rate = state.exchangeRates[state.currentCurrency];
    if (!rate) {
      return `${symbol} ${numericPrice}`;
    }

    const converted = numericPrice * rate;
    const formattedNum = converted.toLocaleString(state.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${symbol} ${formattedNum}`;
  }

  // Render Horizontal Category Navigation
  function renderCategoryNav() {
    if (!elements.categoryNav) return;
    elements.categoryNav.innerHTML = '';

    const t = state.translations[state.currentLang] || state.translations['tr'];

    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = `category-btn ${state.activeCategory === 'all' ? 'active' : ''}`;
    allBtn.setAttribute('data-category-id', 'all');
    allBtn.innerHTML = `<i class="fa-solid fa-layer-group"></i> <span>${t.allCategories || 'Tümü'}</span>`;
    allBtn.addEventListener('click', () => {
      state.activeCategory = 'all';
      updateCategoryActiveState('all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      renderMenu();
    });
    elements.categoryNav.appendChild(allBtn);

    // Each Category Button
    state.menu.categories.forEach(cat => {
      const catName = getLocalizedText(cat, 'name');
      const btn = document.createElement('button');
      btn.className = `category-btn ${state.activeCategory === cat.id ? 'active' : ''}`;
      btn.setAttribute('data-category-id', cat.id);

      let badgeHtml = '';
      if (cat.badge) {
        badgeHtml = `<span class="cat-badge">${cat.badge}</span>`;
      }

      btn.innerHTML = `
        <i class="${cat.iconClass || 'fa-solid fa-utensils'}"></i>
        <span>${catName}</span>
        ${badgeHtml}
      `;

      btn.addEventListener('click', () => {
        state.isProgrammaticScroll = true;
        state.activeCategory = cat.id;
        updateCategoryActiveState(cat.id);
        
        renderMenu();

        setTimeout(() => {
          const sectionEl = document.getElementById(`category-${cat.id}`);
          if (sectionEl) {
            sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          setTimeout(() => {
            state.isProgrammaticScroll = false;
          }, 800);
        }, 50);
      });

      elements.categoryNav.appendChild(btn);
    });
  }

  // Auto-center category button smoothly (no manual drag needed!)
  function updateCategoryActiveState(catId) {
    if (!elements.categoryNav) return;
    const buttons = elements.categoryNav.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
      const bCatId = btn.getAttribute('data-category-id');
      if (bCatId === catId) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Scrollspy: Automatically tracks user's scroll on mobile & desktop
  function setupScrollspy() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (state.isProgrammaticScroll) return;
      if (state.searchQuery || state.selectedAllergens.size > 0) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const sections = document.querySelectorAll('.menu-section');
        const scrollPosition = window.scrollY + 100;

        for (let section of sections) {
          const top = section.offsetTop;
          const height = section.offsetHeight;
          const catId = section.getAttribute('id').replace('category-', '');

          if (scrollPosition >= top && scrollPosition < top + height) {
            if (state.activeCategory !== catId) {
              state.activeCategory = catId;
              updateCategoryActiveState(catId);
            }
            break;
          }
        }
      }, 40);
    }, { passive: true });
  }

  // Render Menu Sections & Items (World-Class Editorial Style)
  function renderMenu() {
    if (!elements.mainContent) return;
    const t = state.translations[state.currentLang] || state.translations['tr'];

    // Filter items
    let filteredItems = state.menu.items.filter(item => {
      if (state.searchQuery && state.activeCategory !== 'all' && item.categoryId !== state.activeCategory) {
        return false;
      }

      if (state.searchQuery) {
        const q = state.searchQuery;
        const nameMatch = (item.name && item.name.toLowerCase().includes(q)) ||
                          (item.name_en && item.name_en.toLowerCase().includes(q)) ||
                          (item.name_de && item.name_de.toLowerCase().includes(q)) ||
                          (item.name_ru && item.name_ru.toLowerCase().includes(q)) ||
                          (item.name_ar && item.name_ar.toLowerCase().includes(q));
        const descMatch = (item.description && item.description.toLowerCase().includes(q)) ||
                          (item.description_en && item.description_en.toLowerCase().includes(q));
        const subcatMatch = item.subcategory && item.subcategory.toLowerCase().includes(q);
        
        let flavorMatch = false;
        if (item.flavorTags) {
          flavorMatch = item.flavorTags.some(ft => ft.text.toLowerCase().includes(q));
        }

        if (!nameMatch && !descMatch && !subcatMatch && !flavorMatch) {
          return false;
        }
      }

      // Allergen filter
      if (state.selectedAllergens.size > 0 && item.allergens && item.allergens.length > 0) {
        for (let allg of state.selectedAllergens) {
          if (item.allergens.includes(allg)) {
            return false;
          }
        }
      }

      return true;
    });

    if (filteredItems.length === 0) {
      elements.mainContent.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-utensils" style="font-size: 2.5rem; color: var(--gold-primary); margin-bottom: 15px; opacity: 0.6;"></i>
          <h3 style="margin-bottom:8px;">${t.noItemsFound || 'Aramanıza uygun ürün bulunamadı.'}</h3>
          <p style="font-size:0.9rem;">Farklı bir arama terimi deneyebilir veya filtreleri temizleyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    let html = '';

    state.menu.categories.forEach(cat => {
      const itemsInCat = filteredItems.filter(i => i.categoryId === cat.id);
      if (itemsInCat.length === 0) return;

      const catName = getLocalizedText(cat, 'name');
      const catDesc = getLocalizedText(cat, 'description');

      html += `
        <section class="menu-section" id="category-${cat.id}">
          <!-- Clean Editorial Category Header -->
          <div class="editorial-category-header">
            <div class="editorial-cat-icon">
              <i class="${cat.iconClass || 'fa-solid fa-utensils'}"></i>
            </div>
            <h2>${catName}</h2>
            ${catDesc ? `<p>${catDesc}</p>` : ''}
          </div>
      `;

      // Official 18+ Hookah Tobacco Legal Warning
      if (cat.id === 'nargile') {
        html += `
          <div class="hookah-alert">
            <i class="fa-solid fa-ban"></i>
            <div>
              <strong>18+ YASAL UYARI:</strong>
              <span>${t.hookahTobaccoWarning || 'Nargile ürünleri tütün mamulüdür. 4207 sayılı Kanun gereğince 18 yaşını doldurmamış kişilere satışı ve sunumu kesinlikle yasaktır.'}</span>
            </div>
          </div>
        `;
      }

      // Group by subcategory
      const subcategories = [...new Set(itemsInCat.map(i => i.subcategory || 'Diğer'))];

      subcategories.forEach(sub => {
        const itemsInSub = itemsInCat.filter(i => (i.subcategory || 'Diğer') === sub);
        if (itemsInSub.length === 0) return;

        html += `
          <div class="subcategory-group">
            ${sub && sub !== 'Diğer' ? `<h3 class="subcategory-title">${sub}</h3>` : ''}
            <div class="items-grid">
        `;

        itemsInSub.forEach(item => {
          html += renderBistroCard(item);
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `</section>`;
    });

    elements.mainContent.innerHTML = html;
  }

  // Render Fine-Dining Bistro Card with Dynamic Meters
  function renderBistroCard(item) {
    const itemName = getLocalizedText(item, 'name');
    const itemDesc = getLocalizedText(item, 'description');
    const formattedPrice = formatPrice(item.price);
    const isPriceEmpty = !item.price || item.price.trim() === '';
    const t = state.translations[state.currentLang] || state.translations['tr'];

    // Badges
    let badgeHtml = '';
    if (item.badge) {
      let badgeClass = 'special';
      const bLower = item.badge.toLowerCase();
      if (bLower.includes('pop') || bLower.includes('hit')) badgeClass = 'popular';
      else if (bLower.includes('şef') || bLower.includes('chef')) badgeClass = 'chef';
      else if (bLower.includes('klasik') || bLower.includes('classic')) badgeClass = 'classic';
      badgeHtml = `<span class="badge ${badgeClass}">${item.badge}</span>`;
    }

    // Dynamic Hookah Smoke & Strength Gauges
    let hookahMetersHtml = '';
    if (item.isHookah && (item.smokeIntensity || item.strengthLevel || item.flavorProfile)) {
      const smokeDots = Array.from({ length: 5 }, (_, idx) => 
        `<span class="meter-dot ${idx < (item.smokeIntensity || 4) ? 'filled' : ''}"></span>`
      ).join('');

      const strengthDots = Array.from({ length: 5 }, (_, idx) => 
        `<span class="meter-dot ${idx < (item.strengthLevel || 3) ? 'filled-fire' : ''}"></span>`
      ).join('');

      hookahMetersHtml = `
        <div class="hookah-meters">
          <div class="meter-row">
            <span class="meter-label"><i class="fa-solid fa-smog"></i> ${t.smokeIntensity || 'Duman'}:</span>
            <div class="meter-dots">${smokeDots}</div>
          </div>
          <div class="meter-row">
            <span class="meter-label"><i class="fa-solid fa-fire"></i> ${t.strengthLevel || 'Sertlik'}:</span>
            <div class="meter-dots">${strengthDots}</div>
          </div>
          ${item.flavorProfile ? `<div class="flavor-profile-text"><i class="fa-solid fa-quote-left" style="font-size:0.6rem; margin-right:4px;"></i>${item.flavorProfile}</div>` : ''}
        </div>
      `;
    }

    // Flavor Profile Tags with FontAwesome Vector Icons
    let flavorHtml = '';
    if (item.isHookah && item.flavorTags && item.flavorTags.length > 0) {
      flavorHtml = `
        <div class="flavor-tags-wrap">
          ${item.flavorTags.map(tag => `
            <span class="flavor-tag">
              <i class="${tag.icon || 'fa-solid fa-leaf'}"></i> ${tag.text}
            </span>
          `).join('')}
        </div>
      `;
    }

    // Allergens with FontAwesome Icons
    let allergensHtml = '';
    if (item.allergens && item.allergens.length > 0) {
      allergensHtml = `
        <div class="allergens-row">
          ${item.allergens.map(algKey => {
            const info = allergenInfo[algKey] || { icon: 'fa-solid fa-circle-info', label: algKey };
            return `<span class="allergen-pill"><i class="${info.icon}"></i> ${info.label}</span>`;
          }).join('')}
        </div>
      `;
    }

    const cardClasses = `bistro-card ${item.isHookah ? 'hookah-card' : ''}`;

    return `
      <article class="${cardClasses}">
        <div>
          <div class="card-header">
            <div class="card-title-wrap">
              <h4 class="card-title">${itemName}</h4>
              ${badgeHtml}
            </div>
            <div class="card-price ${isPriceEmpty ? 'empty' : ''}">${formattedPrice}</div>
          </div>
          ${itemDesc ? `<p class="card-desc">${itemDesc}</p>` : ''}
        </div>
        <div>
          ${hookahMetersHtml}
          ${flavorHtml}
          ${allergensHtml}
        </div>
      </article>
    `;
  }

  // Run on DOM load
  document.addEventListener('DOMContentLoaded', init);
})();
