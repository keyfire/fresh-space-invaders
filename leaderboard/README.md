# Лидерборд "Космических жуков" – Cloudflare Worker + D1

> **ВЫВЕДЕНО ИЗ ЭКСПЛУАТАЦИИ (2026-07-06).** Лидерборд и шаринг переехали на общий
> бэкенд портфеля – VPS `https://api.keyfiregames.ru` (`game=kosmozhuki`), см.
> `passive-money/games/leaderboard`. Cloudflare-воркер `kosmozhuki-leaderboard`
> удалён (`wrangler delete`), поддомен отдаёт 404. Клиент (`index.html`) теперь
> ходит на VPS. Эти файлы оставлены как история и на случай отката. База D1
> `kosmozhuki` в аккаунте Cloudflare НЕ удалена (страховка с прежними данными).

Глобальная таблица рекордов и медиа-шаринг (карточка счёта) для Telegram Mini App.
Один Worker + одна база D1. Клиентский `index.html` остаётся одним файлом – он лишь
делает `fetch()` на эти эндпоинты, а если Worker недоступен, топ и медиа-шаринг тихо
выключаются (игра работает как раньше).

## Что делает

- `GET  /top?limit=50` – глобальный топ (публичный).
- `POST /submit {initData, score, level}` – отправить счёт. Подпись `initData` проверяется
  HMAC с токеном бота – значит счёт привязан к настоящему пользователю Telegram.
- `POST /me {initData}` – своё место и рекорд в мире.
- `POST /share {initData, png, text, w, h, playText, gameUrl}` – сохранить PNG-карточку и
  подготовить inline-сообщение с фото (`savePreparedInlineMessage`); возвращает
  `prepared_message_id` для `WebApp.shareMessage()`.
- `GET  /card/<id>.png` – отдать PNG карточки (Telegram тянет по `photo_url`).

Честно про анти-чит: игра клиентская и открыта, поэтому единственная реальная защита –
проверка подписи `initData` на сервере (настоящий пользователь + настоящее имя, отсечение
анонимного спама). От накрутки собственного счёта на 100% клиентскую игру защитить нельзя;
стоит санити-кап (`MAX_SCORE`).

## Деплой (один раз)

Нужен аккаунт Cloudflare (бесплатный) и Node.js. Все команды – из папки `leaderboard/`.

```bash
# 1. Логин в Cloudflare
npx wrangler login

# 2. Создать базу D1 и вставить database_id в wrangler.toml
npx wrangler d1 create kosmozhuki
#   -> скопировать database_id из вывода в поле database_id внутри wrangler.toml

# 3. Применить схему (таблицы scores и cards)
npx wrangler d1 execute kosmozhuki --remote --file=./schema.sql

# 4. Задать секрет с токеном бота (из BotFather); значение не попадает в репозиторий
npx wrangler secret put BOT_TOKEN
#   -> вставить токен @kosmozhuki_bot

# 5. Деплой
npx wrangler deploy
#   -> запомнить выданный URL, напр. https://kosmozhuki-leaderboard.<субдомен>.workers.dev

# 6. Прописать этот URL и задеплоить ещё раз (чтобы ссылки на карточки были абсолютными)
#   - в wrangler.toml:  PUBLIC_URL = "https://kosmozhuki-leaderboard.<субдомен>.workers.dev"
#   - повторить:        npx wrangler deploy
```

## Подключение к игре

В `index.html` найти константу `LEADERBOARD_URL` и вписать адрес воркера (без слэша в конце):

```js
const LEADERBOARD_URL = 'https://kosmozhuki-leaderboard.<субдомен>.workers.dev';
```

Пока константа пустая, игра ведёт себя как раньше: локальный рекорд работает, а кнопка
"Рейтинг" и медиа-шаринг просто не показываются.

## Проверка после деплоя

```bash
curl https://kosmozhuki-leaderboard.<субдомен>.workers.dev/           # {"ok":true,...}
curl "https://kosmozhuki-leaderboard.<субдомен>.workers.dev/top?limit=5"  # {"ok":true,"top":[],...}
```

`/submit`, `/me`, `/share` требуют валидный `initData` из Telegram, поэтому проверяются уже
из игры (в вебе вне Telegram подпись не сгенерировать).

## Стоимость

Бесплатного тарифа Cloudflare (Workers 100k запросов/день, D1 5 ГБ) с запасом хватает для
такой игры. Карточки шаринга самоочищаются через сутки.
