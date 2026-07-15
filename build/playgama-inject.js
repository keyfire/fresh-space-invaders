/* ============================================================================
   Интеграция Playgama Bridge. Внедряется build-скриптом (build-playgama.mjs) в
   КОНЕЦ основного <script> игры – имеет доступ ко всем её переменным и функциям
   (Ads, bestScore, saveBest, startGame, loop, audioCtx, LANG...). В обычной
   сборке (Telegram/Pages) этого кода нет.

   Bridge SDK (снимок API 13.07.2026, wiki.playgama.com/playgama/bridge-sdk):
     init      bridge.initialize() -> Promise
     платформа bridge.platform.id / .language / .sendMessage("game_ready")
     реклама   bridge.advertisement.showInterstitial|showRewarded()
               состояния через EVENT_NAME.*_STATE_CHANGED: loading|opened|closed|rewarded|failed
     сейвы     bridge.storage.get([keys]) / set([keys],[values]) -> Promise
               ВНИМАНИЕ: get возвращает УЖЕ РАЗОБРАННОЕ значение (Bridge сам делает
               JSON.parse) – число придёт числом, не строкой.
     пауза     PAUSE_STATE_CHANGED / AUDIO_STATE_CHANGED на bridge.platform

   Без SDK (локальный прогон, CDN недоступен) игра стартует как обычная веб-версия
   по таймауту – сейвы остаются на куках, реклама недоступна.
   ========================================================================== */
