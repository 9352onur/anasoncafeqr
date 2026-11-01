# 🌿 Anason Cafe & Bistro - Dijital QR Menü & Yönetim Sistemi

Anason Cafe için özel olarak geliştirilmiş, mobil öncelikli (Mobile-First), ultra lüks lounge tasarımına sahip, canlı döviz kurlu ve 5 dil destekli yeni nesil Dijital QR Menü web uygulaması.

---

## 🌟 Öne Çıkan Özellikler

### 📱 1. Müşteri QR Menü Arayüzü (`/`)
- **Lüks Lounge & Kafe Estetiği:** Koyu mat zemin (`#0c0d10`), zarif altın ve kehribar ışıltılar, cam (glassmorphism) ürün kartları ve pürüzsüz mikro animasyonlar.
- **Tüm Menüye Sadık Kalınan Eksiksiz Liste:** 
  - Nargile Menüsü (İmza Karışımlar, Premium Karışımlar, Ferah Buzlu Aromalar, Klasik Aromalar, Özel Servisler)
  - Kahvaltı & Yumurtalar & Tostlar
  - Atıştırmalıklar & Çıtırlar
  - Burgerler (Patates kızartması eşliğinde)
  - Pizzalar (İtalyan mayalı)
  - Makarnalar & Penne & Spagetti
  - Sandviç & Çıtır Wrap Çeşitleri
  - Salatalar (Sezar, Tavuklu Sezar, Akdeniz)
  - Ana Yemekler (Izgara, Köri Soslu, Mantar Soslu Tavuk, Tavuk & Et Fajita)
  - Tatlılar (San Sebastian, Lotus Cheesecake, Sufle, Brownie, Magnolia, Tiramisu)
  - Soğuk İçecekler (Ev yapımı limonatalar, frozen, smoothie, milkshake, mocktail, meşrubatlar)
  - Kahve & Çay Çeşitleri (Espresso bazlı, soğuk kahveler, Anason Special, közde Türk kahvesi, 3. nesil V60/Chemex demlemeler, bitki çayları)
- **Nargile Menüsü İçin Özel İkonlar:** Meyve ve aroma bileşenleri için özel simgeler (🍇 Üzüm, 🌿 Nane, ❄️ Ice, 🥭 Mango, 🍉 Karpuz, 🍓 Çilek, 🍍 Ananas, 🍋 Limon, 🍏 Elma, 🫧 Sakız vb.).
- **Alerjen Göstergeleri:** Yiyecek ve içeceklerde alerjen etiketleri (🌾 Gluten, 🥛 Laktoz, 🥜 Kuruyemiş, 🥚 Yumurta, 🐟 Balık) ve tek tıkla alerjen filtreleme özelliği.
- **Canlı Döviz Çevirici (Canlı API):**
  - Üst barda yer alan döviz seçici ile fiyatlar tek tıkla **₺ TRY, $ USD, € EUR veya £ GBP** cinsine anlık canlı kurla çevrilir.
  - Canlı kur API'si otomatik güncellenir ve internet kesintilerine karşı yedekli çalışır.
- **5 Dilde Çoklu Dil (i18n):**
  - 🇹🇷 Türkçe (TR)
  - 🇬🇧 İngilizce (EN)
  - 🇩🇪 Almanca (DE)
  - 🇷🇺 Rusça (RU)
  - 🇸🇦 Arapça (AR - Tam RTL sağdan sola desteği ile)
- **Google Yorum & Sosyal Medya Teşviki:**
  - Sayfa sonunda göz alıcı 5 yıldızlı interaktif "Google'da Değerlendirin" kartı ve ekranın köşesinde sabit floating değerlendirme butonu (Doğrudan [Google Yorum](https://www.google.com/searchviewer/10?svid=CAwSHRIbCgNwdnESFENnMHZaeTh4TVhSdGJqQXdjVGRpGAo) linkine açılır).
  - [@anasoncafefethiye](https://www.instagram.com/anasoncafefethiye/) Instagram yönlendirmesi.
- **Orijinal Menü Sayfaları Galerisi:** Müşteriler tek tıkla kafenin basılı menü fotoğraflarını (`1.jpeg` - `5.jpeg`) modal penceresinde inceleyebilir.

---

### 🔐 2. Güvenli Yönetim Paneli (`/admin`)
- **PIN Korumalı Giriş:** 
  - Varsayılan PIN: `1923`
  - Admin panelinden güvenlik PIN kodu kolayca değiştirilebilir.
- **Hızlı Fiyat Yönetimi:**
  - Tüm ürünlerin fiyatı TL (₺) cinsinden liste üzerinden anında düzenlenebilir ve "Fiyatları Kaydet" butonu ile tek tıkla güncellenir.
- **Ürün Ekleme & Çıkarma (CRUD):**
  - Menüye yeni yiyecek, içecek veya nargile ekleme.
  - Ürün stok durumu (Stokta Var / Tükendi) anında değiştirilebilir.
  - Öne çıkan rozetleri (Özel, Popüler, Şefin Seçimi, Klasik) seçilebilir.
  - Ürün silme imkanı.
- **Masa QR Kod Üretici & Yazdırma:**
  - Masalara koymak için dinamik QR kodu oluşturur, PNG olarak indirmeyi ve doğrudan yazdırmayı sağlar.

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Python 3.9+
- Yüklü kütüphaneler: `fastapi`, `uvicorn`, `requests`, `pydantic`

### Başlatma
Terminalde proje klasöründe şu komutu çalıştırın:
```bash
python server.py
```

Tarayıcınızdan erişin:
- **Müşteri QR Menüsü:** [http://localhost:8000](http://localhost:8000)
- **Yönetim Paneli:** [http://localhost:8000/admin](http://localhost:8000/admin) (Varsayılan PIN: `1923`)
