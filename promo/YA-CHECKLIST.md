# Чеклист заливки – "Космические жуки" (Я.Игры, черновик 547704)

Обогащение черновика: **5 языков (ru/en/es/pt/tr)** + локализованные обложки и
**родные скриншоты** (мобильные + десктоп) на каждом языке. Всё готово, ниже –
"скопировал → вставил". Файлы – рядом с этим файлом, в `space-invaders-game/promo/`.

## 0. Перед началом (важно)
- **Черновик должен быть РЕДАКТИРУЕМЫМ.** Если статус "На модерации" – правки
  заблокированы до вердикта. Дождись вердикта (или отзови заявку), потом обогащай.
- Кнопки "Сохранить"/"Отправить" активны только при ИЗМЕНЁННОЙ форме. Серые –
  впиши что-нибудь в "Комментарий разработчика" (внизу), разблокируется.
- **Заявил язык → обязан заполнить его вкладку** (Название/Об игре/Как играть).

## 1. Общее (locale-независимо)
- **Игра переведена на:** добавь **Español, Português, Türkçe** (ru/en уже есть).
- Платформы: Десктоп + iOS + Android. Ориентация: Любая. (Уже выставлено, не меняем.)

## 2. Карта картинок (файл → слот)
Иконка одна на все языки. Обложка и скриншоты – СВОИ на каждый язык. У жуков **две**
группы скриншотов: Мобильные/Портретная (5) и Десктопные/Альбомная (5).

| Язык | Обложка 800×470 | Скрины Мобильные+Портрет (5) | Скрины Десктоп+Альбом (5) |
|------|-----------------|------------------------------|----------------------------|
| ru | `cover-ru-clean-800x470.png` | `screens-ru/screen-1..5.png` | `screens-ru-desktop/screen-1..5.png` |
| en | `cover-en-800x470.png` | `screens-en/screen-1..5.png` | `screens-en-desktop/screen-1..5.png` |
| es | `cover-es-800x470.png` | `screens-es/screen-1..5.png` | `screens-es-desktop/screen-1..5.png` |
| pt | `cover-pt-800x470.png` | `screens-pt/screen-1..5.png` | `screens-pt-desktop/screen-1..5.png` |
| tr | `cover-tr-800x470.png` | `screens-tr/screen-1..5.png` | `screens-tr-desktop/screen-1..5.png` |

- Файлы скринов в каждой папке: `screen-1-gameplay`, `screen-2-powerups`,
  `screen-3-boss`, `screen-4-upgrades`, `screen-5-record`.
- **Иконка 512×512 (все языки):** `tma-avatar-512.png`. На неосновных вкладках можно
  галку "Использовать значение русского черновика".
- **ru-обложка:** `cover-ru-clean-800x470.png` – новая, в одном стиле с en/es/pt/tr.
  (Прежняя `tma-cover-yandex-800x470.png` с плотной сеткой жуков тоже годна – если
  хочешь оставить её, просто не трогай ru-обложку. Но тогда ru будет выбиваться из ряда.)
- **Замена обложки/иконки:** занятый слот без поля загрузки – снеси крестиком (✕
  внутри бокса "Обложка"/"Иконка"), потом грузи. Жди превью ДО "Сохранить".
- **Скриншоты:** для каждой группы переключи селектор (Мобильные+Портретная, затем
  Десктопные+Альбомная), старые кадры удали вручную, порядок 1→5.

## 3. Тексты по вкладкам (copy-paste)
Поля: Название (≤50), Описание для SEO (≤160), Об игре (≤1000), Короткое описание
(≤70), Как играть (≤1000). Названия совпадают с внутриигровыми (п.5.1.3).

---
### RU – вкладка "Русский"
**Название:**
Космические жуки

**Описание для SEO:**
Космические жуки – ретро-аркада в духе Space Invaders с прокачкой. Сбивай жуков, лови призы, бей боссов и навсегда усиливай свой корабль.

**Об игре:**
«Космические жуки» – ретро-аркада в духе Space Invaders с современной прокачкой. Отбивай волны инопланетных жуков, лови падающие призы и пробивайся сквозь боссов, чтобы навсегда усилить свой корабль.

