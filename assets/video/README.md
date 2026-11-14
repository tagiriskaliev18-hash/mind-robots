# Ролики сборки Apptronik Apollo (Google Flow · 720p · 8 с)

Сайт автоматически поддерживает скролл-видео поверх или вместо фоновой покадровой 3D-секвенции (`video.currentTime` в едином цикле `requestAnimationFrame` + WebGL2-кроссфейд на стыках этапов). Пока `.mp4` файлы не добавлены, активен аккуратный плейсхолдер и 3D-превью Apptronik Apollo без ошибок сети.

## Куда положить ролики

Положите сгенерированные в Google Flow ролики (`1280×720`, 720p, длительность ~8 с каждый) в `assets/video/`:

1. `assets/video/apollo-01-wireframe.mp4` — Этап 01: Световой замысел и контур 1,73 м
2. `assets/video/apollo-02-skeleton.mp4` — Этап 02: Модульная рама и база шасси
3. `assets/video/apollo-03-actuators.mp4` — Этап 03: Линейные приводы и сменный блок 4 ч
4. `assets/video/apollo-04-nerves.mp4` — Этап 04: Сенсорика и шины управления 5-палыми кистями
5. `assets/video/apollo-05-shell.mp4` — Этап 05: Перламутровый корпус Apollo, нагрудный OLED и визор
6. `assets/video/apollo-06-visor.mp4` — Этап 06: Влёт через затемнённый визор-экран E-Ink
7. `assets/video/apollo-07-core.mp4` — Этап 07: Нейронное ядро и финал

Опционально для вертикального iPhone (`9:16`) положите одноимённые ролики в `assets/video/mobile/` — или один сквозной файл `assets/video/apollo-master.mp4` (`mode: "master"` в `manifest.json`).

## Подготовка для плавного скраббинга (`keyint=1..2`)

Чтобы `video.currentTime` двигался плавно в обе стороны (включая быстрый fling) без фризов декодера, перекодируйте исходник перед размещением:

```bash
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -profile:v main -pix_fmt yuv420p -g 2 -keyint_min 1 -bf 0 -an -movflags +faststart assets/video/apollo-01-wireframe.mp4
```

После добавления файлов выполните:

```bash
node tools/scan_videos.mjs
```

Скрипт проверит наличие `.mp4` в `assets/video/`, обновит флаги `available` в `assets/video/manifest.json`, и движок автоматически переключит соответствующие этапы на скролл-видео `video.currentTime` с мягким кроссфейдом между этапами.
