import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockAppendLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockFindOpenLeadsByPhone = vi.fn();

vi.mock('@/lib/leads', () => ({
  appendLead: (...args: unknown[]) => mockAppendLead(...args),
  updateLead: (...args: unknown[]) => mockUpdateLead(...args),
  findOpenLeadsByPhone: (...args: unknown[]) => mockFindOpenLeadsByPhone(...args),
}));

const mockAppendOrder = vi.fn();
const mockUpdateOrder = vi.fn();

vi.mock('@/lib/orders', () => ({
  appendOrder: (...args: unknown[]) => mockAppendOrder(...args),
  updateOrder: (...args: unknown[]) => mockUpdateOrder(...args),
  listOrders: vi.fn(async () => []),
  deleteOrder: vi.fn(async () => true),
}));

const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: (...args: unknown[]) => mockSendMail(...args),
    })),
  },
}));

const mockNotifyOrder = vi.fn();
const mockNotifyLead = vi.fn();
vi.mock('@/lib/notify', () => ({
  notifyOrder: (...args: unknown[]) => mockNotifyOrder(...args),
  notifyLead: (...args: unknown[]) => mockNotifyLead(...args),
}));

vi.mock('@/lib/site-data', () => ({
  getProduct: vi.fn(async (id: string) => ({
    id,
    title: 'Test Battery',
    price: 500,
    code: 'BAT-01',
    visible: true,
  })),
}));

describe('Journal write failure gives 500 and guards notification dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOpenLeadsByPhone.mockResolvedValue([]);
    mockNotifyLead.mockResolvedValue(false);
    mockNotifyOrder.mockResolvedValue(false);
    mockSendMail.mockResolvedValue({ messageId: 'test-msg' });

    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'secret123';
    process.env.MAIL_TO = 'boss@example.com';
  });

  it('POST /api/contact: помилка appendLead повертає 500 і не викликає sendMail та Telegram', async () => {
    mockAppendLead.mockRejectedValue(new Error('Disk write failed'));

    const { POST } = await import('@/app/api/contact/route');
    const req = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({ phone: '+380501112233' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save lead');

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(mockNotifyLead).not.toHaveBeenCalled();
  });

  it('POST /api/contact: успішний запис у журнал повертає ok: true навіть якщо відправка листа впала', async () => {
    mockAppendLead.mockResolvedValue({
      id: 'lead-123',
      phone: '+380501112233',
      emailed: false,
    });
    mockSendMail.mockRejectedValue(new Error('SMTP timeout'));

    const { POST } = await import('@/app/api/contact/route');
    const req = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({ phone: '+380501112233' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
  });

  it('POST /api/orders: помилка appendOrder повертає 500 і не викликає sendMail та Telegram', async () => {
    mockAppendOrder.mockRejectedValue(new Error('Corrupt orders.json'));

    const { POST } = await import('@/app/api/orders/route');
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({ phone: '+380501112233', productId: 'p1' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save order');

    // Mail and Telegram must NOT have been called
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(mockNotifyOrder).not.toHaveBeenCalled();
  });

  it('POST /api/orders: успішний запис у журнал повертає ok: true навіть якщо відправка листа впала', async () => {
    mockAppendOrder.mockResolvedValue({
      id: 'ord-123',
      phone: '+380501112233',
      product: { id: 'p1', title: 'Test Battery', price: 500 },
      emailed: false,
      telegram: false,
    });
    mockSendMail.mockRejectedValue(new Error('SMTP timeout'));

    const { POST } = await import('@/app/api/orders/route');
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({ phone: '+380501112233', productId: 'p1' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
  });
});
