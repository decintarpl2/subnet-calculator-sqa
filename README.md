# Kalkulator Subnet IPv4 Berbasis Web

Aplikasi web modern, responsif, dan interaktif untuk menghitung subnetting IPv4 secara instan. Dirancang khusus untuk mempermudah praktikum dan pelatihan jaringan komputer.

---

## 🚀 Fitur Utama

1. **Input Fleksibel & Real-Time**:
   - Mendukung input IP standar (contoh: `192.168.1.100`) maupun langsung dalam notasi CIDR (contoh: `192.168.1.100/24`).
   - Prefix CIDR dapat diatur melalui **Dropdown**, **Input Angka (/0 s/d /32)**, maupun **Slider Interaktif**.
   - Tombol pilihan cepat (*Quick Presets*) untuk kelas umum: `/8 (Kelas A)`, `/16 (Kelas B)`, `/24 (Kelas C)`, `/26`, `/28`, dan `/30 (Point-to-Point)`.

2. **Hasil Perhitungan Lengkap**:
   - **Network Address**: Alamat jaringan / subnet ID.
   - **Broadcast Address**: Alamat broadcast untuk mengirim paket ke seluruh host dalam subnet.
   - **Rentang Host (Usable Host Range)**: Host pertama (*First Usable*) s/d Host terakhir (*Last Usable*).
   - **Jumlah Host Valid**: Jumlah perangkat/host yang dapat dialokasikan (rumus: $2^{(32 - n)} - 2$).
   - **Total Alamat IP**: Jumlah total alamat (rumus: $2^{(32 - n)}$).
   - **Subnet Mask & Wildcard Mask**: Tersedia dalam format desimal bertitik dan heksadesimal.
   - **Identifikasi Kelas & Jenis IP**: Mendeteksi otomatis Kelas A, B, C, D, E serta tipe IP (Privat RFC 1918, Publik, Loopback, APIPA, dsb).

3. **Visualisasi Biner & Bitmask**:
   - Menampilkan representasi biner 32-bit untuk IP Address, Subnet Mask, Network ID, dan Broadcast.
   - Pemisahan warna kontras antara **Bit Network** (Biru) dan **Bit Host** (Kuning/Amber).
   - Bar progress persentase alokasi bit Network vs bit Host.

4. **Tabel Referensi CIDR (Cheat Sheet)**:
   - Tabel lipat (*accordion*) berisi seluruh daftar prefix dari `/0` hingga `/32`.
   - Menampilkan Subnet Mask, Wildcard Mask, Jumlah Host Valid, dan Total Alamat.
   - Klik pada baris mana saja di tabel untuk langsung menerapkan prefix tersebut.

5. **Fitur Pendukung**:
   - Tombol **Salin Cepat**: Salin hasil per kartu atau salin seluruh ringkasan dengan satu klik.
   - Mode Gelap (*Dark Theme*) & Mode Terang (*Light Theme*) dengan penyimpanan preferensi otomatis.
   - Validasi input otomatis untuk mencegah kesalahan ketik IP.

---

## 📁 Struktur File

```text
Calculator/
├── index.html     # Halaman utama aplikasi (struktur HTML5 semantik)
├── style.css      # Desain modern, responsif, dark/light theme, visual biner
├── script.js      # Algoritma perhitungan subnetting IPv4 & manipulasi DOM
└── README.md      # Dokumentasi penggunaan aplikasi
```

---

## 💻 Cara Menjalankan

Aplikasi ini dibuat murni berbasis **HTML, CSS, dan JavaScript murni (Vanilla)** tanpa dependensi eksternal yang rumit.

### Opsi 1: Buka Langsung di Browser (Paling Mudah)
Cukup **klik dua kali (*double click*)** file `index.html` atau klik kanan lalu pilih **Open with > Google Chrome / Microsoft Edge / Mozilla Firefox**.

### Opsi 2: Menggunakan Local Server (Opsional)
Jika ingin menjalankan via server lokal (misalnya menggunakan Python):
```bash
# Di direktori project:
python -m http.server 8000
```
Lalu buka browser di alamat: [http://localhost:8000](http://localhost:8000).

---

## 📐 Rumus Dasar Subnetting IPv4

- **Subnet Mask**: $n$ bit pertama bernilai `1`, sisanya bernilai `0`.
- **Wildcard Mask**: Invers bitwise dari Subnet Mask ($\sim\text{Mask}$).
- **Network Address**: $\text{IP} \ \& \ \text{Subnet Mask}$.
- **Broadcast Address**: $\text{Network Address} \ | \ \text{Wildcard Mask}$.
- **Host Pertama**: $\text{Network Address} + 1$ (untuk prefix $\le 30$).
- **Host Terakhir**: $\text{Broadcast Address} - 1$ (untuk prefix $\le 30$).
- **Jumlah Host Valid**: $2^{(32 - n)} - 2$ (dengan perlakuan khusus untuk $/31$ sesuai RFC 3021 dan $/32$).

