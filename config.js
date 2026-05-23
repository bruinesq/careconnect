// ─── CareConnect Configuration ────────────────────────────────────────────────
const SUPABASE_URL  = 'https://vpohfpyouwshqgkntxzm.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwb2hmcHlvdXdzaHFna250eHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTM1MjEsImV4cCI6MjA5NTEyOTUyMX0.FqnoeWgjYbFCMTt1gOMuGToH7LdX5wVtCdTXn7HrWrQ';

// GAS PDF endpoint — kept for report generation only
const GAS_PDF_URL   = 'https://script.google.com/macros/s/AKfycbzP1aTNY_pc0VAlQihSz-Gwi3rm5g-uFlBXapszIyG3Pt9BuoRX16mlfo2WPR5crAxbNA/exec';

// Supabase REST helpers
async function sbGet(table, params) {
  const url = SUPABASE_URL + '/rest/v1/' + table + '?' + params;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (!res.ok) throw new Error('GET ' + table + ' failed: ' + res.status);
  return res.json();
}

async function sbInsert(table, data) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('INSERT ' + table + ' failed: ' + res.status);
  return res.json();
}

async function sbDelete(table, id) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=minimal'
    }
  });
  if (!res.ok) throw new Error('DELETE ' + table + ' failed: ' + res.status);
}

async function sbUpsert(table, data) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('UPSERT ' + table + ' failed: ' + res.status);
}
