const { createClient } = require('@supabase/supabase-js');
const dns = require('node:dns/promises');

const MODULE_TABLES = {
  guestbook: 'guestbook_messages',
  friendProfiles: 'friend_profiles',
};

const GUESTBOOK_PUBLIC_COLUMNS =
  'id,user_id,friend_username,display_name,avatar_emoji,avatar_color,avatar_url,message,sticker,note_color,is_visible,created_at,updated_at';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([_key, value]) => value !== undefined)
  );
}

function toGuestbook(payload) {
  const item = { ...(payload || {}) };
  item.friend_username = String(item.friend_username || '').trim().slice(0, 64);
  item.display_name = String(item.display_name || '').trim().slice(0, 40);
  item.avatar_emoji = String(item.avatar_emoji || '🌱').trim().slice(0, 8);
  item.avatar_color = String(item.avatar_color || '#e6f2df').trim().slice(0, 24);
  item.avatar_url = String(item.avatar_url || '').trim().slice(0, 500);
  item.message = String(item.message || '').trim().slice(0, 500);
  item.sticker = String(item.sticker || '').trim().slice(0, 16);
  item.note_color = String(item.note_color || '').trim().slice(0, 24);
  item.delete_token = String(item.delete_token || '').trim().slice(0, 160);
  item.is_visible = item.is_visible !== false;
  return cleanPayload(item);
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';
  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';
  return { url, key };
}

function errorDetails(error) {
  return {
    message: error?.message || String(error || 'Unknown error'),
    code: error?.code || error?.cause?.code || '',
    name: error?.name || error?.cause?.name || '',
    cause: error?.cause?.message || '',
  };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readBody(req);
    const action = String(body.action || '');
    if (action === 'health') {
      const { url, key } = supabaseConfig();
      const host = url ? new URL(url).hostname : '';
      const health = {
        hasUrl: Boolean(url),
        hasKey: Boolean(key),
        host,
        addresses: [],
        fetchOk: false,
        fetchStatus: 0,
        error: null,
      };
      try {
        health.addresses = host ? await dns.lookup(host, { all: true }) : [];
      } catch (error) {
        health.error = errorDetails(error);
      }
      if (url) {
        try {
          const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
            headers: { apikey: key },
            signal: AbortSignal.timeout(8000),
          });
          health.fetchOk = response.ok;
          health.fetchStatus = response.status;
        } catch (error) {
          health.error = errorDetails(error);
        }
      }
      json(res, 200, { data: health });
      return;
    }
    const supabase = createSupabaseClient();
    let data = null;
    let error = null;

    if (action === 'listGuestbook') {
      const orderField = String(body.orderField || 'created_at').replace(/[^a-z0-9_]/gi, '') || 'created_at';
      ({ data, error } = await supabase
        .from(MODULE_TABLES.guestbook)
        .select(GUESTBOOK_PUBLIC_COLUMNS)
        .order(orderField, { ascending: false }));
    } else if (action === 'createGuestbookMessage') {
      ({ data, error } = await supabase
        .from(MODULE_TABLES.guestbook)
        .insert(toGuestbook(body.payload))
        .select(GUESTBOOK_PUBLIC_COLUMNS)
        .single());
    } else if (action === 'getFriendProfile') {
      ({ data, error } = await supabase
        .from(MODULE_TABLES.friendProfiles)
        .select('*')
        .eq('username', String(body.username || '').trim().slice(0, 32))
        .maybeSingle());
    } else if (action === 'enterFriendProfile') {
      const payload = body.payload || {};
      ({ data, error } = await supabase.rpc('sage_friend_enter', {
        p_display_name: String(payload.display_name || '').trim().slice(0, 40),
        p_username: String(payload.username || '').trim().slice(0, 32),
        p_password_hash: String(payload.password_hash || '').trim(),
        p_avatar_emoji: String(payload.avatar_emoji || '🌱').trim().slice(0, 8),
        p_avatar_color: String(payload.avatar_color || '#e6f2df').trim().slice(0, 24),
        p_avatar_url: String(payload.avatar_url || '').trim().slice(0, 500),
      }));
      data = Array.isArray(data) ? data[0] || null : data;
    } else if (action === 'updateFriendAvatar') {
      ({ data, error } = await supabase.rpc('sage_friend_update_avatar', {
        p_username: String(body.username || '').trim().slice(0, 32),
        p_password_hash: String(body.passwordHash || '').trim(),
        p_avatar_url: String(body.avatarUrl || '').trim().slice(0, 500),
      }));
      data = Array.isArray(data) ? data[0] || null : data;
    } else if (action === 'createFriendProfile') {
      ({ data, error } = await supabase
        .from(MODULE_TABLES.friendProfiles)
        .insert(cleanPayload(body.payload))
        .select('*')
        .single());
    } else if (action === 'hideGuestbookMessage') {
      ({ data, error } = await supabase.rpc('sage_hide_guestbook_message', {
        p_message_id: body.id,
        p_delete_token: String(body.deleteToken || '').trim(),
        p_username: String(body.username || '').trim().slice(0, 32),
        p_password_hash: String(body.passwordHash || '').trim(),
      }));
      data = Boolean(data);
    } else {
      json(res, 400, { error: 'Unknown cloud action.' });
      return;
    }

    if (error) {
      json(res, 502, { error: error.message || 'Supabase request failed.', details: errorDetails(error) });
      return;
    }

    json(res, 200, { data });
  } catch (error) {
    json(res, 500, { error: error.message || 'Cloud proxy failed.', details: errorDetails(error) });
  }
};
