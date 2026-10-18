// Gör om svenska mallsträngar till t("text med {namn}", { namn }):
//   `Gick inte att ladda upp ${file.name}: ${err.message}`
//   -> t("Gick inte att ladda upp {name}: {message}", { name: file.name, message: err.message })
// Hoppar över uttryck med villkor (?:) — de görs för hand.
// Användning: node scripts/i18n-templates.cjs fil1 fil2 ...  (utan --write: bara lista)
const ts = require("typescript");
const fs = require("fs");
const SV = /[åäöÅÄÖ]|\b(och|att|som|för|med|på|inte|är|har|ditt|din|dina|vi|ni|kan|till|från|ett|det|den|om|av|när|eller|vill|ska|här|inga|alla|bokning|sajt|sida)\b/i;
let total = 0;
for (const file of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  (function v(node) {
    if (ts.isTemplateExpression(node) && !ts.isTaggedTemplateExpression(node.parent)) {
      const parts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
      const all = parts.join(" ").trim();
      const skip = /className|style|rgba?\(|\bbg-|\btext-|Önskemål i chattredigeraren/.test(all);
      const complex = node.templateSpans.some((s) => ts.isConditionalExpression(s.expression) || ts.isBinaryExpression(s.expression) || ts.isCallExpression(s.expression) && /join|map/.test(s.expression.getText()));
      if (all.length > 3 && SV.test(all) && !skip && !complex && !ts.isJsxAttribute(node.parent)) {
        const used = new Set(); const vars = [];
        let text = node.head.text;
        node.templateSpans.forEach((sp, i) => {
          const e = sp.expression;
          let name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "v" + (i + 1);
          name = name.replace(/[^A-Za-z0-9_]/g, "");
          while (used.has(name)) name += "2";
          used.add(name);
          vars.push(name === e.getText() ? name : `${name}: ${e.getText()}`);
          text += `{${name}}` + sp.literal.text;
        });
        edits.push({ start: node.getStart(), end: node.getEnd(), text: `t(${JSON.stringify(text)}, { ${vars.join(", ")} })` });
      }
    }
    ts.forEachChild(node, v);
  })(sf);
  if (!edits.length) continue;
  let out = src;
  edits.sort((a, b) => b.start - a.start).forEach((e) => { out = out.slice(0, e.start) + e.text + out.slice(e.end); });
  fs.writeFileSync(file, out);
  total += edits.length;
  console.log(file, edits.length);
}
console.log("totalt", total);
