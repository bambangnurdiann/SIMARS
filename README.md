# SIMARS - Sistem Informasi Manajemen Surat

SIMARS adalah aplikasi manajemen surat masuk, surat keluar, dan surat keputusan yang dirancang khusus untuk instansi pemerintahan (Pengadilan).

## Fitur Utama

- **Dashboard Statistik**: Visualisasi data surat masuk dan keluar per bulan serta per klasifikasi.
- **Manajemen Surat Masuk**: Pencatatan surat masuk, upload file, dan sistem disposisi.
- **Sistem Disposisi**: Alur kerja disposisi dari pimpinan ke pegawai dengan notifikasi email.
- **Manajemen Surat Keluar**: Penomoran surat otomatis sesuai pola instansi.
- **Manajemen Surat Keputusan (SK)**: Pengarsipan SK instansi.
- **Buku Agenda**: Cetak agenda surat berdasarkan periode tanggal ke PDF dan Excel.
- **Manajemen Pengguna**: 4 level akses (Super Admin, Admin, Pimpinan, Pegawai).
- **Notifikasi Email**: Notifikasi otomatis ke Pimpinan untuk surat baru dan ke Pegawai untuk disposisi baru.
- **Dark Mode**: Dukungan penuh mode gelap untuk kenyamanan mata.

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **UI Components**: shadcn/ui + Lucide Icons
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Server**: Express (untuk API Email)
- **Email**: Resend API
- **Export**: xlsx (Excel) + jsPDF (PDF)

## Instalasi

1. Clone repository ini.
2. Jalankan `npm install` untuk menginstal dependensi.
3. Buat file `.env` berdasarkan `.env.example` dan isi dengan konfigurasi Firebase serta Resend API Key Anda.
4. Jalankan `npm run dev` untuk memulai server pengembangan.

## Konfigurasi Firebase

Pastikan Anda telah mengaktifkan:
- **Authentication**: Email/Password provider.
- **Firestore Database**: Dalam mode produksi atau test.
- **Storage**: Untuk penyimpanan file surat dan logo.

## Struktur Folder

- `/src/pages`: Halaman utama aplikasi.
- `/src/components`: Komponen UI reusable.
- `/src/lib`: Konfigurasi Firebase, Email, dan fungsi Export.
- `/src/hooks`: Custom hooks untuk autentikasi.
- `/server.ts`: Server Express untuk menangani API backend (Email).

## Lisensi

Apache-2.0
