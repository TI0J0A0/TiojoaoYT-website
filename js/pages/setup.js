import { $ } from "../site.js";

// o three.js só é baixado nesta página
const root = $("#setup3d");
import("../setup3d.js").then(m => m.initSetup3D(root)).catch(err => {
  console.error(err);
  const l = $(".s3-loading", root); if (l) l.textContent = "Não foi possível carregar o setup 3D.";
});
