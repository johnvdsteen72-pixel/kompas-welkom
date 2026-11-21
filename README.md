# kompas-welkom

Testje: een gesproken welkomstwoord over Kompas, ingesproken door ElevenLabs met de stem van John,
gepubliceerd op Cloudflare Pages.

## Hoe het werkt
1. Pas `welkomst.md` aan en push naar `main`.
2. De GitHub Action (`.github/workflows/deploy.yml`) bouwt de pagina (`build.mjs` + `template.html`),
   laat ElevenLabs de tekst inspreken (`eleven_multilingual_v2`) en zet alles op Cloudflare Pages
   (project `kompas-welkom`).
3. Resultaat: https://kompas-welkom.pages.dev

## Secrets (Settings → Secrets and variables → Actions)
| Naam | Waar vandaan |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs → Profile → API keys (recht: Text to Speech) |
| `ELEVENLABS_VOICE_ID` | ElevenLabs → Voices → je gekloonde stem → ID kopiëren |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Custom token met *Account · Cloudflare Pages · Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare-dashboard, rechts op de overzichtspagina |

Geen geheimen in deze repo; de tekst bevat bewust geen cijfers, klanten of namen van collega's.
De pagina staat open (geen login) maar wordt niet geïndexeerd (`noindex`).
