# Промо-посты - "Космические жуки"

Готовые тексты для продвижения. Ассеты рядом:
- `promo/gameplay.gif` - анимация геймплея (300x633, ~0.6 МБ), главный визуал для постов.
- `promo/screen-1..5-*.png` - скрины (геймплей / призы / босс / апгрейды / рекорд).
- `promo/cover-ru-800x470.png`, `promo/cover-en-800x470.png` - обложки.

Ссылка на игру: **https://t.me/kosmozhuki_bot/play**

> Про лидерборд: глобальный топ и шаринг карточкой включатся после деплоя воркера
> (см. `leaderboard/README.md`). Строки про топ помечены `[после деплоя]` - до деплоя
> их не публиковать.

---

## Telegram - анонс в канале/чате (RU)

🚀 "Космические жуки" - ретро-аркада прямо в Telegram

Отбивай волны космических жуков, лови призы и качай корабль на боссах. Пиксель-арт,
звук, управление одним пальцем. Бесплатно и без установки - открывается прямо в Telegram.

👾 Тройной выстрел, щит, заморозка, дроны, пробивные пули
👑 Боссы каждые 5 уровней - за победу корабль получает апгрейд навсегда
🌍 Русский, English, Español, Português, Türkçe
🏆 Глобальный рейтинг - обгони друзей `[после деплоя]`

🎮 Играть: https://t.me/kosmozhuki_bot/play

_(прикрепить `gameplay.gif`)_

---

## VK (RU)

🚀 Сделал ретро-аркаду "Космические жуки" - и она запускается прямо в Telegram, без
установки.

Классические "Космические захватчики" на новый лад: волны жуков, призы (тройной выстрел,
щит, заморозка, очередь), боссы каждые 5 уровней и постоянная прокачка корабля - крылья
с пушками, дроны-спутники, пробивные пули, магнит-щит. Управление одним пальцем, честный
пиксель-арт и звук. Игра на пяти языках.

Бесплатно, играется в один тап: https://t.me/kosmozhuki_bot/play

#игры #аркада #telegram #miniapp #gamedev #pixelart #indiegame #spaceinvaders

_(прикрепить `gameplay.gif` или карусель `screen-*.png`)_

---

## DTF / Хабр - дев-история (RU)

**Аркада "Космические жуки": один HTML-файл, без сборки и бэкенда, живёт в Telegram**

Захотелось сделать маленькую честную аркаду в духе Space Invaders - и уместить всю игру
в один `index.html` на чистом Canvas и Web Audio, без фреймворков, без сборки, без
зависимостей. Получилось около 2000 строк: игровой цикл, пиксельные спрайты, звук
синтезом, адаптив под мобилу с учётом "чёлки" и жестов Telegram.

Что в игре:
- призы с жуков - тройной и двойной выстрел, щит, заморозка, очередь, лишняя жизнь;
- боссы каждые 5 уровней, а за победу корабль получает случайный апгрейд навсегда
  (крылья с пушками, дроны, пробивные пули, магнит-щит);
- управление одним пальцем: тап по треку - выстрел, удержание - авто-поток;
- локализация на RU/EN/ES/PT/TR по языку пользователя;
- запуск как Telegram Mini App - рекорды в облаке аккаунта, шаринг результата.

`[после деплоя]` Прикрутил и глобальный рейтинг: этос "один файл без бэкенда" пришлось
чуть подвинуть - для общего топа поднял крохотный Cloudflare Worker + D1, который
проверяет подпись Telegram initData (реальные игроки и имена), а клиент так и остался
одним файлом и просто дёргает эндпоинт.

Поиграть (открывается в Telegram): https://t.me/kosmozhuki_bot/play
Буду рад фидбеку по геймплею и сложности.

_(прикрепить `gameplay.gif` + `screen-3-boss.png`, `screen-4-upgrades.png`)_

---

## X / Twitter (EN)

🚀 Cosmic Bugs - a retro Space Invaders arcade that runs right inside Telegram.
Power-ups, bosses every 5 levels, permanent ship upgrades, one-finger controls. Free,
no install.

Built as a single dependency-free HTML5 Canvas file 👾

▶️ https://t.me/kosmozhuki_bot/play

#gamedev #indiedev #TelegramMiniApps #html5games #pixelart

_(attach `gameplay.gif`)_

---

## Reddit - r/WebGames, r/playmygame (EN)

**Title:** I made a single-file HTML5 Space Invaders that runs as a Telegram Mini App (Cosmic Bugs)

**Body:**
Cosmic Bugs is a small retro arcade shooter I built as one dependency-free `index.html`
(Canvas + Web Audio, no build step). It runs in the browser and also as a Telegram Mini App.

- Power-ups: triple/double shot, shield, freeze, rapid fire, extra life
- A boss every 5 levels; beating one grants a permanent ship upgrade (wing cannons,
  drones, piercing shots, magnet shield)
- One-finger controls, pixel art, five languages (EN/RU/ES/PT/TR)
- Free, no install - opens right in Telegram

Play (opens in Telegram): https://t.me/kosmozhuki_bot/play

Feedback on difficulty curve and controls is very welcome.

_(attach `gameplay.gif`)_

> Reddit-этикет: не спамить одинаковым текстом в много сабов подряд, отвечать в
> комментариях, постить в тематические (r/WebGames, r/playmygame, r/IndieGaming).

---

## Telegram - геймдев-чаты, короткий (RU)

Собрал аркаду "Космические жуки" одним HTML-файлом на Canvas (без сборки и зависимостей),
запускается как Telegram Mini App. Space Invaders с призами, боссами и прокачкой корабля,
управление одним пальцем, 5 языков.

Потыкать: https://t.me/kosmozhuki_bot/play - фидбек приветствую 🙂
