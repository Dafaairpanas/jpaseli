import db from '../../lib/db.js';

// Pastikan tabel flashcard_template ada
db.exec(`
  CREATE TABLE IF NOT EXISTS flashcard_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    deskripsi TEXT,
    data_json TEXT NOT NULL,
    urutan INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// GET: Ambil daftar template atau detail template
export const GET = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');

    if (action === 'list') {
      const templates = db.prepare(`
        SELECT id, nama, deskripsi, urutan, created_at,
          json_array_length(data_json) as jumlah_kartu
        FROM flashcard_template
        ORDER BY urutan ASC, id ASC
      `).all();
      return new Response(JSON.stringify(templates), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'detail') {
      const id = parseInt(url.searchParams.get('id') || '0');
      if (!id) return new Response(JSON.stringify({ error: 'Parameter id diperlukan' }), { status: 400 });

      const template = db.prepare('SELECT * FROM flashcard_template WHERE id = ?').get(id);
      if (!template) return new Response(JSON.stringify({ error: 'Template tidak ditemukan' }), { status: 404 });

      return new Response(JSON.stringify(template), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Action tidak dikenali. Gunakan: list, detail' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// POST: Tambah template baru
export const POST = async ({ request }) => {
  try {
    const data = await request.json();
    const { nama, deskripsi, data_json, urutan } = data;

    if (!nama || !data_json) {
      return new Response(JSON.stringify({ error: 'Field nama dan data_json wajib diisi' }), { status: 400 });
    }

    // Validasi JSON
    const parsed = JSON.parse(typeof data_json === 'string' ? data_json : JSON.stringify(data_json));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Response(JSON.stringify({ error: 'data_json harus berupa array JSON yang tidak kosong' }), { status: 400 });
    }

    const jsonStr = typeof data_json === 'string' ? data_json : JSON.stringify(data_json);
    const result = db.prepare(
      'INSERT INTO flashcard_template (nama, deskripsi, data_json, urutan) VALUES (?, ?, ?, ?)'
    ).run(nama, deskripsi || '', jsonStr, urutan || 0);

    return new Response(JSON.stringify({
      success: true,
      id: result.lastInsertRowid,
      message: `Template "${nama}" berhasil ditambahkan`
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// DELETE: Hapus template
export const DELETE = async ({ request }) => {
  try {
    const data = await request.json();
    const { id } = data;

    if (!id) return new Response(JSON.stringify({ error: 'Parameter id diperlukan' }), { status: 400 });

    const result = db.prepare('DELETE FROM flashcard_template WHERE id = ?').run(id);
    return new Response(JSON.stringify({
      success: true,
      message: `Template ID ${id} berhasil dihapus (${result.changes} baris)`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
