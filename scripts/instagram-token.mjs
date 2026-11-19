// Gera o token do Instagram (login do Instagram, válido por 60 dias) e grava no .env.local.
// Antes, coloque no .env.local:
//   INSTAGRAM_APP_ID=...      (Casos de uso → Instagram → "Configuração da API com login do Instagram" → ID do app do Instagram)
//   INSTAGRAM_APP_SECRET=...  (mesma tela → Chave secreta do app do Instagram)
// E cadastre https://tiojoaoyt.com/ em "Configurar login comercial do Instagram" → URLs de redirecionamento.
// Uso: node scripts/instagram-token.mjs
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(ROOT, ".env.local");
const envText = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { INSTAGRAM_APP_ID: id, INSTAGRAM_APP_SECRET: secret } = env;
const REDIRECT = env.INSTAGRAM_REDIRECT || "https://tiojoaoyt.com/";
if (!id || !secret) {
  console.log("Faltam INSTAGRAM_APP_ID e/ou INSTAGRAM_APP_SECRET no .env.local (veja o topo deste arquivo).");
  process.exit(1);
}

const auth = new URL("https://www.instagram.com/oauth/authorize");
auth.search = new URLSearchParams({ client_id: id, redirect_uri: REDIRECT, response_type: "code", scope: "instagram_business_basic" });
console.log("\n1) Abra este link no navegador, entre com o @tiojoaoyt e clique em Permitir:\n");
console.log("   " + auth.href + "\n");
console.log("2) Você vai cair no site (tiojoaoyt.com/?code=...). Copie o endereço INTEIRO da barra e cole aqui.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pasted = (await rl.question("Endereço: ")).trim();
rl.close();
let code = pasted;
try { code = new URL(pasted).searchParams.get("code") || ""; } catch {}
code = code.replace(/#_?$/, "");
if (!code) { console.log("Não achei o ?code= nesse endereço."); process.exit(1); }

const j = async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok || d.error || d.error_message) throw new Error(d.error_message || d.error?.message || JSON.stringify(d)); return d; };
try {
  const short = await j(await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "authorization_code", redirect_uri: REDIRECT, code }),
  }));
  const long = await j(await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(short.access_token)}`));
  const me = await j(await fetch(`https://graph.instagram.com/me?fields=username,media_count&access_token=${encodeURIComponent(long.access_token)}`));

  const line = `INSTAGRAM_TOKEN=${long.access_token}`;
  const out = /^\s*INSTAGRAM_TOKEN\s*=.*$/m.test(envText)
    ? envText.replace(/^\s*INSTAGRAM_TOKEN\s*=.*$/m, line)
    : envText.replace(/\s*$/, "\n") + line + "\n";
  fs.writeFileSync(envFile, out);
  const ate = new Date(Date.now() + (long.expires_in || 0) * 1000).toLocaleDateString("pt-BR");
  console.log(`\n✔ Pronto! Conta @${me.username} (${me.media_count} posts). Token gravado no .env.local, válido até ${ate}.`);
} catch (e) {
  console.log("\n✘ Não deu certo:", e.message);
  console.log("Dicas: o código vale só 1 vez e por poucos minutos (gere de novo); confira se a URL de redirecionamento cadastrada é exatamente " + REDIRECT);
  process.exit(1);
}
