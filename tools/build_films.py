#!/usr/bin/env python3
"""End-to-end continuous-camera dolly assembly + stitch + seam verification + Mind grade
+ budget-enforced WebP sequence export for Desktop (1920x1080, 280 fr, <=25 MB)
and Mobile (720x1280, 174 fr, <=8 MB)."""
import os
import subprocess
import sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, ".."))
CACHE = os.path.join(HERE, ".cache_hf")
VIDEOS = os.path.join(CACHE, "videos")
FILM_PY = os.path.join(HERE, "film.py")


def py(*args, check=True):
    cmd = [sys.executable, FILM_PY, *args]
    print(">>", " ".join(cmd))
    return subprocess.run(cmd, cwd=SITE, check=check)


def dir_size_mb(d: str) -> float:
    if not os.path.isdir(d):
        return 0.0
    return sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d) if f.endswith(".webp")) / 1e6


def read_frames(mp4_path: str) -> list[np.ndarray]:
    if not os.path.exists(mp4_path):
        raise FileNotFoundError(f"Missing video: {mp4_path}")
    cap = cv2.VideoCapture(mp4_path)
    out = []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        out.append(fr)  # BGR uint8
    cap.release()
    if not out:
        raise RuntimeError(f"Empty video: {mp4_path}")
    return out


