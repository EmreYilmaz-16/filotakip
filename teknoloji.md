# Mulk Yonetim Sistemi - Kullanilan Teknolojiler ve Bagimliliklar

Bu dokuman, bu tarz bir mulk ve kira yonetim uygulamasi yazdirirken kullanilan teknoloji yigini, kutuphaneler, servisler ve altyapi bilesenlerini ozetler.

## Genel Mimari

- Frontend: React tabanli, mobil uyumlu web uygulamasi
- Backend: Node.js + Express REST API
- Veritabani: PostgreSQL
- Reverse proxy: Nginx
- Dagitim: Docker Compose
- Kimlik dogrulama: JWT tabanli oturum yapisi
- Dosya yukleme: Multer tabanli upload sistemi
- PWA destegi: Vite PWA eklentisi ile telefona kurulabilir yapi

## Frontend Teknolojileri

Ana yapi:

- React `^18.3.1`
- React DOM `^18.3.1`
- Vite `^5.3.3`
- Tailwind CSS `^3.4.4`
- PostCSS `^8.4.39`
- Autoprefixer `^10.4.19`

Arayuz ve istemci tarafi kutuphaneler:

- React Router DOM `^6.24.0`
  Amac: sayfa yonetimi ve route bazli gezinme
- @tanstack/react-query `^5.45.1`
  Amac: API verisi cekme, cache, yenileme, mutation yonetimi
- Axios `^1.7.2`
  Amac: backend API istekleri
- React Hook Form `^7.52.1`
  Amac: form yonetimi ve validasyon akisi
- Zustand `^4.5.4`
  Amac: oturum ve istemci tarafi global state yonetimi
- Lucide React `^0.395.0`
  Amac: ikon seti

Grafik ve gorsellestirme:

- Chart.js `^4.4.9`
- react-chartjs-2 `^5.3.0`
- Recharts `^2.12.7`

Mobil ve medya islemleri:

- heic2any `^0.0.4`
  Amac: iPhone HEIC/HEIF gorsellerini tarayici tarafinda JPEG'e cevirmek

PWA ve kurulum:

- vite-plugin-pwa `^0.20.0`
  Amac: uygulamanin telefona kurulabilmesi, manifest ve service worker uretimi

## Backend Teknolojileri

Sunucu tarafi ana yapi:

- Node.js
- Express `^4.19.2`

Guvenlik ve kimlik dogrulama:

- jsonwebtoken `^9.0.2`
  Amac: JWT token uretimi ve dogrulamasi
- bcryptjs `^2.4.3`
  Amac: sifre hashleme
- helmet `^7.1.0`
  Amac: temel HTTP guvenlik header'lari
- cors `^2.8.5`
  Amac: istemci kaynak erisim kontrolu
- express-rate-limit `^7.3.1`
  Amac: rate limiting ile kaba kuvvet ve suistimal riskini azaltma

API yardimci kutuphaneleri:

- express-validator `^7.1.0`
  Amac: request validasyonu
- dotenv `^16.4.5`
  Amac: ortam degiskenleri yonetimi
- multer `^1.4.5-lts.1`
  Amac: dosya yukleme islemleri
- pg `^8.12.0`
  Amac: PostgreSQL baglantisi ve sorgular

Gelistirme bagimliligi:

- nodemon `^3.1.4`
  Amac: local gelistirmede otomatik yeniden baslatma

## Veritabani ve Veri Katmani

- PostgreSQL 16 Alpine image
- SQL migration/init tabanli kurulum
- Iliskisel veri modeli
- Mulk, kiraci, sozlesme, kira, gider, belge ve lokasyon tablolari

Bu yapida tipik olarak su veri alanlari bulunur:

- Mulkler
- Kiracilar
- Sozlesmeler
- Kiralar / tahsilatlar
- Giderler
- Belgeler
- Bakim / tadilat kayitlari
- Sehir / ilce / mahalle verileri

## DevOps ve Dagitim Altyapisi

Container altyapisi:

- Docker
- Docker Compose

Servisler:

- `db`: PostgreSQL veritabani
- `backend`: Node.js / Express API
- `frontend`: React uygulamasi icin build container
- `nginx`: reverse proxy ve static servis katmani

Reverse proxy gorevleri:

- `/api/v1/*` isteklerini backend'e yonlendirme
- SPA frontend dosyalarini servis etme
- tek giris noktasi saglama

Kalici veri alanlari:

- PostgreSQL volume
- Upload dosyalari icin ayri volume

## Bu Tarz Bir Uygulamada Kullanilan Temel Ozellik Gruplari

- Mulk yonetimi
- Kiraci kayitlari
- Sozlesme takibi
- Aylik kira tahakkuku ve tahsilat izleme
- Gider yonetimi
- Belge yukleme ve indirme
- Dashboard ve grafikler
- Mobil uyumlu kullanim
- PWA kurulum destegi
- Rol bazli veya oturum bazli erisim kontrolu

## Neden Bu Teknoloji Yigini Tercih Edildi

- React + Vite: hizli gelistirme, mobil uyumlu arayuz ve kolay component yapisi
- Express + PostgreSQL: CRUD agirlikli is uygulamalarinda sade ve guvenilir yapi
- React Query: listeleme, filtreleme ve dashboard verilerinde cache avantajı
- Tailwind CSS: hizli ve tutarli arayuz gelistirme
- Docker Compose: lokal ve sunucu ortaminda ayni kurulum mantigi
- Nginx: SPA ve API'yi tek domain altinda sunmak icin pratik cozum
- JWT: mobil istemciler ve web istemcileri icin uygun oturum modeli

## Yeni Bir Benzer Uygulama Yazdirirken Soz Edilmesi Faydalı Olan Ek Notlar

- Frontend ve backend ayri proje klasorleri olarak tasarlanabilir
- API REST mimarisi ile kurulabilir
- Veritabani PostgreSQL kalabilir
- Dosya yukleme, belge yonetimi ve mobil kamera yuklemeleri baslangictan planlanmali
- PWA destegi isteniyorsa manifest, icon seti ve service worker daha ilk asamada dahil edilmeli
- Dashboard tarafinda grafik kutuphaneleri bastan secilmeli
- Uretim ortami icin Docker, Nginx ve environment variable yapisi standartlastirilmali

## Ozet

Bu uygulama icin kullanilan ana stack su sekildedir:

- React + Vite + Tailwind CSS
- React Query + Axios + React Hook Form + Zustand
- Node.js + Express
- PostgreSQL
- JWT + bcrypt + helmet + rate limit
- Multer ile dosya yukleme
- Chart.js / Recharts ile raporlama
- Docker Compose + Nginx ile deployment
- Vite PWA ile mobil kurulum destegi

Bu dosya, ayni tarzda yeni bir uygulama gelistirme talebi verirken teknik referans olarak kullanilabilir.