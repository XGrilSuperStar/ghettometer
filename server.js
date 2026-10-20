const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
  ".json": "application/json", ".ico": "image/x-icon"
};
const cache = new Map(); // gzip once, serve many

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(file).toLowerCase();
    const headers = { "Content-Type": TYPES[ext] || "application/octet-stream",
                      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600" };
    const canGzip = /\bgzip\b/.test(req.headers["accept-encoding"] || "") && [".html", ".js", ".css", ".svg", ".json"].includes(ext);
    if (canGzip) {
      const key = file + st.mtimeMs;
      let buf = cache.get(key);
      if (!buf) { buf = zlib.gzipSync(fs.readFileSync(file), { level: 9 }); cache.set(key, buf); }
      headers["Content-Encoding"] = "gzip"; headers["Content-Length"] = buf.length;
      res.writeHead(200, headers); return res.end(buf);
    }
    headers["Content-Length"] = st.size;
    res.writeHead(200, headers); fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, "0.0.0.0", () => console.log("Gettometer running on " + PORT));
