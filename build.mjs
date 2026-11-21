// Bouwt de site uit paginas.json: per pagina een index.html met video (als die er is),
// audio en de uitgeschreven tekst. Media staan in media/ (door de workflow gemaakt en
// teruggezet in de repo, zodat een ongewijzigde tekst niet opnieuw betaald hoeft te worden).
//
//   node build.mjs --nodig   → schrijft werk/<naam>.txt en print de namen waarvan de media
//                              ontbreken of bij een oudere tekst horen (één per regel)
//   node build.mjs           → bouwt site/
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";

const versie = (process.env.GITHUB_SHA || "lokaal").slice(0, 7);
const paginas = JSON.parse(readFileSync("paginas.json", "utf8"));

const alineasVan = (bestand) =>
  readFileSync(bestand, "utf8").replace(/\r\n/g, "\n").trim()
    .split(/\n\s*\n/).map((a) => a.replace(/\s+/g, " ").trim()).filter(Boolean);
// Alinea's gescheiden door een witregel geven in de stem een natuurlijke pauze.
const spreektekst = (p) => alineasVan(p.tekst).join("\n\n");
const hash = (s) => createHash("sha256").update(s).digest("hex");

if (process.argv.includes("--nodig")) {
  mkdirSync("werk", { recursive: true });
  for (const p of paginas) {
    const tekst = spreektekst(p);
    writeFileSync(`werk/${p.naam}.txt`, tekst);
    const opgeslagen = existsSync(`media/${p.naam}.sha`) ? readFileSync(`media/${p.naam}.sha`, "utf8").trim() : "";
    if (opgeslagen !== hash(tekst) || !existsSync(`media/${p.naam}.mp3`)) console.log(p.naam);
  }
  process.exit(0);
}

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sjabloon = readFileSync("template.html", "utf8");

for (const p of paginas) {
  const doel = p.map ? `site/${p.map}` : "site";
  mkdirSync(doel, { recursive: true });
  const metVideo = existsSync(`media/${p.naam}.mp4`);
  const metAudio = existsSync(`media/${p.naam}.mp3`);
  if (metVideo) copyFileSync(`media/${p.naam}.mp4`, `${doel}/${p.naam}.mp4`);
  if (metAudio) copyFileSync(`media/${p.naam}.mp3`, `${doel}/${p.naam}.mp3`);

  const v = metAudio ? hash(readFileSync(`media/${p.naam}.mp3`)).slice(0, 8) : versie;
  const video = metVideo
    ? `      <h2>Bekijk</h2>
      <video controls playsinline preload="metadata" src="${p.naam}.mp4?v=${v}">
        Je browser speelt geen video af. Luister hieronder of lees de tekst.
      </video>
      <h2 class="los">Alleen luisteren</h2>`
    : `      <h2>Luister</h2>`;
  const audio = metAudio
    ? `      <audio controls preload="metadata" src="${p.naam}.mp3?v=${v}">
        Je browser speelt geen audio af. Lees de tekst hieronder.
      </audio>`
    : `      <p>De opname volgt nog.</p>`;
  const nav = paginas
    .map((q) => {
      const href = (p.map ? "../" : "") + (q.map ? `${q.map}/` : "");
      return q.naam === p.naam
        ? `<span aria-current="page">${escape(q.titel)}</span>`
        : `<a href="${href || "./"}">${escape(q.titel)}</a>`;
    })
    .join("");

  const html = sjabloon
    .replaceAll("{{VERSIE}}", versie)
    .replaceAll("{{TITEL}}", escape(p.titel))
    .replace("{{ONDERTITEL}}", escape(p.ondertitel))
    .replace("{{NAV}}", nav)
    .replace("{{VIDEO}}", video)
    .replace("{{AUDIO}}", audio)
    .replace("{{TEKST}}", alineasVan(p.tekst).map((a) => `      <p>${escape(a)}</p>`).join("\n"));
  writeFileSync(`${doel}/index.html`, html);
  console.log(`${doel}/index.html (video: ${metVideo ? "ja" : "nee"}, audio: ${metAudio ? "ja" : "nee"})`);
}
