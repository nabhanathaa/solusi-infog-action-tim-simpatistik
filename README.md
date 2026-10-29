# LokaKerja · "Nganggur Juga Punya Alamat"
# Tim SimpatiStik - Nabhan Athallah - Annisa Rizqiya Hanumm - Viranosa Ariana Hafsari
Aplikasi web interaktif untuk **ACTION 2026 (HMP Sains Data UNESA)**, subtema *Turning Insight into Opportunity: Analisis Pengangguran Terbuka untuk Pemerataan Kesempatan Kerja*.
Infografis A3 menjelaskan temuan; aplikasi ini **mengoperasionalkannya**: peta 514 kab/kota, klasifikasi zona otomatis, rekomendasi per peran, simulator investasi → kerja (Input-Output), radar peringatan dini, dan suara publik.

## Stack
TypeScript · Vite · React 18 · d3-scale/d3-shape · peta SVG buatan sendiri (zoom, geser, pinch) · PWA (service worker) · **tanpa server, tanpa basis data, tanpa pelacakan**.
Alasan: seluruh analisis (LISA, IO, forecast) sudah dihitung di notebook Python dan diekspor menjadi JSON, sehingga aplikasi cukup statis: cepat, murah (hosting gratis), tidak bisa "down", dan bisa dibuka offline.

## Menjalankan
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil di dist/
npm run preview    # uji hasil build
```
Perlu Node 18+ (disarankan 20).

## Struktur
```
public/data/        geo.json (path SVG 514 wilayah) · regions.json · national.json · sentimen_ringkasan.json
scripts/build_data.py   notebook output -> public/data  (Python: pandas, geopandas, shapely, scipy)
src/lib/            reco.ts (aturan rekomendasi) · sim.ts (simulator IO) · ask.ts (asisten) · colors.ts · store.tsx (rute+URL)
src/components/     MapView · Charts · RegionCard (Kartu Alamat) · Assistant · ui
src/views/          Home (scrollytelling) · Peta · Kompas · Simulator · Radar · Suara · Metode
```
## Fitur utama
1. **Beranda scrollytelling** 11 langkah, peta dan grafik berubah mengikuti cerita.
2. **Peta Alamat** 7 lapisan (TPT, LISA, tipologi, kewaspadaan, pendidikan, kemiskinan, penduduk), cari, filter provinsi, zoom/pinch.
3. **Kartu Alamat** per kab/kota: zona, status siaga + alasannya, profil vs pembanding, Moran scatter, tetangga, wilayah serupa, resep per peran, tautan bagikan.
4. **Kompas 3 peran**: Pemda (antrean prioritas, ambang atur sendiri), Pencari kerja (sektor, hambatan, langkah), Penyelenggara pelatihan (lokasi kelas paling dibutuhkan).
5. **Simulator IO**: investasi → kerja langsung/tidak langsung, upah, perbandingan skenario, kebutuhan investasi untuk menyerap X% penganggur daerah.
6. **Radar**: fan chart proyeksi, skenario *what-if*, uji ke belakang, status siaga per daerah.
7. **Suara publik**: tema keluhan + emosi → solusi per peran.
8. **Tanya Data**: asisten berbasis aturan (bukan LLM) yang menjawab dari data aplikasi.
9. **Metode & Batas**: transparansi analisis dan keterbatasan.
