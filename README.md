# Proper Service

Маркетинговий сайт + file-based CMS для сервісу ремонту техніки (Чорноморськ).

**Стек:** Next.js 15 · React 19 · TypeScript · Sass · Docker

## Можливості

- Публічні сторінки з composable-секціями (hero, переваги, контакти, відгуки, магазин…)
- Каталог товарів `/shop` (замовлення через телефон / месенджери)
- Форма зворотного дзвінка → email (SMTP / nodemailer)
- Адмінка `/admin` для меню, сторінок, товарів і налаштувань
- Збереження контенту в `data/site.json` (без окремої БД)

## Швидкий старт

```bash
cp .env.example .env
# задайте ADMIN_PASSWORD і SESSION_SECRET
npm install
npm run seed   # опційно: записати default-контент у data/site.json
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) та [http://localhost:3000/admin](http://localhost:3000/admin).

## Змінні середовища

| Змінна | Опис |
|--------|------|
| `ADMIN_PASSWORD` | Пароль адмінки (**обовʼязково**) |
| `SESSION_SECRET` | Секрет для підпису cookie-сесії (рекомендовано; інакше fallback на пароль) |
| `SMTP_*` / `MAIL_*` | Налаштування пошти для `/api/contact` |
| `DATA_DIR` | Каталог для `site.json` (Docker volume) |
| `NGINX_PORT` | Зовнішній порт nginx у Docker |

Див. `.env.example`.

## Скрипти

| Команда | Дія |
|---------|-----|
| `npm run dev` | Dev-сервер |
| `npm run build` / `start` | Production build |
| `npm run seed` | Заповнити `data/site.json` з defaults |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run format` | Prettier |
| `npm run docker:up` / `docker:down` | Prod-стек |
| `npm run docker:dev` | Dev Docker (hot mount) |

## Docker

```bash
cp .env.example .env
npm run docker:up
```

Том’и: `data/` (контент), `public/uploads/` (зображення). Деталі — [docs/deploy.md](docs/deploy.md).

## Документація

- [Архітектура](docs/architecture.md)
- [Посібник адміна](docs/admin-guide.md)
- [Деплой](docs/deploy.md)
- [CHANGELOG](CHANGELOG.md)

## Безпека (коротко)

- Сесія: HMAC-підписаний httpOnly cookie, secret з env
- `GET/PUT /api/site` — лише для авторизованих
- HTML з CMS санітизується при рендері
- Upload: whitelist MIME + magic bytes, max 5 MB
- Rate-limit на `/api/auth` і `/api/contact`

**Не** комітьте `.env` і не використовуйте `changeme` у production.
