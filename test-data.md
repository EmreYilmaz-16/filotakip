# Filo Takip - Test Verisi

---

## 1. ARAÇ TİPLERİ
> Menü: Araçlar → Araç Tipi alanında görünür (önceden tanımlı gelir)

| Ad |
|----|
| Kamyon |
| Kamyonet |
| Otobüs |
| Binek |
| Forklift |

---

## 2. ARAÇLAR
> Menü: Araçlar → Araç Ekle

| Plaka | Marka | Model | Yıl | Tip | Yakıt Tipi | Güncel KM | Renk | VIN / Şasi No |
|-------|-------|-------|-----|-----|-----------|-----------|------|---------------|
| 34 ABC 001 | Ford | Transit | 2021 | Kamyonet | Dizel | 87.450 | Beyaz | WF0XXXTTGXKA12345 |
| 34 DEF 002 | Mercedes | Actros | 2020 | Kamyon | Dizel | 215.300 | Gri | WDB9634031L123456 |
| 34 GHI 003 | Volkswagen | Crafter | 2022 | Kamyonet | Dizel | 43.200 | Siyah | WV1ZZZ2EZ M4001234 |
| 06 JKL 004 | Renault | Master | 2019 | Kamyonet | Dizel | 132.800 | Beyaz | VF1JD000564123456 |
| 06 MNO 005 | Toyota | Hilux | 2023 | Kamyonet | Dizel | 12.600 | Kırmızı | AHTEZ29G507123456 |

---

## 3. SÜRÜCÜLER
> Menü: Sürücüler → Sürücü Ekle

| Ad | Soyad | TC Kimlik | Telefon | E-posta | Ehliyet No | Ehliyet Sınıfı | Ehliyet Bitiş |
|----|-------|-----------|---------|---------|-----------|----------------|---------------|
| Ahmet | Yılmaz | 12345678901 | 0532 111 22 33 | ahmet.yilmaz@test.com | E-123456 | CE | 15.03.2028 |
| Mehmet | Kaya | 23456789012 | 0533 222 33 44 | mehmet.kaya@test.com | E-234567 | CE | 22.07.2027 |
| Ali | Demir | 34567890123 | 0534 333 44 55 | ali.demir@test.com | E-345678 | B | 10.11.2029 |
| Hasan | Çelik | 45678901234 | 0535 444 55 66 | hasan.celik@test.com | E-456789 | CE | 05.02.2026 ⚠️ |
| Fatma | Arslan | 56789012345 | 0536 555 66 77 | fatma.arslan@test.com | E-567890 | B | 18.09.2028 |

---

## 4. ZİMMETLER
> Menü: Zimmetler → Zimmet Ekle

| Araç | Sürücü | Zimmet Tarihi | Notlar |
|------|--------|---------------|--------|
| 34 ABC 001 | Ahmet Yılmaz | 01.01.2026 | Uzun dönem zimmet |
| 34 DEF 002 | Mehmet Kaya | 15.01.2026 | Ankara-İstanbul hattı |
| 34 GHI 003 | Ali Demir | 10.02.2026 | Şehiriçi dağıtım |
| 06 JKL 004 | Hasan Çelik | 20.03.2026 | — |

> 06 MNO 005 Toyota Hilux → zimmetlenmemiş (havuzda)

---

## 5. YAKIT KAYITLARI
> Menü: Yakıt Takibi → Yakıt Kaydı Ekle

| Araç | Sürücü | Tarih | KM | Yakıt Tipi | Litre | Birim Fiyat | İstasyon |
|------|--------|-------|----|-----------|-------|-------------|----------|
| 34 ABC 001 | Ahmet Yılmaz | 05.04.2026 | 86.100 | Dizel | 65.50 | 42.90 | Shell - Kadıköy |
| 34 ABC 001 | Ahmet Yılmaz | 14.04.2026 | 87.000 | Dizel | 70.20 | 43.10 | BP - Ümraniye |
| 34 DEF 002 | Mehmet Kaya | 03.04.2026 | 214.500 | Dizel | 120.00 | 42.85 | Opet - TEM |
| 34 DEF 002 | Mehmet Kaya | 18.04.2026 | 215.300 | Dizel | 115.80 | 43.20 | Total - E-5 |
| 34 GHI 003 | Ali Demir | 10.04.2026 | 42.800 | Dizel | 55.30 | 43.00 | Shell - Beşiktaş |
| 06 JKL 004 | Hasan Çelik | 08.04.2026 | 131.900 | Dizel | 80.00 | 42.95 | Petrol Ofisi - Ankara |

---

## 6. BAKIM TAKİBİ
> Menü: Bakım Takibi → Bakım Zamanlaması Ekle

