const fs = require('fs');

try {
  const dump = fs.readFileSync('development.sql', 'utf8');
  const lines = dump.split('\n');

  const cleanLines = lines.filter(line => {
    // Remove commands that cause permission errors on managed databases
    if (line.startsWith('ALTER TABLE ') && line.includes(' OWNER TO ')) return false;
    if (line.startsWith('ALTER SEQUENCE ') && line.includes(' OWNER TO ')) return false;
    if (line.startsWith('ALTER DEFAULT PRIVILEGES ')) return false;
    if (line.startsWith('GRANT ')) return false;
    if (line.startsWith('REVOKE ')) return false;
    if (line.startsWith('CREATE ROLE ')) return false;
    if (line.startsWith('ALTER ROLE ')) return false;
    return true;
  });

  fs.writeFileSync('clean_development.sql', cleanLines.join('\n'));
  console.log("Successfully created clean_development.sql! (Removed " + (lines.length - cleanLines.length) + " permission lines)");
} catch (e) {
  console.error("Error processing file:", e);
}
