// Cloudflare Worker: глобальный лидерборд + шаринг карточки для "Космических жуков".
//
// Инфраструктура минимальна: один Worker + одна база D1 (binding DB) + secret BOT_TOKEN.
// Клиент (index.html) остаётся одним файлом без зависимостей и просто дёргает эти
// эндпоинты по HTTP; если Worker недоступен, игра работает как раньше (топ и медиа-
// шаринг тихо выключаются).
//
// Эндпоинты:
//   GET  /top?limit=50           – глобальный топ (публичный, без авторизации)
//   POST /submit {initData,score,level}   – отправить счёт (подпись initData проверяется)
//   POST /me     {initData}      – своё место/рекорд в мире
//   POST /share  {initData,png,text,...}  – подготовить inline-сообщение с карточкой
//   GET  /card/<id>.png          – отдать PNG карточки (Telegram тянет по photo_url)
//
// Честность: счёт приходит с открытого клиента, поэтому единственная реальная защита –
// проверка подписи Telegram initData (HMAC с токеном бота) на сервере: это гарантирует
// настоящего пользователя Telegram и настоящее имя, режет анонимный спам. Абсолютной
// защиты от накрутки собственного счёта для клиентской игры не существует – добавлен
// только санити-кап. См. verifyInitData().

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
});

const MAX_SCORE = 10000000;   // санити-кап: выше – явная накрутка, отклоняем
const MAX_LEVEL = 10000;
const TOP_LIMIT = 100;        // максимум строк в выдаче топа
const CARD_MAX_BYTES = 900000; // предел размера PNG карточки (~0.9 МБ)
const CARD_TTL = 86400;       // карточки шаринга живут сутки

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
        const url = new URL(request.url);
        try {
            if (url.pathname === '/top' && request.method === 'GET') return await handleTop(url, env);
            if (url.pathname === '/submit' && request.method === 'POST') return await handleSubmit(request, env);
            if (url.pathname === '/me' && request.method === 'POST') return await handleMe(request, env);
            if (url.pathname === '/share' && request.method === 'POST') return await handleShare(request, env, url);
            if (url.pathname.startsWith('/card/') && request.method === 'GET') return await handleCard(url, env);
            if (url.pathname === '/whoami' && request.method === 'GET') return await handleWhoami(env);
            if (url.pathname === '/') return json({ ok: true, service: 'kosmozhuki-leaderboard' });
            return json({ error: 'not_found' }, 404);
        } catch (e) {
            return json({ error: 'server', detail: String((e && e.message) || e) }, 500);
        }
    },
};

// ===== Проверка подписи Telegram initData =====
const enc = (s) => new TextEncoder().encode(s);
const toHex = (buf) => [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(keyBytes, msgBytes) {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', key, msgBytes));
}

// Возвращает объект user, если подпись валидна и данные свежие; иначе null.
// maxAgeSec = 7 суток: initData переиспользуется в сессии, строгая защита от реплея
// для игрового топа не нужна.
async function verifyInitData(initData, botToken, maxAgeSec = 604800) {
    botToken = String(botToken || '').trim();   // защита от лишних пробелов/переносов в secret
    if (!initData || !botToken) { console.log('verify FAIL: missing', { hasInit: !!initData, hasToken: !!botToken }); return null; }
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) { console.log('verify FAIL: no hash'); return null; }
    // data_check_string: все поля, кроме hash (и Ed25519-signature), key=value по '\n',
    // отсортированные по ключу; значения – уже декодированные (как их берёт Telegram).
    const entries = [...params.entries()].filter(([k]) => k !== 'hash' && k !== 'signature');
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = await hmac(enc('WebAppData'), enc(botToken));
    const computed = toHex(await hmac(secret, enc(dataCheckString)));
    if (computed !== hash) { console.log('verify FAIL: hash mismatch', { tokenLen: botToken.length, keys: entries.map((e) => e[0]) }); return null; }
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const age = Math.round(Date.now() / 1000 - authDate);
    if (maxAgeSec && authDate && age > maxAgeSec) { console.log('verify FAIL: stale', { age }); return null; }
    let user = null;
    try { user = JSON.parse(params.get('user') || 'null'); } catch (e) { /* ignore */ }
    if (!user || !user.id) { console.log('verify FAIL: no user', { rawUser: params.get('user') }); return null; }
    console.log('verify OK', { id: user.id, name: user.first_name, age });
    return user;
}

function displayName(user) {
    let n = (user.first_name || '').trim();
    if (user.last_name) n += ' ' + String(user.last_name).trim();
    n = n.trim();
    if (!n) n = user.username ? '@' + user.username : 'Player ' + String(user.id).slice(-4);
    return n.slice(0, 32);
}

