#!/usr/bin/env python3
"""Film pipeline for build-story sites (cross-platform: needs ffmpeg + ffprobe on PATH).

  python tools/film.py stitch  out.mp4 clip1.mp4 clip2.mp4 ...   # chain FLF clips, drop duplicated seam frame
  python tools/film.py seams   film.mp4 [--thr 0.12]              # per-frame scene score; flags jumps/cuts
  python tools/film.py stabilize film.mp4 out.mp4                 # vidstab 2-pass (fallback: deshake)
  python tools/film.py grade   film.mp4 out.mp4                   # unify grade, light grain, 1-pass
  python tools/film.py frames  film.mp4 assets/frames/desktop --count 300 --width 1920 [--quality 72]
  python tools/film.py frames  film.mp4 assets/frames/mobile  --count 180 --width 720 --portrait [--fx 0.5]
  python tools/film.py scrubvideo film.mp4 assets/film-desktop.mp4 --width 1920 [--gop 1]
"""
import argparse, json, os, re, shutil, statistics, subprocess, sys, tempfile

def run(cmd):
    print('$', ' '.join(cmd)); subprocess.run(cmd, check=True)

def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
                          'stream=width,height,r_frame_rate,nb_read_frames:format=duration', '-of', 'json', path],
                         capture_output=True, text=True, check=True).stdout
    j = json.loads(out); s = j['streams'][0]; n, d = s['r_frame_rate'].split('/')
    return {'w': int(s['width']), 'h': int(s['height']), 'fps': float(n) / float(d),
            'frames': int(s.get('nb_read_frames', 0)), 'dur': float(j['format']['duration'])}

def stitch(a):
    # Every clip after the first starts on the previous clip's last frame (first/last-frame conditioning),
    # so drop its first frame; normalise fps/size/pixel format so the concat cannot glitch.
    p0 = probe(a.clips[0]); fps = round(p0['fps']) or 24
    inputs, parts = [], []
    for i, c in enumerate(a.clips):
        inputs += ['-i', c]
        trim = '' if i == 0 else 'trim=start_frame=1,setpts=PTS-STARTPTS,'
        parts.append(f'[{i}:v]{trim}fps={fps},scale={p0["w"]}:{p0["h"]}:flags=lanczos,setsar=1,format=yuv420p[v{i}]')
    graph = ';'.join(parts) + ';' + ''.join(f'[v{i}]' for i in range(len(a.clips))) + f'concat=n={len(a.clips)}:v=1:a=0[out]'
    run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', graph, '-map', '[out]', '-an',
         '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', a.out])

def seams(a):
    # scene score per frame (0..1). A continuous camera move scores ~0.00–0.04; a cut/jump spikes >0.1.
    film_abs = os.path.abspath(a.film)
    with tempfile.TemporaryDirectory() as td:
        log = os.path.join(td, 'scores.txt')
        flt = "select='gte(scene,0)',metadata=print:key=lavfi.scene_score:file=scores.txt"
        subprocess.run(['ffmpeg', '-v', 'error', '-i', film_abs, '-vf', flt, '-an', '-f', 'null', '-'], cwd=td, check=True)
        txt = open(log).read()
    frames = [int(x) for x in re.findall(r'frame:(\d+)', txt)]
    scores = [float(x) for x in re.findall(r'lavfi\.scene_score=([\d.]+)', txt)]
    if not scores: print('no scores'); return 1
    med = statistics.median(scores); p95 = sorted(scores)[int(len(scores) * 0.95)]
    bad = [(f, s) for f, s in zip(frames, scores) if s > a.thr or s > max(0.02, med * 6)]
    print(f'frames {len(scores)}  median {med:.4f}  p95 {p95:.4f}  max {max(scores):.4f}  threshold {a.thr}')
    for f, s in bad: print(f'  JUMP at frame {f}: score {s:.4f}')
    print('SEAMS PASS' if not bad else f'SEAMS FAIL ({len(bad)} suspicious frames)')
    return 0 if not bad else 2

def stabilize(a):
    with tempfile.TemporaryDirectory() as td:
        trf = os.path.join(td, 't.trf').replace(os.sep, '/').replace(':', '\\:')
        try:
            run(['ffmpeg', '-y', '-v', 'error', '-i', a.film, '-vf', f'vidstabdetect=shakiness=4:accuracy=15:result={trf}', '-f', 'null', '-'])
            run(['ffmpeg', '-y', '-v', 'error', '-i', a.film, '-vf', f'vidstabtransform=input={trf}:smoothing=30:zoom=2:optzoom=0,unsharp=5:5:0.4',
                 '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', a.out])
        except subprocess.CalledProcessError:
            run(['ffmpeg', '-y', '-v', 'error', '-i', a.film, '-vf', 'deshake=rx=24:ry=24', '-an', '-c:v', 'libx264', '-crf', '14', a.out])

