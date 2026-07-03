# Сборка для Яндекс Игр

Основной `index.html` — версия для Telegram/GitHub Pages. Для Яндекс Игр нужна
self-contained сборка (без внешних CDN, со своим SDK). Её делает build-скрипт —
основной файл при этом не меняется.

## Как собрать

```
node build/build-yandex.mjs
```
Создаёт `yandex-build/index.html` (шрифт вшит, Telegram/Adsgram убраны, подключён
Яндекс-SDK `/sdk.js`, внедрён `build/yandex-inject.js`).

Затем архив (Windows PowerShell):
```
Compress-Archive -Path yandex-build\* -DestinationPath kosmozhuki-yandex.zip -Force
```
`index.html` лежит в корне архива — как требует Яндекс. `yandex-build/` и `*.zip`
в .gitignore (это артефакты; в репозитории — только исходники сборки в `build/`).

## Что внутри

- `build/build-yandex.mjs` — трансформация `index.html` → `yandex-build/index.html`.
- `build/yandex-inject.js` — интеграция Яндекса, внедряется в конец `<script>` игры:
  `YaGames.init()` + `LoadingAPI.ready()`, rewarded-реклама (`showRewardedVideo`)
  вместо Adsgram, лидерборд (отправка `setLeaderboardScore` + топ-5 на экране меню).
- `build/fonts/*.woff2` — подмножества Press Start 2P (cyrillic + latin + latin-ext)
  для инлайна base64.

## Важно для консоли Яндекса (KeyFire Games)

- Создать **лидерборд** с техническим ID **`score`** (совпадает с `LB_NAME` в
  `yandex-inject.js`), иначе таблица лидеров работать не будет.
- Загрузить `kosmozhuki-yandex.zip` как черновик, заполнить карточку, отправить
  на модерацию (3–5 рабочих дней).