• Призы с жуков: тройной и двойной выстрел, очередь, щит, заморозка, +жизнь
• 5 видов пришельцев – форма меняется каждые 5 уровней
• Босс на каждом 5-м уровне со своим поведением и запасом HP
• Постоянная прокачка от боссов: крылья-пушки, дроны, пробивные пули, магнит-щит
• Управление одним пальцем: тап – выстрел, удержание – авто-огонь
• Таблица рекордов и салют за новый рекорд
• Пиксельная графика, мгновенный запуск без регистрации

**Короткое описание:**
Сбивай жуков, лови призы, бей боссов и качай корабль.

**Как играть:**
Внизу экрана – твой корабль. Тапни, чтобы выстрелить, удерживай палец для авто-огня; двигай корабль, ведя пальцем (на ПК – стрелки и пробел). Сбивай строй жуков, пока они не спустились к тебе, и уклоняйся от их пуль. С разбитых жуков падают призы – лови их: тройной выстрел, очередь, щит, заморозка, +жизнь. Каждый 5-й уровень – босс с полосой HP; одолей его и выбери постоянную прокачку корабля. Набирай очки и побивай свой рекорд.

---
### EN – вкладка "English"
**Название:**
Cosmic Bugs

**Описание для SEO:**
Cosmic Bugs – a retro Space-Invaders-style arcade with upgrades. Blast bugs, grab power-ups, beat bosses and permanently level up your ship.

**Об игре:**
Cosmic Bugs is a retro Space-Invaders-style arcade with modern upgrades. Fend off waves of alien bugs, catch falling power-ups and fight your way through bosses to permanently upgrade your ship.

• Power-ups from bugs: triple and double shot, rapid fire, shield, freeze, extra life
• 5 alien types – the form changes every 5 levels
• A boss every 5th level, each with its own behavior and HP
• Permanent boss upgrades: gun-wings, drones, piercing bullets, magnet-shield
• One-finger controls: tap to shoot, hold for auto-fire
• Leaderboard and fireworks for a new record
• Pixel art, instant play with no sign-up

**Короткое описание:**
Blast bugs, grab power-ups, beat bosses, upgrade your ship.

**Как играть:**
Your ship sits at the bottom of the screen. Tap to fire, hold for auto-fire, and drag to move (on desktop – arrow keys and space). Shoot down the formation of bugs before they reach you and dodge their fire. Downed bugs drop power-ups – grab them: triple shot, rapid fire, shield, freeze, extra life. Every 5th level is a boss with an HP bar; beat it and pick a permanent ship upgrade. Rack up points and beat your own record.

---
### ES – вкладка "Español"
**Название:**
Bichos Cósmicos

**Описание для SEO:**
Bichos Cósmicos – arcade retro estilo Space Invaders con mejoras. Derriba bichos, atrapa potenciadores, vence jefes y mejora tu nave para siempre.

**Об игре:**
Bichos Cósmicos es un arcade retro estilo Space Invaders con mejoras modernas. Repele oleadas de bichos alienígenas, atrapa los potenciadores que caen y ábrete paso entre los jefes para mejorar tu nave para siempre.

• Potenciadores de los bichos: tiro triple y doble, ráfaga, escudo, congelar, vida extra
• 5 tipos de alienígenas – la forma cambia cada 5 niveles
• Un jefe cada 5 niveles, cada uno con su comportamiento y HP
• Mejoras permanentes de los jefes: alas-cañón, drones, balas perforantes, escudo imán
• Control con un dedo: toca para disparar, mantén para fuego automático
• Ranking y fuegos artificiales por un nuevo récord
• Gráficos pixel art, juega al instante sin registro

**Короткое описание:**
Derriba bichos, atrapa potenciadores y vence a los jefes.

**Как играть:**
Tu nave está en la parte inferior de la pantalla. Toca para disparar, mantén pulsado para fuego automático y desliza para moverte (en PC – flechas y espacio). Derriba la formación de bichos antes de que lleguen a ti y esquiva sus disparos. Los bichos derribados sueltan potenciadores – atrápalos: tiro triple, ráfaga, escudo, congelar, vida extra. Cada 5 niveles hay un jefe con barra de HP; véncelo y elige una mejora permanente para tu nave. Suma puntos y supera tu propio récord.