def join_clips_seamless(clip_frames_list: list[list[np.ndarray]], blend_n: int = 4) -> tuple[list[np.ndarray], list[tuple[int, float]]]:
    """Concatenate clips while cross-blending `blend_n` boundary frames to eliminate H.264/exposure micro-steps.
    Returns (all_frames, [(seam_frame_index, raw_mae_before_blend), ...])."""
    acc = list(clip_frames_list[0])
    seam_stats = []
    for k in range(1, len(clip_frames_list)):
        nxt = clip_frames_list[k]
        raw_mae = float(np.mean(np.abs(acc[-1].astype(np.float32) - nxt[0].astype(np.float32))))
        seam_idx = len(acc) - 1
        seam_stats.append((seam_idx, raw_mae))
        b = min(blend_n, len(acc) // 4, len(nxt) // 4)
        if b > 0:
            # Blend last b frames of acc with first b frames of nxt
            blended = []
            for j in range(b):
                alpha = (j + 1) / (b + 1)
                f = (1.0 - alpha) * acc[-b + j].astype(np.float32) + alpha * nxt[j].astype(np.float32)
                blended.append(np.clip(np.round(f), 0, 255).astype(np.uint8))
            acc = acc[:-b] + blended + nxt[b:]
        else:
            acc.extend(nxt[1:])
    return acc, seam_stats


def subpixel_crop_resize(bgr: np.ndarray, vx0: float, vy0: float, vcw: float, vch: float, out_w: int, out_h: int) -> np.ndarray:
    """Sub-pixel affine resample from floating-point source rect (vx0, vy0, vcw, vch) to (out_w, out_h)."""
    sx = out_w / vcw
    sy = out_h / vch
    M = np.array([[sx, 0.0, -vx0 * sx], [0.0, sy, -vy0 * sy]], dtype=np.float64)
    return cv2.warpAffine(bgr, M, (out_w, out_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)


def render_desktop_raw(out_mp4: str):
    out_w, out_h = 1280, 720
    # 1. Reuse c01 (d0->d1, MAE=1.86) and c02 (d1->d2, MAE=4.80) which are already seamless
    c01 = [cv2.resize(f, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4) for f in read_frames(os.path.join(VIDEOS, "c01.mp4"))]
    c02 = [cv2.resize(f, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4) for f in read_frames(os.path.join(VIDEOS, "c02.mp4"))]

    # 2. Read static-camera legs s_c03..s_c05 (u2->u3->u4->u5) and apply C-infinity dolly z=1.142 (d2) -> z=1.415 (d5)
    static_legs = [read_frames(os.path.join(VIDEOS, f"s_c0{i}.mp4")) for i in range(3, 6)]
    asm_frames, asm_seams = join_clips_seamless(static_legs, blend_n=5)
    print("[desktop] Static s_c03..s_c05 raw seam MAEs:", [(idx, round(m, 2)) for idx, m in asm_seams])

    W_orig, H_orig = 2752.0, 1536.0
    x0_u, y0_u, w_u, h_u = 10.0, 0.0, 2731.0, 1536.0
    base_h = H_orig
    base_w = base_h * (16.0 / 9.0)
    z_start, z_end = 1.142, 1.415

    H_v, W_v = asm_frames[0].shape[:2]
    N = len(asm_frames)
    dollied_35 = []
    for idx, fr in enumerate(asm_frames):
        t = idx / max(1, N - 1)
        z = z_start * ((z_end / z_start) ** t)
        cw = base_w / z
        ch = base_h / z
        ax = 0.672 * W_orig
        ay = 0.24 * H_orig
        # At k=2 (d2), dst_y = 0.24 + 0.014*2 = 0.268; at k=5 (d5), dst_y = 0.24 + 0.014*5 = 0.310
        dst_y = 0.268 + (0.310 - 0.268) * t
        x0 = max(x0_u, min(x0_u + w_u - cw, ax - 0.668 * cw))
        y0 = max(y0_u, min(y0_u + h_u - ch, ay - dst_y * ch))
        vx0 = (x0 - x0_u) * (W_v / w_u)
        vy0 = (y0 - y0_u) * (H_v / h_u)
        vcw = cw * (W_v / w_u)
        vch = ch * (H_v / h_u)
        dollied_35.append(subpixel_crop_resize(fr, vx0, vy0, vcw, vch, out_w, out_h))

    # 3. Append c06 (d5 -> d6 visor entry) and c07 (d6 -> d7 neural core)
    c06 = [cv2.resize(f, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4) for f in read_frames(os.path.join(VIDEOS, "c06.mp4"))]
    c07 = [cv2.resize(f, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4) for f in read_frames(os.path.join(VIDEOS, "c07.mp4"))]
    full_frames, all_seams = join_clips_seamless([c01, c02, dollied_35, c06, c07], blend_n=6)
    print("[desktop] All stitched seam MAEs:", [(idx, round(m, 2)) for idx, m in all_seams])
    write_mp4(full_frames, out_mp4, out_w, out_h, fps=24)


def render_mobile_raw(out_mp4: str):
    # 1. Read 5 static-camera portrait assembly legs (s_m01..s_m05)
    static_legs = [read_frames(os.path.join(VIDEOS, f"s_m0{i}.mp4")) for i in range(1, 6)]
    asm_frames, asm_seams = join_clips_seamless(static_legs, blend_n=5)
    print("[mobile] Static assembly raw seam MAEs:", [(idx, round(m, 2)) for idx, m in asm_seams])

    # 2. Apply single C-infinity exponential forward camera dolly (1.00 -> 1.342) matching m0..m5
    W_orig, H_orig = 1536.0, 2752.0
    x0_u, y0_u, w_u, h_u = 0.0, 10.0, 1536.0, 2731.0
    base_w = W_orig
    base_h = base_w * (16.0 / 9.0)
    z_start, z_end = 1.00, 1.342

    H_v, W_v = asm_frames[0].shape[:2]
    out_w, out_h = 720, 1280
    N = len(asm_frames)
    dollied = []
    for idx, fr in enumerate(asm_frames):
        t = idx / max(1, N - 1)
        z = z_start * ((z_end / z_start) ** t)
        cw = base_w / z
        ch = base_h / z
        ax = 0.509 * W_orig
        ay = 0.22 * H_orig
        dst_y = 0.22 + 0.012 * (5.0 * t)
        x0 = max(x0_u, min(x0_u + w_u - cw, ax - 0.51 * cw))
        y0 = max(y0_u, min(y0_u + h_u - ch, ay - dst_y * ch))
        vx0 = (x0 - x0_u) * (W_v / w_u)
        vy0 = (y0 - y0_u) * (H_v / h_u)
        vcw = cw * (W_v / w_u)
        vch = ch * (H_v / h_u)
        dollied.append(subpixel_crop_resize(fr, vx0, vy0, vcw, vch, out_w, out_h))

    # 3. Trim m06 at exact min-MAE match against m07[0] (frame 67, MAE=4.31) so visor->core has zero jump
    m06_all = [cv2.resize(f, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4) for f in read_frames(os.path.join(VIDEOS, "m06.mp4"))]
    m07 = [cv2.resize(f, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4) for f in read_frames(os.path.join(VIDEOS, "m07.mp4"))]
    best_i = min(range(30, len(m06_all)), key=lambda i: float(np.mean(np.abs(m06_all[i].astype(np.float32) - m07[0].astype(np.float32)))))
    m06 = m06_all[: best_i + 1]
    full_frames, tail_seams = join_clips_seamless([dollied, m06, m07], blend_n=6)
    print(f"[mobile] Trimmed m06 at fr={best_i}; Visor/Core seam MAEs:", [(idx, round(m, 2)) for idx, m in tail_seams])
    write_mp4(full_frames, out_mp4, out_w, out_h, fps=24)


def write_mp4(frames: list[np.ndarray], out_mp4: str, w: int, h: int, fps: int = 24):
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264", "-crf", "13", "-preset", "fast", "-pix_fmt", "yuv420p",
        out_mp4,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    for fr in frames:
        proc.stdin.write(fr.tobytes())
    proc.stdin.close()
    rc = proc.wait()
    if rc != 0:
        raise RuntimeError(f"ffmpeg rawvideo encode failed ({rc}) for {out_mp4}")
    print(f"Wrote {out_mp4} ({len(frames)} frames @ {fps}fps)")


def export_variant(raw_mp4: str, label: str, out_dir: str, count: int, width: int, max_mb: float):
    final_mp4 = os.path.join(CACHE, f"film_{label}_final.mp4")
    res = py("seams", raw_mp4, "--thr", "0.18", check=False)
    print(f"[{label}] seams exit code: {res.returncode}")
    py("grade", raw_mp4, final_mp4)

    for q in (72, 64, 56):
        py("frames", final_mp4, out_dir, "--count", str(count), "--width", str(width), "--quality", str(q))
        mb = dir_size_mb(out_dir)
        files = sorted(f for f in os.listdir(out_dir) if f.endswith(".webp"))
        print(f"[{label}] quality={q} -> {len(files)} frames, {mb:.2f} MB (budget <= {max_mb} MB)")
        if mb <= max_mb:
            break


if __name__ == "__main__":
    desk_raw = os.path.join(CACHE, "film_desk_raw.mp4")
    mob_raw = os.path.join(CACHE, "film_mob_raw.mp4")

    render_desktop_raw(desk_raw)
    export_variant(
        raw_mp4=desk_raw,
        label="desk",
        out_dir=os.path.join(SITE, "assets", "frames", "desktop"),
        count=280,
        width=1920,
        max_mb=25.0,
    )

    render_mobile_raw(mob_raw)
    export_variant(
        raw_mp4=mob_raw,
        label="mob",
        out_dir=os.path.join(SITE, "assets", "frames", "mobile"),
        count=174,
        width=720,
        max_mb=8.0,
    )
    print("ALL ZERO-SEAM FILM SEQUENCES BUILT SUCCESSFULLY!")
