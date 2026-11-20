# Legacy PHP mailer

This folder (`smart.php` + PHPMailer) is **legacy**.

- Public forms use `POST /api/contact` and `POST /api/orders` (nodemailer).
- Docker containers (`docker-compose.yml`, `docker-compose.dev.yml`) do not start `php-mailer`, and nginx returns 404 for `/mailer/`.

To fully remove:

1. Delete this directory

Do not wire new frontend code to `smart.php`.
