# JEF Daily Log Book

Aplikasi web internal JEF untuk pencatatan Daily Log Book, reporting aktivitas harian, dan dashboard task.

## Ringkasan

Aplikasi ini menyediakan:
- Halaman login sederhana untuk karyawan internal.
- Menu utama untuk membuat daily plan dan menyelesaikan laporan pekerjaan.
- Form input task harian dengan target dan pencatatan waktu.
- Halaman dashboard task menggunakan data dari Google Apps Script API.
- PWA support dengan manifest dan service worker untuk kemampuan install sebagai aplikasi.

## Fitur Utama

- Login pengguna via API eksternal.
- Pembuatan daftar task harian dengan detail target.
- Laporan task aktif dengan input waktu mulai, selesai, output hasil, dan status selesai.
- Dashboard task dengan filter tanggal dan status.
- PWA install prompt dan service worker caching sederhana.
- Penyimpanan sesi user menggunakan `localStorage`.

## Struktur Proyek

- `index.html` - Halaman utama aplikasi dengan login, menu, plan, dan report.
- `dashboard.html` - Halaman dashboard task untuk monitoring dan update task.
- `css/style.css` - Stylesheet utama.
- `js/script.js` - Semua logika aplikasi termasuk navigasi, API, dashboard, dan PWA.
- `js/manifest.json` - Konfigurasi PWA.
- `js/sw.js` - Service worker caching untuk offline ringan.
- `images/` - Asset gambar dan ikon aplikasi.

## Cara Menjalankan

1. Buka folder proyek di browser.
2. Jalankan `index.html` langsung atau gunakan server lokal.
3. Login dengan username dan password yang tersedia pada API backend.

> Catatan: Aplikasi membutuhkan koneksi ke API Google Apps Script (`WEB_APP_URL`) untuk operasi login dan penyimpanan data.

## Teknologi

- HTML5
- CSS + Bootstrap 5
- JavaScript murni
- Flatpickr untuk input waktu
- SweetAlert2 untuk notifikasi modal
- Service Worker untuk caching PWA

## Pengembangan

- Untuk mengubah tampilan, edit `css/style.css`.
- Untuk menambah logika fitur, edit `js/script.js`.
- Untuk menyesuaikan API endpoint, ubah nilai `WEB_APP_URL` di `js/script.js`.

## Catatan

- `manifest.json` mengkonfigurasi aplikasi sebagai PWA.
- `sw.js` hanya melakukan caching sederhana pada halaman `index.html` dan asset CDN.
- Halaman `dashboard.html` memuat data menggunakan localStorage untuk user yang sama.
