// Samlar alla texter som går genom t(...), msg(...) och rich(t, ...) och
// jämför med ordlistan för ett språk.
// Användning:
//   node scripts/i18n-keys.cjs en            -> visar hur många som saknas
//   node scripts/i18n-keys.cjs en --missing  -> skriver saknade nycklar som JSON (för översättning)
//   node scripts/i18n-keys.cjs en --unused   -> visar nycklar i ordlistan som inte längre finns i koden
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const lang = process.argv[2] || "en";
const mode = process.argv[3] || "";
const roots = ["app", "components", "lib"];
const keys = new Set();

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f.name)) scan(p);
  }
}
function scan(file) {
  const src = fs.readFileSync(file, "utf8");
  if (!/\b(t|te|msg|rich|getT)\(/.test(src)) return;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  (function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText();
      let arg = null;
      if ((callee === "t" || callee === "te" || callee === "msg" || callee === "getT()") && node.arguments.length >= 1) arg = node.arguments[0];
      else if (callee === "rich" && node.arguments.length >= 2) arg = node.arguments[1];
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) keys.add(arg.text);
    }
    ts.forEachChild(node, visit);
  })(sf);
}
for (const r of roots) if (fs.existsSync(r)) walk(r);

const dictPath = `lib/i18n/${lang}.json`;
const dict = fs.existsSync(dictPath) ? JSON.parse(fs.readFileSync(dictPath, "utf8")) : {};
const missing = [...keys].filter((k) => !(k in dict));
if (mode === "--missing") {
  const o = {};
  for (const k of missing) o[k] = "";
  console.log(JSON.stringify(o, null, 2));
} else if (mode === "--unused") {
  console.log(Object.keys(dict).filter((k) => !keys.has(k)).join("\n"));
} else {
  console.log(`${keys.size} texter i koden, ${missing.length} saknar översättning till ${lang}.`);
}
