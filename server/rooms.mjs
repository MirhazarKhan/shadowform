// Room membership and recovery live on the server. The elected peer simulates
// patrols; clients send emitter state, never individual particle buffers.
const COLORS = ['#ff0305', '#12d9e8', '#ad5aff', '#ffb52e'];
const MAX_PLAYERS = 4, ROOM_LIFE = 6 * 3600 * 1000, ONLINE = 6000, RETAIN = 45000;
const initial = slot => ({ x: (slot - 1.5) * 10, y: 0, z: 278, form: 0, morph: 0,
  heading: 0, low: false, moving: false, burst: false, cohesion: 100,
  flow: [0, 0, 0], wall: [0, 0, 0, 0], transport: false, vision: false,
  consume: [0, 0, 0, -1], consumeGuard: -1, channel: '', mode: 'ready', tick: 0 });
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
function error(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
const parse = value => { try { return JSON.parse(value || '{}'); } catch { return {}; } };
const number = (v, min, max, fallback = 0) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
const vector = (v, n, min, max) => Array.from({ length: n }, (_, i) => number(v?.[i], min, max));
export function playerState(s = {}) {
  return { x: number(s.x, -700, 700), y: number(s.y, -20, 200), z: number(s.z, -700, 360, 278),
    form: Math.floor(number(s.form, 0, 7)), morph: number(s.morph, 0, 1),
    heading: number(s.heading, -100, 100), low: !!s.low, moving: !!s.moving, burst: !!s.burst,
    cohesion: number(s.cohesion, 0, 100, 100), flow: vector(s.flow, 3, -1.5, 1.5),
    wall: vector(s.wall, 4, -1, 1), transport: !!s.transport, vision: !!s.vision,
    consume: [...vector(s.consume, 3, -700, 700), number(s.consume?.[3], -1, 1, -1)],
    consumeGuard: Math.floor(number(s.consumeGuard, -1, 63, -1)),
    channel: typeof s.channel === 'string' ? s.channel.slice(0, 64) : '',
    mode: ['ready', 'playing', 'paused', 'downed'].includes(s.mode) ? s.mode : 'playing',
    tick: Math.floor(number(s.tick, 0, 1e12)) };
}
export function worldState(w = {}) {
  // Bound snapshots so one participant cannot grow room storage without limit.
  const bounded = JSON.stringify(w);
  if (bounded.length > 18000) error('World snapshot is too large.');
  const state = parse(bounded);
  state.ack = Math.floor(number(state.ack, 0, 1e12));
  state.tick = Math.floor(number(state.tick, 0, 1e12));
  return state;
}
function cleanName(name) { return String(name || 'Spirit').replace(/[\x00-\x1f<>]/g, '').trim().slice(0, 18) || 'Spirit'; }
function uid() { return crypto.randomUUID(); }
async function digest(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
}
function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
function checkCode(value) { const c = String(value || '').trim().toUpperCase(); if (!/^[A-Z2-9]{6}$/.test(c)) error('Enter a six-character room code.'); return c; }
function database(env) {
  if (!env.DB) error('Room server is unavailable. Please retry shortly.', 503);
  return env.DB.withSession ? env.DB.withSession('first-primary') : env.DB;
}
async function roomRow(db, c, now) {
  const r = await db.prepare('SELECT * FROM spirit_rooms WHERE code = ?').bind(c).first();
  if (!r || r.expires < now) error('Room not found or expired. Create a new room.', 404);
  return r;
}
async function member(db, c, input, request) {
  const p = await db.prepare('SELECT * FROM spirit_players WHERE id = ? AND room = ?').bind(String(input.player || ''), c).first();
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (!p || !token || await digest(token) !== p.token_hash) error('Your room session has expired. Join again.', 401);
  return p;
}
async function roster(db, c) {
  const result = await db.prepare('SELECT * FROM spirit_players WHERE room = ? ORDER BY joined, id').bind(c).all();
  return result.results;
}
async function snapshot(db, c, actor, signalAfter, now) {
  let room = await roomRow(db, c, now);
  const players = await roster(db, c);
  const eligible = players.filter(p => p.seen > now - ONLINE && p.available);
  if (eligible.length && !eligible.some(p => p.id === room.host_id)) {
    const elected = eligible[0].id;
    await db.prepare('UPDATE spirit_rooms SET host_id = ?, epoch = epoch + 1 WHERE code = ? AND host_id = ? AND epoch = ?')
      .bind(elected, c, room.host_id, room.epoch).run();
    room = await roomRow(db, c, now);
  }
  const world = parse(room.world);
  const queries = [db.prepare('SELECT seq, sender, payload FROM spirit_signals WHERE room = ? AND recipient = ? AND seq > ? AND created > ? ORDER BY seq LIMIT 48')
    .bind(c, actor.id, signalAfter, now - 60000)];
  if (actor.id === room.host_id) queries.push(db.prepare('SELECT seq, event_id, actor, payload FROM spirit_events WHERE room = ? AND seq > ? ORDER BY seq LIMIT 64').bind(c, world.ack || 0));
  const result = await db.batch(queries);
  return { you: actor.id, code: c, host: room.host_id, epoch: room.epoch, phase: room.phase,
    revision: room.revision, world, now,
    players: players.filter(p => p.seen > now - RETAIN).map(p => ({ id: p.id, slot: p.slot, color: COLORS[p.slot], name: p.name,
      ready: !!p.ready, online: p.seen > now - ONLINE, available: !!p.available, joined: p.joined, state: parse(p.state) })),
    signals: result[0].results.map(s => ({ seq: s.seq, from: s.sender, data: parse(s.payload) })),
    events: result[1]?.results.map(e => ({ seq: e.seq, id: e.event_id, from: e.actor, data: parse(e.payload) })) || [] };
}
export async function roomsFetch(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (!path.startsWith('/api/rooms')) return null;
  try {
    if (request.method !== 'POST') return json({ error: 'Use POST for room operations.' }, 405);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) error('Cross-origin room requests are not allowed.', 403);
    if (Number(request.headers.get('Content-Length') || 0) > 64000) error('Request is too large.', 413);
    const text = await request.text(); if (text.length > 64000) error('Request is too large.', 413);
    let input; try { input = JSON.parse(text); } catch { error('Invalid room request.'); }
    if (!input || typeof input !== 'object') error('Invalid room request.');
    const db = database(env), now = Date.now();
    if (path === '/api/rooms/create' || path === '/api/rooms/join') {
      const create = path.endsWith('/create'), c = create ? code() : checkCode(input.code);
      const id = uid(), token = uid() + uid(), hash = await digest(token);
      if (create) {
        await db.prepare('DELETE FROM spirit_rooms WHERE expires < ?').bind(now).run();
        await db.prepare('INSERT INTO spirit_rooms (code, host_id, created, expires) VALUES (?, ?, ?, ?)')
          .bind(c, id, now, now + ROOM_LIFE).run();
      } else await roomRow(db, c, now);
      await db.prepare('DELETE FROM spirit_players WHERE room = ? AND seen < ?').bind(c, now - RETAIN).run();
      let inserted = false;
      for (let attempt = 0; attempt < MAX_PLAYERS && !inserted; attempt++) {
        const existing = await roster(db, c), used = existing.map(p => p.slot);
        if (used.length >= MAX_PLAYERS) error('This room already has four spirits.', 409);
        const preferred = Math.floor(number(input.color, 0, 3));
        const slot = used.includes(preferred) ? [0, 1, 2, 3].find(n => !used.includes(n)) : preferred;
        try {
          await db.prepare('INSERT INTO spirit_players (id, room, token_hash, slot, name, joined, seen, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(id, c, hash, slot, cleanName(input.name), now, now, JSON.stringify(initial(slot))).run();
          inserted = true;
        } catch (e) { if (!String(e.message).includes('UNIQUE')) throw e; }
      }
      if (!inserted) error('Room changed while joining. Please try again.', 409);
      const actor = await db.prepare('SELECT * FROM spirit_players WHERE id = ?').bind(id).first();
      return json({ ...(await snapshot(db, c, actor, 0, now)), token });
    }
    const match = path.match(/^\/api\/rooms\/([A-Z2-9]{6})\/(sync|leave|start|ready|restart)$/);
    if (!match) error('Room operation not found.', 404);
    const [, c, operation] = match;
    let room = await roomRow(db, c, now);
    const actor = await member(db, c, input, request);
    if (operation === 'leave') {
      await db.prepare('DELETE FROM spirit_players WHERE id = ? AND room = ?').bind(actor.id, c).run();
      return json({ left: true });
    }
    if (operation === 'ready') await db.prepare('UPDATE spirit_players SET ready = ?, seen = ? WHERE id = ?').bind(input.ready ? 1 : 0, now, actor.id).run();
    if (operation === 'start' || operation === 'restart') {
      if (actor.id !== room.host_id) error('Only the room host can launch the heist.', 403);
      const players = (await roster(db, c)).filter(p => p.seen > now - ONLINE);
      if (players.length < 2) error('Two spirits are required to launch.', 409);
      if (operation === 'start' && players.some(p => !p.ready)) error('Each spirit must select Ready first.', 409);
      if (operation === 'start' && room.phase !== 'lobby') error('The heist has already started.', 409);
      if (operation === 'restart' && !['won', 'failed'].includes(parse(room.world).result)) error('The current heist is still active.', 409);
      const round = Math.floor(number(parse(room.world).round, 0, 1e9)) + 1;
      const last = await db.prepare('SELECT MAX(seq) AS seq FROM spirit_events WHERE room = ?').bind(c).first();
      const world = JSON.stringify({ round, tick: 0, ack: last.seq || 0, stage: 0, progress: 0, down: {}, dead: [], claims: {}, marks: {}, lures: [], result: null, time: 0, relay: 0 });
      const statements = [db.prepare("UPDATE spirit_rooms SET phase = 'playing', world = ?, revision = revision + 1 WHERE code = ? AND host_id = ?").bind(world, c, actor.id)];
      for (const p of players) statements.push(db.prepare('UPDATE spirit_players SET state = ? WHERE id = ?').bind(JSON.stringify(initial(p.slot)), p.id));
      await db.batch(statements);
    }
    if (operation === 'sync') {
      const statements = [db.prepare('UPDATE spirit_players SET state = ?, available = ?, seen = ? WHERE id = ? AND room = ?')
        .bind(JSON.stringify(playerState(input.state || parse(actor.state))), input.available === false ? 0 : 1, now, actor.id, c)];
      if (room.host_id === actor.id && input.world && input.epoch === room.epoch && room.phase === 'playing') {
        const world = worldState(input.world), prior = parse(room.world);
        if (world.round === prior.round && world.tick >= (prior.tick || 0)) statements.push(db.prepare('UPDATE spirit_rooms SET world = ?, revision = revision + 1 WHERE code = ? AND host_id = ? AND epoch = ?')
          .bind(JSON.stringify(world), c, actor.id, room.epoch));
      }
      for (const event of (Array.isArray(input.events) ? input.events : []).slice(0, 16)) {
        if (!/^[a-zA-Z0-9-]{8,80}$/.test(event.id || '') || !event.data || JSON.stringify(event.data).length > 1200) continue;
        if (!['lure', 'claim', 'consumed', 'ping'].includes(event.data.kind)) continue;
        statements.push(db.prepare('INSERT OR IGNORE INTO spirit_events (event_id, room, actor, payload, created) VALUES (?, ?, ?, ?, ?)')
          .bind(event.id, c, actor.id, JSON.stringify(event.data), now));
      }
      const players = await roster(db, c), ids = players.map(p => p.id);
      for (const s of (Array.isArray(input.signals) ? input.signals : []).slice(0, 24)) {
        if (!ids.includes(s.to) || s.to === actor.id || !/^[a-zA-Z0-9-]{8,80}$/.test(s.id || '')) continue;
        const payload = JSON.stringify(s.data);
        if (payload.length > 16000 || !['offer', 'answer', 'ice'].includes(s.data?.type)) continue;
        statements.push(db.prepare('INSERT OR IGNORE INTO spirit_signals (signal_id, room, sender, recipient, payload, created) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(s.id, c, actor.id, s.to, payload, now));
      }
      await db.batch(statements);
      // Bounded cleanup is performed on the slow recovery heartbeat only.
      if (input.cleanup && actor.id === room.host_id) await db.batch([
        db.prepare('DELETE FROM spirit_signals WHERE room = ? AND created < ?').bind(c, now - 60000),
        db.prepare('DELETE FROM spirit_events WHERE room = ? AND seq <= ? AND created < ?').bind(c, parse(room.world).ack || 0, now - 30000)
      ]);
    }
    return json(await snapshot(db, c, actor, Math.floor(number(input.signalAfter, 0, 1e12)), now));
  } catch (e) {
    if (!e.status) console.error('Room request failed:', e.message);
    return json({ error: e.status ? e.message : 'Room connection is temporarily unavailable. Try again.' }, e.status || 503);
  }
}
export default { async fetch(request, env) {
  const api = await roomsFetch(request, env); if (api) return api;
  return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Game assets are unavailable.', { status: 503 });
} };
