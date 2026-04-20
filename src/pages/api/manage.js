import db from '../../lib/db.js';

// GET: Ambil data berdasarkan query parameter
export const GET = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');

    // Daftar semua Day yang ada di database
    if (action === 'days') {
      const days = db.prepare(`
        SELECT hari, 
          (SELECT COUNT(*) FROM bunpou WHERE bunpou.hari = t.hari) as bunpou_count,
          (SELECT COUNT(*) FROM kanji WHERE kanji.hari = t.hari) as kanji_count,
          (SELECT COUNT(*) FROM kotoba WHERE kotoba.hari = t.hari) as kotoba_count
        FROM (
          SELECT DISTINCT hari FROM bunpou UNION SELECT DISTINCT hari FROM kanji UNION SELECT DISTINCT hari FROM kotoba
        ) t
        ORDER BY hari ASC
      `).all();
      return new Response(JSON.stringify(days), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Detail materi untuk Day tertentu
    if (action === 'detail') {
      const day = parseInt(url.searchParams.get('day') || '0');
      if (!day) return new Response(JSON.stringify({ error: 'Parameter day diperlukan' }), { status: 400 });

      const bunpou = db.prepare('SELECT * FROM bunpou WHERE hari = ? ORDER BY urutan_slide ASC').all(day);
      const kanji = db.prepare('SELECT * FROM kanji WHERE hari = ? ORDER BY urutan_slide ASC').all(day);
      const kotoba = db.prepare('SELECT * FROM kotoba WHERE hari = ? ORDER BY urutan_slide ASC').all(day);

      return new Response(JSON.stringify({ day, bunpou, kanji, kotoba }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Statistik umum
    if (action === 'stats') {
      const totalBunpou = db.prepare('SELECT COUNT(*) as c FROM bunpou').get().c;
      const totalKanji = db.prepare('SELECT COUNT(*) as c FROM kanji').get().c;
      const totalKotoba = db.prepare('SELECT COUNT(*) as c FROM kotoba').get().c;
      const totalDays = db.prepare('SELECT COUNT(DISTINCT hari) as c FROM (SELECT hari FROM bunpou UNION SELECT hari FROM kanji UNION SELECT hari FROM kotoba)').get().c;
      return new Response(JSON.stringify({ totalDays, totalBunpou, totalKanji, totalKotoba }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Action tidak dikenali' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// DELETE: Hapus data
export const DELETE = async ({ request }) => {
  try {
    const data = await request.json();
    const { action, day, table, id } = data;

    // Hapus seluruh materi untuk Day tertentu (bunpou + kanji + kotoba)
    if (action === 'delete_day') {
      if (!day) return new Response(JSON.stringify({ error: 'Parameter day diperlukan' }), { status: 400 });

      const deleteDayData = db.transaction(() => {
        const b = db.prepare('DELETE FROM bunpou WHERE hari = ?').run(day);
        const k = db.prepare('DELETE FROM kanji WHERE hari = ?').run(day);
        const kt = db.prepare('DELETE FROM kotoba WHERE hari = ?').run(day);
        return { bunpou: b.changes, kanji: k.changes, kotoba: kt.changes };
      });

      const result = deleteDayData();
      return new Response(JSON.stringify({
        success: true,
        message: `Day ${day} berhasil dihapus. (${result.bunpou} bunpou, ${result.kanji} kanji, ${result.kotoba} kotoba)`
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Hapus satu item spesifik dari tabel tertentu
    if (action === 'delete_item') {
      if (!table || !id) return new Response(JSON.stringify({ error: 'Parameter table dan id diperlukan' }), { status: 400 });

      const allowedTables = ['bunpou', 'kanji', 'kotoba'];
      if (!allowedTables.includes(table)) {
        return new Response(JSON.stringify({ error: 'Nama tabel tidak valid' }), { status: 400 });
      }

      const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      return new Response(JSON.stringify({
        success: true,
        message: `Item ID ${id} dari tabel ${table} berhasil dihapus. (${result.changes} baris)`
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Action tidak dikenali' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
