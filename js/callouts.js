import * as THREE from "three";

const NS = "http://www.w3.org/2000/svg";
const v = new THREE.Vector3();

// Callout'ы — DOM-карточки в двух колонках у краёв кадра, связанные с 3D-якорем ломаной leader-line.
// Раскладка: якорь проецируется каждый кадр, карточки сортируются по y и раздвигаются (min gap 16px),
// колонка не выходит за safe-зону; если не влезает — сдвиг вверх, затем скрытие карточек c desk:true.
export function createCallouts({ els, svg, isPhone, getSafe }) {
  const lines = els.map(() => {
    const g = document.createElementNS(NS, "g");
    const path = document.createElementNS(NS, "polyline");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", "2.4");
    g.append(path, dot);
    svg.append(g);
    return { g, path, dot };
  });
  let specs = [];

  function show(list, findPart) {
    specs = list.filter((c) => !(c.desk && isPhone())).slice(0, els.length).map((c) => ({ ...c, partRef: findPart(c.part) }));
    els.forEach((el, i) => {
      const c = specs[i];
      el.hidden = !c;
      if (!c) return;
      el.innerHTML = `<p class="idx">${c.title}</p><p class="fig">${c.fig}${c.unit ? `<span>${c.unit}</span>` : ""}</p><p class="note">${c.note}</p>`;
    });
  }

  function hide() { specs = []; els.forEach((el) => { el.hidden = true; }); lines.forEach((l) => { l.g.style.opacity = "0"; }); }

  function update(camera, alpha) {
    const w = innerWidth, h = innerHeight, phone = isPhone();
    const safe = getSafe();                    // { top, bottom } в px: под табами и над credit
    const gutter = phone ? 16 : Math.max(28, w * 0.04);
    const cols = { left: [], right: [] };
    specs.forEach((c, i) => {
      const el = els[i];
      const p = c.partRef;
      if (!p) { el.style.opacity = "0"; return; }
      v.copy(p.mesh.position).add(p.centerLocal).add(new THREE.Vector3(...c.at)).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { el.style.opacity = "0"; lines[i].g.style.opacity = "0"; return; }
      const item = { el, i, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, desk: !!c.desk };
      item.side = item.x < w * 0.5 ? "left" : "right";   // и на телефоне: две колонки в верхней полосе, линии не пересекают экран
      cols[item.side].push(item);
    });

    for (const side of ["left", "right"]) {
      const col = cols[side].sort((a, b) => a.y - b.y);
      let cursor = safe.top;
      for (const it of col) {
        const el = it.el;
        el.style.width = phone ? "min(150px, 44vw)" : "min(210px, 18vw)";
        el.style.left = side === "left" ? gutter + "px" : "auto";
        el.style.right = side === "right" ? gutter + "px" : "auto";
        const top = phone ? cursor : Math.max(cursor, Math.round(it.y - 24)); // карточка тянется к высоте якоря
        el.style.top = top + "px";
        it.h = el.offsetHeight;
        it.top = top;
        cursor = top + it.h + 16;
      }
      const limit = phone ? h * 0.36 : safe.bottom;   // на телефоне карточки живут в верхней полосе, объект — ниже
      const last = col[col.length - 1];
      if (last && last.top + last.h > limit) {
        const shift = last.top + last.h - limit;
        col.forEach((it) => { it.top = Math.max(safe.top, it.top - shift); it.el.style.top = it.top + "px"; });
        // всё ещё перекрываются? скрыть второстепенные
        for (let k = 1; k < col.length; k++) {
          if (col[k].desk && col[k].top < col[k - 1].top + col[k - 1].h + 8) col[k].hidden = true;
        }
      }
    }

    for (const side of ["left", "right"]) {
      for (const it of cols[side]) {
        const L = lines[it.i];
        if (it.hidden || alpha < 0.04) { L.g.style.opacity = "0"; it.el.style.opacity = it.hidden ? "0" : String(alpha); continue; }
        it.el.style.opacity = String(alpha);
        const r = it.el.getBoundingClientRect();
        const x1 = side === "left" ? r.right : r.left;
        const y1 = r.top + 0.5;
        const elbow = side === "left" ? it.x - 18 : it.x + 18;
        L.path.setAttribute("points", `${it.x.toFixed(1)},${it.y.toFixed(1)} ${elbow.toFixed(1)},${it.y.toFixed(1)} ${elbow.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`);
        L.dot.setAttribute("cx", it.x.toFixed(1));
        L.dot.setAttribute("cy", it.y.toFixed(1));
        L.g.style.opacity = alpha.toFixed(3);
      }
    }
  }

  return { show, hide, update };
}
