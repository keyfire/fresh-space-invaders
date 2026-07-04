-- Схема D1 для лидерборда "Космических жуков".
-- Применить: wrangler d1 execute kosmozhuki --remote --file=./schema.sql

-- Таблица рекордов: одна строка на пользователя Telegram, хранится лучший счёт.
CREATE TABLE IF NOT EXISTS scores (
    user_id  INTEGER PRIMARY KEY,   -- Telegram user id (из подписанного initData)
    name     TEXT    NOT NULL,      -- отображаемое имя (first + last)
    username TEXT,                  -- @username, если есть
    score    INTEGER NOT NULL,      -- лучший счёт
    level    INTEGER NOT NULL,      -- уровень лучшего забега
    updated  INTEGER NOT NULL       -- unixtime последнего обновления
);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

-- Временное хранилище PNG-карточек для шаринга (живут сутки, чистятся при записи).
CREATE TABLE IF NOT EXISTS cards (
    id      TEXT    PRIMARY KEY,    -- короткий id, попадает в photo_url
    png     BLOB    NOT NULL,       -- байты PNG
    created INTEGER NOT NULL        -- unixtime создания
);
