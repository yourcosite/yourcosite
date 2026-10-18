// Packar in svenska felmeddelanden i API-rutter med t(...):
//   NextResponse.json({ error: "Text" })  ->  { error: t("Text") }
//   fail("Text") / bad("Text")           ->  fail(t("Text"))
// och lägger in "const t = getT();" överst i varje hanterare som behöver det.
// Användning: node scripts/i18n-errors.cjs fil1 fil2 ...
const ts = require("typescript");
const fs = require("fs");
let total = 0;
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = []; const needT = new Set();
  const isSv = (s) => /[A-Za-zÅÄÖåäö]/.test(s) && s.length > 2;
  function encl(node) {
    let n = node.parent;
    while (n) {
      if ((ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.body && ts.isBlock(n.body)) return n;
      n = n.parent;
    }
    return null;
  }
  function wrap(lit) {
    const text = lit.text;
    if (!isSv(text)) return;
    const fn = encl(lit);
    if (!fn) return;
    edits.push({ start: lit.getStart(), end: lit.getEnd(), text: `t(${JSON.stringify(text)})` });
    needT.add(fn);
    total++;
  }
  (function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText() === "error" && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) wrap(node.initializer);
    if (ts.isCallExpression(node) && /^(fail|bad|jsonError|err)$/.test(node.expression.getText())) {
      const a = node.arguments[0];
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) wrap(a);
    }
    ts.forEachChild(node, visit);
  })(sf);
  if (!edits.length) continue;
  for (const fn of needT) {
    const hasT = /const t = getT\(\)|let t = getT\(\)/.test(fn.body.getText());
    if (!hasT) edits.push({ start: fn.body.getStart() + 1, end: fn.body.getStart() + 1, text: "\n  const t = getT();" });
  }
  let out = src;
  edits.sort((a, b) => b.start - a.start).forEach((e) => { out = out.slice(0, e.start) + e.text + out.slice(e.end); });
  if (!/from "@\/lib\/i18n\/server"/.test(out)) out = `import { getT } from "@/lib/i18n/server";\n` + out;
  fs.writeFileSync(file, out);
  console.log(file, edits.length);
}
console.log("totalt", total);
