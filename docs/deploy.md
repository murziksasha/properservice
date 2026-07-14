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
- [ ] `SITE_URL` — публічний URL (sitemap.xml, Open Graph), напр. `http://service.home`
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

`typecheck` → `lint` → `test` → `test:smoke` (Playwright) → `build`

## Laptop + Keenetic DNS (LAN)

Типовий сценарій: сайт крутиться на ноутбуці, роутер роздає імʼя через Keen DNS.

1. У `.env`: `COOKIE_SECURE=false` (без HTTPS cookie з `Secure` не збережеться).
2. `docker compose up -d --build` (або `npm run docker:up`).
3. Дізнайтесь LAN IP ноутбука (`ipconfig` / `ip a`).
4. Keenetic: DNS → A-запис (напр. `service.home`) → цей IP; або Cloud / remote access за інструкцією Keenetic.
5. Windows Firewall: дозволити вхідний TCP `NGINX_PORT` (зазвичай 80).
6. Перевірка: `http://<host>/api/health` → `{"ok":true,...}`.
7. Адмінка: `http://<host>/admin` — сильний `ADMIN_PASSWORD` + `SESSION_SECRET`.

Рекомендації безпеки в LAN:

- Не використовуйте `changeme`
- Обмежте `/admin`:
  - `ADMIN_IP_ALLOWLIST=192.168.1.10,127.0.0.1` — лише ці IP (UI + API)
  - або VPN / firewall allowlist / basic auth на nginx
- Регулярний backup `data/site.json`, `data/backups/`, `data/leads.json`, `public/uploads`
- Якщо відкриваєте порт у інтернет — обовʼязково HTTPS (і тоді `COOKIE_SECURE=true`)

## Off-site backup (обовʼязково)

Snapshots у `data/backups/` **на тому ж ноутбуці** не рятують від крадіжки/SSD-crash.

Раз на тиждень (або щодня в Task Scheduler):

```bash
# Windows (приклад): xcopy / robocopy на інший диск
robocopy "C:\path\to\properservice\data" "D:\backups\ps-data" /MIR
robocopy "C:\path\to\properservice\public\uploads" "D:\backups\ps-uploads" /MIR

# або rclone → OneDrive / S3 / SMB
# rclone sync ./data remote:properservice/data
# rclone sync ./public/uploads remote:properservice/uploads
```

Також: Dashboard → Live health показує last backup і підказку off-site.

## Auto-backup

За замовчуванням кожне збереження контенту пише snapshot у `data/backups/` (`AUTO_BACKUP=true`, `BACKUP_KEEP=20`).

### CLI (Task Scheduler / cron на ноутбуці)

```bash
cd properservice
npm run backup
```

**Windows Task Scheduler:** щодня `npm run backup` у каталозі проєкту (або `npx tsx scripts/backup.ts`).

**Linux/macOS cron** (щодня о 03:00):

```cron
0 3 * * * cd /path/to/properservice && npm run backup >> /var/log/ps-backup.log 2>&1
```

### HTTP cron (якщо сайт запущений)

У `.env`: `BACKUP_CRON_SECRET=...`

```bash
curl -X POST -H "Authorization: Bearer $BACKUP_CRON_SECRET" http://localhost/api/backup
```

Список snapshot: адмінка → **Налаштування → Backup**.

## Security notes

1. Не публікуйте `.env`
2. Обмежте доступ до `/admin` (VPN / basic auth на nginx — опційно)
3. PHP mailer можна вимкнути з compose, якщо не використовується
4. Після зміни `SESSION_SECRET` усі сесії інвалідуються
5. Health endpoint: `GET /api/health` (без секретів)
