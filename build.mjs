// Bouwt site/index.html en site/tekst.txt uit welkomst.md.
// De mp3 zelf maakt de workflow met ElevenLabs (zie .github/workflows/deploy.yml).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const versie = (process.env.GITHUB_SHA || "lokaal").slice(0, 7);
const bron = readFileSync("welkomst.md", "utf8").replace(/\r\n/g, "\n").trim();
const alineas = bron.split(/\n\s*\n/).map((a) => a.replace(/\s+/g, " ").trim()).filter(Boolean);

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Is er een HeyGen-video, dan staat die bovenaan; de audio blijft als "alleen luisteren".
const metVideo = existsSync("site/welkomst.mp4");
const video = metVideo
  ? `      <h2>Bekijk</h2>
      <video controls playsinline preload="metadata" src="welkomst.mp4?v=${versie}">
        Je browser speelt geen video af. Luister hieronder of lees de tekst.
      </video>
      <h2 class="los">Alleen luisteren</h2>`
  : `      <h2>Luister</h2>`;

const html = readFileSync("template.html", "utf8")
  .replaceAll("{{VERSIE}}", versie)
  .replace("{{VIDEO}}", video)
  .replace("{{TEKST}}", alineas.map((a) => `      <p>${escape(a)}</p>`).join("\n"));

mkdirSync("site", { recursive: true });
writeFileSync("site/index.html", html);
// Voor de stem: alinea's gescheiden door een witregel geeft een natuurlijke pauze.
// Bij de tweede bouw (na audio en video) hoeft dat niet meer.
if (!process.argv.includes("--alleen-html")) writeFileSync("site/tekst.txt", alineas.join("\n\n"));
console.log(`site/index.html gebouwd (versie ${versie}, ${alineas.length} alinea's, video: ${metVideo ? "ja" : "nee"})`);
