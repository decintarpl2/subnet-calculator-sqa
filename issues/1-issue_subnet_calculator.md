## Deskripsi

Membangun fitur inti **Kalkulator Subnet IPv4 dan VLSM (Variable Length Subnet Mask)** menggunakan Python 3.12 dan FastAPI dengan antarmuka web interaktif berbasis Single Page Application (SPA). Fitur ini ditujukan sebagai modul alat peraga pembelajaran jaringan komputer yang mematuhi standar RFC (termasuk RFC 3021 untuk link *point-to-point* /31 dan *host route* /32) dengan aturan validasi input yang ketat (*strict*).

Dokumen spesifikasi teknis lengkap mengacu pada [SPEC.md](../SPEC.md) dan desain antarmuka mengacu pada [DESIGN.md](../DESIGN.md).

---

## Tugas

- [ ] **Validasi Input Ketat**:
  - Validasi IPv4: tepat 4 oktet, bernilai 0–255, tidak ada spasi, dan **tidak ada angka nol di depan (*leading zeros*)** (contoh `192.168.01.1` harus ditolak).
  - Validasi Prefix: bilangan bulat rentang 0 hingga 32 (angka di luar rentang ditolak).
- [ ] **Logika Bisnis Subnetting (`main.py`)**:
  - Implementasi fungsi `hitung_subnet(ip: str, prefix: int) -> dict` dengan kunci `mask`, `network`, `broadcast`, `first_host`, `last_host`, `usable_hosts`.
  - Penanganan khusus prefix `/31` (2 host valid, broadcast: `None`) dan `/32` (1 host valid, broadcast: `None`, first/last host: IP input).
- [ ] **Logika Bisnis VLSM (`main.py`)**:
  - Implementasi fungsi `alokasi_vlsm(network_cidr: str, kebutuhan_host: list[int]) -> list[dict]`.
  - Pengurutan kebutuhan secara menurun (*descending*).
  - Alokasi blok terkecil yang mencukupi dengan batas minimum `/30`.
  - Validasi network induk dan penanganan galat jika kapasitas melebihi (*overcapacity*).
- [ ] **FastAPI Endpoints**:
  - `GET /api/subnet` dengan query parameters `ip` dan `prefix`.
  - `POST /api/vlsm` dengan JSON body `network` dan `kebutuhan_host`.
  - `GET /` merender `index.html`.
  - Respon error HTTP 400 dengan format `{"detail": "<pesan error>"}` saat validasi gagal.
- [ ] **Pengujian Otomatis (TDD)**:
  - Implementasi seluruh skenario pengujian pada `test_main.py` menggunakan `pytest` dan `httpx`.
- [ ] **Integrasi Antarmuka Web**:
  - Integrasi antarmuka tab Subnet & VLSM pada `index.html` dengan API backend.
  - Tampilan visual penanganan pesan error HTTP 400 secara eksplisit dan mencolok.

---

## Kriteria Penerimaan

Kriteria penerimaan diverifikasi melalui pengujian otomatis unit & integrasi yang merujuk pada tabel uji di [SPEC.md](../SPEC.md):

| No | Skenario | Input Uji | Kriteria Hasil yang Diharapkan |
| :---: | :--- | :--- | :--- |
| 1 | **Subnet Umum** | IP: `172.16.5.130`, Prefix: `25` | Network: `172.16.5.128`, Broadcast: `172.16.5.255`, Usable Host: `126` |
| 2 | **Batas Bawah Normal** | IP: `10.0.0.0`, Prefix: `30` | Host range: `10.0.0.1` s/d `10.0.0.2`, Broadcast: `10.0.0.3`, Usable Host: `2` |
| 3 | **Point-to-Point (RFC 3021)** | IP: `192.168.1.0`, Prefix: `31` | Broadcast: `None`, Usable Host: `2` |
| 4 | **Host Route** | IP: `192.168.1.5`, Prefix: `32` | Broadcast: `None`, Usable Host: `1`, First Host: `192.168.1.5`, Last Host: `192.168.1.5` |
| 5 | **Error: Format IP** | IP: `256.1.1.1`, Prefix: `24` | `raise ValueError` / HTTP 400 (Ditolak) |
| 6 | **Error: Leading Zero** | IP: `192.168.01.1`, Prefix: `24` | `raise ValueError` / HTTP 400 (Ditolak) |
| 7 | **Error: Input Teks/Tidak Lengkap** | IP: `192.168.1`, `abc`, atau kosong | `raise ValueError` / HTTP 400 (Ditolak) |
| 8 | **Error: Prefix Out of Range** | Prefix: `33` atau `-1` | `raise ValueError` / HTTP 400 (Ditolak) |
| 9 | **VLSM Berhasil** | Network: `192.168.1.0/24`<br>Kebutuhan: `100, 50, 20, 2` | - 100 host &rarr; `/25` (Net `192.168.1.0`)<br>- 50 host &rarr; `/26` (Net `192.168.1.128`)<br>- 20 host &rarr; `/27` (Net `192.168.1.192`)<br>- 2 host &rarr; `/30` (Net `192.168.1.224`) |
| 10 | **Error: VLSM Overcapacity** | Network: `192.168.1.0/24`<br>Kebutuhan: `200, 100` | `raise ValueError` / HTTP 400 (Kapasitas tidak muat) |

---

## Alur Kerja (Workflow)

Pengembangan fitur ini wajib mengikuti disiplin alur kerja berikut:

1. **Issue**: Buat dan identifikasi tiket issue di GitHub sebagai dasar pengerjaan.
2. **Branch**: Buat cabang fitur baru dari branch `main` dengan format penamaan:
   `feature/issue-<nomor>-subnet-calculator`
3. **Test Dulu (TDD - Test Driven Development)**: Tulis pengujian di `test_main.py` terlebih dahulu berdasarkan tabel kriteria penerimaan. Pastikan test awalnya gagal (*red phase*).
4. **Implementasi**: Tulis kode implementasi pada `main.py` dan `index.html` hingga seluruh pengujian lulus (*green phase*).
5. **Commit**: Lakukan commit perubahan dengan pesan commit yang jelas dan terstruktur sesuai konvensi conventional commits.
6. **Pull Request**: Buka Pull Request (PR) ke branch `main` dengan mencantumkan referensi `Closes #<nomor>`.
7. **CI**: Jalankan rangkaian pengujian otomatis dan linting pada pipeline CI untuk memastikan integritas kode.
8. **Merge**: Gabungkan PR ke branch `main` setelah seluruh pengujian lulus dan peninjauan disetujui.
