const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/page.tsx', 'utf8');

// Import the widget
const importTarget = `import useUserPermissions from "@/hooks/useUserPermissions";`;
const importReplace = `import useUserPermissions from "@/hooks/useUserPermissions";\nimport SystemHealthWidget from "@/components/Dashboard/SystemHealthWidget";`;

if (code.includes(importTarget)) {
  code = code.replace(importTarget, importReplace);
}

// Inject the widget next to the Match Engine widget
const widgetTarget = `<div className="flex flex-col justify-center min-w-[100px] border-l border-slate-200 dark:border-white/10 pl-4 sm:pl-8">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Clearance
                    </div>`;

const widgetReplace = `<SystemHealthWidget darkMode={darkMode} />
                    <div className="flex flex-col justify-center min-w-[100px] border-l border-slate-200 dark:border-white/10 pl-4 sm:pl-8">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Clearance
                    </div>`;

if (code.includes(widgetTarget)) {
  code = code.replace(widgetTarget, widgetReplace);
} else {
  // LF
  const targetLF = widgetTarget.replace(/\r\n/g, '\n');
  if (code.includes(targetLF)) {
    code = code.replace(targetLF, widgetReplace);
  }
}

fs.writeFileSync('apps/web/src/app/page.tsx', code);
console.log("✅ Injected SystemHealthWidget into Command Center");
