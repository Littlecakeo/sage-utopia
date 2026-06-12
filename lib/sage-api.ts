import { hasSupabaseConfig, supabase } from './supabase';

export type SageTable =
  | 'courses'
  | 'assignments'
  | 'job_applications'
  | 'expenses'
  | 'portfolio_projects'
  | 'profile';

export type SageRecord = Record<string, unknown> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

function ensureClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('尚未配置 Supabase 环境变量，当前只能使用本地模式。');
  }
  return supabase;
}

export async function listRecords<T extends SageRecord>(table: SageTable, orderField = 'created_at') {
  const client = ensureClient();
  const { data, error } = await client.from(table).select('*').order(orderField, { ascending: false });
  if (error) throw error;
  return (data || []) as T[];
}

export async function getRecord<T extends SageRecord>(table: SageTable, id: string) {
  const client = ensureClient();
  const { data, error } = await client.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data as T;
}

export async function createRecord<T extends SageRecord>(table: SageTable, payload: SageRecord) {
  const client = ensureClient();
  const { data, error } = await client.from(table).insert(payload).select('*').single();
  if (error) throw error;
  return data as T;
}

export async function updateRecord<T extends SageRecord>(table: SageTable, id: string, payload: SageRecord) {
  const client = ensureClient();
  const { data, error } = await client
    .from(table)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as T;
}

export async function deleteRecord(table: SageTable, id: string) {
  const client = ensureClient();
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw error;
}

export const sageApi = {
  hasSupabaseConfig,
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
};
