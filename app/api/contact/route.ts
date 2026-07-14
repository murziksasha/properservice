import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { appendLead } from '@/lib/leads';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { escapeText } from '@/lib/sanitize';
import { isValidUaPhone, normalizePhoneDisplay } from '@/lib/phone';

export async function POST(request: NextRequest) {
  const rl = rateLimit(clientKey(request, 'contact'), { limit: 8, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
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
    let emailed = false;

    if (!smtpUser || !smtpPass) {
      console.log('[CONTACT] Phone submission (no SMTP creds configured):', phone);
    } else {
      try {
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
        emailed = true;
      } catch (err) {
        console.error('Contact mail error:', err);
        // Still persist lead so admin can call back
      }
    }

    try {
      await appendLead({ phone, emailed, source: 'callback' });
    } catch (err) {
      console.error('[leads] failed to persist', err);
      // If we couldn't store and couldn't email — fail
      if (!emailed && smtpUser && smtpPass) {
        return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, emailed, dev: !smtpUser || !smtpPass });
  } catch (err) {
    console.error('Contact error:', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
