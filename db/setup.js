import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Pastikan folder db ada
const dbDir = path.resolve('./db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'database.sqlite'));

// Buat skema
db.exec(`
  CREATE TABLE IF NOT EXISTS bunpou (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hari INTEGER NOT NULL,
      pola TEXT NOT NULL,
      penjelasan TEXT,
      contoh_kalimat TEXT,
      arti_contoh TEXT,
      urutan_slide INTEGER
  );

  CREATE TABLE IF NOT EXISTS kanji (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hari INTEGER NOT NULL,
      karakter TEXT NOT NULL,
      onyomi TEXT,
      kunyomi TEXT,
      arti TEXT,
      contoh_kata TEXT,
      cara_baca_contoh TEXT,
      arti_contoh TEXT,
      urutan_slide INTEGER
  );

  CREATE TABLE IF NOT EXISTS kotoba (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hari INTEGER NOT NULL,
      kata TEXT NOT NULL,
      cara_baca TEXT,
      arti TEXT,
      urutan_slide INTEGER
  );
`);

// Hapus data lama agar saat di-rerun tidak dobel
db.exec('DELETE FROM bunpou; DELETE FROM kanji; DELETE FROM kotoba;');

// Insert Data Dummy Day 1
const insertBunpou = db.prepare('INSERT INTO bunpou (hari, pola, penjelasan, contoh_kalimat, arti_contoh, urutan_slide) VALUES (?, ?, ?, ?, ?, ?)');
const insertKanji = db.prepare('INSERT INTO kanji (hari, karakter, onyomi, kunyomi, arti, contoh_kata, cara_baca_contoh, arti_contoh, urutan_slide) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertKotoba = db.prepare('INSERT INTO kotoba (hari, kata, cara_baca, arti, urutan_slide) VALUES (?, ?, ?, ?, ?)');

// Transaksi untuk memastikan data masuk dengan rapi
db.transaction(() => {
  // === DAY 1 ===
  // 1. Bunpou
  insertBunpou.run(1, 'Nです / N1はN2です', 'Pola kalimat dasar. "Nです" untuk identitas. "N1はN2です" berarti "N1 adalah N2". Partikel "は" penanda subjek.', '私はマルシアです。', 'Saya adalah Marcia.', 1);
  insertBunpou.run(1, '【場所】から来ました', 'Menyatakan asal tempat, daerah, atau negara. から (kara) berarti "dari", dan 来ました (kimashita) berarti "berasal/datang".', 'インドネシアから来ました。', '(Saya) berasal dari Indonesia.', 3);

  // 2. Kanji
  insertKanji.run(1, '年', 'ネン', 'とし', 'Tahun', '去年', 'きょねん', 'Tahun lalu', 2);
  insertKanji.run(1, '週', 'シュウ', '-', 'Minggu / Pekan', '先週', 'せんしゅう', 'Minggu lalu', 4);
  insertKanji.run(1, '学', 'ガク', 'まな(ぶ)', 'Belajar / Ilmu', '学生', 'がくせい', 'Siswa / Pelajar', 5);

  // 3. Kotoba (Kosakata)
  let urutan = 6;
  const kotobas = [
    ['ここ', 'ここ', 'di sini'],
    ['名前', 'なまえ', 'nama'],
    ['部屋', 'へや', 'kamar / ruangan'],
    ['傘', 'かさ', 'payung'],
    ['友だち', 'ともだち', 'teman'],
    ['家族', 'かぞく', 'keluarga'],
    ['それから', 'それから', 'kemudian / lalu'],
    ['うどん', 'うどん', 'mi udon'],
    ['カレー', 'カレー', 'kari'],
    ['牛丼', 'ぎゅうどん', 'mangkuk daging sapi (beef bowl)'],
    ['刺身', 'さしみ', 'sashimi (potongan ikan mentah)'],
    ['すし', 'すし', 'sushi'],
    ['そば', 'そば', 'mi soba'],
    ['食べ物', 'たべもの', 'makanan'],
    ['ラーメン', 'ラーメン', 'mi ramen']
  ];
  
  kotobas.forEach(k => {
    insertKotoba.run(1, k[0], k[1], k[2], urutan++);
  });
})();

console.log("Database SQLite berhasil dibuat dengan materi Day 1!");
db.close();
