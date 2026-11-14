#!/usr/bin/env python3
"""Prepare progressive dolly-in 1920x1080 (desktop) and 1080x1920 (mobile) keyframes
from 2K Higgsfield stills so every adjacent pair (d_k -> d_{k+1}) shares the exact
same studio geometry along one continuous forward camera trajectory."""
import argparse
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache_hf")
OUT = os.path.join(CACHE, "framed")

DESK_NAMES = [
    "desk_00_wireframe",
    "desk_01_base",
    "desk_02_skeleton",
    "desk_03_actuators",
    "desk_04_wired",
    "desk_05_master",
    "desk_06_visor_entry",
    "desk_07_neural_core",
]

MOB_NAMES = [
    "mob_00_wireframe",
    "mob_01_base",
    "mob_02_skeleton",
    "mob_03_actuators",
    "mob_04_wired",
    "mob_05_master",
    "mob_06_visor_entry",
    "mob_07_neural_core",
]

# Smooth exponential forward dolly curve across K0..K5 (stages 1..5 -> finished robot)
DESK_ZOOMS = [1.00, 1.068, 1.142, 1.224, 1.314, 1.415]
MOB_ZOOMS = [1.00, 1.058, 1.120, 1.188, 1.262, 1.342]


def crop_aspect(img: Image.Image, out_w: int, out_h: int, zoom: float, src_anchor: tuple[float, float], dst_anchor: tuple[float, float]):
    W, H = img.size
    aspect = out_w / out_h
    if W / H >= aspect:
        base_h = float(H)
        base_w = base_h * aspect
    else:
        base_w = float(W)
        base_h = base_w / aspect

    cw = base_w / zoom
    ch = base_h / zoom

    ax = src_anchor[0] * W
    ay = src_anchor[1] * H
    x0 = ax - dst_anchor[0] * cw
    y0 = ay - dst_anchor[1] * ch

    x0 = max(0.0, min(W - cw, x0))
    y0 = max(0.0, min(H - ch, y0))

    box = (int(round(x0)), int(round(y0)), int(round(x0 + cw)), int(round(y0 + ch)))
    cropped = img.crop(box).resize((out_w, out_h), Image.Resampling.LANCZOS)

    def map_pt(nx: float, ny: float):
        px = nx * W
        py = ny * H
        return round((px - x0) / cw, 4), round((py - y0) / ch, 4)

    return cropped, map_pt


def process_desktop():
    os.makedirs(OUT, exist_ok=True)
    meta = []
    # Src anchor near upper chest/visor (0.672, 0.24), placed on right third (0.665, 0.28)
    for i, name in enumerate(DESK_NAMES):
        src = os.path.join(CACHE, f"{name}.png")
        if not os.path.exists(src):
            raise FileNotFoundError(src)
        img = Image.open(src).convert("RGB")
        if i <= 5:
            z = DESK_ZOOMS[i]
            # Subtle upward tilt toward visor on K4->K5 so c06 flies straight into the visor
            dst_y = 0.24 + 0.014 * i
            framed, mp = crop_aspect(img, 1920, 1080, z, (0.672, 0.24), (0.668, dst_y))
            pts = {
                "visor": mp(0.668, 0.162),
                "chest": mp(0.672, 0.295),
                "pelvis": mp(0.672, 0.455),
                "knee": mp(0.640, 0.645),
            }
        else:
            framed, _ = crop_aspect(img, 1920, 1080, 1.0, (0.5, 0.5), (0.5, 0.5))
            pts = {"visor": (0.60, 0.36), "core": (0.65, 0.42)}
        out_path = os.path.join(OUT, f"d{i}.png")
        framed.save(out_path, format="PNG", optimize=False)
        meta.append({"index": i, "name": name, "file": out_path, "points": pts})
        print(f"[desktop] d{i}.png <- {name}.png  pts={pts}")
    return meta


def process_mobile():
    os.makedirs(OUT, exist_ok=True)
    meta = []
    # Src anchor on robot upper chest (0.509, 0.22), kept in upper half so bottom 40% stays clear for copy
    for i, name in enumerate(MOB_NAMES):
        src = os.path.join(CACHE, f"{name}.png")
        if not os.path.exists(src):
            raise FileNotFoundError(src)
        img = Image.open(src).convert("RGB")
        if i <= 5:
            z = MOB_ZOOMS[i]
            dst_y = 0.22 + 0.012 * i
            framed, mp = crop_aspect(img, 1080, 1920, z, (0.509, 0.22), (0.51, dst_y))
            pts = {
                "visor": mp(0.509, 0.132),
                "chest": mp(0.509, 0.235),
                "pelvis": mp(0.509, 0.345),
                "knee": mp(0.475, 0.460),
            }
        else:
            framed, _ = crop_aspect(img, 1080, 1920, 1.0, (0.5, 0.5), (0.5, 0.5))
            pts = {"visor": (0.54, 0.32), "core": (0.54, 0.36)}
        out_path = os.path.join(OUT, f"m{i}.png")
        framed.save(out_path, format="PNG", optimize=False)
        meta.append({"index": i, "name": name, "file": out_path, "points": pts})
        print(f"[mobile]  m{i}.png <- {name}.png  pts={pts}")
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", choices=["desktop", "mobile", "all"], default="all")
    args = ap.parse_args()
    report = {}
    if args.set in ("desktop", "all"):
        report["desktop"] = process_desktop()
    if args.set in ("mobile", "all"):
        report["mobile"] = process_mobile()
    out_json = os.path.join(OUT, f"framed_{args.set}.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print("Saved metadata:", out_json)
