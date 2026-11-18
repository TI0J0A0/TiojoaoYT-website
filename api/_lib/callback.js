// Lógica comum da volta do login (Twitch ou Kick)
import { finish } from "./oauth.js";
import { db } from "./db.js";
import { getSession, setSession, redirect } from "./session.js";

const ERRS = { conta_ja_vinculada: "conta_ja_vinculada", plataforma_ja_vinculada: "plataforma_ja_vinculada", perfil_inexistente: "sessao_expirada" };

export function callbackHandler(provider) {
  return async function handler(req, res) {
    try {
      const { user, link } = await finish(req, res, provider);
      const sess = link ? getSession(req) : null;
      const prof = await db.rpc("login_with", {
        p_provider: provider, p_uid: user.uid, p_login: user.login, p_name: user.name, p_avatar: user.avatar,
        p_link: sess ? sess.pid : null,
      });
      setSession(req, res, prof.id);
      const q = new URLSearchParams({ conta: link ? "vinculada" : "ok" });
      if (prof.imported > 0) q.set("importados", prof.imported);
      redirect(res, `/?${q}#conta`);
    } catch (e) {
      const known = e.public || Object.keys(ERRS).find((k) => String(e.message).includes(k));
      console.error(`login ${provider}:`, e.message);
      redirect(res, `/?conta_erro=${encodeURIComponent(ERRS[known] || known || "falha")}#conta`);
    }
  };
}
