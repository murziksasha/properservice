# Legacy PHP mailer

This folder (`smart.php` + PHPMailer) is **legacy**.

- Public forms use `POST /api/contact` and `POST /api/orders` (nodemailer).
- Docker still optionally runs `php-mailer` for nginx compatibility with old paths.

To fully remove:

1. Drop `php-mailer` service from `docker-compose.yml`
2. Remove mailer location blocks from `docker/nginx.conf`
3. Delete this directory

Do not wire new frontend code to `smart.php`.
