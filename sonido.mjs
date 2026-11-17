// Sonidos reales de animales con ElevenLabs (efectos de sonido).
// Solo acepta animales de la lista: nadie puede pedir otros sonidos y gastar créditos.
// Cada sonido se genera una vez y Netlify lo guarda en su caché para todos.
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
export default async (req) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response('Falta ELEVENLABS_API_KEY', { status: 503 });
  const id = new URL(req.url).searchParams.get('a') || '';
  const a = ANIMALES[id];
  if (!a) return new Response('Animal desconocido', { status: 400 });
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: a[0], duration_seconds: a[1], prompt_influence: 0.6 }),
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