---
### PT – вкладка "Português"
**Название:**
Bichos Cósmicos

**Описание для SEO:**
Bichos Cósmicos – arcade retrô estilo Space Invaders com melhorias. Derrube bichos, pegue itens, vença chefes e melhore a sua nave para sempre.

**Об игре:**
Bichos Cósmicos é um arcade retrô estilo Space Invaders com melhorias modernas. Repila ondas de bichos alienígenas, pegue os itens que caem e abra caminho pelos chefes para melhorar a sua nave para sempre.

• Itens dos bichos: tiro triplo e duplo, rajada, escudo, congelar, vida extra
• 5 tipos de alienígenas – a forma muda a cada 5 níveis
• Um chefe a cada 5 níveis, cada um com seu comportamento e HP
• Melhorias permanentes dos chefes: asas-canhão, drones, balas perfurantes, escudo ímã
• Controle com um dedo: toque para atirar, segure para fogo automático
• Ranking e fogos de artifício por um novo recorde
• Gráficos pixel art, jogue na hora sem cadastro

**Короткое описание:**
Derrube bichos, pegue itens e vença os chefes.

**Как играть:**
A sua nave fica na parte de baixo da tela. Toque para atirar, segure para fogo automático e arraste para mover (no PC – setas e espaço). Derrube a formação de bichos antes que cheguem até você e desvie dos tiros. Bichos derrubados soltam itens – pegue-os: tiro triplo, rajada, escudo, congelar, vida extra. A cada 5 níveis há um chefe com barra de HP; vença-o e escolha uma melhoria permanente para a nave. Some pontos e supere o seu próprio recorde.

---
### TR – вкладка "Türkçe"
**Название:**
Uzay Böcekleri

**Описание для SEO:**
Uzay Böcekleri – yükseltmeli, Space Invaders tarzı retro arcade. Böcekleri vur, güçlendiriciler topla, bossları yen ve gemini kalıcı geliştir.

**Об игре:**
Uzay Böcekleri, modern yükseltmelerle Space Invaders tarzı retro bir arcade. Uzaylı böcek dalgalarını püskürt, düşen güçlendiricileri topla ve gemini kalıcı olarak geliştirmek için bossları geç.

• Böceklerden güçlendiriciler: üçlü ve ikili atış, seri atış, kalkan, dondurma, ekstra can
• 5 uzaylı türü – biçim her 5 seviyede değişir
• Her 5. seviyede bir boss, her biri kendi davranışı ve HP'siyle
• Bosslardan kalıcı yükseltmeler: top-kanatlar, dronlar, delici mermiler, mıknatıs kalkan
• Tek parmak kontrol: ateş için dokun, otomatik ateş için basılı tut
• Sıralama ve yeni rekor için havai fişek
• Piksel grafik, kayıt olmadan anında oyna

**Короткое описание:**
Böcekleri vur, güçlendiriciler topla, bossları yen.

**Как играть:**
Gemin ekranın altında. Ateş etmek için dokun, otomatik ateş için basılı tut, hareket için parmağını kaydır (PC'de – ok tuşları ve boşluk). Böcek dizisini sana ulaşmadan vur ve mermilerinden kaç. Vurulan böcekler güçlendirici düşürür – onları topla: üçlü atış, seri atış, kalkan, dondurma, ekstra can. Her 5. seviyede HP çubuklu bir boss var; onu yen ve gemine kalıcı bir yükseltme seç. Puan topla ve kendi rekorunu geç.

---
## 4. Финал
1. Проверь: 5 вкладок заполнены (текст + обложка + 5 моб. + 5 десктоп. скринов каждая),
   иконка на месте.
2. Впиши "Комментарий разработчика" (напр.: "Добавлены языки es/pt/tr, локализованные
   обложки и родные скриншоты (моб.+десктоп) на каждом языке").
3. "Сохранить" → "Отправить на модерацию".
