import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { escapeText } from '@/lib/sanitize';
import { isValidUaPhone, normalizePhoneDisplay } from '@/lib/phone';

export async function POST(request: NextRequest) {
  const rl = rateLimit(clientKey(request, 'contact'), { limit: 8, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000) || 60) } },
    );
  }

  try {
    let phone = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      phone = typeof body.phone === 'string' ? body.phone : '';
    } else {
      const formData = await request.formData();
      phone = String(formData.get('phone') || '');
    }

    phone = normalizePhoneDisplay(phone);

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }

    if (!isValidUaPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const mailTo = process.env.MAIL_TO || 'remontmailshop@gmail.com';
    const mailFrom = process.env.MAIL_FROM || smtpUser || 'no-reply@example.com';

    const safePhone = escapeText(phone);

    // Dev / missing creds fallback: log and succeed so UI flow works
    if (!smtpUser || !smtpPass) {
      console.log('[CONTACT] Phone submission (no SMTP creds configured):', phone);
      return NextResponse.json({ ok: true, dev: true });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Proper Service" <${mailFrom}>`,
      to: mailTo,
      subject: 'Новий дзвінок з сайту',
      html: `
        <p>Клієнт залишив заявку на дзвінок.</p>
        <p><strong>Номер телефону:</strong> ${safePhone}</p>
        <p>Час: ${escapeText(new Date().toLocaleString('uk-UA'))}</p>
      `,
      text: `Клієнт залишив заявку.\nТелефон: ${phone}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Contact mail error:', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
