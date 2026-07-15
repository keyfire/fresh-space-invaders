/* ============================================================================
   Локальный QA-прогон playgama-сборки жуков под управляемым моком Bridge SDK.
   По мотивам games/scripts/qa-playgama.mjs монорепы, но под архитектуру этой
   игры (один index.html, сейвы куки+bridge.storage, ручка window.__pg).

   Мок ОБЯЗАН повторять поведение живого SDK: get возвращает УЖЕ РАЗОБРАННОЕ
   значение (не строку) – именно на этом упущении в монорепе мимо всех прогонов
   проехал баг сброса прогресса.

   Запуск (puppeteer берётся из монорепы игр):
     node build/qa-playgama.mjs
   Проверки:
     1. boot            – игра грузится, шлёт game_ready, консоль чистая
     2. облако-мердж    – рекорд из bridge.storage поднимается при старте
     3. запись-сейва    – saveBest пишет все ключи через bridge.storage, localStorage не тронут
     4. rewarded        – Ads.showRewarded зовёт площадку и отдаёт награду по "rewarded"
     5. interstitial    – рестарт после game over показывает interstitial (после грейса)
     6. пауза           – PAUSE_STATE_CHANGED замораживает игру и отпускает обратно
     7. без-SDK         – CDN недоступен -> игра стартует как обычная веб-версия
   ========================================================================== */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const SERVE_DIR = resolve(ROOT, 'playgama-build');
