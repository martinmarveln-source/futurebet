const fs = require('fs');

try {
  const dump = fs.readFileSync('clean_development.sql', 'utf8');
  const lines = dump.split('\n');

  let schema = [];
  let data = {};
  let copyingTable = null;

  for (let line of lines) {
    if (line.startsWith('COPY ')) {
      const match = line.match(/COPY\s+(.+?)\s+FROM stdin;/);
      if (match) {
        copyingTable = match[1].replace(/"/g, ''); 
        data[copyingTable] = [];
        continue;
      }
    }
    
    if (copyingTable) {
      if (line.trim() === '\\.') {
        copyingTable = null;
        continue;
      }
      if (line.trim() === '') continue;
      
      const values = line.split('\t').map(val => {
        if (val === '\\N') return 'NULL';
        let unescaped = val.replace(/\\(.)/g, (match, p1) => {
          if (p1 === 'n') return '\n';
          if (p1 === 't') return '\t';
          if (p1 === 'r') return '\r';
          if (p1 === 'b') return '\b';
          if (p1 === 'f') return '\f';
          if (p1 === 'v') return '\v';
          if (p1 === '\\') return '\\';
          return p1;
        });
        const finalStr = unescaped.replace(/'/g, "''");
        return `'${finalStr}'`;
      });
      
      data[copyingTable].push(`INSERT INTO public."${copyingTable}" OVERRIDING SYSTEM VALUE VALUES (${values.join(', ')});`);
    } else {
      schema.push(line);
    }
  }

  // Ensure auth_users is inserted first to satisfy foreign key constraints
  const tables = Object.keys(data);
  const orderedTables = ['auth_users', ...tables.filter(t => t !== 'auth_users')];

  let out = [...schema];
  for (let t of orderedTables) {
    if (data[t]) {
      out.push(...data[t]);
    }
  }

  fs.writeFileSync('insert_development.sql', out.join('\n'));
  console.log("Successfully converted and reordered tables to satisfy foreign keys!");
} catch (e) {
  console.error("Error processing file:", e);
}