def grade(a):
    # Mind cinema look: crisp contrast, clean obsidian shadows, cool cyan/violet fidelity, subtle temporal grain.
    vf = ("eq=contrast=1.04:saturation=1.05:gamma=0.98,"
          "unsharp=5:5:0.32:3:3:0.0,"
          "noise=alls=2:allf=t,format=yuv420p")
    run(['ffmpeg', '-y', '-v', 'error', '-i', a.film, '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', a.out])

def frames(a):
    p = probe(a.film); total = p['frames'] or int(p['dur'] * p['fps'])
    if os.path.isdir(a.dir):
        for old in os.listdir(a.dir):
            if old.endswith(('.' + a.format)):
                os.remove(os.path.join(a.dir, old))
    os.makedirs(a.dir, exist_ok=True)
    step = max(1.0, (total - 1) / max(1, a.count - 1)) if total >= a.count else 1.0
    sel = f"select='lt(mod(n\\,{step:.6f})\\,1)'"
    if a.portrait:
        crop = f"crop='min(iw,ih*9/16)':ih:'(iw-min(iw,ih*9/16))*{a.fx}':0,"
        scale = f'scale={a.width}:{round(a.width * 16 / 9 / 2) * 2}:flags=lanczos'
    else:
        crop, scale = '', f'scale={a.width}:-2:flags=lanczos'
    ext = a.format
    codec = ['-c:v', 'libwebp', '-quality', str(a.quality), '-compression_level', '6', '-preset', 'photo'] if ext == 'webp' \
        else ['-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '30', '-cpu-used', '6'] if ext == 'avif' \
        else ['-q:v', '4']
    run(['ffmpeg', '-y', '-v', 'error', '-i', a.film, '-vf', f'{sel},{crop}{scale}', '-fps_mode', 'vfr',
         '-frames:v', str(a.count), *codec, '-start_number', '1', os.path.join(a.dir, f'%04d.{ext}')])
    files = sorted(f for f in os.listdir(a.dir) if f.endswith('.' + ext))
    size = sum(os.path.getsize(os.path.join(a.dir, f)) for f in files)
    print(f'{len(files)} frames, {size / 1e6:.1f} MB total, {size / max(1, len(files)) / 1e3:.0f} KB/frame -> set count: {len(files)} in STORY.sets')

def scrubvideo(a):
    # All-intra (gop 1) = every frame is a keyframe -> seeks are instant in Safari/Chrome. gop 2-5 = smaller, still OK.
    vf = f'scale={a.width}:-2:flags=lanczos,format=yuv420p'
    if a.portrait: vf = f"crop='min(iw,ih*9/16)':ih,scale={a.width}:{round(a.width * 16 / 9 / 2) * 2}:flags=lanczos,format=yuv420p"
    run(['ffmpeg', '-y', '-v', 'error', '-i', a.film, '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', str(a.crf),
         '-profile:v', 'high', '-level', '4.1', '-x264-params', f'keyint={a.gop}:min-keyint=1:scenecut=0:bframes=0',
         '-movflags', '+faststart', a.out])
    print(f'{os.path.getsize(a.out) / 1e6:.1f} MB')

if __name__ == '__main__':
    if not shutil.which('ffmpeg'): sys.exit('ffmpeg not found on PATH')
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('stitch'); s.add_argument('out'); s.add_argument('clips', nargs='+')
    s = sp.add_parser('seams'); s.add_argument('film'); s.add_argument('--thr', type=float, default=0.12)
    s = sp.add_parser('stabilize'); s.add_argument('film'); s.add_argument('out')
    s = sp.add_parser('grade'); s.add_argument('film'); s.add_argument('out')
    s = sp.add_parser('frames'); s.add_argument('film'); s.add_argument('dir'); s.add_argument('--count', type=int, default=300)
    s.add_argument('--width', type=int, default=1920); s.add_argument('--quality', type=int, default=72)
    s.add_argument('--portrait', action='store_true'); s.add_argument('--fx', type=float, default=0.5)
    s.add_argument('--format', default='webp', choices=['webp', 'avif', 'jpg'])
    s = sp.add_parser('scrubvideo'); s.add_argument('film'); s.add_argument('out'); s.add_argument('--width', type=int, default=1920)
    s.add_argument('--gop', type=int, default=1); s.add_argument('--crf', type=int, default=21); s.add_argument('--portrait', action='store_true')
    a = ap.parse_args()
    sys.exit({'stitch': stitch, 'seams': seams, 'stabilize': stabilize, 'grade': grade, 'frames': frames, 'scrubvideo': scrubvideo}[a.cmd](a) or 0)
