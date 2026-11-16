# [Feature] Kalkulator VLSM (Variable Length Subnet Mask)

## Deskripsi

Fitur ini mengimplementasikan kalkulator VLSM (*Variable Length Subnet Mask*) untuk IPv4.
VLSM memungkinkan pembagian satu blok jaringan menjadi beberapa subnet dengan ukuran berbeda-beda
sesuai kebutuhan host masing-masing departemen, secara otomatis diurutkan dari kebutuhan terbesar
ke terkecil (best-fit descending).

## Tugas

- [ ] Tambahkan fungsi `alokasi_vlsm(network_cidr: str, kebutuhan_host: list[int]) -> list[dict]` di `main.py`
- [ ] Tambahkan endpoint `POST /api/vlsm` di `main.py`
- [ ] Hubungkan tab VLSM di `index.html` ke endpoint `POST /api/vlsm`
- [ ] Tulis test VLSM di `test_main.py` (TDD — test ditulis lebih dulu)
- [ ] Jalankan CI sampai hijau

## Kriteria Penerimaan

Mengacu pada tabel test di `SPEC.md`:

| Skenario | Input | Hasil yang Diharapkan |
|:---|:---|:---|
| **VLSM Berhasil** | Network: `192.168.1.0/24`<br>Host: `[100, 50, 20, 2]` | - 100 host → `/25` (Network `192.168.1.0`)<br>- 50 host → `/26` (Network `192.168.1.128`)<br>- 20 host → `/27` (Network `192.168.1.192`)<br>- 2 host → `/30` (Network `192.168.1.224`) |
| **Error: VLSM Overcapacity** | Network: `192.168.1.0/24`<br>Host: `[200, 100]` | `raise ValueError` / HTTP 400 (Kapasitas tidak muat) |
| **Error: Network Bukan Address** | Network: `192.168.1.5/24` | `raise ValueError` / HTTP 400 |
| **Error: Daftar Kosong** | `kebutuhan_host: []` | `raise ValueError` / HTTP 400 |
| **Error: Nilai Host < 1** | `kebutuhan_host: [0]` atau `[-1]` | `raise ValueError` / HTTP 400 |
| **API POST /api/vlsm Berhasil** | Body JSON valid | HTTP 200 + array hasil alokasi |
| **API POST /api/vlsm Gagal** | Body JSON tidak valid | HTTP 400 + `{"detail": "<pesan>"}` |

### Kontrak `alokasi_vlsm`:
- Urutkan `kebutuhan_host` **menurun** (terbesar ke terkecil) sebelum dialokasikan
- Alokasi berurutan mulai tepat dari alamat network `network_cidr`
- Ukuran blok = pangkat 2 terkecil yang kapasitasnya ≥ (kebutuhan + 2), minimum `/30`
- Tiap hasil memuat: `kebutuhan`, `network_cidr` (CIDR alokasi), + semua kunci `hitung_subnet`
- `raise ValueError` jika: network bukan alamat awal, daftar kosong/nilai < 1, atau kapasitas tidak muat

## Alur Kerja

```
issue (dokumen ini)
  → branch feature/issue-<nomor>-vlsm dari main terbaru
    → test_main.py: tambah test VLSM (TDD — test DULU, merah)
      → main.py: kerangka alokasi_vlsm (raise NotImplementedError)
        → uv run pytest → konfirmasi MERAH
          → commit "test: tulis test VLSM lebih dulu"
            → main.py: implementasikan alokasi_vlsm + POST /api/vlsm
              → index.html: hubungkan tab VLSM ke API
                → uv run pytest → konfirmasi HIJAU
                  → commit "feat: implementasi alokasi_vlsm dan API VLSM"
                    → git push
                      → gh pr create (Closes #<nomor>)
                        → gh pr checks --watch → hijau
                          → gh pr merge → main
```

