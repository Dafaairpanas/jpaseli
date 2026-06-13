import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync('rapihin/bunpo.json', 'utf-8');

// Split multiple JSON arrays yang ditumpuk
const arrays = [];
let depth = 0;
let start = -1;
for (let i = 0; i < raw.length; i++) {
  if (raw[i] === '[' && depth === 0) { start = i; depth++; }
  else if (raw[i] === '[') { depth++; }
  else if (raw[i] === ']') {
    depth--;
    if (depth === 0 && start !== -1) {
      arrays.push(JSON.parse(raw.substring(start, i + 1)));
      start = -1;
    }
  }
}

console.log(`Ditemukan ${arrays.length} array JSON`);
arrays.forEach((arr, i) => console.log(`  Array ${i+1}: ${arr.length} pola`));

// Kelompokkan berdasarkan kategori yang ada
const kategoriMap = {};
for (const arr of arrays) {
  for (const item of arr) {
    const kat = item.kategori || 'Lainnya';
    if (!kategoriMap[kat]) kategoriMap[kat] = [];
    kategoriMap[kat].push(item);
  }
}

console.log(`\nDitemukan ${Object.keys(kategoriMap).length} kategori unik:`);
Object.entries(kategoriMap).forEach(([k, v]) => console.log(`  - ${k}: ${v.length} pola`));

// Bagi ke template per kelompok tematik
const templates = [
  {
    nama: "Bab 1 - Pola Dasar & Identitas",
    deskripsi: "Pola kalimat dasar (は～です, じゃありません, ですか), kata tunjuk, ungkapan konfirmasi",
    urutan: 1,
    kategoris: ["Pola Dasar", "Kata Tunjuk Benda", "Kata Tunjuk Tempat", "Ungkapan Dasar"]
  },
  {
    nama: "Bab 2 - Waktu & Perpindahan",
    deskripsi: "Keterangan waktu, partikel から・まで, perpindahan lokasi (へ行きます), transportasi (で), teman (と)",
    urutan: 2,
    kategoris: ["Waktu", "Waktu & Tempat", "Kalimat Perpindahan", "Konjugasi Kata Kerja"]
  },
  {
    nama: "Bab 3 - Partikel & Tindakan",
    deskripsi: "Partikel を, で, ajakan (ませんか・ましょう), sarana/alat, pemberian & penerimaan",
    urutan: 3,
    kategoris: ["Objek Tindakan", "Keterangan Tempat", "Ajakan", "Sarana / Alat", "Pemberian", "Penerimaan", "Aspek Waktu"]
  },
  {
    nama: "Bab 4 - Kata Sifat & Konjungsi",
    deskripsi: "Kata sifat い dan な (positif, negatif), konjungsi (そして, が), preferensi (すき・きらい)",
    urutan: 4,
    kategoris: ["Kata Sifat", "Kata Tanya", "Konjungsi", "Preferensi", "Kemampuan & Kepemilikan", "Kata Keterangan", "Sebab Akibat"]
  },
  {
    nama: "Bab 5 - Keberadaan & Bilangan",
    deskripsi: "Pola あります・います, posisi (上・下・中), partikel penyambung や, counter, frekuensi",
    urutan: 5,
    kategoris: ["Keberadaan", "Partikel Penyambung", "Kata Bantu Bilangan", "Durasi Waktu", "Frekuensi"]
  },
  {
    nama: "Bab 6 - Aspek Lampau & Perbandingan",
    deskripsi: "Bentuk lampau (でした, かったです), perbandingan (より), superlatif (いちばん), keinginan (ほしい・たい)",
    urutan: 6,
    kategoris: ["Aspek Lampau", "Perbandingan", "Superlatif", "Keinginan", "Tujuan Pergerakan"]
  },
  {
    nama: "Bab 7 - Bentuk Te & Aturan",
    deskripsi: "Bentuk て (instruksi, progresif, keadaan), izin (てもいいです), larangan (てはいけません), kewajiban (なければなりません)",
    urutan: 7,
    kategoris: ["Instruksi", "Aspek Progresif", "Penawaran", "Izin", "Larangan", "Keadaan", "Instruksi Negatif", "Kewajiban", "Kelonggaran", "Penekanan Topik"]
  },
  {
    nama: "Bab 8 - Pola Lanjutan",
    deskripsi: "Urutan kejadian (て・てから), kemampuan (ことができます), pengalaman (たことがあります), opini (と思います), pengandaian (たら), pertentangan (ても)",
    urutan: 8,
    kategoris: ["Urutan Kejadian", "Deskripsi", "Kemampuan", "Hobi", "Keterangan Waktu", "Pengalaman", "Aktivitas Acak", "Perubahan Keadaan", "Gaya Bahasa", "Opini", "Kutipan", "Keberadaan & Acara", "Konfirmasi", "Modifikasi Benda", "Kondisional / Fakta", "Pemberian Jasa", "Penerimaan Jasa", "Pengandaian", "Pertentangan"]
  }
];

// Kumpulkan semua pola dari semua array ke satu flat list
const allPola = [];
for (const arr of arrays) {
  for (const item of arr) {
    allPola.push(item);
  }
}
console.log(`\nTotal semua pola: ${allPola.length}`);

// Assign pola ke template berdasarkan kategori
const usedIndices = new Set();
const result = [];

for (const tpl of templates) {
  const data = [];
  for (let i = 0; i < allPola.length; i++) {
    if (usedIndices.has(i)) continue;
    const item = allPola[i];
    if (tpl.kategoris.includes(item.kategori)) {
      data.push(item);
      usedIndices.add(i);
    }
  }
  if (data.length > 0) {
    result.push({
      nama: tpl.nama,
      deskripsi: tpl.deskripsi,
      urutan: tpl.urutan,
      data_json: data
    });
    console.log(`  ${tpl.nama}: ${data.length} pola`);
  }
}

// Cek pola yang belum ter-assign
const unassigned = [];
for (let i = 0; i < allPola.length; i++) {
  if (!usedIndices.has(i)) {
    unassigned.push(allPola[i]);
    console.log(`  ⚠ Belum ter-assign: "${allPola[i].pola}" (kategori: ${allPola[i].kategori})`);
  }
}

if (unassigned.length > 0) {
  // Tambahkan ke template terakhir
  result[result.length - 1].data_json.push(...unassigned);
  console.log(`  → Ditambahkan ${unassigned.length} pola ke template terakhir`);
}

// Write output
writeFileSync('rapihin/bunpo_rapi.json', JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n✅ File berhasil disimpan: rapihin/bunpo_rapi.json`);
console.log(`   Total template: ${result.length}`);
console.log(`   Total pola: ${result.reduce((s, t) => s + t.data_json.length, 0)}`);
