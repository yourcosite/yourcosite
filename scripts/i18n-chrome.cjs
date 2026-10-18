// Bygger lib/i18n/chrome/<språk>.json: alla texter som sajtens chrome
// (components/SitePreview.tsx, funktionerna som använder useSiteT) skriver ut,
// hämtade ur huvudordlistan <språk>.json. Saknas en text i huvudordlistan
// skrivs den ut så den kan översättas först.
// Användning: node scripts/i18n-chrome.cjs en [da fi ...]
const ts = require("typescript");
const fs = require("fs");
const file = "components/SitePreview.tsx";
const src = fs.readFileSync(file, "utf8");
const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const keys = new Set();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.body && /useSiteT\(\)/.test(node.body.getText())) {
    (function walk(n) {
      if (ts.isCallExpression(n) && n.expression.getText() === "t" && n.arguments.length) {
        const a = n.arguments[0];
        if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) keys.add(a.text);
      }
      ts.forEachChild(n, walk);
    })(node.body);
  }
  ts.forEachChild(node, visit);
}
visit(sf);
// Extra texter som serverkoden skickar fram men som visas i chromen.
for (const k of JSON.parse(fs.readFileSync("lib/i18n/chrome-extra.json", "utf8"))) keys.add(k);
for (const lang of process.argv.slice(2)) {
  const main = JSON.parse(fs.readFileSync(`lib/i18n/${lang}.json`, "utf8"));
  const out = {}; const missing = [];
  for (const k of [...keys].sort()) { if (main[k]) out[k] = main[k]; else missing.push(k); }
  fs.writeFileSync(`lib/i18n/chrome/${lang}.json`, JSON.stringify(out, null, 2) + "\n");
  console.log(lang, "nycklar:", keys.size, "saknas i huvudordlistan:", missing.length);
  if (missing.length) console.log(JSON.stringify(missing, null, 1));
}
