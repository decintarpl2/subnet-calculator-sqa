from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse

app = FastAPI(title="Kalkulator Subnet & VLSM IPv4")


def validate_ip(ip: str) -> list[int]:
    """Validasi format alamat IPv4 secara ketat sesuai SPEC.md."""
    if not isinstance(ip, str):
        raise ValueError("Alamat IP harus berupa string.")

    if " " in ip or "\t" in ip or "\n" in ip:
        raise ValueError("Alamat IP tidak boleh mengandung spasi.")

    octets_str = ip.split(".")
    if len(octets_str) != 4:
        raise ValueError("Alamat IP harus terdiri dari tepat 4 oktet.")

    octets: list[int] = []
    for oct_s in octets_str:
        if not oct_s.isdigit():
            raise ValueError(f"Oktet '{oct_s}' bukan angka valid.")
        if len(oct_s) > 1 and oct_s.startswith("0"):
            raise ValueError(
                f"Angka nol di depan (leading zero) tidak diperbolehkan: '{oct_s}'."
            )
        val = int(oct_s)
        if not (0 <= val <= 255):
            raise ValueError(
                f"Nilai oktet {val} di luar rentang yang diizinkan (0-255)."
            )
        octets.append(val)

    return octets


def validate_prefix(prefix: int) -> int:
    """Validasi prefix CIDR rentang 0-32."""
    if not isinstance(prefix, int) or isinstance(prefix, bool):
        try:
            prefix = int(prefix)
        except (ValueError, TypeError):
            raise ValueError("Prefix harus berupa bilangan bulat.")

    if not (0 <= prefix <= 32):
        raise ValueError(f"Prefix {prefix} di luar rentang yang diizinkan (0-32).")

    return prefix


def ip_to_int(octets: list[int]) -> int:
    """Konversi 4 oktet ke bilangan bulat 32-bit unsigned."""
    return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]


def int_to_ip(val: int) -> str:
    """Konversi integer 32-bit ke format string IPv4 dotted-decimal."""
    return f"{(val >> 24) & 255}.{(val >> 16) & 255}.{(val >> 8) & 255}.{val & 255}"


def prefix_to_mask_int(prefix: int) -> int:
    """Menghasilkan representasi integer dari subnet mask berdasarkan prefix."""
    if prefix == 0:
        return 0
    return ((0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF)


def hitung_subnet(ip: str, prefix: int) -> dict:
    """Menghitung parameter subnet IPv4 secara bitwise sesuai SPEC.md."""
    octets = validate_ip(ip)
    prefix_val = validate_prefix(prefix)

    ip_int = ip_to_int(octets)
    mask_int = prefix_to_mask_int(prefix_val)
    mask_str = int_to_ip(mask_int)

    # Kalkulasi Network dihitung secara bitwise (IP AND Subnet Mask)
    network_int = ip_int & mask_int
    network_str = int_to_ip(network_int)

    # Aturan khusus /32 (Host Route)
    if prefix_val == 32:
        return {
            "mask": mask_str,
            "network": network_str,
            "broadcast": None,
            "first_host": network_str,
            "last_host": network_str,
            "usable_hosts": 1,
        }

    # Aturan khusus /31 (RFC 3021 Point-to-Point)
    if prefix_val == 31:
        return {
            "mask": mask_str,
            "network": network_str,
            "broadcast": None,
            "first_host": network_str,
            "last_host": int_to_ip(network_int + 1),
            "usable_hosts": 2,
        }

    # Aturan standar (Prefix 0-30)
    wildcard_int = (~mask_int) & 0xFFFFFFFF
    broadcast_int = network_int | wildcard_int
    broadcast_str = int_to_ip(broadcast_int)

    if prefix_val == 0:
        usable_hosts = 2**32 - 2
        first_host = "0.0.0.1"
        last_host = "255.255.255.254"
    else:
        usable_hosts = 2 ** (32 - prefix_val) - 2
        first_host = int_to_ip(network_int + 1)
        last_host = int_to_ip(broadcast_int - 1)

    return {
        "mask": mask_str,
        "network": network_str,
        "broadcast": broadcast_str,
        "first_host": first_host,
        "last_host": last_host,
        "usable_hosts": usable_hosts,
    }


@app.get("/")
def get_root():
    """Merender file index.html antarmuka web."""
    index_file = Path(__file__).parent / "index.html"
    if not index_file.exists():
        index_file = Path("index.html")
    return FileResponse(index_file)


@app.get("/api/subnet")
def api_subnet(ip: str = Query(""), prefix: int | str = Query("")):
    """Endpoint API perhitungan subnet IPv4."""
    try:
        try:
            prefix_int = int(prefix)
        except (ValueError, TypeError):
            raise ValueError(f"Prefix '{prefix}' harus berupa integer antara 0 dan 32.")
        return hitung_subnet(ip, prefix_int)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
