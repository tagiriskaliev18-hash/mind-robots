# mind-cinematic-starter
Проверенный каркас (three 0.170 + postprocessing 6.39.6 + n8ao 2.0.2 + GSAP 3.12.5, importmap, без сборщика).
Без GLB работает на процедурном плейсхолдере. Проверено: critic.mjs PASS на 1440×900 и 390×844 (Chromium, плейсхолдер и Apollo GLB).
Запуск:  python -m http.server 47400 --bind 127.0.0.1
Critic:  npm i -D playwright@1.49.1 && npx playwright install chromium && node tools/critic.mjs http://127.0.0.1:47400/
Шрифты Geist/Geist Mono — SIL OFL 1.1 (npm geist 1.9.2). HDRI studio_small_09 — Poly Haven, CC0.