// ===== Диагностика: чей токен лежит в секрете (сам токен не раскрывается) =====
async function handleWhoami(env) {
    const token = String(env.BOT_TOKEN || '').trim();
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`)
        .then((x) => x.json()).catch((e) => ({ ok: false, description: String(e) }));
    return json({
        ok: !!(r && r.ok),
        bot: r && r.ok ? r.result.username : null,
        tokenLen: token.length,
        error: r && r.ok ? undefined : (r && r.description) || 'unknown',
    });
}

// ===== Топ =====
async function handleTop(url, env) {
    let limit = parseInt(url.searchParams.get('limit') || '50', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 50;
    limit = Math.min(limit, TOP_LIMIT);
    const rows = await env.DB.prepare(
        'SELECT name,score,level FROM scores ORDER BY score DESC, updated ASC LIMIT ?1'
    ).bind(limit).all();
    const top = (rows.results || []).map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, level: r.level }));
    const total = await env.DB.prepare('SELECT COUNT(*) AS c FROM scores').first();
    return json({ ok: true, top, total: (total && total.c) || 0 });
}

// ===== Отправка счёта =====
async function handleSubmit(request, env) {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'bad_json' }, 400);
    const user = await verifyInitData(body.initData, env.BOT_TOKEN);
    if (!user) return json({ error: 'unauthorized' }, 401);

    let score = Math.floor(Number(body.score));
    let level = Math.floor(Number(body.level));
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return json({ error: 'bad_score' }, 400);
    if (!Number.isFinite(level) || level < 0 || level > MAX_LEVEL) level = 0;

    const name = displayName(user);
    const now = Math.floor(Date.now() / 1000);
    console.log('submit', { user: user.id, name, score, level });
    // upsert: храним максимальный счёт пользователя; уровень – от лучшего забега.
    await env.DB.prepare(
        `INSERT INTO scores (user_id,name,username,score,level,updated) VALUES (?1,?2,?3,?4,?5,?6)
         ON CONFLICT(user_id) DO UPDATE SET
           name=excluded.name,
           username=excluded.username,
           level=CASE WHEN excluded.score > scores.score THEN excluded.level ELSE scores.level END,
           score=MAX(scores.score, excluded.score),
           updated=excluded.updated`
    ).bind(user.id, name, user.username || null, score, level, now).run();

    return await meResponse(env, user.id, { score, level });
}

// ===== Своё место в мире =====
async function handleMe(request, env) {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'bad_json' }, 400);
    const user = await verifyInitData(body.initData, env.BOT_TOKEN);
    if (!user) return json({ error: 'unauthorized' }, 401);
    return await meResponse(env, user.id, null);
}

async function meResponse(env, userId, fallback) {
    const me = await env.DB.prepare('SELECT score,level FROM scores WHERE user_id=?1').bind(userId).first();
    const best = me ? me.score : (fallback ? fallback.score : 0);
    const level = me ? me.level : (fallback ? fallback.level : 0);
    const rankRow = await env.DB.prepare('SELECT COUNT(*)+1 AS rank FROM scores WHERE score > ?1').bind(best).first();
    const total = await env.DB.prepare('SELECT COUNT(*) AS c FROM scores').first();
    return json({
        ok: true,
        rank: me ? (rankRow && rankRow.rank) || null : null,
        best, level,
        total: (total && total.c) || 0,
    });
}

// ===== Шаринг: карточка -> подготовленное inline-сообщение (фото) =====
async function handleShare(request, env, url) {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'bad_json' }, 400);
    const user = await verifyInitData(body.initData, env.BOT_TOKEN);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const m = String(body.png || '').match(/^data:image\/png;base64,(.+)$/);
    if (!m) return json({ error: 'bad_png' }, 400);
    const bytes = base64ToBytes(m[1]);
    if (bytes.length > CARD_MAX_BYTES) return json({ error: 'png_too_big' }, 400);

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare('INSERT INTO cards (id,png,created) VALUES (?1,?2,?3)').bind(id, bytes.buffer, now).run();
    // Опортунистическая уборка просроченных карточек.
    await env.DB.prepare('DELETE FROM cards WHERE created < ?1').bind(now - CARD_TTL).run();

    const base = (env.PUBLIC_URL && env.PUBLIC_URL.replace(/\/$/, '')) || url.origin;
    const cardUrl = `${base}/card/${id}.png`;
    const result = {
        type: 'photo',
        id,
        photo_url: cardUrl,
        thumbnail_url: cardUrl,
        photo_width: Math.min(2560, Math.max(1, parseInt(body.w, 10) || 640)),
        photo_height: Math.min(2560, Math.max(1, parseInt(body.h, 10) || 800)),
        caption: String(body.text || '').slice(0, 1000),
        reply_markup: {
            inline_keyboard: [[{
                text: String(body.playText || '🎮 Play').slice(0, 40),
                url: String(body.gameUrl || 'https://t.me/kosmozhuki_bot/play'),
            }]],
        },
    };
    const token = String(env.BOT_TOKEN || '').trim();
    const api = `https://api.telegram.org/bot${token}/savePreparedInlineMessage`;
    const tgResp = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user.id,
            result,
            allow_user_chats: true,
            allow_group_chats: true,
            allow_channel_chats: true,
        }),
    }).then((r) => r.json()).catch(() => null);
    if (!tgResp || !tgResp.ok) {
        return json({ error: 'tg_failed', detail: (tgResp && tgResp.description) || 'no response' }, 502);
    }
    return json({ ok: true, prepared_message_id: tgResp.result.id, card_url: cardUrl });
}

// ===== Отдать PNG карточки =====
async function handleCard(url, env) {
    const id = url.pathname.split('/').pop().replace(/\.png$/, '');
    const row = await env.DB.prepare('SELECT png FROM cards WHERE id=?1').bind(id).first();
    if (!row) return new Response('not found', { status: 404, headers: CORS });
    return new Response(row.png, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', ...CORS },
    });
}

function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}
