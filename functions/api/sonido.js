// Sonidos reales de animales con ElevenLabs (efectos de sonido).
// Solo acepta animales de la lista: nadie puede pedir otros sonidos y gastar créditos.
// Cada sonido se genera una vez y Cloudflare lo guarda en su caché para todos.
const ANIMALES = {
  perro: ['A friendly small dog barking twice, clear close-up recording, no background noise', 2],
  gato: ['A cute cat meowing once, clear close-up recording', 2],
  vaca: ['A cow mooing on a farm, clear', 2.5],
  oveja: ['A sheep bleating baa, clear', 2],
  cerdo: ['A pig oinking and grunting, cute', 2],
  caballo: ['A horse neighing, whinny, clear', 2.5],
  gallina: ['A hen clucking, clear', 2],
  gallo: ['A rooster crowing cock-a-doodle-doo in the morning', 3],
  pato: ['A duck quacking, clear', 2],
  pollito: ['Baby chicks chirping peep peep, cute', 2],
  rana: ['A frog croaking ribbit at a pond', 2],
  leon: ['A lion roaring, friendly cartoon style, not scary', 2.5],
  elefante: ['An elephant trumpeting', 2.5],
  mono: ['A playful monkey chattering ooh ooh aah aah', 2.5],
  buho: ['An owl hooting softly at night', 2.5],
  abeja: ['A bee buzzing around flowers', 2],
  serpiente: ['A snake hissing softly', 2],
  lobo: ['A wolf howling at the moon, gentle', 3],
  ballena: ['A whale singing underwater, gentle', 3.5],
  raton: ['A small mouse squeaking, cute', 1.5],
};
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
  const key = env.ELEVENLABS_API_KEY;
  if (!key) return new Response('Falta ELEVENLABS_API_KEY', { status: 503 });
  const id = new URL(req.url).searchParams.get('a') || '';
  const a = ANIMALES[id];
  if (!a) return new Response('Animal desconocido', { status: 400 });
  return cached(context, () => fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: a[0], duration_seconds: a[1], prompt_influence: 0.6 }),
  }));
}
