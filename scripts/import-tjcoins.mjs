// Importa os saldos de tjcoins do StreamElements para o banco do site.
// Uso (na pasta do site, com o .env.local preenchido):
//   node scripts/import-tjcoins.mjs            → mostra o que seria importado (não grava)
//   node scripts/import-tjcoins.mjs --gravar   → grava no Supabase
// Cada pessoa recebe o saldo no 1º login com a Twitch (pelo mesmo nick).
// Rodar de novo atualiza só quem ainda não entrou no site.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const CHANNEL = process.env.STREAMELEMENTS_CHANNEL_ID || "5f2dc9322cd5ba7dd38e4f35"; // tiojoaoyt
const gravar = process.argv.includes("--gravar");

async function fetchAll() {
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`https://api.streamelements.com/kappa/v2/points/${CHANNEL}/top?limit=1000&offset=${offset}`);
    if (!r.ok) throw new Error(`StreamElements ${r.status}`);
    const { users = [], _total = 0 } = await r.json();
    all.push(...users);
    if (!users.length || all.length >= _total) break;
  }
  return all;
}

const IGNORAR = new Set(["streamelements", "tiojoaoyt", "creatisbot", "nightbot", "moobot", "streamlabs"]);

const users = (await fetchAll())
  .map((u) => ({ login: String(u.username).toLowerCase(), points: Math.max(0, Math.floor(u.points || 0)) }))
  .filter((u) => u.points > 0 && !IGNORAR.has(u.login));
const total = users.reduce((a, u) => a + u.points, 0);
console.log(`${users.length} pessoas · ${total.toLocaleString("pt-BR")} tjcoins no total`);
console.log("Maiores saldos:", users.slice(0, 5).map((u) => `${u.login}=${u.points}`).join(", "));

if (!gravar) { console.log("\n(Simulação. Para gravar no banco: node scripts/import-tjcoins.mjs --gravar)"); process.exit(0); }

const { db } = await import("../api/_lib/db.js");
// só atualiza quem ainda não resgatou (claimed_by nulo); quem já entrou fica como está
const claimed = new Set((await db.select("se_import", "select=login&claimed_by=not.is.null")).map((r) => r.login));
const rows = users.filter((u) => !claimed.has(u.login)).map((u) => ({ ...u, imported_at: new Date().toISOString() }));
for (let i = 0; i < rows.length; i += 500) await db.upsert("se_import", rows.slice(i, i + 500), "login");
console.log(`Gravado: ${rows.length} saldos (${claimed.size} já tinham sido resgatados e não foram mexidos).`);
