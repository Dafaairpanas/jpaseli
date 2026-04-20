import db from '../../lib/db.js';

export const POST = async ({ request }) => {
  try {
    const data = await request.json();
    const { day, bunpou, kanji, kotoba } = data;

    if (!day) {
      return new Response(JSON.stringify({ error: "Kolom 'day' (hari) wajib diisi." }), { status: 400 });
    }

    // Insert statements
    const insertBunpou = db.prepare('INSERT INTO bunpou (hari, pola, penjelasan, contoh_kalimat, arti_contoh, urutan_slide) VALUES (?, ?, ?, ?, ?, ?)');
    const insertKanji = db.prepare('INSERT INTO kanji (hari, karakter, onyomi, kunyomi, arti, contoh_kata, cara_baca_contoh, arti_contoh, urutan_slide) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertKotoba = db.prepare('INSERT INTO kotoba (hari, kata, cara_baca, arti, urutan_slide) VALUES (?, ?, ?, ?, ?)');

    const processImport = db.transaction(() => {
      if (bunpou && Array.isArray(bunpou)) {
        for (const item of bunpou) {
          insertBunpou.run(day, item.pola, item.penjelasan, item.contoh_kalimat || null, item.arti_contoh || null, item.urutan_slide);
        }
      }
      if (kanji && Array.isArray(kanji)) {
        for (const item of kanji) {
          insertKanji.run(day, item.karakter, item.onyomi || '-', item.kunyomi || '-', item.arti, item.contoh_kata || null, item.cara_baca_contoh || null, item.arti_contoh || null, item.urutan_slide);
        }
      }
      if (kotoba && Array.isArray(kotoba)) {
        for (const item of kotoba) {
          insertKotoba.run(day, item.kata, item.cara_baca, item.arti, item.urutan_slide);
        }
      }
    });

    processImport();

    return new Response(JSON.stringify({ success: true, message: `Berhasil import data mater untuk Day ${day}! ✨` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