### Bakım Tipleri (önce bunları ekle → Bakım Tipi alanı)

| Bakım Tipi | Açıklama |
|-----------|----------|
| Yağ Değişimi | Motor yağı ve filtre |
| Lastik Rotasyonu | 4 lastik rotasyon |
| Fren Kontrolü | Balatalar ve diskler |
| Genel Bakım | Periyodik servis |
| Akü Kontrolü | Akü şarj ve terminal |

### Bakım Zamanlamaları

| Araç | Bakım Tipi | KM Aralığı | Son KM | Son Tarih | Sonraki Tarih |
|------|-----------|-----------|--------|-----------|---------------|
| 34 ABC 001 | Yağ Değişimi | 15.000 | 80.000 | 10.01.2026 | 10.07.2026 |
| 34 ABC 001 | Lastik Rotasyonu | 20.000 | 70.000 | 15.11.2025 | 15.05.2026 |
| 34 DEF 002 | Yağ Değişimi | 20.000 | 200.000 | 05.02.2026 | 05.08.2026 |
| 34 DEF 002 | Genel Bakım | 40.000 | 200.000 | 05.02.2026 | 05.02.2027 |
| 06 JKL 004 | Fren Kontrolü | 30.000 | 120.000 | 01.03.2026 | 01.09.2026 |

> **Not:** 34 ABC 001 - Yağ Değişimi için son KM 80.000, mevcut KM 87.450 → **GECİKMİŞ görünmeli** ✅

---

## 7. ARIZA TAKİBİ
> Menü: Arıza Takibi → Arıza Bildir

| Araç | Sürücü | Tarih | Başlık | Kategori | Önem | Açıklama |
|------|--------|-------|--------|----------|------|---------|
| 34 DEF 002 | Mehmet Kaya | 20.04.2026 | Motor uyarı lambası yandı | Motor | Yüksek | Kontrol motorunu göster uyarısı sabahtan beri yanıyor |
| 06 JKL 004 | Hasan Çelik | 22.04.2026 | Sol ön lastik basıncı düşük | Lastikler | Orta | Sol ön lastik her sabah hava kaybediyor |
| 34 GHI 003 | Ali Demir | 25.04.2026 | Klima soğutmuyor | Elektrik | Düşük | Sıcak havalarda klima devreye girmiyor |
| 34 ABC 001 | Ahmet Yılmaz | 27.04.2026 | Fren pedalı sert basıyor | Frenler | Kritik | Frenleme mesafesi uzadı, pedal sert hissettiriyor |

---

## 8. SEFER DEFTERİ
> Menü: Sefer Defteri → Sefer Ekle

| Araç | Sürücü | Tarih | Kalkış Saati | Kalkış Yeri | Varış Yeri | Gidiş KM | Dönüş KM | Dönüş Saati | Açıklama |
|------|--------|-------|-------------|------------|-----------|---------|---------|------------|---------|
| 34 ABC 001 | Ahmet Yılmaz | 10.04.2026 | 08:00 | İstanbul Depo | Ankara Müşteri | 86.200 | 87.000 | 18:30 | Malzeme teslimatı |
| 34 DEF 002 | Mehmet Kaya | 12.04.2026 | 06:00 | İstanbul | İzmir | 214.600 | 215.100 | 20:00 | Büyük yük transferi |
| 34 GHI 003 | Ali Demir | 15.04.2026 | 09:30 | Merkez Depo | Anadolu Yakası | 42.850 | 43.100 | 14:00 | Şehiriçi dağıtım |
| 06 MNO 005 | — | 20.04.2026 | 07:00 | Ankara Merkez | Eskişehir | 12.700 | — | — | **Devam eden sefer** (dönüş girilmeyecek) |

---

## 9. SÜRÜCÜ BELGELERİ
> Menü: Sürücü Belgeleri → Belge Ekle

| Sürücü | Belge Tipi | Belge No | Veriliş Tarihi | Geçerlilik Bitiş | Veren Kurum |
|--------|-----------|---------|----------------|-----------------|-------------|
| Ahmet Yılmaz | SRC | SRC-2021-12345 | 10.06.2021 | 10.06.2026 ⚠️ | Ulaştırma Bakanlığı |
| Mehmet Kaya | SRC | SRC-2020-23456 | 15.03.2020 | 15.03.2025 ❌ | Ulaştırma Bakanlığı |
| Ali Demir | Psikoteknik | PSK-2023-34567 | 20.09.2023 | 20.09.2025 ❌ | Özel Tıp Merkezi |
| Hasan Çelik | Sağlık Raporu | SGL-2024-45678 | 05.01.2024 | 05.01.2027 ✅ | Devlet Hastanesi |
| Fatma Arslan | Takograf Kartı | TK-TR-56789 | 01.04.2024 | 01.04.2029 ✅ | Karayolları |
| Ahmet Yılmaz | Takograf Kartı | TK-TR-11111 | 15.07.2022 | 15.07.2027 ✅ | Karayolları |
| Mehmet Kaya | Sağlık Raporu | SGL-2023-22222 | 10.10.2023 | 10.10.2026 ⚠️ | Özel Hastane |

