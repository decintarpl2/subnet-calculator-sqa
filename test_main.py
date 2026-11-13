import pytest
from fastapi.testclient import TestClient
from main import app, hitung_subnet

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
