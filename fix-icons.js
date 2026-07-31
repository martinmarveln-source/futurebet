const fs = require('fs');
const files = [
  'apps/web/src/components/Dashboard/FilterPanel.tsx',
  'apps/web/src/components/Dashboard/SocialLinks.tsx',
  'apps/web/src/components/Dashboard/StickySocialBar.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    let changed = false;

    // Add import if not exists
    if (!content.includes('SocialIcons') && (content.includes('<Facebook') || content.includes('<Youtube'))) {
      content = 'import { FacebookIcon, YoutubeIcon } from "@/components/SocialIcons";\n' + content;
      changed = true;
    }
    
    // Replace <Facebook with <FacebookIcon
    if (content.match(/<Facebook\s/g)) {
       content = content.replace(/<Facebook\s/g, '<FacebookIcon ');
       changed = true;
    }
    if (content.match(/<Youtube\s/g)) {
       content = content.replace(/<Youtube\s/g, '<YoutubeIcon ');
       changed = true;
    }
    
    // Remove from lucide-react import
    if (content.match(/Facebook,\s*/g)) {
       content = content.replace(/Facebook,\s*/g, '');
       changed = true;
    }
    if (content.match(/Youtube,\s*/g)) {
       content = content.replace(/Youtube,\s*/g, '');
       changed = true;
    }
    
    if (changed) {
       fs.writeFileSync(file, content);
       console.log('Fixed', file);
    }
  }
}
