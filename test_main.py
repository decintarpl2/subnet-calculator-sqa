import pytest
from fastapi.testclient import TestClient
from main import app, hitung_subnet, alokasi_vlsm

client = TestClient(app)


# ---------------------------------------------------------------------------
# Unit Tests: hitung_subnet()
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "ip,prefix,expected",
    [
        # Skenario 1: Subnet Umum (/25)
        (
            "172.16.5.130",
            25,
            {
                "mask": "255.255.255.128",
                "network": "172.16.5.128",
                "broadcast": "172.16.5.255",
                "first_host": "172.16.5.129",
                "last_host": "172.16.5.254",
                "usable_hosts": 126,
            },
        ),
        # Skenario 2: Batas Bawah Normal (/30)
        (
            "10.0.0.0",
            30,
            {
                "mask": "255.255.255.252",
                "network": "10.0.0.0",
                "broadcast": "10.0.0.3",
                "first_host": "10.0.0.1",
                "last_host": "10.0.0.2",
                "usable_hosts": 2,
            },
        ),
        # Skenario 3: Point-to-Point (/31 - RFC 3021)
        (
            "192.168.1.0",
            31,
            {
                "mask": "255.255.255.254",
                "network": "192.168.1.0",
                "broadcast": None,
                "first_host": "192.168.1.0",
                "last_host": "192.168.1.1",
                "usable_hosts": 2,
            },
        ),
        # Skenario 4: Host Route (/32)
        (
            "192.168.1.5",
            32,
            {
                "mask": "255.255.255.255",
                "network": "192.168.1.5",
                "broadcast": None,
                "first_host": "192.168.1.5",
                "last_host": "192.168.1.5",
                "usable_hosts": 1,
            },
        ),
    ],
)
def test_hitung_subnet_valid(ip, prefix, expected):
    """Menguji kalkulasi subnet normal, /31, dan /32 sesuai spesifikasi."""
    result = hitung_subnet(ip, prefix)
    assert result == expected


@pytest.mark.parametrize(
    "ip,prefix",
    [
        ("256.1.1.1", 24),  # Error: Format IP oktet > 255
        ("192.168.01.1", 24),  # Error: Leading Zero
        ("192.168.1", 24),  # Error: Input tidak lengkap (kurang oktet)
        ("abc", 24),  # Error: Input teks non-IP
        ("", 24),  # Error: Input kosong
        ("192.168.1.1 ", 24),  # Error: Mengandung spasi
        ("192.168.1.1", 33),  # Error: Prefix out of range (>32)
        ("192.168.1.1", -1),  # Error: Prefix out of range (<0)
    ],
)
def test_hitung_subnet_invalid_raises_value_error(ip, prefix):
    """Menguji penolakan input invalid dengan raise ValueError."""
    with pytest.raises(ValueError):
        hitung_subnet(ip, prefix)


# ---------------------------------------------------------------------------
# Integration Tests: FastAPI Endpoints
# ---------------------------------------------------------------------------


def test_get_root_returns_200():
    """Menguji endpoint antarmuka web GET / merender index.html dengan status 200."""
    response = client.get("/")
    assert response.status_code == 200


@pytest.mark.parametrize(
    "ip,prefix,expected_network,expected_broadcast,expected_hosts",
    [
        ("172.16.5.130", 25, "172.16.5.128", "172.16.5.255", 126),
        ("10.0.0.0", 30, "10.0.0.0", "10.0.0.3", 2),
        ("192.168.1.0", 31, "192.168.1.0", None, 2),
        ("192.168.1.5", 32, "192.168.1.5", None, 1),
    ],
)
def test_api_subnet_success(
    ip, prefix, expected_network, expected_broadcast, expected_hosts
):
    """Menguji endpoint GET /api/subnet sukses menghasilkan status 200 dan data sesuai."""
    response = client.get("/api/subnet", params={"ip": ip, "prefix": prefix})
    assert response.status_code == 200
    data = response.json()
    assert data["network"] == expected_network
    assert data["broadcast"] == expected_broadcast
    assert data["usable_hosts"] == expected_hosts


@pytest.mark.parametrize(
    "ip,prefix",
    [
        ("256.1.1.1", 24),
        ("192.168.01.1", 24),
        ("192.168.1", 24),
        ("abc", 24),
        ("", 24),
        ("192.168.1.1", 33),
        ("192.168.1.1", -1),
    ],
)
def test_api_subnet_invalid_returns_400(ip, prefix):
    """Menguji endpoint GET /api/subnet mengembalikan status 400 dan JSON detail error untuk input tidak valid."""
    response = client.get("/api/subnet", params={"ip": ip, "prefix": prefix})
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data


