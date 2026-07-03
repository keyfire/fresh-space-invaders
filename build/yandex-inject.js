/* ============================================================================
   Интеграция Яндекс Игр. Внедряется build-скриптом (build-yandex.mjs) в КОНЕЦ
   основного <script> игры, поэтому имеет доступ ко всем её переменным и функциям
   (Ads, bestScore, saveBest, updateScore, draw, gameRunning, gameOver, LANG...).
   В обычной сборке (Telegram/Pages) этого кода нет.
   Локально без Яндекса /sdk.js не загрузится → ysdk=null, игра работает как обычно.
   ========================================================================== */
(function () {
    'use strict';

    // Технический ID лидерборда — должен совпадать с созданным в консоли Яндекса.
    var LB_NAME = 'score';
    var LB_TITLE = { ru: 'ЛИДЕРЫ', en: 'LEADERS', es: 'LIDERES', pt: 'LIDERES', tr: 'LIDERLER' };

    var ysdk = null, ylb = null, ylbReady = false;
    var panel = null, panelHtml = '', fetched = false, fetching = false;

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    // Вызывается из onload SDK-скрипта (<script async src="/sdk.js" onload="__initYaSDK()">)
    window.__initYaSDK = function () {
        if (typeof YaGames === 'undefined') return;
        YaGames.init().then(function (sdk) {
            ysdk = sdk;
            window.ysdk = sdk;
            // Язык из окружения Яндекса — чтобы игра переключалась вместе с интерфейсом
            // Яндекса (модерация проверяет каждый заявленный язык через SDK).
            try {
                var yl = sdk.environment && sdk.environment.i18n && sdk.environment.i18n.lang;
                if (yl) {
                    yl = String(yl).toLowerCase().split('-')[0];
                    if (SUPPORTED_LANGS.indexOf(yl) >= 0 && yl !== LANG) { LANG = yl; applyI18n(); }
                }
            } catch (e) {}
            // Обязательно: сообщаем платформе, что игра загрузилась и готова к игре.
            try { if (sdk.features && sdk.features.LoadingAPI) sdk.features.LoadingAPI.ready(); } catch (e) {}

            // Rewarded-реклама Яндекса вместо Adsgram (кнопки «Продолжить» и «×2 очки»).
            Ads.showRewarded = function (onReward, onFail) {
                if (ysdk && ysdk.adv) {
                    var rewarded = false;
                    ysdk.adv.showRewardedVideo({ callbacks: {
                        onRewarded: function () { rewarded = true; if (onReward) onReward(); },
                        onClose: function () { if (!rewarded && onFail) onFail(); },
                        onError: function () { if (onFail) onFail(); }
                    } });
                } else if (onFail) { onFail(); }
            };

            // Лидерборд: подтягиваем личный рекорд из облака Яндекса и грузим топ.
            ysdk.getLeaderboards().then(function (lb) {
                ylb = lb; ylbReady = true;
                lb.getLeaderboardPlayerEntry(LB_NAME).then(function (e) {
                    if (e && typeof e.score === 'number' && e.score > bestScore) {
                        bestScore = e.score;
                        try { updateScore(); } catch (x) {}
                    }
                }).catch(function () {});
                loadTop(true);
            }).catch(function () {});
        }).catch(function () {});
    };

    // Отправка рекорда в лидерборд — оборачиваем существующий saveBest().
    var _saveBest = saveBest;
    saveBest = function () {
        _saveBest();
        if (ylbReady && ylb) {
            try { ylb.setLeaderboardScore(LB_NAME, bestScore); } catch (e) {}
            loadTop(true);
        }
    };

    function loadTop(force) {
        if (!ylbReady || !ylb || fetching || (fetched && !force)) return;
        fetching = true;
        ylb.getLeaderboardEntries(LB_NAME, { quantityTop: 5, includeUser: false, quantityAround: 0 })
            .then(function (res) {
                var rows = (res && res.entries) || [];
                var title = LB_TITLE[LANG] || LB_TITLE.en;
                var h = '<div class="ya-lb-title">' + esc(title) + '</div>';
                rows.forEach(function (e) {
                    var nm = (e.player && e.player.publicName) || '—';
                    if (nm.length > 12) nm = nm.slice(0, 12);
                    h += '<div class="ya-lb-row"><span>' + e.rank + '. ' + esc(nm) + '</span><span>' + e.score + '</span></div>';
                });
                panelHtml = rows.length ? h : '';
                fetched = true;
                if (panel && panel.style.display !== 'none') panel.innerHTML = panelHtml;
            })
            .catch(function () {})
            .then(function () { fetching = false; });
    }

    function ensurePanel() {
        if (panel) return;
        var st = document.createElement('style');
        st.textContent =
            '#yaLb{position:absolute;left:50%;top:12%;transform:translateX(-50%);z-index:40;' +
            'width:82%;max-width:360px;pointer-events:none;font-family:inherit;color:#cfe0ff;display:none;}' +
            '#yaLb .ya-lb-title{color:#ffd166;font-size:clamp(8px,2.6vw,12px);margin-bottom:8px;text-align:center;}' +
            '#yaLb .ya-lb-row{display:flex;justify-content:space-between;gap:10px;' +
            'font-size:clamp(7px,2.2vw,10px);line-height:2;opacity:.9;}';
        document.head.appendChild(st);
        panel = document.createElement('div');
        panel.id = 'yaLb';
        (document.querySelector('.canvas-wrap') || document.body).appendChild(panel);
    }

    // Показываем топ лидерборда на экране меню (там пусто — не мешает game over/кнопкам).
    var _draw = draw;
    draw = function () {
        _draw();
        if (!ysdk) return;
        if (!panel) ensurePanel();
        var onMenu = (!gameRunning && !gameOver);
        if (onMenu && panelHtml) {
            if (panel.style.display === 'none') panel.innerHTML = panelHtml;
            panel.style.display = 'block';
        } else if (panel.style.display !== 'none') {
            panel.style.display = 'none';
        }
    };
})();
