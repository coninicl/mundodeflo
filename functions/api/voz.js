// Voz IA de Mundo de Flo (ElevenLabs) para TODOS los usuarios.
// Variables de entorno en Cloudflare Pages (Settings → Variables and Secrets):
//   ELEVENLABS_API_KEY          (obligatoria)
//   ELEVENLABS_VOICE_ID         (la voz de Chimpi)
//   ELEVENLABS_STORY_VOICE_ID   (opcional: narrador tranquilo de los cuentos)
//   ELEVENLABS_SPECIAL_VOICE_ID (opcional: voz especial de los cuentos, por ejemplo tu propia voz)
// Cada frase se genera una vez y Cloudflare la guarda en su caché: las repeticiones no gastan créditos.
const clean = (v) => String(v || '').replace(/[^A-Za-z0-9]/g, '');
const SLOTS = { cuento: 'ELEVENLABS_STORY_VOICE_ID', especial: 'ELEVENLABS_SPECIAL_VOICE_ID' };

// Guarda cada audio una sola vez (caché de Cloudflare y, si existe, el KV "AUDIO"),
// así las repeticiones no gastan créditos de ElevenLabs.
async function cached(context, make) {
  const { request, env } = context;
  const cache = caches.default;
  const key = new Request(new URL(request.url).toString(), { method: 'GET' });
  try { const hit = await cache.match(key); if (hit) return hit; } catch (e) {}
  const kvKey = new URL(request.url).pathname + new URL(request.url).search;
  if (env.AUDIO) {
    try {
      const buf = await env.AUDIO.get(kvKey, 'arrayBuffer');
      if (buf) return audio(buf);
    } catch (e) {}
  }
  const res = await make();
  if (!res.ok) return res;
  const buf = await res.arrayBuffer();
  const out = audio(buf);
  try { context.waitUntil(cache.put(key, out.clone())); } catch (e) {}
  if (env.AUDIO) { try { context.waitUntil(env.AUDIO.put(kvKey, buf)); } catch (e) {} }
  return out;
}
function audio(buf) {
  return new Response(buf, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}

export async function onRequest(context) {
  const { request, env } = context;
  const req = request;
  const url = new URL(req.url);
  if (url.searchParams.get('info')) {
    const info = { ok: !!env.ELEVENLABS_API_KEY };
    for (const [slot, name] of Object.entries(SLOTS)) info[slot] = !!clean(env[name]);
    // Huella corta de las voces: si cambias una voz, la app pide audios nuevos en vez de usar los guardados.
    const all = [env.ELEVENLABS_VOICE_ID, ...Object.values(SLOTS).map((e) => env[e])].map(clean).join('|');
    let h = 0;
    for (const ch of all) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    info.ver = h.toString(36);
    return new Response(JSON.stringify(info), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  const key = env.ELEVENLABS_API_KEY;
  if (!key) return new Response('Falta ELEVENLABS_API_KEY', { status: 503 });
  const text = String(url.searchParams.get('t') || '').replace(/\s+/g, ' ').trim().slice(0, 320);
  if (!text) return new Response('Texto vacío', { status: 400 });
  const model = url.searchParams.get('m') === 'eleven_multilingual_v2' ? 'eleven_multilingual_v2' : 'eleven_flash_v2_5';
  const lang = ['es', 'en', 'pt', 'fr'].includes(url.searchParams.get('l')) ? url.searchParams.get('l') : 'es';
  const slot = SLOTS[url.searchParams.get('v')] ? url.searchParams.get('v') : '';
  const slotVoice = slot ? clean(env[SLOTS[slot]]) : '';
  const voiceId = slotVoice || clean(env.ELEVENLABS_VOICE_ID) || '21m00Tcm4TlvDq8ikWAM';
  // Los narradores de cuentos hablan más calmados y un poquito más lento.
  const voice_settings = slotVoice
    ? { stability: 0.75, similarity_boost: 0.8, speed: 0.9 }
    : { stability: 0.5, similarity_boost: 0.75 };
  const payload = { text, model_id: model, voice_settings };
  if (model === 'eleven_flash_v2_5') payload.language_code = lang;
  return cached(context, () => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(payload),
  }));
}
