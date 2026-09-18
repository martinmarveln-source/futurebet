const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/stats/insights/page.tsx', 'utf8');
code = code.replace(/import { useBetslipStore } from "\.\.\/\.\.\/\.\.\/store\/betslipStore";/, 'import useBetslipStore from "../../../store/betslipStore";');
fs.writeFileSync('apps/web/src/app/stats/insights/page.tsx', code);
console.log("Fixed import");
