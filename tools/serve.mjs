import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.argv[2] || 47400);
const ROOT = path.resolve(process.argv[3] || process.cwd());

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".glb":  "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".hdr":  "application/octet-stream",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
  ".ico":  "image/x-icon"
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, rel);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const idx = path.join(filePath, "index.html");
      stat = fs.statSync(idx);
      return serveFile(idx, stat, req, res);
    }
  } catch {
    res.writeHead(404);
    return res.end("Not found");
  }
  serveFile(filePath, stat, req, res);
});

function serveFile(filePath, stat, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const total = stat.size;
  const cacheCtl = (ext === ".mp4" || ext === ".webp" || ext === ".glb" || ext === ".hdr")
    ? "public, max-age=3600"
    : "no-cache";
  const range = req.headers.range;

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m) {
      res.writeHead(416, { "Content-Range": `bytes */${total}` });
      return res.end();
    }
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(total - 1, Number(m[2])) : total - 1;
    if (start > end || start >= total) {
      res.writeHead(416, { "Content-Range": `bytes */${total}` });
      return res.end();
    }
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": type,
      "Cache-Control": cacheCtl
    });
    const stream = fs.createReadStream(filePath, { start, end });
    stream.on("error", () => { if (!res.destroyed) res.destroy(); });
    return stream.pipe(res);
  }

  res.writeHead(200, {
    "Accept-Ranges": "bytes",
    "Content-Length": total,
    "Content-Type": type,
    "Cache-Control": cacheCtl
  });
  if (req.method === "HEAD") return res.end();
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => { if (!res.destroyed) res.destroy(); });
  return stream.pipe(res);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Range static server listening on http://127.0.0.1:${PORT}/ -> ${ROOT}`);
});
