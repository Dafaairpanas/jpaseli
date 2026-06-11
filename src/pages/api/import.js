import db from '../../lib/db.js';

export const POST = async ({ request }) => {
  let rawBody;

  // Parsing JSON dari request body
  try {
    rawBody = await request.json();
  } catch (parseError) {
    return new Response(JSON.stringify({
      error: 'JSON tidak valid. Pastikan format JSON benar dan tidak ada koma/kutip berlebih.',
      detail: parseError.message
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { day, bunpou, kanji, kotoba } = rawBody;

  // Validasi field wajib
  if (!day || typeof day !== 'number' || day < 1) {
    return new Response(JSON.stringify({
      error: "Field 'day' wajib diisi dan harus berupa angka positif."
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validasi minimal harus ada satu kategori data
  const hasBunpou = bunpou && Array.isArray(bunpou) && bunpou.length > 0;
  const hasKanji = kanji && Array.isArray(kanji) && kanji.length > 0;
  const hasKotoba = kotoba && Array.isArray(kotoba) && kotoba.length > 0;

  if (!hasBunpou && !hasKanji && !hasKotoba) {
    return new Response(JSON.stringify({
      error: 'Minimal satu kategori data (bunpou, kanji, atau kotoba) harus diisi dan berupa array yang tidak kosong.'
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validasi field wajib di setiap item
  const validationErrors = [];

  if (hasBunpou) {
    bunpou.forEach((item, i) => {
      if (!item.pola) validationErrors.push(`bunpou[${i}]: field 'pola' wajib diisi`);
      if (item.urutan_slide == null) validationErrors.push(`bunpou[${i}]: field 'urutan_slide' wajib diisi`);
    });
  }

  if (hasKanji) {
    kanji.forEach((item, i) => {
      if (!item.karakter) validationErrors.push(`kanji[${i}]: field 'karakter' wajib diisi`);
      if (!item.arti) validationErrors.push(`kanji[${i}]: field 'arti' wajib diisi`);
      if (item.urutan_slide == null) validationErrors.push(`kanji[${i}]: field 'urutan_slide' wajib diisi`);
    });
  }

  if (hasKotoba) {
    kotoba.forEach((item, i) => {
      if (!item.kata) validationErrors.push(`kotoba[${i}]: field 'kata' wajib diisi`);
      if (!item.arti) validationErrors.push(`kotoba[${i}]: field 'arti' wajib diisi`);
      if (item.urutan_slide == null) validationErrors.push(`kotoba[${i}]: field 'urutan_slide' wajib diisi`);
    });
  }

  if (validationErrors.length > 0) {
    return new Response(JSON.stringify({
      error: 'Validasi gagal pada beberapa item.',
      detail: validationErrors
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Proses insert ke database
  try {
    const insertBunpou = db.prepare('INSERT INTO bunpou (hari, pola, penjelasan, contoh_kalimat, arti_contoh, urutan_slide) VALUES (?, ?, ?, ?, ?, ?)');
    const insertKanji = db.prepare('INSERT INTO kanji (hari, karakter, onyomi, kunyomi, arti, contoh_kata, cara_baca_contoh, arti_contoh, urutan_slide) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertKotoba = db.prepare('INSERT INTO kotoba (hari, kata, cara_baca, arti, urutan_slide) VALUES (?, ?, ?, ?, ?)');

    let insertedCount = { bunpou: 0, kanji: 0, kotoba: 0 };

    const processImport = db.transaction(() => {
      if (hasBunpou) {
        for (const item of bunpou) {
          insertBunpou.run(day, item.pola, item.penjelasan || null, item.contoh_kalimat || null, item.arti_contoh || null, item.urutan_slide);
          insertedCount.bunpou++;
        }
      }
      if (hasKanji) {
        for (const item of kanji) {
          insertKanji.run(day, item.karakter, item.onyomi || '-', item.kunyomi || '-', item.arti, item.contoh_kata || null, item.cara_baca_contoh || null, item.arti_contoh || null, item.urutan_slide);
          insertedCount.kanji++;
        }
      }
      if (hasKotoba) {
        for (const item of kotoba) {
          insertKotoba.run(day, item.kata, item.cara_baca || null, item.arti, item.urutan_slide);
          insertedCount.kotoba++;
        }
      }
    });

    processImport();

    return new Response(JSON.stringify({
      success: true,
      message: `Berhasil import data materi untuk Day ${day}! ✨`,
      detail: `${insertedCount.bunpou} bunpou, ${insertedCount.kanji} kanji, ${insertedCount.kotoba} kotoba ditambahkan.`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (dbError) {
    return new Response(JSON.stringify({
      error: 'Gagal menyimpan ke database.',
      detail: dbError.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
