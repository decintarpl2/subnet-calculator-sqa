# Spesifikasi Teknis: Kalkulator Subnet dan VLSM

## Tujuan
Membangun layanan API kalkulator Subnetting dan *Variable Length Subnet Mask* (VLSM) untuk IPv4 menggunakan Python 3.12 dan FastAPI, disertai antarmuka *single-page* berbasis HTML murni. Sistem ini dirancang untuk memberikan hasil perhitungan yang akurat dan *strict* (ketat) terhadap standar jaringan, termasuk penanganan khusus untuk arsitektur *point-to-point* (/31) dan *host route* (/32).

## Aturan Validasi
Seluruh input yang masuk ke sistem, baik melalui API maupun fungsi internal, harus mematuhi aturan ketat berikut:
1. **Validasi Alamat IPv4:**
   - Harus terdiri dari tepat 4 oktet yang dipisahkan oleh titik (`.`).
   - Setiap oktet harus berupa bilangan bulat bernilai `0` hingga `255`.
   - Tidak boleh mengandung spasi.
   - Tidak boleh mengandung angka nol di depan (*leading zeros*). Contoh: `192.168.01.1` ditolak.
2. **Validasi Prefix (CIDR):**
   - Harus berupa bilangan bulat (integer) dengan rentang `0` hingga `32`.
   - Angka di luar rentang tersebut (misalnya `33` atau `-1`) ditolak.

## Kontrak Fungsi
Logika bisnis utama ditempatkan di dalam modul `main.py` tanpa state internal (*stateless*).

### 1. `hitung_subnet(ip: str, prefix: int) -> dict`
Fungsi inti untuk menghitung parameter subnet dari satu IP dan prefix.
- **Kalkulasi Network:** Dihitung secara *bitwise* (IP `AND` Subnet Mask).
- **Aturan Standar (Prefix 0-30):**
  - Jumlah usable host = $2^{(32-\text{prefix})} - 2$
- **Aturan Khusus (Edge Cases):**
  - **Prefix /31 (RFC 3021):** Menghasilkan 2 host yang valid, `broadcast` = `None`.
  - **Prefix /32 (Host Route):** Menghasilkan 1 host, `broadcast` = `None`, `first_host` = IP tersebut, dan `last_host` = IP tersebut.
- **Return Type (`dict`):** Memiliki kunci wajib: `mask`, `network`, `broadcast`, `first_host`, `last_host`, `usable_hosts`.
- **Penanganan Kesalahan:** Melakukan `raise ValueError` apabila IP atau prefix gagal melewati aturan validasi.

### 2. `alokasi_vlsm(network_cidr: str, kebutuhan_host: list[int]) -> list[dict]`
Fungsi untuk membagi blok jaringan secara dinamis berdasarkan daftar kebutuhan host.
- **Mekanisme Pengurutan:** Parameter `kebutuhan_host` harus diurutkan secara menurun (dari terbesar ke terkecil) sebelum dialokasikan.
- **Mekanisme Alokasi:** Berurutan dimulai tepat dari alamat network `network_cidr`.
- **Ukuran Blok:** Menggunakan blok subnet terkecil (berbasis pangkat 2) yang kapasitasnya $\ge$ (kebutuhan + 2), dengan batas minimum blok adalah `/30`.
- **Return Type (`list[dict]`):** Mengembalikan daftar dictionary yang mana tiap dictionary memuat:
  - `kebutuhan`: Angka kebutuhan asli dari input.
  - `network_cidr`: Alamat network beserta prefix alokasi (contoh: `192.168.1.128/26`).
  - Seluruh kunci dari hasil fungsi `hitung_subnet`.
- **Penanganan Kesalahan (`raise ValueError`):**
  - Jika `network_cidr` bukan alamat awal jaringan (Network Address) yang valid.
  - Jika daftar kebutuhan kosong atau berisi nilai kurang dari 1.
  - Jika total kapasitas yang dibutuhkan melebihi kapasitas subnet induk (tidak muat).

## Kontrak API
Sistem menyediakan antarmuka REST menggunakan FastAPI.

### 1. Endpoint Subnet Standar
- **Method & Path:** `GET /api/subnet`
- **Query Parameters:**
  - `ip` (string): Alamat IPv4.
  - `prefix` (integer): CIDR Prefix (0-32).
