/* Упаковка playgama-build/ в kosmozhuki-playgama.zip через archiver (ПРЯМЫЕ слэши
   в путях записей). Compress-Archive на Windows кладёт обратные слэши – на
   Linux-хостинге Playgama бандл резолвится не туда -> HEAD 404 -> игра не стартует.
   archiver не ставим в этот репозиторий (игра без зависимостей) – берём из монорепы игр.
   Запуск: node build/pack-playgama.mjs */
import { createWriteStream, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const GAMES_ROOT = 'D:/Repos/passive-money/games';
const { ZipArchive } = await import(pathToFileURL(join(GAMES_ROOT, 'node_modules/archiver/index.js')).href);

const dist = join(ROOT, 'playgama-build');
if (!existsSync(join(dist, 'index.html'))) {
    console.error('Нет билда:', dist, '– собери: node build/build-playgama.mjs');
    process.exit(1);
}
const zip = join(ROOT, 'kosmozhuki-playgama.zip');
await new Promise((res, rej) => {
    const out = createWriteStream(zip);
    const a = new ZipArchive({ zlib: { level: 9 } });
    out.on('close', res);
    a.on('error', rej);
    a.pipe(out);
    a.directory(dist, false); // содержимое билда в КОРЕНЬ архива (index.html в корне)
    a.finalize();
});
console.log('packed:', zip);
