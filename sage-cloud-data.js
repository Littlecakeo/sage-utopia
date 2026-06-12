import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = typeof __SAGE_SUPABASE_URL__ !== 'undefined' ? __SAGE_SUPABASE_URL__ : '';
const SUPABASE_ANON_KEY =
  typeof __SAGE_SUPABASE_ANON_KEY__ !== 'undefined' ? __SAGE_SUPABASE_ANON_KEY__ : '';

const MODULE_TABLES = {
  study: 'courses',
  assignments: 'assignments',
  career: 'job_applications',
  expenses: 'expenses',
  portfolio: 'portfolio_projects',
  profile: 'profile',
};

const hasConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const client = hasConfig ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function tableFor(module) {
  return MODULE_TABLES[module] || module;
}

function localModeMessage() {
  return hasConfig
    ? 'Supabase 已连接'
    : '未配置 Supabase，当前使用本地模式；部署到 Vercel 后请填写环境变量。';
}

async function list(module, orderField = 'created_at') {
  if (!client) return null;
  const { data, error } = await client.from(tableFor(module)).select('*').order(orderField, { ascending: false });
  if (error) throw error;
  return data || [];
}

async function create(module, payload) {
  if (!client) return null;
  const { data, error } = await client.from(tableFor(module)).insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function update(module, id, payload) {
  if (!client) return null;
  const { data, error } = await client
    .from(tableFor(module))
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function remove(module, id) {
  if (!client) return null;
  const { error } = await client.from(tableFor(module)).delete().eq('id', id);
  if (error) throw error;
  return true;
}

window.SageCloudData = {
  hasConfig,
  client,
  localModeMessage,
  list,
  create,
  update,
  remove,
};

window.dispatchEvent(new CustomEvent('sage-cloud-ready'));
