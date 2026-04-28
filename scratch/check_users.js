import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = '/var/www/dadanggeun/backend/database.sqlite';
const db = new sqlite3.Database(dbPath);

console.log('--- User List ---');
db.all('SELECT id, login_id, profile_name, role FROM users', [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
