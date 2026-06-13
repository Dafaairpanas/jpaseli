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

    if (action === 'export') {
      try {
        const templates = db.prepare(`
          SELECT *
          FROM flashcard_template
          ORDER BY urutan ASC, id ASC
        `).all();

        if (!templates || templates.length === 0) {
          return new Response(JSON.stringify({
            error: 'Tidak ada template untuk diexport.'
          }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify(templates), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (exportError) {
        return new Response(JSON.stringify({
          error: 'Gagal mengexport template dari database.',
          detail: exportError.message
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (action === 'all-kotoba') {
      const templates = db.prepare('SELECT id, nama, data_json FROM flashcard_template ORDER BY urutan ASC, id ASC').all();
      let allKotoba = [];
      for (const t of templates) {
        try {
          const cards = typeof t.data_json === 'string' ? JSON.parse(t.data_json) : t.data_json;
          if (Array.isArray(cards)) {
            for (const c of cards) {
              allKotoba.push({
                front: c.front || '',
                back: c.back || '',
                hint: c.hint || '',
                extra: c.extra || '',
                isExtra: !!c.isExtra,
                bab_id: t.id,
                bab_nama: t.nama
              });
            }
          }
        } catch (e) {
          // Abaikan jika error parsing
        }
      }
      return new Response(JSON.stringify(allKotoba), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Action tidak dikenali. Gunakan: list, detail, export, all-kotoba' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan server.', detail: error.message }), { status: 500 });
  }
};

// POST: Tambah template baru
export const POST = async ({ request, url }) => {
  const action = url.searchParams.get('action');
  let data;

  // Parsing JSON dari request body
  try {
    data = await request.json();
  } catch (parseError) {
    return new Response(JSON.stringify({
      error: 'JSON tidak valid. Pastikan format file JSON benar.',
      detail: parseError.message
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Import semua template sekaligus
  if (action === 'importAll') {
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({
        error: 'Data import harus berupa array dari template.',
        detail: 'Format yang diharapkan: [{"nama": "...", "data_json": [...], ...}, ...]'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (data.length === 0) {
      return new Response(JSON.stringify({
        error: 'Array template kosong. Tidak ada data untuk diimport.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Validasi setiap template sebelum insert
    const validationErrors = [];
    data.forEach((tpl, i) => {
      if (!tpl.nama) validationErrors.push(`Template[${i}]: field 'nama' wajib diisi`);
      if (!tpl.data_json) validationErrors.push(`Template[${i}]: field 'data_json' wajib diisi`);
    });

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({
        error: 'Validasi gagal pada beberapa template.',
        detail: validationErrors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const stmt = db.prepare('INSERT INTO flashcard_template (nama, deskripsi, data_json, urutan) VALUES (?, ?, ?, ?)');
      let count = 0;
      const skipped = [];

      const transaction = db.transaction((templates) => {
        // Hapus semua template lama sebelum import
        db.prepare('DELETE FROM flashcard_template').run();

        for (let i = 0; i < templates.length; i++) {
          const tpl = templates[i];
          if (!tpl.nama || !tpl.data_json) {
            skipped.push(i);
            continue;
          }
          const jsonStr = typeof tpl.data_json === 'string' ? tpl.data_json : JSON.stringify(tpl.data_json);
          stmt.run(tpl.nama, tpl.deskripsi || '', jsonStr, tpl.urutan || 0);
          count++;
        }
      });

      transaction(data);

      const message = `${count} template berhasil diimport` + (skipped.length > 0 ? ` (${skipped.length} dilewati karena data tidak lengkap)` : '');
      return new Response(JSON.stringify({
        success: true,
        message,
        imported: count,
        skipped: skipped.length
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (dbError) {
      return new Response(JSON.stringify({
        error: 'Gagal menyimpan template ke database.',
        detail: dbError.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Tambah satu template
  const { nama, deskripsi, data_json, urutan } = data;

  if (!nama || !data_json) {
    return new Response(JSON.stringify({
      error: 'Field nama dan data_json wajib diisi'
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validasi format data_json
  try {
    const parsed = JSON.parse(typeof data_json === 'string' ? data_json : JSON.stringify(data_json));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Response(JSON.stringify({
        error: 'data_json harus berupa array JSON yang tidak kosong'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (jsonError) {
    return new Response(JSON.stringify({
      error: 'Format data_json tidak valid.',
      detail: jsonError.message
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Insert ke database
  try {
    const jsonStr = typeof data_json === 'string' ? data_json : JSON.stringify(data_json);
    const result = db.prepare(
      'INSERT INTO flashcard_template (nama, deskripsi, data_json, urutan) VALUES (?, ?, ?, ?)'
    ).run(nama, deskripsi || '', jsonStr, urutan || 0);

    return new Response(JSON.stringify({
      success: true,
      id: result.lastInsertRowid,
      message: `Template "${nama}" berhasil ditambahkan`
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (dbError) {
    return new Response(JSON.stringify({
      error: 'Gagal menyimpan template ke database.',
      detail: dbError.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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

// PUT: Perbarui template
export const PUT = async ({ request }) => {
  let data;

  try {
    data = await request.json();
  } catch (parseError) {
    return new Response(JSON.stringify({
      error: 'JSON tidak valid.',
      detail: parseError.message
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { id, nama, deskripsi, data_json, urutan } = data;

  if (!id || !nama || !data_json) {
    return new Response(JSON.stringify({
      error: 'Field id, nama, dan data_json wajib diisi'
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validasi format data_json
  try {
    const parsed = JSON.parse(typeof data_json === 'string' ? data_json : JSON.stringify(data_json));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Response(JSON.stringify({
        error: 'data_json harus berupa array JSON yang tidak kosong'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (jsonError) {
    return new Response(JSON.stringify({
      error: 'Format data_json tidak valid.',
      detail: jsonError.message
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Update ke database
  try {
    const jsonStr = typeof data_json === 'string' ? data_json : JSON.stringify(data_json);
    const result = db.prepare(
      'UPDATE flashcard_template SET nama = ?, deskripsi = ?, data_json = ?, urutan = ? WHERE id = ?'
    ).run(nama, deskripsi || '', jsonStr, urutan || 0, id);

    if (result.changes === 0) {
      return new Response(JSON.stringify({
        error: 'Template tidak ditemukan'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Template "${nama}" berhasil diperbarui`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (dbError) {
    return new Response(JSON.stringify({
      error: 'Gagal memperbarui template di database.',
      detail: dbError.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

