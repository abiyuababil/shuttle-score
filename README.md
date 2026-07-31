# 🏸 ShuttleScore — Tournament & Real-time Scorekeeper

**ShuttleScore** adalah aplikasi pengelola turnamen bulutangkis (badminton) modern, responsif, dan real-time yang dilengkapi dengan generator bagan otomatis (*Pixel-Perfect Bracket Tree*), pencatat skor pertandingan (*Live Scorekeeper*), dan integrasi cloud database Firebase Firestore.

🌐 **Demo Live App**: [https://badminton-cup.web.app](https://badminton-cup.web.app)  
📁 **Repository GitHub**: [https://github.com/abiyuababil/shuttle-score.git](https://github.com/abiyuababil/shuttle-score.git)

---

## 🌟 Fitur Utama

- **🏸 Generator Bagan Presisi (*Pixel-Perfect Bracket Engine*)**:
  - Menghitung koordinat node dan garis hubung SVG secara dinamis tanpa overlap.
  - Mendukung jumlah tim ganjil/genap dari 3 hingga 16 tim.
  - Penanganan babak kualifikasi (*Play-in Round*) otomatis untuk 9–15 tim (misalnya **9 tim Mixed Doubles**).
  - Penanganan *BYE* otomatis yang menyembunyikan slot kosong dan memajukan pemenang secara otomatis.

- **📱 Papan Skor Real-time (*Mobile Scorekeeper*)**:
  - Antarmuka gelap (*Dark Mode*) khusus seluler untuk petugas skor di lapangan.
  - Tombol skor besar (+1 / -1) agar mudah ditekan saat memimpin pertandingan.
  - Indikator posisi porsi servis (*shuttlecock indicator*) dengan animasi dinamis.
  - Sistem Best-of-3 Set (Game 1, Game 2, Rubber) dengan verifikasi pemenang set & pertandingan.
  - Sinkronisasi Firestore real-time — skor otomatis memperbarui bagan turnamen di layar utama.

- **⚡ Presets AMINEF Badminton Cup 2026**:
  - **Men's Doubles**: 4 tim (Irham + Abiyu, Yasa + Johan, Suparji + Sean, Nova + Rizqi).
  - **Women's Doubles**: 7 tim (Maria + Prisil, Frisca + Tinna, Thasia + Rere, Rianti + Bella, Mada + Rimma, Rahmi + Ratna, Ibu Sandra + Nabila).
  - **Mixed Doubles**: 9 tim (Anthony + Bella, Irham + Tinna, Abiyu + Maria, Nova + Frisca, Rizqi + Nabila, Yasa + Thasia, Sean + Rimma, Suparji + Rahmi, Johan + Ibu Sandra).
  - Tombol **"Buat Semua (3)"** untuk men-generate 3 kategori sekaligus dalam 1 klik.

- **🎨 UX & UI Modern**:
  - *Collapsible Form* untuk pembuat turnamen baru agar tampilan depan tetap ringkas.
  - Fitur urutkan / tukar pasangan tim (*Up/Down swap buttons*) & fitur acak (*Shuffle*).
  - Konfirmasi hapus turnamen aman di dalam halaman bagan.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React Icons](https://lucide.dev/)
- **Backend & Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Real-time NoSQL Cloud DB)
- **Hosting**: [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

## 📁 Struktur Direktori

```text
shuttle-score/
├── public/                  # Asset publik & favicon
├── src/
│   ├── assets/              # Gambar & grafik
│   ├── lib/
│   │   ├── bracketUtils.ts  # Algoritma bagan, BYE handling, Firestore logic
│   │   ├── firebase.ts      # Inisialisasi SDK Firebase
│   │   └── types.ts         # TypeScript definitions (Tournament, Match, Team)
│   ├── pages/
│   │   ├── HomePage.tsx        # Halaman utama (Turnamen Berlangsung & Form)
│   │   ├── BracketPage.tsx     # Tampilan Bagan Turnamen (SVG Overlay Engine)
│   │   └── ScorekeeperPage.tsx # Papan Skor Real-Time Mobile
│   ├── App.tsx              # Routing React Router
│   ├── index.css            # Custom CSS & Tailwind utilities
│   └── main.tsx             # Entry point React
├── .firebaserc              # Config project target Firebase
├── firebase.json            # Config rewrite routing Firebase Hosting
└── package.json
```

---

## 🚀 Panduan Memulai (*Getting Started*)

### 1. Prasyarat
Pastikan komputer Anda sudah terinstall [Node.js](https://nodejs.org/) (versi 18+).

### 2. Kloning Repository & Instalasi Dependencies
```bash
git clone https://github.com/abiyuababil/shuttle-score.git
cd shuttle-score
npm install
```

### 3. Jalankan Local Development Server
```bash
npm run dev
```
Buka browser Anda di `http://localhost:5173`.

---

## ☁️ Konfigurasi & Deployment ke Firebase

### 1. Inisialisasi Firebase Config
Konfigurasi Firebase diletakkan di `src/lib/firebase.ts`.

### 2. Build untuk Produksi
```bash
npm run build
```

### 3. Deploy ke Firebase Hosting
```bash
npx firebase-tools login
npx firebase-tools deploy --only hosting
```

Aplikasi Anda akan langsung di-deploy ke alamat live:  
`https://<project-id>.web.app`

---

## 📄 Lisensi

Proyek ini dibuat untuk turnamen **AMINEF Badminton Cup 2026** dan didistribusikan secara bebas untuk komunitas bulutangkis.