(function () {
    'use strict';

    var BRIDGE_SDK = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js';
    var LB_ID = 'main';                       // совпадает с playgama-bridge-config.json
    var AD_TERMINAL = ['closed', 'failed'];   // rewarded – промежуточное, после него будет closed
    var INTER_GRACE_MS = 10000;               // тишина первые ~10с сессии (стенд Test Game дольше не ждёт)
    var INTER_GAP_MS = 90000;                 // свой кулдаун между interstitial (в конфиге delays=0 – SDK не режет)

    var bridge = null;

    // Ключи сейвов – те же, что в куках/TG CloudStorage (единый нейминг сейва игры).
    var SAVE_KEYS = ['ksi_best_score', 'ksi_best_level', 'ksi_daily_streak', 'ksi_daily_last', 'ksi_daily_used'];

    function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
    function str(v) { return v == null ? '' : String(v); }

    /* ---------- Отложенный старт движка (как в сборке Яндекса) ----------
       Язык площадки применяем ДО первого кадра меню; страховка на случай
       недоступного SDK – стартуем через 6с без облачных функций. */
    var engineStarted = false;
    function startEngineOnce(lang) {
        if (engineStarted) return;
        engineStarted = true;
        if (lang && SUPPORTED_LANGS.indexOf(lang) >= 0) { LANG = lang; }
        if (typeof window.__startEngine === 'function') { window.__startEngine(); }
    }
    var bootFallback = setTimeout(function () { startEngineOnce(LANG); }, 6000);

    /* ---------- Загрузка SDK с повторами ----------
       CDN Playgama отвечает не всегда, сбои почти всегда транзиентные – три
       подхода снимают проблему. Неудачный тег обязательно снимаем, иначе повтор
       мгновенно "успешно" вернётся по querySelector, ничего не загрузив. */
    function injectScript(src, timeoutMs) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
            var el = document.createElement('script');
            el.src = src;
            el.async = true;
            var timer = setTimeout(function () { reject(new Error('таймаут загрузки SDK')); }, timeoutMs || 10000);
            el.onload = function () { clearTimeout(timer); resolve(); };
            el.onerror = function () { clearTimeout(timer); reject(new Error('SDK не загрузился')); };
            document.head.appendChild(el);
        });
    }
    function loadSdk(attempt) {
        attempt = attempt || 1;
        return injectScript(BRIDGE_SDK).then(function () {
            if (!window.bridge) throw new Error('скрипт загрузился, но window.bridge не появился');
        }).catch(function (err) {
            var tag = document.querySelector('script[src="' + BRIDGE_SDK + '"]');
            if (tag) tag.remove();
            if (attempt >= 3) throw err;
            console.warn('[playgama] SDK не загрузился (попытка ' + attempt + '/3), повтор', err);
            return new Promise(function (r) { setTimeout(r, 800 * attempt); }).then(function () {
                return loadSdk(attempt + 1);
            });
        });
    }

    /* ---------- Пауза геймплея и звука ----------
       Bridge шлёт PAUSE_STATE_CHANGED при показе рекламы, системной паузе,
       переключении вкладки; AUDIO_STATE_CHANGED – когда площадка глушит звук.
       Пауза замораживает ВЕСЬ цикл (update+draw): последний кадр остаётся на
       холсте, dt после разморозки не скачет (lastTime ведём вперёд). */
    var pgPaused = false;
    var pgAudioOff = false;
    var _loop = loop;
    loop = function (currentTime) {
        if (pgPaused) { lastTime = currentTime; requestAnimationFrame(loop); return; }
        _loop(currentTime);
    };
    function applyAudio() {
        if (!audioCtx) return;
        if (pgPaused || pgAudioOff) {
            if (audioCtx.state === 'running') audioCtx.suspend();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }
    // initAudio() при каждом взаимодействии делает resume() – после него
    // повторно применяем волю площадки (например звук выключен в оболочке).
    var _initAudio = initAudio;
    initAudio = function () { _initAudio(); applyAudio(); };
    function setPaused(p) {
        pgPaused = !!p;
        if (pgPaused) stopFire();
        applyAudio();
    }

    /* ---------- Ожидание завершения показа рекламы ----------
       Терминальные состояния closed/failed; с rewardState=true только если среди
       состояний встретилось "rewarded". Предохранитель 60с – не зависаем, если
       площадка не пришлёт терминал. Колбэк принимает (state) или (_, state) в
       зависимости от площадки – берём первый строковый аргумент. */
    function waitAdState(eventKey, eventFallback, rewardState) {
        var ad = bridge.advertisement;
        var event = (bridge.EVENT_NAME && bridge.EVENT_NAME[eventKey]) || eventFallback;
        return new Promise(function (resolve) {
            var settled = false, rewarded = false;
            function finish(value) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try { if (ad.off) ad.off(event, handler); } catch (e) { /* off не у всех площадок */ }
                resolve(value);
            }
            function handler() {
                var state = null;
                for (var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] === 'string') { state = arguments[i]; break; }
                }
                if (!state) return;
                if (rewardState && state === rewardState) rewarded = true;
                if (AD_TERMINAL.indexOf(state) >= 0) finish(rewardState ? rewarded : true);
            }
            var timer = setTimeout(function () { finish(rewardState ? rewarded : true); }, 60000);
            ad.on(event, handler);
        });
    }

    /* ---------- Interstitial на рестарте после законченного забега ----------
       Показываем ПЕРЕД стартом новой игры (game over -> "Играть снова"): грейс
       ~10с от старта сессии, дальше свой кулдаун. Пока реклама открыта, клики
       не копим – старт произойдёт по её завершении. */
    var sessionStart = Date.now();
    var lastInter = 0;
    var interPending = false;
    var _startGame = startGame;
    startGame = function () {
        if (interPending) return;
        var now = Date.now();
        var due = gameOver && bridge && bridge.advertisement &&
            bridge.advertisement.isInterstitialSupported !== false &&   // режем только явный отказ (undefined в стенде)
            now - sessionStart > INTER_GRACE_MS && now - lastInter > INTER_GAP_MS;
        if (!due) { _startGame(); return; }
        lastInter = now;
        interPending = true;
        waitAdState('INTERSTITIAL_STATE_CHANGED', 'interstitial_state_changed').then(function () {
            interPending = false;
            _startGame();
        });
        try { bridge.advertisement.showInterstitial(); } catch (e) {
            interPending = false;
            _startGame();
        }
    };

    /* ---------- Облачные сейвы через Storage-модуль Bridge ----------
       Требование площадки: сейвы ТОЛЬКО через bridge.storage – иначе не доходят
       до облака и теряются в стороннем iframe (куки там зачастую отрезаны).
       Куки остаются локальным кешем (пишутся исходными saveBest/saveDaily). */
    function cloudSave() {
        if (!bridge) return;
        bridge.storage.set(SAVE_KEYS, [
            String(bestScore), String(bestLevel),
            String(dailyStreak), dailyLast, dailyUsed
        ]).catch(function (err) { console.warn('[playgama] storage.set отказал', err); });
    }
    function cloudLoad() {
        bridge.storage.get(SAVE_KEYS).then(function (vals) {
            vals = vals || [];
            // Рекорд: облако авторитетнее, если там больше (кросс-девайс).
            var cs = num(vals[0]), cl = num(vals[1]);
            if (cs > bestScore || cl > bestLevel) {
                bestScore = Math.max(bestScore, cs);
                bestLevel = Math.max(bestLevel, cl);
                hadRecord = bestScore > 0 || bestLevel > 0;
                updateScore();
            }
            // Ежедневный бонус: авторитетна более свежая дата забора (как в TG-облаке).
            var cLast = str(vals[3]);
            if (cLast > dailyLast) {
                dailyLast = cLast;
                dailyStreak = num(vals[2]) || dailyStreak;
                var cUsed = str(vals[4]);
                if (cUsed > dailyUsed) dailyUsed = cUsed;
                refreshDailyButton();
                maybeAutoOpenDaily();
            }
            console.info('[playgama] облачный сейв загружен');
        }).catch(function (err) { console.warn('[playgama] storage.get отказал', err); });
    }
    var _saveBest = saveBest;
    saveBest = function () {
        _saveBest();
        cloudSave();
        // Лидерборд площадки (id из playgama-bridge-config.json); есть не у всех
        // порталов – мягкий фолбэк, лидерборд не должен ронять игру.
        if (bridge && bridge.leaderboards) {
            try {
                var p = bridge.leaderboards.setScore(LB_ID, bestScore);
                if (p && p.catch) p.catch(function () {});
            } catch (e) { /* площадка без лидерборда */ }
        }
    };
    var _saveDaily = saveDaily;
    saveDaily = function () { _saveDaily(); cloudSave(); };

    /* ---------- Rewarded вместо Adsgram (кнопки "Продолжить" и "x2 очки") ---------- */
    Ads.showRewarded = function (onReward, onSkip) {
        if (!bridge || !bridge.advertisement || bridge.advertisement.isRewardedSupported === false) {
            if (onSkip) onSkip();
            return;
        }
        waitAdState('REWARDED_STATE_CHANGED', 'rewarded_state_changed', 'rewarded').then(function (ok) {
            if (ok) { if (onReward) onReward(); }
            else if (onSkip) { onSkip(); }
        });
        try { bridge.advertisement.showRewarded(); } catch (e) { /* терминал придёт по таймауту предохранителя */ }
    };

    /* ---------- Чит-коды для QA рекламы (стенд Test Game – десктоп) ----------
       Набор на клавиатуре зовёт рекламу площадки напрямую, минуя игровые кулдауны:
       idkfa – interstitial, idfa – rewarded. Проверка транспорта, не игровой логики;
       безвредно для прода (награда идёт мимо игровой выдачи). */
    var cheatBuf = '';
    window.addEventListener('keydown', function (e) {
        if (!bridge || e.key.length !== 1) return;
        cheatBuf = (cheatBuf + e.key.toLowerCase()).slice(-8);
        if (cheatBuf.endsWith('idkfa')) {
            console.info('[cheat] interstitial');
            try { bridge.advertisement.showInterstitial(); } catch (x) {}
        } else if (cheatBuf.endsWith('idfa')) {
            console.info('[cheat] rewarded');
            try { bridge.advertisement.showRewarded(); } catch (x) {}
        }
    });

    /* ---------- Отладочная ручка для QA-прогонов ----------
       Аналог window.__game в монорепе игр: build/qa-playgama.mjs сверяет через неё
       состояние (мердж облака, паузу) и дёргает пути рекламы/сейва. Игровых
       преимуществ не даёт (game over и рестарт доступны и так). */
    window.__pg = {
        state: function () {
            return {
                bestScore: bestScore, bestLevel: bestLevel, dailyStreak: dailyStreak,
                gameRunning: gameRunning, gameOver: gameOver, paused: pgPaused,
                audioOff: pgAudioOff, hasBridge: !!bridge
            };
        },
        ads: function () { return Ads; },
        saveBest: function () { saveBest(); },
        startGame: function () { startGame(); },
        gameOverNow: function () { if (gameRunning && !gameOver) { gameOver = true; showGameOver(); } }
    };

    /* ---------- Инициализация ---------- */
    loadSdk().then(function () {
        bridge = window.bridge;
        return bridge.initialize();
    }).then(function () {
        console.info('[playgama] инициализирован: платформа=' + (bridge.platform && bridge.platform.id || '?') +
            ', язык=' + (bridge.platform && bridge.platform.language || '?'));
        // Язык площадки – до первого кадра меню.
        var lang = '';
        try { lang = String(bridge.platform.language || '').slice(0, 2).toLowerCase(); } catch (e) {}
        clearTimeout(bootFallback);
        startEngineOnce(lang);
        // Площадка прячет свой лоадер по этому сообщению – шлём, когда игра играбельна.
        try { bridge.platform.sendMessage('game_ready'); } catch (e) {}
        cloudLoad();
        // Пауза/звук: один универсальный обработчик покрывает рекламу, системную
        // паузу и сворачивание вкладки (рекомендация Bridge).
        function on(key, fallback, cb) {
            var event = (bridge.EVENT_NAME && bridge.EVENT_NAME[key]) || fallback;
            bridge.platform.on(event, function () {
                for (var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] === 'boolean') { cb(arguments[i]); return; }
                }
            });
        }
        on('PAUSE_STATE_CHANGED', 'pause_state_changed', function (paused) { setPaused(paused); });
        on('AUDIO_STATE_CHANGED', 'audio_state_changed', function (enabled) { pgAudioOff = !enabled; applyAudio(); });
    }).catch(function (err) {
        // SDK/инициализация не поднялись – стартуем без облачных функций (куки остаются).
        console.warn('[playgama] работаем без Bridge', err);
        clearTimeout(bootFallback);
        startEngineOnce(LANG);
    });
})();
