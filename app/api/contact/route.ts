import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { appendLead, updateLead } from '@/lib/leads';
import {
  absoluteSiteUrl,
  sanitizePagePath,
  sanitizePageTitle,
  truncateMeta,
} from '@/lib/page-path';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { escapeText } from '@/lib/sanitize';
import { isValidUaPhone, normalizePhoneDisplay } from '@/lib/phone';

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

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
    let pagePathRaw: unknown;
    let pageTitleRaw: unknown;
    let honeypot = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      phone = typeof body.phone === 'string' ? body.phone : '';
      pagePathRaw = body.pagePath;
      pageTitleRaw = body.pageTitle;
      honeypot = typeof body.website === 'string' ? body.website : '';
    } else {
      const formData = await request.formData();
      phone = String(formData.get('phone') || '');
      pagePathRaw = formData.get('pagePath');
      pageTitleRaw = formData.get('pageTitle');
      honeypot = String(formData.get('website') || '');
    }

    // Honeypot: bots that fill hidden field get soft success
    if (honeypot.trim()) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    phone = normalizePhoneDisplay(phone);

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }

    if (!isValidUaPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const pagePath = sanitizePagePath(pagePathRaw);
    const pageTitle = sanitizePageTitle(pageTitleRaw);
    const ip = clientIp(request);
    const userAgent = truncateMeta(request.headers.get('user-agent'), 200);
    const referer = truncateMeta(request.headers.get('referer'), 300);
    const language = truncateMeta(
      (request.headers.get('accept-language') || '').split(',')[0],
      40,
    );

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const mailTo = process.env.MAIL_TO || 'remontmailshop@gmail.com';
    const mailFrom = process.env.MAIL_FROM || smtpUser || 'no-reply@example.com';
    const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');

    let lead;
    try {
      lead = await appendLead({
        phone,
        emailed: false,
        source: 'callback',
        pagePath,
      });
    } catch (err) {
      console.error('[leads] failed to persist', err);
      // Without journal we still try email so the shop can call back
      lead = null;
    }

    const when = new Date().toLocaleString('uk-UA');
    const pageUrl = absoluteSiteUrl(pagePath, siteUrl) || pagePath;
    const adminLeadsUrl = siteUrl ? `${siteUrl}/admin/leads` : undefined;
    const phoneDigits = phone.replace(/\D/g, '');
    const source = 'callback';

    const safePhone = escapeText(phone);
    const safeWhen = escapeText(when);
    const safeId = lead ? escapeText(lead.id) : '—';
    const safeSource = escapeText(source);
    const safePage = pageUrl ? escapeText(pageUrl) : '—';
    const safeTitle = pageTitle ? escapeText(pageTitle) : '—';
    const safeReferer = referer ? escapeText(referer) : '—';
    const safeIp = escapeText(ip);
    const safeUa = userAgent ? escapeText(userAgent) : '—';
    const safeLang = language ? escapeText(language) : '—';
    const safeAdmin = adminLeadsUrl ? escapeText(adminLeadsUrl) : undefined;

    let emailed = false;

    if (!smtpUser || !smtpPass) {
      console.log('[CONTACT] Phone submission (no SMTP creds configured):', phone, {
        leadId: lead?.id,
        pagePath,
        ip,
      });
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

        const html = `
        <p>Клієнт залишив <strong>заявку на дзвінок</strong>.</p>
        <p><strong>Телефон:</strong> <a href="tel:${escapeText(phoneDigits)}">${safePhone}</a></p>
        <p><strong>Час:</strong> ${safeWhen}</p>
        <p><strong>ID заявки:</strong> ${safeId}</p>
        <p><strong>Джерело:</strong> ${safeSource}</p>
        <p><strong>Сторінка:</strong> ${
          pageUrl ? `<a href="${safePage}">${safePage}</a>` : '—'
        }</p>
        <p><strong>Заголовок сторінки:</strong> ${safeTitle}</p>
        <p><strong>Referer:</strong> ${safeReferer}</p>
        <p><strong>IP:</strong> ${safeIp}</p>
        <p><strong>User-Agent:</strong> ${safeUa}</p>
        <p><strong>Мова браузера:</strong> ${safeLang}</p>
        ${
          safeAdmin
            ? `<p><strong>Журнал:</strong> <a href="${safeAdmin}">${safeAdmin}</a></p>`
            : ''
        }
      `;

        const textLines = [
          'Клієнт залишив заявку на дзвінок.',
          `Телефон: ${phone}`,
          `Час: ${when}`,
          `ID заявки: ${lead?.id || '—'}`,
          `Джерело: ${source}`,
          `Сторінка: ${pageUrl || '—'}`,
          `Заголовок сторінки: ${pageTitle || '—'}`,
          `Referer: ${referer || '—'}`,
          `IP: ${ip}`,
          `User-Agent: ${userAgent || '—'}`,
          `Мова браузера: ${language || '—'}`,
        ];
        if (adminLeadsUrl) textLines.push(`Журнал: ${adminLeadsUrl}`);

        await transporter.sendMail({
          from: `"Proper Service" <${mailFrom}>`,
          to: mailTo,
          subject: `Новий дзвінок з сайту · ${phone}`,
          html,
          text: textLines.join('\n'),
        });
        emailed = true;

        if (lead) {
          try {
            await updateLead(lead.id, { emailed: true });
          } catch (err) {
            console.error('[leads] failed to mark emailed', err);
          }
        }
      } catch (err) {
        console.error('Contact mail error:', err);
        // Lead already in journal with emailed: false
      }
    }

    // Completely lost the request (no journal, no mail)
    if (!lead && !emailed) {
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, emailed, dev: !smtpUser || !smtpPass });
  } catch (err) {
    console.error('Contact error:', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
