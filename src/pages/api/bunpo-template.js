import db from '../../lib/db.js';

/* GET: list, detail, export */
export const GET = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'list';

    if (action === 'list') {
      const templates = db.prepare(
        'SELECT id, nama, deskripsi, urutan, created_at FROM bunpo_template ORDER BY urutan ASC, id ASC'
      ).all();
      // Hitung jumlah pola per template
      for (const t of templates) {
        try {
          const data = JSON.parse(
            db.prepare('SELECT data_json FROM bunpo_template WHERE id = ?').get(t.id).data_json
          );
          t.jumlah_pola = Array.isArray(data) ? data.length : 0;
        } catch {
          t.jumlah_pola = 0;
        }
      }
      return new Response(JSON.stringify(templates), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'detail') {
      const id = url.searchParams.get('id');
      if (!id) return new Response(JSON.stringify({ error: 'Parameter id diperlukan' }), { status: 400 });
      const tpl = db.prepare('SELECT * FROM bunpo_template WHERE id = ?').get(parseInt(id));
      if (!tpl) return new Response(JSON.stringify({ error: 'Template tidak ditemukan' }), { status: 404 });
      return new Response(JSON.stringify(tpl), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'export') {
      const all = db.prepare('SELECT * FROM bunpo_template ORDER BY urutan ASC, id ASC').all();
      return new Response(JSON.stringify(all), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'all-bunpo') {
      const templates = db.prepare('SELECT id, nama, data_json FROM bunpo_template ORDER BY urutan ASC, id ASC').all();
      let allBunpo = [];
      for (const t of templates) {
        try {
          const items = JSON.parse(t.data_json);
          if (Array.isArray(items)) {
            items.forEach(item => {
              allBunpo.push({ ...item, _bab: t.nama, _babId: t.id });
            });
          }
        } catch { /* skip */ }
      }
      return new Response(JSON.stringify(allBunpo), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Action tidak dikenali. Gunakan: list, detail, export, all-bunpo' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

/* POST: create baru / importAll */
export const POST = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action');

    if (action === 'importAll') {
      const json = await request.json();
      if (!Array.isArray(json)) {
        return new Response(JSON.stringify({ error: 'Format harus berupa array.' }), { status: 400 });
      }

      const insertStmt = db.prepare('INSERT INTO bunpo_template (nama, deskripsi, data_json, urutan) VALUES (?, ?, ?, ?)');
      const importAll = db.transaction(() => {
        db.prepare('DELETE FROM bunpo_template').run();
        let count = 0;
        for (const item of json) {
          if (!item.nama) continue;
          const dataJson = typeof item.data_json === 'string' ? item.data_json : JSON.stringify(item.data_json);
          insertStmt.run(item.nama, item.deskripsi || null, dataJson, item.urutan || 0);
          count++;
        }
        return count;
      });

      const imported = importAll();
      return new Response(JSON.stringify({ success: true, message: `Berhasil import ${imported} template bunpo.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Create baru
    const body = await request.json();
    const { nama, deskripsi, data_json, urutan } = body;

    if (!nama || !data_json) {
      return new Response(JSON.stringify({ error: 'Field nama dan data_json wajib diisi.' }), { status: 400 });
    }

    // Validasi JSON
    try {
      const parsed = typeof data_json === 'string' ? JSON.parse(data_json) : data_json;
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Data harus array tidak kosong.');
    } catch (e) {
      return new Response(JSON.stringify({ error: 'JSON tidak valid: ' + e.message }), { status: 400 });
    }

    const jsonStr = typeof data_json === 'string' ? data_json : JSON.stringify(data_json);
    const result = db.prepare('INSERT INTO bunpo_template (nama, deskripsi, data_json, urutan) VALUES (?, ?, ?, ?)').run(nama, deskripsi || null, jsonStr, urutan || 0);

    return new Response(JSON.stringify({ success: true, id: result.lastInsertRowid, message: `Template "${nama}" berhasil ditambahkan.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

/* PUT: update template */
export const PUT = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, nama, deskripsi, data_json, urutan } = body;

    if (!id || !nama || !data_json) {
      return new Response(JSON.stringify({ error: 'Field id, nama, dan data_json wajib diisi.' }), { status: 400 });
    }

    try {
      const parsed = typeof data_json === 'string' ? JSON.parse(data_json) : data_json;
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Data harus array tidak kosong.');
    } catch (e) {
      return new Response(JSON.stringify({ error: 'JSON tidak valid: ' + e.message }), { status: 400 });
    }

    const jsonStr = typeof data_json === 'string' ? data_json : JSON.stringify(data_json);
    db.prepare('UPDATE bunpo_template SET nama = ?, deskripsi = ?, data_json = ?, urutan = ? WHERE id = ?').run(nama, deskripsi || null, jsonStr, urutan || 0, id);

    return new Response(JSON.stringify({ success: true, message: `Template "${nama}" berhasil diperbarui.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

/* DELETE: hapus template */
export const DELETE = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Parameter id diperlukan.' }), { status: 400 });
    }

    const tpl = db.prepare('SELECT nama FROM bunpo_template WHERE id = ?').get(id);
    if (!tpl) {
      return new Response(JSON.stringify({ error: 'Template tidak ditemukan.' }), { status: 404 });
    }

    db.prepare('DELETE FROM bunpo_template WHERE id = ?').run(id);
    return new Response(JSON.stringify({ success: true, message: `Template "${tpl.nama}" berhasil dihapus.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
