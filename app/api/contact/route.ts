import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    let phone = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      phone = body.phone || '';
    } else {
      const formData = await request.formData();
      phone = (formData.get('phone') as string) || '';
    }

    if (!phone || phone.trim() === '') {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const mailTo = process.env.MAIL_TO || 'remontmailshop@gmail.com';
    const mailFrom = process.env.MAIL_FROM || smtpUser || 'no-reply@example.com';

    // Dev / missing creds fallback: log and succeed so UI flow works
    if (!smtpUser || !smtpPass) {
      console.log('[CONTACT] Phone submission (no SMTP creds configured):', phone);
      return NextResponse.json({ ok: true, dev: true });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587 (will use STARTTLS)
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
        <p><strong>Номер телефону:</strong> ${phone.replace(/</g, '&lt;')}</p>
        <p>Час: ${new Date().toLocaleString('uk-UA')}</p>
      `,
      text: `Клієнт залишив заявку.\nТелефон: ${phone}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Contact mail error:', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
