import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

try {
  const dbPath = path.resolve('db', 'database.sqlite');
  console.log('Menghubungkan ke database di:', dbPath);
  const db = new Database(dbPath);

  // Membaca file bunpo_rapi.json
  const rawData = readFileSync('rapihin/bunpo_rapi.json', 'utf-8');
  const templates = JSON.parse(rawData);

  console.log(`Membaca ${templates.length} template bunpo dari file.`);

  // Transaksi untuk menghapus data lama dan memasukkan data baru
  const insertStmt = db.prepare('INSERT INTO bunpo_template (nama, deskripsi, data_json, urutan) VALUES (?, ?, ?, ?)');
  
  const importTransaction = db.transaction(() => {
    // Kosongkan tabel bunpo_template terlebih dahulu
    db.prepare('DELETE FROM bunpo_template').run();
    console.log('Tabel bunpo_template dikosongkan.');

    let count = 0;
    for (const tpl of templates) {
      const dataJsonStr = JSON.stringify(tpl.data_json);
      insertStmt.run(tpl.nama, tpl.deskripsi || null, dataJsonStr, tpl.urutan || 0);
      count++;
    }
    return count;
  });

  const totalImported = importTransaction();
  console.log(`✅ Berhasil mengimport ${totalImported} template bunpo ke database SQLite.`);
} catch (error) {
  console.error('❌ Gagal melakukan import:', error);
}
