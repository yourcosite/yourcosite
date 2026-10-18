// Lägger in översättningar i lib/i18n/<språk>.json.
// Användning: node scripts/i18n-merge.cjs <språk> <fil.json>
// fil.json: { "svensk text": "översättning", ... }. Nycklar som redan finns
// skrivs över; tomma värden hoppas över.
const fs = require("fs");
const [lang, file] = process.argv.slice(2);
const target = `lib/i18n/${lang}.json`;
const dict = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : {};
const add = JSON.parse(fs.readFileSync(file, "utf8"));
let n = 0;
for (const [k, v] of Object.entries(add)) { if (v) { dict[k] = v; n++; } }
const sorted = Object.fromEntries(Object.entries(dict));
fs.writeFileSync(target, JSON.stringify(sorted, null, 2) + "\n");
console.log(lang, "inlagda:", n, "totalt:", Object.keys(dict).length);
