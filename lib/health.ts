import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { listSiteBackups } from './backup';
import { countLeads } from './leads';
import { countOrders } from './orders';
import { uploadsStats } from './media';

const startedAt = Date.now();

export interface HealthReport {
  ok: boolean;
  service: string;
  time: string;
  uptimeSec: number;
  dataFile: boolean;
  dataDir: string;
  smtp: boolean;
  backups: {
    count: number;
    last: string | null;
  };
  leads: {
    total: number;
    unhandled: number;
  };
  orders: {
    total: number;
    unhandled: number;
  };
  uploads: {
    count: number;
    bytes: number;
  };
  autoBackup: boolean;
  offsiteHint: string;
}

export async function getHealthReport(): Promise<HealthReport> {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const sitePath = path.join(dataDir, 'site.json');

  let backupsCount = 0;
  let lastBackup: string | null = null;
  try {
    const list = await listSiteBackups();
    backupsCount = list.length;
    lastBackup = list[0]?.mtime ?? null;
  } catch {
    // ignore
  }

  let leadsTotal = 0;
  let leadsUnhandled = 0;
  try {
    leadsTotal = await countLeads();
    leadsUnhandled = await countLeads({ unhandledOnly: true });
  } catch {
    // ignore
  }

  let ordersTotal = 0;
  let ordersUnhandled = 0;
  try {
    ordersTotal = await countOrders();
    ordersUnhandled = await countOrders({ unhandledOnly: true });
  } catch {
    // ignore
  }

  let uploads = { count: 0, bytes: 0 };
  try {
    uploads = await uploadsStats();
  } catch {
    // ignore
  }

  // Ensure data dir is readable
  let dataFile = existsSync(sitePath);
  if (dataFile) {
    try {
      await fs.access(sitePath);
    } catch {
      dataFile = false;
    }
  }

  return {
    ok: dataFile,
    service: 'properservice',
    time: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    dataFile,
    dataDir,
    smtp: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
    backups: { count: backupsCount, last: lastBackup },
    leads: { total: leadsTotal, unhandled: leadsUnhandled },
    orders: { total: ordersTotal, unhandled: ordersUnhandled },
    uploads,
    autoBackup: process.env.AUTO_BACKUP !== 'false',
    offsiteHint:
      'Копіюйте data/ і public/uploads/ на інший диск / SMB / rclone (див. docs/deploy.md).',
  };
}
