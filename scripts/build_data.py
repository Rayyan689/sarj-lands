"""Build the single source of truth (data/portfolio.json) from the provided files.

Run: python3 scripts/build_data.py <dir with sarj-lands-riyadh.json and investor-inquiries.json>
Nothing is dropped: all 120 parcels and 48 inquiries are kept. Every fix is logged in `corrections`.
"""
import json, math, statistics as st, sys
from collections import defaultdict
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads")
OUT = Path(__file__).resolve().parent.parent / "data" / "portfolio.json"
SNAPSHOT = "2026-08-11"

parcels = json.loads((SRC / "sarj-lands-riyadh.json").read_text())
inquiries = json.loads((SRC / "investor-inquiries.json").read_text())
corrections = []

# Approximate public coordinates of well-known Riyadh anchors (used for straight-line distances only).
ANCHORS = {
    "kafd": {"en": "King Abdullah Financial District", "ar": "مركز الملك عبدالله المالي", "lat": 24.7636, "lng": 46.6400},
    "airport": {"en": "King Khalid International Airport", "ar": "مطار الملك خالد الدولي", "lat": 24.9576, "lng": 46.6988},
    "kingdom": {"en": "Kingdom Centre (Olaya)", "ar": "برج المملكة (العليا)", "lat": 24.7114, "lng": 46.6744},
    "diriyah": {"en": "Diriyah", "ar": "الدرعية", "lat": 24.7342, "lng": 46.5754},
}

def km(a_lat, a_lng, b_lat, b_lng):
    r = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))

# ---------- fixes ----------
for p in parcels:
    lat, lng = p["lat"], p["lng"]
    if not (24 < lat < 25.3) and (24 < lng < 25.3) and (46 < lat < 47.3):
        p["lat"], p["lng"] = lng, lat
        corrections.append({"parcel_id": p["parcel_id"], "field": "lat/lng",
            "issue": f"Latitude and longitude were swapped ({lat}, {lng}), which places the parcel outside Saudi Arabia.",
            "action": "Swapped back so the parcel plots in its district."})
    p["price_on_request"] = p["total_price_sar"] is None or p["price_per_sqm_sar"] is None
    if p["price_on_request"]:
        corrections.append({"parcel_id": p["parcel_id"], "field": "price",
            "issue": "No price per sqm and no total price in the source data.",
            "action": "Kept in the portfolio and shown as 'Price on request'. Excluded from price statistics. Inquiries route to sales."})

corrections.append({"parcel_id": None, "field": "days_on_market",
    "issue": "Days on market keeps counting to the 11 Aug 2026 snapshot even for sold and leased parcels, so it measures listing age, not time to close.",
    "action": "Shown as 'listed X days ago'. Never presented as time to sell."})
corrections.append({"parcel_id": None, "field": "total_price_sar",
    "issue": "Totals are size x price per sqm rounded to the nearest SAR 1,000 (e.g. SRE-105: 31,500 shown as 32,000).",
    "action": "Source totals kept as the official price."})

# ---------- benchmarks (priced parcels only, all statuses = market evidence) ----------
groups = defaultdict(list)
for p in parcels:
    if p["price_on_request"]:
        continue
    k = (p["listing_type"], p["land_type"])
    groups[("area",) + k + (p["area_of_city"],)].append(p["price_per_sqm_sar"])
    groups[("district",) + k + (p["district_en"],)].append(p["price_per_sqm_sar"])
    groups[("city",) + k].append(p["price_per_sqm_sar"])
med = {k: st.median(v) for k, v in groups.items()}
cnt = {k: len(v) for k, v in groups.items()}

def frontage(w):
    if w >= 36: return "main_road"
    if w >= 20: return "collector"
    return "internal"

def size_class(s):
    if s < 500: return "single_plot"
    if s < 1500: return "large_plot"
    if s < 5000: return "development"
    return "large_scale"

# aggregate demand per segment (no personal data)
demand = defaultdict(int)
for q in inquiries:
    demand[(q["area_of_city_wanted"], q["land_type_wanted"], q["prefers"])] += 1

out_parcels = []
for p in parcels:
    k = (p["listing_type"], p["land_type"])
    d = {}
    if not p["price_on_request"]:
        a_med = med[("area",) + k + (p["area_of_city"],)]
        d["area_median_sqm"] = a_med
        d["area_peer_count"] = cnt[("area",) + k + (p["area_of_city"],)]
        d["vs_area_pct"] = round((p["price_per_sqm_sar"] / a_med - 1) * 100)
        dk = ("district",) + k + (p["district_en"],)
        if cnt[dk] >= 2:
            d["district_median_sqm"] = med[dk]
            d["vs_district_pct"] = round((p["price_per_sqm_sar"] / med[dk] - 1) * 100)
    dist = {key: round(km(p["lat"], p["lng"], a["lat"], a["lng"]), 1) for key, a in ANCHORS.items()}
    comps = [q["parcel_id"] for q in parcels
             if q["parcel_id"] != p["parcel_id"] and q["status"] in ("sold", "leased")
             and q["listing_type"] == p["listing_type"] and q["land_type"] == p["land_type"]
             and q["area_of_city"] == p["area_of_city"]]
    out_parcels.append({**p,
        "frontage": frontage(p["street_width_m"]),
        "size_class": size_class(p["area_sqm"]),
        "listing_age_days": p["days_on_market"],
        "pricing": d,
        "distances_km": dist,
        "closed_comps": comps,
        "segment_demand": demand[(p["area_of_city"], p["land_type"], p["listing_type"])],
    })

out = {
    "snapshot_date": SNAPSHOT,
    "anchors": ANCHORS,
    "parcels": out_parcels,
    "inquiries": inquiries,
    "corrections": corrections,
    "benchmarks": [{"scope": k[0], "listing_type": k[1], "land_type": k[2], "key": k[3] if len(k) > 3 else "Riyadh",
                    "median_sqm": med[k], "count": cnt[k]} for k in med if k[0] in ("area", "city")],
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"wrote {OUT}: {len(out_parcels)} parcels, {len(inquiries)} inquiries, {len(corrections)} corrections")