// puppeteer не ставим в этот репозиторий (игра без зависимостей) – берём из монорепы игр.
const GAMES_ROOT = 'D:/Repos/passive-money/games';
const puppeteer = (await import(pathToFileURL(join(GAMES_ROOT, 'node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href)).default;

const BRIDGE_SDK_HOST = 'bridge.playgama.com';
const PORT = 8123;
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
};

// Мок Bridge: подставляется вместо скрипта SDK с CDN. "Облако" живёт в Node
// (переживает reload). window.__mockEmit отдан наружу – прогон шлёт им паузу.
const MOCK_SDK = `
(function () {
  var handlers = {};
  function emit(event, state) { (handlers[event] || []).forEach(function (cb) { cb(state); }); }
  function on(event, cb) { (handlers[event] = handlers[event] || []).push(cb); }
  window.__mockEmit = emit;
  window.bridge = {
    EVENT_NAME: {
      INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed',
      REWARDED_STATE_CHANGED: 'rewarded_state_changed',
      PAUSE_STATE_CHANGED: 'pause_state_changed',
      AUDIO_STATE_CHANGED: 'audio_state_changed',
    },
    initialize: function () { return Promise.resolve(); },
    platform: {
      id: 'crazy_games',
      language: 'en',
      sendMessage: function (m) { window.__qaEvent('msg', m); },
      on: on,
    },
    storage: {
      // Как живой SDK: значения возвращаются УЖЕ РАЗОБРАННЫМИ (JSON.parse при удаче).
      get: function (keys) {
        return Promise.all(keys.map(function (k) { return window.__qaCloudGet(k); }))
          .then(function (vals) {
            return vals.map(function (v) {
              if (v == null) return null;
              try { return JSON.parse(v); } catch (e) { return v; }
            });
          });
      },
      set: function (keys, values) {
        return Promise.all(keys.map(function (k, i) { return window.__qaCloudSet(k, values[i]); }));
      },
    },
    advertisement: {
      isInterstitialSupported: true,
      isRewardedSupported: true,
      showInterstitial: function () {
        window.__qaEvent('ad', 'interstitial');
        emit('interstitial_state_changed', 'opened');
        emit('pause_state_changed', true);
        setTimeout(function () {
          emit('pause_state_changed', false);
          emit('interstitial_state_changed', 'closed');
        }, 150);
      },
      showRewarded: function () {
        window.__qaEvent('ad', 'rewarded');
        emit('rewarded_state_changed', 'opened');
        emit('pause_state_changed', true);
        setTimeout(function () {
          emit('rewarded_state_changed', 'rewarded');
          emit('pause_state_changed', false);
          emit('rewarded_state_changed', 'closed');
        }, 150);
      },
      on: on,
      off: function (event, cb) {
        handlers[event] = (handlers[event] || []).filter(function (h) { return h !== cb; });
      },
    },
    leaderboards: {
      setScore: function (id, score) { window.__qaEvent('score', id + ':' + score); return Promise.resolve(); },
    },
  };
})();
`;

function waitFor(cond, timeoutMs) {
    const started = Date.now();
    return new Promise((res) => {
        const tick = async () => {
            if (await cond()) return res(true);
            if (Date.now() - started > timeoutMs) return res(false);
            setTimeout(tick, 60);
        };
        tick();
    });
}

async function runBoot(browser, { cloud, blockSdk = false }) {
    const page = await browser.newPage();
    const bag = { gets: [], sets: [], ads: [], msgs: [], scores: [], errors: [], notFound: [] };

    await page.exposeFunction('__qaCloudGet', (key) => { bag.gets.push(key); return cloud.get(key) ?? null; });
    await page.exposeFunction('__qaCloudSet', (key, value) => {
        setTimeout(() => cloud.set(key, value), 200);   // облако "медленное", как настоящая сеть
        bag.sets.push({ key, value });
    });
    await page.exposeFunction('__qaEvent', (kind, payload) => {
        if (kind === 'msg') bag.msgs.push(payload);
        if (kind === 'ad') bag.ads.push(payload);
        if (kind === 'score') bag.scores.push(payload);
    });

    page.on('console', (m) => { if (m.type() === 'error') bag.errors.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => bag.errors.push(String(e.message).slice(0, 160)));
    page.on('response', (r) => {
        const path = new URL(r.url()).pathname;
        if (r.status() === 404 && path !== '/favicon.ico') bag.notFound.push(path);
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (req.url().includes(BRIDGE_SDK_HOST)) {
            if (blockSdk) return req.abort();
            return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: MOCK_SDK });
        }
        req.continue();
    });

    // Куки/локальное хранилище чистые на каждый прогон (кросс-девайс сценарий).
    const cdp = await page.createCDPSession();
    await cdp.send('Network.clearBrowserCookies');
    await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    return { page, bag };
}

const checks = [];
function check(name, ok, note) {
    checks.push({ name, ok, note });
    console.log(`  ${ok ? 'OK    ' : 'ПРОВАЛ'}  ${name.padEnd(22)} ${note}`);
}

const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = resolve(SERVE_DIR, '.' + (path === '/' ? '/index.html' : path));
    try {
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        if (path === '/favicon.ico') { res.writeHead(204).end(); return; }
        res.writeHead(404).end('not found');
    }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

console.log('\nkosmozhuki (playgama-build)');

/* --- Прогон A: облако засеяно рекордом – мердж, сейв, реклама, пауза, interstitial --- */
{
    const cloud = new Map([
        ['ksi_best_score', '4242'],
        ['ksi_best_level', '7'],
        ['ksi_daily_streak', '3'],
        ['ksi_daily_last', '2026-07-14'],
        ['ksi_daily_used', ''],
    ]);
    const { page, bag } = await runBoot(browser, { cloud });

    const ready = await waitFor(() => bag.msgs.includes('game_ready'), 15000);
    const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
    check('boot', ready && hasCanvas && bag.errors.length === 0 && bag.notFound.length === 0,
        !ready ? 'game_ready НЕ отправлен'
            : bag.notFound.length ? `404: ${[...new Set(bag.notFound)].join(', ')}`
            : bag.errors.length ? `ошибки консоли: ${bag.errors.slice(0, 2).join(' | ')}`
            : 'игра загрузилась, game_ready отправлен, консоль чистая');

    const merged = await waitFor(() => page.evaluate(() => window.__pg && window.__pg.state().bestScore === 4242), 5000);
    const st0 = await page.evaluate(() => window.__pg.state());
    check('облако-мердж', merged && st0.bestLevel === 7 && st0.dailyStreak === 3,
        merged ? `рекорд из bridge.storage поднялся (score=${st0.bestScore}, level=${st0.bestLevel}, streak=${st0.dailyStreak})`
               : `рекорд НЕ поднялся из облака (state=${JSON.stringify(st0)})`);

    bag.sets.length = 0;
    await page.evaluate(() => window.__pg.saveBest());
    await waitFor(() => bag.sets.length >= 5, 3000);
    const keys = bag.sets.map((s) => s.key);
    const lsKeys = await page.evaluate(() => Object.keys(localStorage));
    check('запись-сейва', keys.includes('ksi_best_score') && keys.includes('ksi_daily_last') && lsKeys.length === 0,
        keys.length ? `bridge.storage.set: ${keys.length} ключей; localStorage ${lsKeys.length === 0 ? 'не тронут' : 'ЗАСОРЁН: ' + lsKeys.join(',')}`
                    : 'saveBest не дошёл до bridge.storage');
    check('лидерборд', bag.scores.some((s) => s.startsWith('main:')),
        bag.scores.length ? `setScore ушёл (${bag.scores[0]})` : 'setScore не вызван');

    // Rewarded: путь игры (Ads.showRewarded) с наградой по состоянию "rewarded".
    const rewardOk = await page.evaluate(() => new Promise((res) => {
        window.__pg.ads().showRewarded(() => res('reward'), () => res('skip'));
        setTimeout(() => res('timeout'), 4000);
    }));
    check('rewarded', rewardOk === 'reward' && bag.ads.includes('rewarded'),
        `исход=${rewardOk}, площадка ${bag.ads.includes('rewarded') ? 'вызвана' : 'НЕ вызвана'}`);

    // Пауза: событие площадки замораживает цикл и отпускает обратно.
    await page.evaluate(() => window.__mockEmit('pause_state_changed', true));
    const pausedOn = await waitFor(() => page.evaluate(() => window.__pg.state().paused === true), 2000);
    await page.evaluate(() => window.__mockEmit('pause_state_changed', false));
    const pausedOff = await waitFor(() => page.evaluate(() => window.__pg.state().paused === false), 2000);
    check('пауза', pausedOn && pausedOff, `замораживается=${pausedOn}, отпускает=${pausedOff}`);

    // Interstitial на рестарте: старт -> game over -> рестарт (после грейса 10с).
    await page.evaluate(() => window.__pg.startGame());
    const started = await waitFor(() => page.evaluate(() => window.__pg.state().gameRunning), 2000);
    await page.evaluate(() => window.__pg.gameOverNow());
    await waitFor(() => page.evaluate(() => window.__pg.state().gameOver), 2000);
    await new Promise((r) => setTimeout(r, 10500));   // грейс INTER_GRACE_MS от старта сессии
    bag.ads.length = 0;
    await page.evaluate(() => window.__pg.startGame());
    const interShown = await waitFor(() => bag.ads.includes('interstitial'), 3000);
    const restarted = await waitFor(() => page.evaluate(() => {
        const s = window.__pg.state();
        return s.gameRunning && !s.gameOver;
    }), 5000);
    check('interstitial', started && interShown && restarted,
        `показан=${interShown}, игра после него перезапустилась=${restarted}`);

    await page.close();
}

/* --- Прогон B: CDN недоступен – игра стартует без Bridge (страховочный таймаут) --- */
{
    const { page, bag } = await runBoot(browser, { cloud: new Map(), blockSdk: true });
    // 3 попытки загрузки SDK с паузами + страховка 6с – ждём старта движка.
    const booted = await waitFor(() => page.evaluate(() =>
        !!document.querySelector('canvas') && window.__pg && window.__pg.hasOwnProperty && window.__pg.state().hasBridge === false
    ), 15000);
    const fatals = bag.errors.filter((e) => !/bridge|playgama|net::|Failed to load/i.test(e));
    check('без-SDK', booted && fatals.length === 0,
        booted ? 'CDN недоступен – игра стартовала обычной веб-версией' : `игра не стартовала (errors: ${bag.errors.slice(0, 2).join(' | ')})`);
    await page.close();
}

await browser.close();
server.close();

const failed = checks.filter((c) => !c.ok);
console.log(failed.length ? `\nИТОГ: провалов – ${failed.length}` : '\nИТОГ: провалов нет.');
process.exit(failed.length ? 1 : 0);