- **Responses:**
  - `200 OK`: Mengembalikan JSON objek dari `hitung_subnet`.
  - `400 Bad Request`: Mengembalikan JSON `{"detail": "<pesan error>"}` jika validasi gagal.

### 2. Endpoint Kalkulasi VLSM
- **Method & Path:** `POST /api/vlsm`
- **Request Body (JSON):**
  - `network` (string): CIDR lengkap (misal: "192.168.1.0/24").
  - `kebutuhan_host` (array of integer): Daftar kebutuhan host.
- **Responses:**
  - `200 OK`: Mengembalikan JSON array hasil dari `alokasi_vlsm`.
  - `400 Bad Request`: Mengembalikan JSON `{"detail": "<pesan error>"}` jika input tidak valid, jaringan tidak valid, atau blok tidak cukup.

### 3. Endpoint Antarmuka
- **Method & Path:** `GET /`
- **Responses:** `200 OK` merender file `index.html`.

## Halaman Web
- Merupakan aplikasi satu halaman (Single Page Application) dalam bentuk satu file `index.html`.
- **Mode UI:** Memiliki dua mode (Tab atau Radio Button) untuk beralih antara "Kalkulator Subnet" dan "Kalkulator VLSM".
- **Visualisasi:** Menampilkan hasil dalam bentuk tabel yang mudah dibaca.
- **Penanganan Error:** Menangkap respon HTTP 400 dari API dan menampilkan `detail` error secara eksplisit (teks berwarna merah/peringatan yang mencolok) kepada pengguna.

## Tabel Test Case
Seluruh *test cases* di bawah ini harus diimplementasikan pada file `test_main.py` menggunakan framework *pytest*.

| Skenario | Input | Hasil yang Diharapkan / Output |
| :--- | :--- | :--- |
| **Subnet Umum** | IP: `172.16.5.130`, Prefix: `25` | Network: `172.16.5.128`, Broadcast: `172.16.5.255`, Host: `126` |
| **Batas Bawah Normal** | IP: `10.0.0.0`, Prefix: `30` | Host range: `.1` sampai `.2`, Broadcast: `.3`, Host: `2` |
| **Point-to-Point** | IP: `192.168.1.0`, Prefix: `31` | Point-to-point, Broadcast: `None`, Host: `2` |
| **Host Route** | IP: `192.168.1.5`, Prefix: `32` | Broadcast: `None`, Host: `1`, First/Last Host: `.5` |
| **Error: Format IP** | IP: `256.1.1.1`, Prefix: `24` | `raise ValueError` / HTTP 400 (Ditolak) |
| **Error: Leading Zero** | IP: `192.168.01.1`, Prefix: `24` | `raise ValueError` / HTTP 400 (Ditolak) |
| **Error: Input Teks/Tidak Lengkap**| IP: `192.168.1`, atau `abc`, atau kosong | `raise ValueError` / HTTP 400 (Ditolak) |
| **Error: Prefix Out of Range** | Prefix: `33` atau `-1` | `raise ValueError` / HTTP 400 (Ditolak) |
| **VLSM Berhasil** | Network: `192.168.1.0/24`<br>Host: `100, 50, 20, 2` | - 100 host $\rightarrow$ `/25` (Network `.0`)<br>- 50 host $\rightarrow$ `/26` (Network `.128`)<br>- 20 host $\rightarrow$ `/27` (Network `.192`)<br>- 2 host $\rightarrow$ `/30` (Network `.224`) |
| **Error: VLSM Overcapacity** | Network: `192.168.1.0/24`<br>Host: `200, 100` | `raise ValueError` / HTTP 400 (Kapasitas tidak muat) |

## Di Luar Cakupan
Untuk menjaga fokus spesifikasi ini, fitur berikut dianggap *Out of Scope*:
- Dukungan atau kalkulasi untuk protokol IPv6.
- Autentikasi pengguna, *rate limiting*, atau otorisasi API.
- Penyimpanan data historis (*database*) atau persistensi hasil kalkulasi pengguna.
- Penambahan file CSS/JS eksternal berukuran besar (UX dijaga tetap *vanilla* dan ringan).