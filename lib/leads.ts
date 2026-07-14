import { promises as fs } from 'fs';
import path from 'path';
import { atomicWriteJson } from './atomic-write';
import { createId } from './id';

export interface Lead {
  id: string;
  phone: string;
  createdAt: string;
  source: 'callback';
  /** Email sent successfully */
  emailed: boolean;
  /** Operator marked as handled */
  handled: boolean;
  note?: string;
}

export interface LeadsStore {
  leads: Lead[];
}

const MAX_LEADS = 500;

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
}): Promise<Lead> {
  const store = await readStore();
  const lead: Lead = {
    id: createId(),
    phone: input.phone,
    createdAt: new Date().toISOString(),
    source: input.source || 'callback',
    emailed: input.emailed,
    handled: false,
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
  patch: Partial<Pick<Lead, 'handled' | 'note'>>,
): Promise<Lead | null> {
  const store = await readStore();
  const idx = store.leads.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const current = store.leads[idx];
  const next: Lead = {
    ...current,
    handled: typeof patch.handled === 'boolean' ? patch.handled : current.handled,
    note: patch.note !== undefined ? patch.note : current.note,
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
