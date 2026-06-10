# Космические жуки

Один `index.html`, без сборки/зависимостей (~2000 строк, 83 функции). HTML5 Canvas + Web Audio.

## Архитектура

- `loop()` → `update()`/`draw()` → `requestAnimationFrame(loop)`
- `dt = deltaTime / 16.6667` (нормировка к 60 fps, max 3)
- `unit = canvas.height / 600` — базовый масштаб скоростей
- `fitCanvas()` — подгон холста под окно (DPR до 2×), вызывает `computeLayout()` + `rescaleEntities()`
- Состояния: `gameRunning`, `gameOver`, `paused`, меню

## Ключевые константы

`FONT_FAMILY`, `TEXT_GLOW_SMALL(2)/FLOAT(3)/LARGE(5)/RECORD(6)`, `BONUS_DURATION`, `POWERUP_WEIGHTS`, `HOLD_INTERVAL(280)`, `RAPID_INTERVAL(85)`.

## Функции (группы)

- **Сетка/уровень:** `computeLayout()`, `fitCanvas()`, `spawnLevel()`, `spawnBoss()`, `createPlayer()`, `clearEntities()`, `rescaleEntities(oldW, oldH)`
- **Update:** `update()` → `updateAutoFire()`, `updatePlayerBullets()`, `updatePowerups()`, `updateEnemyFormation()`, `updateEnemyBullets()`, `updateBoss()`
- **Draw:** `draw()` → `drawBackground()`, `drawShip()`, `drawBug()`, `drawBoss()`, `drawSprite()`, `drawBullets()`, `drawShield()`, `drawBuffIndicators()`, `drawFreezeOverlay()`
- **Экраны:** `drawMenuScreen()`, `drawPauseOverlay()`, `drawGameOverScreen()`, `drawCelebration()`, `drawBossVictory()`
- **Звук:** `sndNote()`, `sndSequence()`, `sndShoot()`, `sndExplosion()`, `sndHit()`, `sndPowerup()`, `sndFanfare()`
- **Утилиты:** `rectsOverlap()`, `clampPlayerX()`, `canvasCoord()`, `shade()`, `getFireInterval()`
- **События:** `KEY_ACTIONS` map, `startFire()/stopFire()`, `togglePause()`
- **Рекорды:** `setCookie/getCookie/loadBest/saveBest/checkRecord`

## Код-стайл

- **Все правки — в `index.html`**. Никаких внешних зависимостей.
- AABB-коллизии → `rectsOverlap()`. Клэмп player.x → `clampPlayerX()`. Пули врагов → `createEnemyBullet()`. Темп стрельбы → `getFireInterval()`. Шрифт → `${FONT_FAMILY}`. Свечение → `TEXT_GLOW_*`.
- После ресайза → `fitCanvas()`.
- Новый приз → `POWERUP_TYPES` + `powerupDefs` + логика в `updatePowerups()`/`shootPlayerBullet()`. Новая форма → `bugForms` (5 циклично) + `bossDefs`. Новый экран → `draw*()` + вставить в `draw()` по порядку слоёв.
