// GET /api/callback-twitch — volta do login da Twitch
// (cadastre esta URL em dev.twitch.tv → seu app → OAuth Redirect URLs)
import { callbackHandler } from "./_lib/callback.js";
export default callbackHandler("twitch");
