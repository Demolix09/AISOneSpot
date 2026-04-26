const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function safePathFromUrl(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relativePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolved = path.resolve(ROOT, "." + relativePath);

  if (!resolved.startsWith(ROOT)) {
    return null;
  }

  return resolved;
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end("Internal Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.statusCode = 200;
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const target = safePathFromUrl(req.url || "/");

  if (!target) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.stat(target, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(target, res);
      return;
    }

    const indexTarget = path.join(target, "index.html");
    fs.stat(indexTarget, (indexErr, indexStats) => {
      if (!indexErr && indexStats.isFile()) {
        serveFile(indexTarget, res);
        return;
      }

      res.statusCode = 404;
      res.end("Not Found");
    });
  });
});

server.listen(PORT, () => {
  console.log(`AIS OneSpot running at http://localhost:${PORT}`);
});
