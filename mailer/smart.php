<?php

$phone = $_POST['phone'] ?? '';

if (empty($phone)) {
    http_response_code(400);
    echo 'Missing phone';
    exit;
}

require_once __DIR__ . '/phpmailer/PHPMailerAutoload.php';

$smtpHost = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
$smtpUser = getenv('SMTP_USER') ?: '';
$smtpPass = getenv('SMTP_PASS') ?: '';
$smtpPort = (int)(getenv('SMTP_PORT') ?: 465);
$mailTo = getenv('MAIL_TO') ?: 'remontmailshop@gmail.com';
$mailFrom = getenv('MAIL_FROM') ?: $smtpUser;

$mail = new PHPMailer;
$mail->CharSet = 'utf-8';
$mail->isSMTP();
$mail->Host = $smtpHost;
$mail->SMTPAuth = true;
$mail->Username = $smtpUser;
$mail->Password = $smtpPass;
$mail->SMTPSecure = 'ssl';
$mail->Port = $smtpPort;

$mail->setFrom($mailFrom, 'Proper Service');
$mail->addAddress($mailTo);
$mail->isHTML(true);
$mail->Subject = 'Phone number';
$mail->Body = 'Клієнт залишив дані <br>Номер телефону: ' . htmlspecialchars($phone, ENT_QUOTES, 'UTF-8');

if (!$mail->send()) {
    http_response_code(500);
    echo 'Error';
} else {
    echo 'OK';
}