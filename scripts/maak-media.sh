#!/usr/bin/env bash
# Maakt media/<naam>.mp3 (ElevenLabs) en media/<naam>.mp4 (HeyGen) uit werk/<naam>.txt.
# Gebruik: scripts/maak-media.sh <naam> [bestaande-heygen-video-id]
# Lukt de video niet, dan blijft alleen de audio staan (de pagina valt daarop terug).
set -euo pipefail
naam="$1"
hergebruik="${2:-}"
mkdir -p media

# --- Stem: ElevenLabs ---------------------------------------------------------
jq -Rs '{
  text: .,
  model_id: "eleven_multilingual_v2",
  voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true }
}' "werk/$naam.txt" > werk/verzoek.json
curl --fail-with-body -sS \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" -H "Content-Type: application/json" \
  --data @werk/verzoek.json -o "media/$naam.mp3"
ls -l "media/$naam.mp3"
rm -f "media/$naam.mp4"

# --- Beeld: HeyGen API v3 (rekent af via de API-wallet) ---------------------------
maak_video() {
  if [ -z "${HEYGEN_API_KEY:-}" ] || [ -z "${HEYGEN_AVATAR_ID:-}" ]; then
    echo "Geen HeyGen-secrets: alleen audio."; return 0
  fi
  echo "Wallet-saldo: $(curl -sS https://api.heygen.com/v3/users/me -H "x-api-key: $HEYGEN_API_KEY" | jq -r '.data.wallet.remaining_balance // "onbekend"')"
  local video_id="$hergebruik"
  if [ -n "$video_id" ]; then
    echo "Bestaande video hergebruiken: $video_id"
  else
    local asset
    asset=$(curl --fail-with-body -sS -X POST https://api.heygen.com/v3/assets \
      -H "x-api-key: $HEYGEN_API_KEY" -F "file=@media/$naam.mp3;type=audio/mpeg" | jq -r '.data.asset_id')
    echo "Audio-asset: $asset"
    jq -n --arg av "$HEYGEN_AVATAR_ID" --arg a "$asset" --arg t "Kompas - $naam" '{
      type: "avatar", avatar_id: $av, audio_asset_id: $a, title: $t,
      aspect_ratio: "auto", resolution: "1080p"
    }' > werk/video.json
    local antwoord
    antwoord=$(curl -sS -X POST https://api.heygen.com/v3/videos \
      -H "x-api-key: $HEYGEN_API_KEY" -H "Content-Type: application/json" \
      -H "Idempotency-Key: kompas-$naam-${GITHUB_SHA:-lokaal}-${GITHUB_RUN_ATTEMPT:-1}" --data @werk/video.json)
    video_id=$(echo "$antwoord" | jq -r '.data.video_id // empty')
    if [ -z "$video_id" ]; then echo "::error::HeyGen weigerde ($naam): $(echo "$antwoord" | jq -c '.error // .')"; return 1; fi
    echo "Video-ID ($naam): $video_id"
  fi
  local i stand status
  for i in $(seq 1 80); do
    [ "$i" -gt 1 ] && sleep 15
    stand=$(curl -sS "https://api.heygen.com/v3/videos/$video_id" -H "x-api-key: $HEYGEN_API_KEY")
    status=$(echo "$stand" | jq -r '.data.status')
    echo "[$i] $status"
    if [ "$status" = "completed" ]; then
      curl --fail -sS -L "$(echo "$stand" | jq -r '.data.video_url')" -o "werk/$naam-groot.mp4"
      break
    fi
    if [ "$status" = "failed" ]; then
      echo "::error::HeyGen-video mislukt ($naam): $(echo "$stand" | jq -c '.data | {failure_code, failure_message}')"; return 1
    fi
  done
  [ -f "werk/$naam-groot.mp4" ] || { echo "::error::Video ($naam) niet op tijd klaar"; return 1; }
  # Cloudflare Pages staat maximaal 25 MiB per bestand toe: altijd naar 720p.
  command -v ffmpeg >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg >/dev/null; }
  ffmpeg -loglevel error -y -i "werk/$naam-groot.mp4" -vf "scale=-2:720" -c:v libx264 -crf 26 -preset slow \
    -c:a aac -b:a 128k -movflags +faststart "media/$naam.mp4"
  ls -l "media/$naam.mp4"
}
maak_video || echo "::warning::Geen video voor $naam; de pagina toont alleen audio."

# Vastleggen bij welke tekst deze media horen.
sha256sum "werk/$naam.txt" | cut -d' ' -f1 > "media/$naam.sha"
