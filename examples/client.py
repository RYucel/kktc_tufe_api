"""
KKTC TÜFE API - Python Örnek İstemci
Harici kütüphane gerektirmez (yerleşik urllib kullanılır)
"""

import json
import urllib.request
import os

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000")

def get_json(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "KKTC-Python-Client/1.0"})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))

def main():
    print("=== KKTC TÜFE API - Python Örneği ===")

    # 1. En son veriyi çek
    print("\n1. En son TÜFE bülteni:")
    latest = get_json("/api/v1/latest")
    data = latest["data"]
    print(f"Dönem: {data['monthName']} {data['year']}")
    print(f"Aylık: %{data['aylikYuzde']} | Yıllık: %{data['yillikYuzde']}")

    # 2. KKTC Dönem kümülatifleri
    print("\n2. KKTC 6 Aylık Maaş Endeksleme Dönemleri:")
    periods = get_json("/api/v1/periods?year=2024")
    p_data = periods["data"]
    print(f"1. Dönem (Ocak - Haziran): %{p_data['period1']['cumulativeRate']}")
    print(f"2. Dönem (Temmuz - Aralık): %{p_data['period2']['cumulativeRate']}")

    # 3. Enflasyon değerleme aracı
    print("\n3. Enflasyon Değerleme Aracı (10.000 TL):")
    calc = get_json("/api/v1/calculate?start_year=2023&start_month=1&end_year=2024&end_month=12&amount=10000")
    print(calc["result"]["note"])
    print(f"Kümülatif Enflasyon: %{calc['result']['cumulativeInflationPct']}")

if __name__ == "__main__":
    main()
