// Voz IA de Mundo de Flo (ElevenLabs) para TODOS los usuarios.
// Variables de entorno en Netlify (Project configuration → Environment variables):
//   ELEVENLABS_API_KEY   (obligatoria)
//   ELEVENLABS_VOICE_ID  (la voz elegida)
// Cada frase se genera una vez y Netlify la guarda en su caché: las repeticiones no gastan créditos.
export default async (req) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response('Falta ELEVENLABS_API_KEY', { status: 503 });
  const url = new URL(req.url);
  const text = String(url.searchParams.get('t') || '').replace(/\s+/g, ' ').trim().slice(0, 320);
  if (!text) return new Response('Texto vacío', { status: 400 });
  const model = url.searchParams.get('m') === 'eleven_multilingual_v2' ? 'eleven_multilingual_v2' : 'eleven_flash_v2_5';
  const lang = ['es', 'en', 'pt', 'fr'].includes(url.searchParams.get('l')) ? url.searchParams.get('l') : 'es';
  const voiceId = String(process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').replace(/[^A-Za-z0-9]/g, '');
  const payload = { text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } };
  if (model === 'eleven_flash_v2_5') payload.language_code = lang;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return new Response(await r.text(), { status: r.status, headers: { 'Cache-Control': 'no-store' } });
  return new Response(await r.arrayBuffer(), {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Netlify-CDN-Cache-Control': 'public, durable, max-age=31536000, immutable',
    },
  });
};
