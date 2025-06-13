import os
import argparse
import json
import xarray as xr
import time

parser = argparse.ArgumentParser(description="Convert NetCDF to GeoJSON with filtering")
parser.add_argument("--region", type=str, default="northwest_russia", help="Region name (used in .nc filename)")
parser.add_argument("--stride", type=int, default=1, help="Sampling stride (default=1)")
parser.add_argument("--bbox", type=str, default="", help="Bounding box as lon_min,lat_min,lon_max,lat_max")
parser.add_argument("--max-features", type=int, default=10000, help="Maximum number of features")
parser.add_argument("--quiet", action="store_true", help="Suppress detailed output")

args = parser.parse_args()

region = args.region
stride = args.stride
max_features = args.max_features
bbox_vals = [float(x) for x in args.bbox.split(",")] if args.bbox else None
quiet = args.quiet

input_path = os.path.join("downloads", f"{region}_currents.nc")
output_path = os.path.join("src", "assets", f"{region}_currents.geojson")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

if not os.path.exists(input_path):
    print(f"[ERROR] Файл не найден: {input_path}")
    exit(1)

if not quiet:
    print("Чтение NetCDF-файла...")

ds = xr.open_dataset(input_path)
lons = ds["longitude"].values
lats = ds["latitude"].values

u = ds["uo"]
v = ds["vo"]

# Удаление размерности time, depth (если есть)
if "depth" in u.dims:
    u = u.isel(time=0, depth=0)
    v = v.isel(time=0, depth=0)
else:
    u = u.isel(time=0)
    v = v.isel(time=0)

u = u.values
v = v.values

features = []
total = 0
start = time.time()

for i in range(0, u.shape[0], stride):
    for j in range(0, u.shape[1], stride):
        lon = float(lons[j])
        lat = float(lats[i])
        u_val = float(u[i, j])
        v_val = float(v[i, j])

        # Пропуск точек с NaN
        if not (u_val == u_val and v_val == v_val):  # Проверка на NaN
            continue

        speed = (u_val**2 + v_val**2)**0.5

        if bbox_vals:
            if not (bbox_vals[0] <= lon <= bbox_vals[2] and bbox_vals[1] <= lat <= bbox_vals[3]):
                continue

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "u": round(u_val, 3),
                "v": round(v_val, 3),
                "speed": round(speed, 3)
            }
        }
        features.append(feature)
        total += 1

        if not quiet and total % 1000 == 0:
            print(f"Записано {total} объектов...")

        if total >= max_features:
            break
    if total >= max_features:
        break

geojson = {
    "type": "FeatureCollection",
    "features": features
}

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"✅ Сохранено: {output_path}")
print(f"🌍 Всего объектов: {total}")
print(f"⏱ Время: {round(time.time() - start, 2)} сек.")