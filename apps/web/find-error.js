const fs = require('fs');
const sql = fs.readFileSync('../../insert_development.sql', 'utf8');
const pos = 24811;
console.log("Characters around error:");
console.log(sql.substring(pos - 100, pos + 100));
