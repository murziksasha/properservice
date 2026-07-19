import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSession } from '@/lib/auth';
import { appendOrder, deleteOrder, listOrders, updateOrder } from '@/lib/orders';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { assertAdminIp } from '@/lib/require-admin-ip';
import { escapeText } from '@/lib/sanitize';
import { isValidUaPhone, normalizePhoneDisplay } from '@/lib/phone';
import { getProduct } from '@/lib/site-data';
import { notifyOrder } from '@/lib/notify';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

const MAX_COMMENT = 1000;

async function guard() {
  const ipGate = await assertAdminIp();
  if (!ipGate.ok) {
    return { ok: false as const, response: NextResponse.json({ error: ipGate.error }, { status: ipGate.status }) };
  }
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true as const };
}

/** Public: create shop order */
export async function POST(request: NextRequest) {
  const rl = rateLimit(clientKey(request, 'order'), { limit: 8, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    let phone = '';
    let productId = '';
    let comment = '';
    let honeypot = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      phone = typeof body.phone === 'string' ? body.phone : '';
      productId = typeof body.productId === 'string' ? body.productId : '';
      comment = typeof body.comment === 'string' ? body.comment : '';
      honeypot = typeof body.website === 'string' ? body.website : '';
    } else {
      const formData = await request.formData();
      phone = String(formData.get('phone') || '');
      productId = String(formData.get('productId') || '');
      comment = String(formData.get('comment') || '');
      honeypot = String(formData.get('website') || '');
    }

    // Honeypot: bots that fill hidden field get soft success without store/mail
    if (honeypot.trim()) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    phone = normalizePhoneDisplay(phone);
    productId = productId.trim();
    comment = comment.trim().slice(0, MAX_COMMENT);

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }
    if (!isValidUaPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const product = await getProduct(productId);
    if (!product || !product.visible) {
      return NextResponse.json({ error: 'Product not available' }, { status: 400 });
    }

    const snapshot = {
      id: product.id,
      title: product.title,
      price: product.price,
      code: product.code,
      image: product.image,
    };

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const mailTo = process.env.MAIL_TO || 'remontmailshop@gmail.com';
    const mailFrom = process.env.MAIL_FROM || smtpUser || 'no-reply@example.com';
    const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');

    const safePhone = escapeText(phone);
    const safeTitle = escapeText(product.title);
    const safeCode = product.code ? escapeText(product.code) : '—';
    const safeComment = comment ? escapeText(comment) : '—';
    const priceStr = product.price.toLocaleString('uk-UA');
    const when = new Date().toLocaleString('uk-UA');
    const productPath = `/shop/${product.id}`;
    const productLink = siteUrl ? `${siteUrl}${productPath}` : productPath;

    let emailed = false;

    if (!smtpUser || !smtpPass) {
      console.log('[ORDER] submission (no SMTP):', phone, product.title);
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"Proper Service" <${mailFrom}>`,
          to: mailTo,
          subject: `Замовлення: ${product.title}`,
          html: `
        <p>Нове <strong>замовлення</strong> з магазину.</p>
        <p><strong>Телефон:</strong> ${safePhone}</p>
        <p><strong>Товар:</strong> ${safeTitle}</p>
        <p><strong>Код:</strong> ${safeCode}</p>
        <p><strong>Ціна:</strong> ${escapeText(priceStr)} ₴</p>
        <p><strong>Кількість:</strong> 1</p>
        <p><strong>Коментар:</strong> ${safeComment}</p>
        <p><strong>Час:</strong> ${escapeText(when)}</p>
        <p><strong>Сторінка:</strong> <a href="${escapeText(productLink)}">${escapeText(productLink)}</a></p>
        <p><strong>ID товару:</strong> ${escapeText(product.id)}</p>
      `,
          text: [
            'Нове замовлення з магазину.',
            `Телефон: ${phone}`,
            `Товар: ${product.title}`,
            `Код: ${product.code || '—'}`,
            `Ціна: ${priceStr} ₴`,
            'Кількість: 1',
            `Коментар: ${comment || '—'}`,
            `Час: ${when}`,
            `Сторінка: ${productLink}`,
            `ID товару: ${product.id}`,
          ].join('\n'),
        });
        emailed = true;
      } catch (err) {
        console.error('Order mail error:', err);
      }
    }

    let telegram = false;
    try {
      telegram = await notifyOrder({
        phone,
        productTitle: product.title,
        price: product.price,
      });
    } catch {
      telegram = false;
    }

    try {
      await appendOrder({
        phone,
        comment: comment || undefined,
        product: snapshot,
        emailed,
        telegram,
      });
    } catch (err) {
      console.error('[orders] failed to persist', err);
      if (!emailed && !telegram) {
        return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, emailed, telegram, dev: !smtpUser || !smtpPass });
  } catch (err) {
    console.error('Order error:', err);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const orders = await listOrders();
  const format = request.nextUrl.searchParams.get('format');
  if (format === 'csv') {
    const csv = toCsv(
      ['id', 'createdAt', 'phone', 'product', 'code', 'price', 'comment', 'handled', 'note', 'emailed'],
      orders.map((o) => [
        o.id,
        o.createdAt,
        o.phone,
        o.product.title,
        o.product.code || '',
        o.product.price,
        o.comment || '',
        o.handled,
        o.note || '',
        o.emailed,
      ]),
    );
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders.csv"',
      },
    });
  }
  return NextResponse.json({
    orders,
    total: orders.length,
    unhandled: orders.filter((o) => !o.handled).length,
  });
}

export async function PATCH(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  try {
    const body = (await request.json()) as { id?: string; handled?: boolean; note?: string };
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const updated = await updateOrder(body.id, {
      handled: body.handled,
      note: body.note,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, order: updated });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const ok = await deleteOrder(body.id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
