/* ============================================================================
   Обложки для кабинета Playgama: Square 1:1 (800x800), Portrait 9:16 (1080x1920),
   Landscape 16:9 (1920x1080). Рисуются из НАСТОЯЩИХ спрайтов игры (ASCII-сетки
   bugForms/shipFrame из index.html, та же палитра и шрифт Press Start 2P) – в
   стиле рукописной обложки promo/cover-en-800x470.png, не сырой генератив.
   Запуск: node build/gen-covers-playgama.mjs  -> promo/playgama/*.png
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_DIR = join(ROOT, 'promo', 'playgama');
const GAMES_ROOT = 'D:/Repos/passive-money/games';
const puppeteer = (await import(pathToFileURL(join(GAMES_ROOT, 'node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href)).default;

const fontB64 = readFileSync(join(__dir, 'fonts', 'ps2p-latin.woff2')).toString('base64');

// Спрайты – копия из index.html (формы 0 жук, 2 краб, 3 осьминог; кадр [0]).
const SPRITES = {
    bug: ['....X...X....', '.....X.X.....', '....XXXXX....', '....eXXXe....', '...XXXXXXX...', '...XXXXXXX...', '...XDDDDDX...', '...XLLLLLX...', '...XXXXXXX...', '..X..X.X..X..', '.X...X.X...X.'],
    crab: ['.X.......X.', '..X.X.X.X..', '.XXXXXXXXX.', 'XXXeXXXeXXX', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'],
    octo: ['..XXXXXXX..', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXeXXXXXeXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX', '.X.X.X.X.X.', 'X..X.X.X..X'],
    ship: ['......H......', '.....HHH.....', '....HHHHH....', '....HCCCH....', '...HHCCCHH...', '..HHHHHHHHH..', '.HHHHHHHHHHH.', 'HHH.HHHHH.HHH', 'HH...HHH...HH', '.....F.F.....'],
};
const BUG_COLORS = ['#ff5e7e', '#ff9f45', '#ffe14a', '#7cff6b', '#6bd5ff'];
const SHIP_PALETTE = { H: '#c2c8e0', C: '#1b9dff', F: '#ff9d00', '.': null };

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'PS2P';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-display:block;}
body{margin:0;background:#111;}
</style></head><body>
<canvas id="c"></canvas>
<script>
const SPRITES = ${JSON.stringify(SPRITES)};
const BUG_COLORS = ${JSON.stringify(BUG_COLORS)};
const SHIP_PALETTE = ${JSON.stringify(SHIP_PALETTE)};

function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return 'rgb(' + ch(n >> 16) + ',' + ch((n >> 8) & 255) + ',' + ch(n & 255) + ')';
}
function bugPalette(base) {
    return { X: base, D: shade(base, 0.55), L: shade(base, 1.35), e: '#ffffff', '.': null };
}
// Детерминированные звёзды (mulberry32) – обложка воспроизводима бит-в-бит.
function rng(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function paintSprite(ctx, grid, palette, x, y, w, h, glow) {
    const cols = grid[0].length, rows = grid.length;
    const cell = Math.min(w / cols, h / rows);
    const ox = x + (w - cell * cols) / 2, oy = y + (h - cell * rows) / 2;
    ctx.save();
    if (glow) { ctx.shadowColor = glow.color; ctx.shadowBlur = glow.blur; }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = palette[grid[r][c]];
            if (color) { ctx.fillStyle = color; ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.5, cell + 0.5); }
        }
    }
    ctx.restore();
}
function background(ctx, W, H, seed) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05050d'); g.addColorStop(1, '#0a0a1c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = rng(seed);
    const n = Math.round(W * H / 6500);
    for (let i = 0; i < n; i++) {
        const b = r();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + b * 0.6).toFixed(2) + ')';
        const s = b > 0.92 ? 2 : 1;
        ctx.fillRect(Math.floor(r() * W), Math.floor(r() * H), s, s);
    }
}
function title(ctx, lines, cx, cy, size, maxW, lineGap) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const line of lines) {
        while (size > 12) {
            ctx.font = size + 'px PS2P';
            if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size / 13) + 'px';
            if (ctx.measureText(line).width <= maxW) break;
            size -= 1;
        }
    }
    ctx.font = size + 'px PS2P';
    lines.forEach((line, i) => {
        const y = cy + i * (size + lineGap);
        ctx.shadowColor = '#2bd1ff'; ctx.shadowBlur = size * 0.5;
        const grad = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
        grad.addColorStop(0, '#dff3ff'); grad.addColorStop(0.55, '#8fd6ff'); grad.addColorStop(1, '#4bb6f5');
        ctx.fillStyle = grad;
        ctx.fillText(line, cx, y);
        ctx.fillText(line, cx, y);   // второй проход – плотнее свечение, как на исходной обложке
    });
    ctx.shadowBlur = 0;
    return size;
}
function tagline(ctx, text, cx, y, size, maxW) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    while (size > 10) {
        ctx.font = size + 'px PS2P';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        if (ctx.measureText(text).width <= maxW) break;
        size -= 1;
    }
    ctx.shadowColor = '#7cff6b'; ctx.shadowBlur = size * 0.7;
    ctx.fillStyle = '#7cff6b';
    ctx.fillText(text, cx, y);
    ctx.fillText(text, cx, y);
    ctx.shadowBlur = 0;
}
function bugRow(ctx, forms, colors, cx, y, cell, gap) {
    const total = forms.length * cell + (forms.length - 1) * gap;
    let x = cx - total / 2;
    forms.forEach((f, i) => {
        paintSprite(ctx, SPRITES[f], bugPalette(colors[i]), x, y, cell, cell, null);
        x += cell + gap;
    });
}

window.__render = async function (spec) {
    const cv = document.getElementById('c');
    cv.width = spec.w; cv.height = spec.h;
    const ctx = cv.getContext('2d');
    await document.fonts.load('40px PS2P', 'COSMIC BUGS');
    await document.fonts.ready;
    const W = spec.w, H = spec.h, cx = W / 2;
    background(ctx, W, H, spec.seed);

    if (spec.layout === 'landscape') {
        // как рукописная 800x470: заголовок, ряд из 5 жуков в 5 цветах, корабль, слоган
        title(ctx, ['COSMIC BUGS'], cx, H * 0.15, 150, W * 0.9, 0);
        bugRow(ctx, ['bug', 'bug', 'bug', 'bug', 'bug'], BUG_COLORS, cx, H * 0.3, H * 0.21, W * 0.055);
        paintSprite(ctx, SPRITES.ship, SHIP_PALETTE, cx - H * 0.14, H * 0.56, H * 0.28, H * 0.28, { color: '#2bd1ff', blur: 16 });
        tagline(ctx, 'ARCADE \\u00b7 BOSSES \\u00b7 UPGRADES', cx, H * 0.92, 56, W * 0.85);
    } else if (spec.layout === 'portrait') {
        title(ctx, ['COSMIC', 'BUGS'], cx, H * 0.11, 150, W * 0.85, 56);
        // строй 3x3 из трёх форм пришельцев ("форма меняется каждые 5 уровней")
        const rows = [['bug', 'bug', 'bug'], ['crab', 'crab', 'crab'], ['octo', 'octo', 'octo']];
        const rowColors = [[BUG_COLORS[0], BUG_COLORS[1], BUG_COLORS[2]], [BUG_COLORS[3], BUG_COLORS[4], BUG_COLORS[0]], [BUG_COLORS[1], BUG_COLORS[2], BUG_COLORS[3]]];
        rows.forEach((forms, i) => bugRow(ctx, forms, rowColors[i], cx, H * (0.28 + i * 0.115), W * 0.17, W * 0.08));
        paintSprite(ctx, SPRITES.ship, SHIP_PALETTE, cx - W * 0.16, H * 0.7, W * 0.32, W * 0.32, { color: '#2bd1ff', blur: 18 });
        tagline(ctx, 'ARCADE \\u00b7 BOSSES', cx, H * 0.9, 52, W * 0.8);
        tagline(ctx, 'UPGRADES', cx, H * 0.935, 52, W * 0.8);
    } else { // square
        title(ctx, ['COSMIC', 'BUGS'], cx, H * 0.13, 96, W * 0.86, 36);
        bugRow(ctx, ['bug', 'crab', 'octo'], [BUG_COLORS[0], BUG_COLORS[2], BUG_COLORS[3]], cx, H * 0.42, W * 0.19, W * 0.09);
        paintSprite(ctx, SPRITES.ship, SHIP_PALETTE, cx - W * 0.14, H * 0.66, W * 0.28, W * 0.28, { color: '#2bd1ff', blur: 14 });
    }
    return cv.toDataURL('image/png');
};
</script></body></html>`;

const SPECS = [
    { name: 'cover-square-800x800.png', w: 800, h: 800, layout: 'square', seed: 11 },
    { name: 'cover-portrait-1080x1920.png', w: 1080, h: 1920, layout: 'portrait', seed: 22 },
    { name: 'cover-landscape-1920x1080.png', w: 1920, h: 1080, layout: 'landscape', seed: 33 },
];

mkdirSync(OUT_DIR, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(PAGE, { waitUntil: 'load' });
for (const spec of SPECS) {
    const dataUrl = await page.evaluate((s) => window.__render(s), spec);
    writeFileSync(join(OUT_DIR, spec.name), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('OK ->', join('promo', 'playgama', spec.name));
}
await browser.close();
