// Sukoon — ElevenLabs TTS proxy (Netlify Function)
// The API key NEVER reaches the browser. It is read from the
// ELEVENLABS_API_KEY environment variable you set in Netlify.
//
// Set this in Netlify:  Site settings → Environment variables
//   ELEVENLABS_API_KEY = sk_...your key...
//
// Restrict who can call it: only your app's origin is allowed below.
// Change ALLOW_ORIGIN if you ever move the app to a new address.

const ALLOW_ORIGIN = "https://yesvarun.github.io";

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST")   return { statusCode: 405, headers: cors, body: "Method not allowed" };

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { statusCode: 500, headers: cors, body: "Server missing ELEVENLABS_API_KEY" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: cors, body: "Bad JSON" }; }

  const text    = String(body.text || "").slice(0, 1200);
  const voiceId = String(body.voiceId || "21m00Tcm4TlvDq8ikWAM");
  const model   = String(body.model || "eleven_flash_v2_5");
  const speed   = Math.max(0.7, Math.min(1.2, Number(body.speed) || 0.9));
  if (!text.trim()) return { statusCode: 400, headers: cors, body: "No text" };

  const url = "https://api.elevenlabs.io/v1/text-to-speech/" +
              encodeURIComponent(voiceId) + "?output_format=mp3_44100_128";

  const payload = {
    text,
    model_id: model,
    voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true, speed }
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", "accept": "audio/mpeg" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      let err = "";
      try { err = await r.text(); } catch (e) {}
      return { statusCode: r.status, headers: { ...cors, "Content-Type": "application/json" },
               body: JSON.stringify({ error: err.slice(0, 500) }) };
    }

    const audio = Buffer.from(await r.arrayBuffer());
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      isBase64Encoded: true,
      body: audio.toString("base64")
    };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: "Upstream error: " + (e && e.message || e) };
  }
};