# ---------------------------------------------------------------------------
# Unit Tests: alokasi_vlsm()
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "network_cidr,kebutuhan_host,expected",
    [
        # Skenario VLSM Berhasil: 192.168.1.0/24 dengan kebutuhan [100, 50, 20, 2]
        # Diurutkan menurun: 100, 50, 20, 2
        # 100 host -> butuh 2^7=128 (>=102), prefix /25, network 192.168.1.0
        # 50 host  -> butuh 2^6=64  (>=52),  prefix /26, network 192.168.1.128
        # 20 host  -> butuh 2^5=32  (>=22),  prefix /27, network 192.168.1.192
        # 2 host   -> butuh 2^2=4   (>=4),   prefix /30, network 192.168.1.224
        (
            "192.168.1.0/24",
            [100, 50, 20, 2],
            [
                {
                    "kebutuhan": 100,
                    "network_cidr": "192.168.1.0/25",
                    "mask": "255.255.255.128",
                    "network": "192.168.1.0",
                    "broadcast": "192.168.1.127",
                    "first_host": "192.168.1.1",
                    "last_host": "192.168.1.126",
                    "usable_hosts": 126,
                },
                {
                    "kebutuhan": 50,
                    "network_cidr": "192.168.1.128/26",
                    "mask": "255.255.255.192",
                    "network": "192.168.1.128",
                    "broadcast": "192.168.1.191",
                    "first_host": "192.168.1.129",
                    "last_host": "192.168.1.190",
                    "usable_hosts": 62,
                },
                {
                    "kebutuhan": 20,
                    "network_cidr": "192.168.1.192/27",
                    "mask": "255.255.255.224",
                    "network": "192.168.1.192",
                    "broadcast": "192.168.1.223",
                    "first_host": "192.168.1.193",
                    "last_host": "192.168.1.222",
                    "usable_hosts": 30,
                },
                {
                    "kebutuhan": 2,
                    "network_cidr": "192.168.1.224/30",
                    "mask": "255.255.255.252",
                    "network": "192.168.1.224",
                    "broadcast": "192.168.1.227",
                    "first_host": "192.168.1.225",
                    "last_host": "192.168.1.226",
                    "usable_hosts": 2,
                },
            ],
        ),
    ],
)
def test_alokasi_vlsm_berhasil(network_cidr, kebutuhan_host, expected):
    """Menguji alokasi VLSM berhasil menghasilkan pembagian subnet yang benar."""
    result = alokasi_vlsm(network_cidr, kebutuhan_host)
    assert result == expected


@pytest.mark.parametrize(
    "network_cidr,kebutuhan_host",
    [
        # Error: Kapasitas tidak muat (200+100 = 300 host > 254 usable di /24)
        ("192.168.1.0/24", [200, 100]),
        # Error: network_cidr bukan network address (host bit aktif)
        ("192.168.1.5/24", [10]),
        # Error: daftar kebutuhan kosong
        ("10.0.0.0/24", []),
        # Error: nilai host kurang dari 1 (nol)
        ("10.0.0.0/24", [0]),
        # Error: nilai host kurang dari 1 (negatif)
        ("10.0.0.0/24", [-1]),
        # Error: salah satu nilai dalam daftar < 1
        ("10.0.0.0/24", [10, 0]),
    ],
)
def test_alokasi_vlsm_invalid_raises_value_error(network_cidr, kebutuhan_host):
    """Menguji bahwa alokasi VLSM dengan input tidak valid melempar ValueError."""
    with pytest.raises(ValueError):
        alokasi_vlsm(network_cidr, kebutuhan_host)


# ---------------------------------------------------------------------------
# Integration Tests: POST /api/vlsm
# ---------------------------------------------------------------------------


def test_api_vlsm_success():
    """Menguji endpoint POST /api/vlsm berhasil mengembalikan 200 dan array hasil."""
    payload = {"network": "192.168.1.0/24", "kebutuhan_host": [100, 50, 20, 2]}
    response = client.post("/api/vlsm", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 4
    # Urutan hasil: diurutkan dari kebutuhan terbesar
    assert data[0]["kebutuhan"] == 100
    assert data[0]["network_cidr"] == "192.168.1.0/25"
    assert data[1]["kebutuhan"] == 50
    assert data[1]["network_cidr"] == "192.168.1.128/26"
    assert data[2]["kebutuhan"] == 20
    assert data[2]["network_cidr"] == "192.168.1.192/27"
    assert data[3]["kebutuhan"] == 2
    assert data[3]["network_cidr"] == "192.168.1.224/30"


@pytest.mark.parametrize(
    "payload",
    [
        # Kapasitas tidak muat
        {"network": "192.168.1.0/24", "kebutuhan_host": [200, 100]},
        # Network bukan network address
        {"network": "192.168.1.5/24", "kebutuhan_host": [10]},
        # Daftar kosong
        {"network": "10.0.0.0/24", "kebutuhan_host": []},
        # Nilai host < 1
        {"network": "10.0.0.0/24", "kebutuhan_host": [0]},
    ],
)
def test_api_vlsm_invalid_returns_400(payload):
    """Menguji endpoint POST /api/vlsm mengembalikan 400 dan detail error untuk input tidak valid."""
    response = client.post("/api/vlsm", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
