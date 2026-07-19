import { promises as fs } from 'fs';
import path from 'path';
import { atomicWriteJson } from './atomic-write';
import { createId } from './id';
import type { UtmParams } from './utm';

export interface LeadAuditEntry {
  at: string;
  action: 'created' | 'handled' | 'reopened' | 'note' | 'emailed';
  detail?: string;
}

export interface Lead {
  id: string;
  phone: string;
  createdAt: string;
  source: 'callback';
  emailed: boolean;
  handled: boolean;
  note?: string;
  pagePath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  handledAt?: string;
  audit?: LeadAuditEntry[];
  telegram?: boolean;
}

export interface LeadsStore {
  leads: Lead[];
}

const MAX_LEADS = 500;
const MAX_AUDIT = 30;

function dataRoot(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

export function leadsFilePath(): string {
  return path.join(dataRoot(), 'leads.json');
}

async function readStore(): Promise<LeadsStore> {
  try {
    const raw = await fs.readFile(leadsFilePath(), 'utf-8');
    const parsed = JSON.parse(raw) as LeadsStore;
    if (!parsed || !Array.isArray(parsed.leads)) return { leads: [] };
    return parsed;
  } catch {
    return { leads: [] };
  }
}

async function writeStore(store: LeadsStore): Promise<void> {
  await atomicWriteJson(leadsFilePath(), store);
}

function pushAudit(lead: Lead, entry: LeadAuditEntry): LeadAuditEntry[] {
  const list = [...(lead.audit || []), entry];
  return list.slice(-MAX_AUDIT);
}

export async function listLeads(): Promise<Lead[]> {
  const store = await readStore();
  return store.leads;
}

export async function countLeads(options?: { unhandledOnly?: boolean }): Promise<number> {
  const leads = await listLeads();
  if (options?.unhandledOnly) return leads.filter((l) => !l.handled).length;
  return leads.length;
}

export async function appendLead(input: {
  phone: string;
  emailed: boolean;
  source?: Lead['source'];
  pagePath?: string;
  utm?: UtmParams;
  telegram?: boolean;
}): Promise<Lead> {
  const store = await readStore();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: createId(),
    phone: input.phone,
    createdAt: now,
    source: input.source || 'callback',
    emailed: input.emailed,
    handled: false,
    ...(input.pagePath ? { pagePath: input.pagePath } : {}),
    ...(input.utm?.utmSource ? { utmSource: input.utm.utmSource } : {}),
    ...(input.utm?.utmMedium ? { utmMedium: input.utm.utmMedium } : {}),
    ...(input.utm?.utmCampaign ? { utmCampaign: input.utm.utmCampaign } : {}),
    ...(input.utm?.utmContent ? { utmContent: input.utm.utmContent } : {}),
    ...(input.utm?.utmTerm ? { utmTerm: input.utm.utmTerm } : {}),
    ...(typeof input.telegram === 'boolean' ? { telegram: input.telegram } : {}),
    audit: [{ at: now, action: 'created' }],
  };
  store.leads.unshift(lead);
  if (store.leads.length > MAX_LEADS) {
    store.leads = store.leads.slice(0, MAX_LEADS);
  }
  await writeStore(store);
  return lead;
}

export async function updateLead(
  id: string,
  patch: Partial<Pick<Lead, 'handled' | 'note' | 'emailed'>>,
): Promise<Lead | null> {
  const store = await readStore();
  const idx = store.leads.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const current = store.leads[idx];
  const now = new Date().toISOString();
  let audit = current.audit || [];

  if (typeof patch.handled === 'boolean' && patch.handled !== current.handled) {
    audit = pushAudit(
      { ...current, audit },
      { at: now, action: patch.handled ? 'handled' : 'reopened' },
    );
  }
  if (patch.note !== undefined && patch.note !== current.note) {
    audit = pushAudit(
      { ...current, audit },
      { at: now, action: 'note', detail: String(patch.note).slice(0, 200) },
    );
  }
  if (typeof patch.emailed === 'boolean' && patch.emailed && !current.emailed) {
    audit = pushAudit({ ...current, audit }, { at: now, action: 'emailed' });
  }

  const next: Lead = {
    ...current,
    handled: typeof patch.handled === 'boolean' ? patch.handled : current.handled,
    note: patch.note !== undefined ? patch.note : current.note,
    emailed: typeof patch.emailed === 'boolean' ? patch.emailed : current.emailed,
    audit,
    handledAt:
      typeof patch.handled === 'boolean'
        ? patch.handled
          ? now
          : undefined
        : current.handledAt,
  };
  store.leads[idx] = next;
  await writeStore(store);
  return next;
}

export async function deleteLead(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.leads.length;
  store.leads = store.leads.filter((l) => l.id !== id);
  if (store.leads.length === before) return false;
  await writeStore(store);
  return true;
}
