// Servidor local para testar o site + as funções de /api sem precisar da Vercel.
// Uso (na pasta do site):   node scripts/dev-server.mjs
// Lê as chaves do arquivo .env.local (que NUNCA deve ir para o GitHub).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 5173;

// carrega .env.local
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // /api/nome → api/nome.js (mesmo formato da Vercel)
  if (url.pathname.startsWith("/api/")) {
    const file = path.join(ROOT, "api", path.basename(url.pathname) + ".js");
    if (!fs.existsSync(file)) { res.writeHead(404).end("not found"); return; }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
    req.query = Object.fromEntries(url.searchParams);
    try {
      const mod = await import(pathToFileURL(file).href + "?t=" + fs.statSync(file).mtimeMs);
      await mod.default(req, res);
    } catch (e) { console.error(e); res.writeHead(500).end("erro"); }
    return;
  }

  // arquivos estáticos (sem expor .env.local nem pastas ocultas)
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || rel.split("/").some((p) => p.startsWith(".")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found"); return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Site em http://localhost:${PORT}`));
