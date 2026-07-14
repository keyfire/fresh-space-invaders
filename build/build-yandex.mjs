/* ============================================================================
   Сборка self-contained версии игры для Яндекс Игр.
   Запуск:  node build/build-yandex.mjs
   Что делает:
     - берёт корневой index.html (Telegram/Pages-версия),
     - вшивает шрифт Press Start 2P (base64) вместо Google Fonts,
     - убирает внешние скрипты Telegram и Adsgram,
     - подключает Яндекс-SDK (/sdk.js) и внедряет build/yandex-inject.js,
     - пишет результат в yandex-build/index.html (index.html в корне архива).
   Затем архив: Compress-Archive -Path yandex-build\* -DestinationPath kosmozhuki-yandex.zip
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_DIR = join(ROOT, 'yandex-build');

// Диапазоны символов подмножеств Press Start 2P (из fonts.googleapis.com CSS).
const FONTS = [
    { file: 'ps2p-cyrillic.woff2',   range: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116' },
    { file: 'ps2p-latin-ext.woff2',  range: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF' },
    { file: 'ps2p-latin.woff2',      range: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }
];

function fontFaceCss() {
    return FONTS.map(f => {
        const b64 = readFileSync(join(__dir, 'fonts', f.file)).toString('base64');
        return "        @font-face{font-family:'Press Start 2P';font-style:normal;font-weight:400;"
            + "font-display:swap;src:url(data:font/woff2;base64," + b64 + ") format('woff2');"
            + "unicode-range:" + f.range + ";}";
    }).join('\n');
}

// Заменяет needle на repl ровно один раз; кидает ошибку, если не найдено.
function must(html, needle, repl) {
    if (!html.includes(needle)) {
        throw new Error('Не найдена подстрока для замены:\n' + needle.slice(0, 90) + ' ...');
    }
    return html.replace(needle, repl);
}

let html = readFileSync(join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

// 1) Убираем внешние скрипты Telegram и Adsgram (в Яндексе не нужны и мешают self-contained).
html = must(html, '    <!-- Telegram Mini App SDK: вне Telegram скрипт безвреден (isTelegram=false) -->\n', '');
html = must(html, '    <script src="https://telegram.org/js/telegram-web-app.js"></script>\n', '');
html = must(html, '    <!-- Adsgram SDK (rewarded-реклама в Telegram), blockId 37189 -->\n', '');
html = must(html, '    <script src="https://sad.adsgram.ai/js/sad.min.js"></script>\n', '');

// 1b) Обнуляем URL лидерборда: в Яндексе свой нативный лидерборд (yandex-inject.js),
//     а VPS-топ/шаринг тут не нужны (CORS с origin Яндекса их всё равно не пустит).
//     Пустой LEADERBOARD_URL прячет DOM-кнопки топа и выключает submit/share на VPS.
html = must(html, "const LEADERBOARD_URL = 'https://api.keyfiregames.ru';", "const LEADERBOARD_URL = '';");

// 2) Убираем preconnect к Google Fonts.
html = must(html, '    <link rel="preconnect" href="https://fonts.googleapis.com">\n', '');
html = must(html, '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n', '');

// 3) Ссылку на Google Fonts заменяем на Яндекс-SDK + вшитый шрифт.
const headBlock =
    '    <!-- Старт движка откладывается до готовности SDK: язык окружения + LoadingAPI.ready() до играбельности (п.1.19, п.2.14) -->\n'
    + '    <script>window.__yaDeferBoot=true;</script>\n'
    + '    <!-- Yandex Games SDK -->\n'
    + '    <script async src="/sdk.js" onload="__initYaSDK()"></script>\n'
    + '    <style>\n' + fontFaceCss() + '\n    </style>';
html = must(html, '    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">', headBlock);

// 4) Внедряем интеграцию Яндекса в конец основного <script> (полный доступ к скоупу игры).
const inject = readFileSync(join(__dir, 'yandex-inject.js'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const marker = '\n    </script>\n</body>';
if (!html.includes(marker)) throw new Error('Не найден закрывающий </script></body>');
html = html.replace(marker, '\n\n' + inject + '\n    </script>\n</body>');

// 5) Пишем результат.
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log('OK -> yandex-build/index.html  (' + kb + ' KB)');
console.log('Проверки: Telegram/Adsgram-скрипты убраны, шрифт вшит, Яндекс-SDK подключён, интеграция внедрена.');
