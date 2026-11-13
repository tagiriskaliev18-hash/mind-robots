# Mind — Unitree G1 (Live 3D Product Film)

Кинематографичный статический live-3D сайт гуманоидного робота **Unitree G1** (масштаб 1 : 1, рост 1,32 м) в стиле Mind.
Одна непрерывная камера (Three.js `0.170.0` + `postprocessing` `6.39.6` + `N8AO` `2.0.2` + GSAP `3.12.5`), студийный свет с селективным bloom на циан-узлах, объёмная типографика внутри 3D-сцены, пружинный каскадный exploded view по шести вкладкам и динамические выносные подписи (leader-lines). Без сборщика — локальные ES-модули через `importmap` в `js/vendor/`.

## Быстрый запуск локально

```bash
python -m http.server 47400 --bind 127.0.0.1
```

Откройте [http://127.0.0.1:47400/](http://127.0.0.1:47400/).

Управление:
- Вкладки сверху (`Голова`, `Руки`, `Корпус`, `Привод`, `Разбор`, `Сборка`), скролл страницы, клавиши `←` / `→` и `Esc` (возврат в Hero).
- Зажатие и перетаскивание сцены мышью или пальцем вращает камеру с инерцией; жест двумя пальцами на телефоне меняет масштаб.
- Режим `prefers-reduced-motion: reduce` мгновенно переключает состояния без орбиты и без пружинного пролёта.

## Автоматический Critic Loop

```bash
node tools/critic.mjs http://127.0.0.1:47400/
node tools/critic.mjs http://127.0.0.1:47400/ --webkit
```

Скрипт проверяет десктоп (`1440×900`, DPR 1) и iPhone (`390×844`, DPR 3, touch): загрузку шрифтов Geist и кириллицы, отсутствие ошибок консоли и битых запросов, FPS, LCP, время успокоения пружин, взаимное неперекрытие карточек и объекта (`onObject <= 0.25`) и сохраняет скриншоты всех состояний и отчёт в `critic/report.json`.

## Лицензии ассетов и библиотек

- **3D-модель Unitree G1 (`assets/model.glb`)**: © 2016–2023 HangZhou YuShu Technology Co., Ltd. («Unitree Robotics»), лицензия **BSD-3-Clause** (полный текст в [UNITREE-G1-LICENSE](./UNITREE-G1-LICENSE)), получена из пакета [Google DeepMind MuJoCo Menagerie (`unitree_g1`)](https://github.com/google-deepmind/mujoco_menagerie/tree/main/unitree_g1), пересобрана в именованный 35-узловой GLB с meshopt-сжатием (`tools/build_g1_glb.py`).
- **HDRI-окружение (`assets/hdri/studio_small_09_1k.hdr`)**: Poly Haven `studio_small_09`, лицензия **CC0 1.0 Universal**.
- **Шрифты (`fonts/Geist-*.woff2`, `fonts/GeistMono-Regular.woff2`)**: Vercel Geist / Geist Mono, лицензия **SIL Open Font License 1.1**.
- **Рендер и анимация (`js/vendor/`)**: Three.js `0.170.0` (MIT), `postprocessing` `6.39.6` (Zlib), `n8ao` `2.0.2` (MIT), GSAP `3.12.5`.

## Источники технических данных

1. Unitree Robotics — паспорт и спецификации G1 / G1 EDU (рост 1,32 м, габарит в сложенном виде 690 × 450 × 300 мм, масса 35 кг, 23–43 DOF, момент колена EDU 120 Н·м, скорость 2,0 м/с, аккумулятор 9000 мА·ч / ~2 ч, 3D-лидар Livox Mid-360 + Intel RealSense D435i): https://www.unitree.com/g1/
2. Unitree Dex3-1 — трёхпалая силомоментная кисть (7 активных степеней свободы на руку: 3 в большом пальце, по 2 в указательном и среднем): https://www.unitree.com/dex3-1/
3. IEEE Spectrum — обзор платформы Unitree G1: https://spectrum.ieee.org/unitree-g1
4. Google DeepMind MuJoCo Menagerie — MJCF-модель G1 с двумя IMU (`imu_in_torso`, `imu_in_pelvis`): https://github.com/google-deepmind/mujoco_menagerie/tree/main/unitree_g1
5. Zakka et al., *MuJoCo Playground* (2025), arXiv:2502.08844 — перенос политик управления на аппаратный Unitree G1: https://arxiv.org/abs/2502.08844
