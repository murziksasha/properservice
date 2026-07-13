# Deploy

## Production Docker

```bash
cp .env.example .env
# set strong ADMIN_PASSWORD and SESSION_SECRET
# set SMTP credentials
docker compose up -d --build
```

Сервіси (`docker-compose.yml`):

| Service | Role |
|---------|------|
| `next-app` | Next.js standalone (`node server.js`) |
| `nginx` | reverse proxy, static `/uploads` |
| `php-mailer` | legacy PHP (optional) |

### Volumes

- site content → `DATA_DIR=/app/data` → `site.json`
- uploads → `public/uploads`

Зробіть backup `data/site.json` і `public/uploads` регулярно.

### Env checklist

- [ ] `ADMIN_PASSWORD` — сильний, не `changeme`
- [ ] `SESSION_SECRET` — довгий random (напр. `openssl rand -hex 32`)
- [ ] SMTP для production (інакше заявки лише в логи)
- [ ] `NODE_ENV=production` (в образі вже)

### Health

- HTTP: nginx → Next `:3000`
- Admin: `/admin/login`
- Contact: submit form, check mailbox or container logs

## Local production build (без Docker)

```bash
npm ci
npm run seed
npm run build
npm start
```

Потрібен `output: 'standalone'` (вже в `next.config.ts`).

## Dev Docker

```bash
npm run docker:dev
# default nginx port often 8080 — see docker-compose.dev.yml
```

## CI

GitHub Actions (`.github/workflows/ci.yml`):

`typecheck` → `lint` → `test` → `build`

## Security notes

1. Не публікуйте `.env`
2. Обмежте доступ до `/admin` (VPN / basic auth на nginx — опційно)
3. PHP mailer можна вимкнути з compose, якщо не використовується
4. Після зміни `SESSION_SECRET` усі сесії інвалідуються
