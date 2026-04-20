import Database from 'better-sqlite3';
import path from 'path';

// Mendapatkan path database file (gunakan process.cwd() agar aman jika dipanggil di dalam file Astro)
const dbPath = path.resolve(process.cwd(), 'db', 'database.sqlite');
const db = new Database(dbPath);

export default db;
