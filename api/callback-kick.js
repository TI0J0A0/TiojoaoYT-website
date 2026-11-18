// GET /api/callback-kick — volta do login da Kick
// (cadastre esta URL em dev.kick.com → seu app → Redirect URL)
import { callbackHandler } from "./_lib/callback.js";
export default callbackHandler("kick");