> **Beklenen sonuçlar:**
> - ❌ Geçersiz: Mehmet Kaya SRC, Ali Demir Psikoteknik
> - ⚠️ Yakında bitiyor: Ahmet Yılmaz SRC (Haziran 2026), Mehmet Kaya Sağlık (Ekim 2026)
> - ✅ Geçerli: diğerleri

---

## 10. VERGİ TAKİBİ (MTV)
> Menü: Vergi Takibi → Vergi Kaydı Ekle

| Araç | Vergi Tipi | Yıl | Taksit | Tutar | Vade Tarihi | Durum |
|------|-----------|-----|--------|-------|-------------|-------|
| 34 ABC 001 | MTV | 2026 | 1. Taksit | 4.250,00 ₺ | 31.01.2026 | Ödendi |
| 34 ABC 001 | MTV | 2026 | 2. Taksit | 4.250,00 ₺ | 31.07.2026 | Bekliyor |
| 34 DEF 002 | MTV | 2026 | 1. Taksit | 12.800,00 ₺ | 31.01.2026 | Ödendi |
| 34 DEF 002 | MTV | 2026 | 2. Taksit | 12.800,00 ₺ | 31.07.2026 | Bekliyor |
| 34 GHI 003 | MTV | 2026 | 1. Taksit | 5.600,00 ₺ | 31.01.2026 | Bekliyor ⚠️ |
| 34 GHI 003 | MTV | 2026 | 2. Taksit | 5.600,00 ₺ | 31.07.2026 | Bekliyor |
| 06 JKL 004 | MTV | 2026 | 1. Taksit | 3.900,00 ₺ | 31.01.2026 | Ödendi |
| 06 MNO 005 | MTV | 2026 | 1. Taksit | 6.100,00 ₺ | 31.01.2026 | Ödendi |

> **Not:** 34 GHI 003 1. taksit vadesi geçmiş ve ödenmemiş → **Gecikmiş** görünmeli ✅

---

## 11. ARAÇ BELGELERİ
> Menü: Araçlar → Araç Detay → Belgeler

| Araç | Belge Tipi | Belge No | Başlangıç | Bitiş | Notlar |
|------|-----------|---------|-----------|-------|--------|
| 34 ABC 001 | Sigorta (Kasko) | KSK-2026-111 | 01.01.2026 | 31.12.2026 ✅ | Allianz |
| 34 ABC 001 | Muayene | MUY-2025-111 | 15.06.2025 | 15.06.2026 ⚠️ | TÜVTÜRK |
| 34 DEF 002 | Sigorta (Kasko) | KSK-2026-222 | 01.03.2026 | 28.02.2027 ✅ | Axa |
| 34 DEF 002 | Muayene | MUY-2024-222 | 10.10.2024 | 10.10.2025 ❌ | TÜVTÜRK |
| 06 MNO 005 | Ruhsat | RHT-2023-555 | 15.04.2023 | — | Araç ruhsatı |

---

## GİRİŞ SIRASI ÖNERİSİ

1. **Araçlar** (5 araç)
2. **Sürücüler** (5 sürücü)
3. **Zimmetler** (4 zimmet)
4. **Bakım Tipleri + Bakım Zamanlamaları**
5. **Yakıt Kayıtları**
6. **Seferler** (4 sefer, 1 tanesi devam ediyor)
7. **Arıza Bildirimleri** (4 arıza)
8. **Sürücü Belgeleri** (7 belge)
9. **Vergi Kayıtları** (8 kayıt, 1. taksitler ödendi olarak işaretle)
10. **Araç Belgeleri** (araç detay sayfasından)

---

## DASHBOARD'DA BEKLENTİLER

Tüm veriler girildikten sonra dashboard'da şunlar görünmeli:
- 🔴 Gecikmiş bakım: 34 ABC 001 yağ değişimi
- 🔴 Geçersiz belgeler: Mehmet Kaya SRC + Ali Demir Psikoteknik
- ⚠️ Yakında bitecek belgeler: Ahmet Yılmaz SRC
- 🔴 Bekleyen MTV: 34 GHI 003 (vade geçmiş)
- 🚨 Açık arıza: 34 ABC 001 kritik fren sorunu
