# Космические жуки — проект

Аркадная Space Invaders на чистом HTML5 Canvas. Один самодостаточный файл — без сборки, зависимостей и внешних ассетов.

## Файловая структура

- `index.html` — весь код: HTML, CSS, JS (~2000 строк, 83 функции)
- `CHANGELOG.md` — история изменений
- `README.md` — описание и управление
- `CLAUDE.md` — этот файл

## Ключевая архитектура

- **Игровой цикл**: `loop()` → `update()` / `draw()` → `requestAnimationFrame(loop)`
- **Дельта-тайм**: `dt = deltaTime / 16.6667` (нормировка к 60 fps, clamp до 3)
- **Canvas**: `fitCanvas()` подстраивает размер под окно с учётом DPR (max 2×)
- **Масштаб**: `unit = canvas.height / 600` — базовый множитель скоростей и отступов
- **Два основных состояния**: `gameRunning` (в игре), `gameOver` (проигрыш), `paused`, меню

## Основные константы

- `FONT_FAMILY` = `"'Press Start 2P', monospace"` — единый шрифт (12+ вхождений)
- `TEXT_GLOW_SMALL / FLOAT / LARGE / RECORD` — уровни свечения текста (2/3/5/6)
- `BONUS_DURATION = { triple: 3000, shield: 5000, freeze: 3000, rapid: 2000, double: 5000 }`
- `POWERUP_DROP_CHANCE = 0.14`
- `POWERUP_TYPES = ['triple', 'shield', 'freeze', 'rapid', 'double']`
- `POWERUP_WEIGHTS = { triple: 1, double: 1, shield: 2, freeze: 2, rapid: 2 }` (тройной и двойной — вдвое реже)
- `HOLD_INTERVAL = 280` (обычный темп автострельбы)
- `RAPID_INTERVAL = 85` (темп при active «очереди»)

## Геймплей

- **Строй врагов**: меняет форму каждые 5 раундов (жук → кальмар → краб → осьминог → череп → циклично)
- **Босс**: после каждого 5-го раунда. HP = `enemyRows × enemyCols`. Со 2-го — диагональный полёт, с 3-го — больший размах. Веерная стрельба (3 пули)
- **Призы**: выпадают с убитых врагов. Типы: тройной/двойной выстрел, щит, заморозка, очередь, доп. жизнь
- **Сложность**: внутри цикла из 5 раундов сбрасывается после босса, но каждый цикл чуть выше

## Важные функции

### Инициализация и сетка
- `computeLayout()` — пересчёт `playerWidth`, `enemyWidth`, `bulletWidth` и т.д. от текущего холста
- `fitCanvas()` — подгонка холста под окно + вызов `computeLayout()` и `rescaleEntities()`
- `spawnLevel()` — создание игрока и строя врагов
- `spawnBoss()` — создание босса (вместо строя)
- `createPlayer()` — создание объекта игрока
- `clearEntities()` — очистка массивов пуль/частиц/призов
- `rescaleEntities(oldW, oldH)` — пропорциональный перенос при ресайзе

### Обновление
- `update(deltaTime, dt)` — диспетчер: движение игрока, таймеры бонусов, пули, босс/строй, пули врагов
- `updateEnemyFormation(deltaTime, dt)` — движение строя (границы/отскок/спуск) + стрельба. 2 прохода по массиву
- `updatePlayerBullets(deltaTime, dt)` — полёт пуль игрока + коллизии с врагами/боссом
- `updateEnemyBullets(dt)` — полёт пуль врагов + попадание в игрока
- `updateBoss(deltaTime, dt)` — движение босса + стрельба
- `updateAutoFire(deltaTime)` — автострельба при удержании огня
- `updatePowerups(dt)` — падение и сбор призов

### Отрисовка
- `draw()` — композиция: фон → игрок → враги → пули → частицы → UI
- `drawShip(p)` — игрок с анимацией пламени
- `drawBug(e)` — враг по текущей форме + цвет ряда
- `drawBoss(b)` — босс с покачиванием и пульсирующими глазами
- `drawSprite(grid, palette, x, y, w, h, glow)` — универсальный рендер пиксельного спрайта
- `drawBullets(arr, fillColor, shadowColor)` — общий рендер пуль
- `drawShield()` — пиксельный полукруг-щит
- `drawBuffIndicators()` — стопка таймеров бонусов слева
- `drawFreezeOverlay()` — морозный налёт при заморозке

### Экраны
- `drawMenuScreen()` — заголовок + рекорд (до старта)
- `drawPauseOverlay()` — ПАУЗА
- `drawGameOverScreen()` — ИГРА ОКОНЧЕНА + счёт/рекорд
- `drawCelebration()` — НОВЫЙ РЕКОРД! + салют
- `drawBossVictory()` — БОСС ПОВЕРЖЕН!

### Звук (Web Audio)
- `sndNote(type, freqStart, freqEnd, gain, dur, offset)` — универсальная нота
- `sndSequence(type, notes, gain, dur, gap)` — арпеджио
- `sndShoot()`, `sndExplosion()`, `sndHit()`, `sndPowerup()`, `sndFanfare()` — готовые звуки

### Утилиты
- `rectsOverlap(a, b)` — AABB коллизия-предикат
- `clampPlayerX()` — клэмпинг `player.x` в границы поля
- `canvasCoord(clientX)` — преобразование координат мыши в холст
- `shade(hex, f)` — затемнение/осветление hex-цвета
- `getFireInterval()` — выбор темпа стрельбы

### События
- `KEY_ACTIONS` (map) — единый маппинг клавиш → `'left'/'right'/'fire'/'pause'`
- `startFire()` / `stopFire()` — удержание огня (пробел, мышь, тап)
- `togglePause()` — пауза по Escape/P/кнопке

### Рекорды
- `setCookie()`, `getCookie()`, `loadBest()`, `saveBest()`, `checkRecord()` — куки с `SameSite=Lax`

## Правила и соглашения

- **Все правки — только в `index.html`** (single-file).
- **Не добавлять внешние зависимости.** Игра — самодостаточный HTML5 Canvas.
- **Для расширения/изменения геймплея** редактировать соответствующие `update*()` и `draw*()` функции.
- **Для добавления нового приза:** добавить тип в `POWERUP_TYPES`, вес в `POWERUP_WEIGHTS`, описание в `powerupDefs`, логику в `updatePowerups()` и обработку в `shootPlayerBullet()` при необходимости.
- **Для новой формы врага:** добавить 2 кадра в `bugForms` (5 форм циклически). Для босса — в `bossDefs`.
- **При изменении уровней/сложности:** править `spawnLevel()` — параметры `diff = inCycle + cycle`, `traverseSec`, `desiredSteps`, `enemyShootInterval`.
- **Для добавления нового экрана:** создать `draw*()` функцию и вставить в `draw()` в нужном порядке слоёв.
- **После ресайза** вызывать `fitCanvas()` — он сам пересчитает `computeLayout()` и `rescaleEntities()`.
- **Не дублировать AABB-коллизии** — использовать `rectsOverlap()`.
- **Не клэмпить player.x инлайн** — вызывать `clampPlayerX()`.
- **Пули врагов** создавать через `createEnemyBullet(x, y, vx)`.
- **Темп стрельбы** — через `getFireInterval()`, не инлайн-тернарник.
- **Шрифт** — через `${FONT_FAMILY}`, не строкой.
- **Свечение текста** — через константы `TEXT_GLOW_*`, не числом.
