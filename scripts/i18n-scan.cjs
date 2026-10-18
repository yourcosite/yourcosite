// Hittar svenska texter i kod som ännu inte går genom t(...).
// Användning: node scripts/i18n-scan.cjs [--write] fil1 fil2 ...
// Utan --write skrivs bara en rapport. Med --write ersätts ren JSX-text och
// vanliga attribut (placeholder, title, alt, aria-label) med t("...") och
// "const t = useT()" / "const t = getT()" läggs in i komponenterna.
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const LITERALS = args.includes("--literals");
const forceIdx = args.indexOf("--force");
const FORCE = new Set(forceIdx >= 0 ? fs.readFileSync(args[forceIdx + 1], "utf8").split("\n").filter(Boolean) : []);
const files = args.filter((a, i) => !a.startsWith("--") && !(forceIdx >= 0 && i === forceIdx + 1));
const ATTRS = new Set(["placeholder", "title", "alt", "aria-label", "label", "description", "helperText", "subtitle", "heading", "cta", "buttonLabel"]);

const report = [];
let totalWrapped = 0;

function isTextual(s) {
  return /[A-Za-zÅÄÖåäöÉéÜüÆØæøß]/.test(s);
}
function norm(s) {
  return s.replace(/\s+/g, " ").trim();
}
function q(s) {
  return JSON.stringify(s);
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const isClient = /^\s*["']use client["']/m.test(src.slice(0, 400));
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = []; // {start,end,text}
  const needT = new Set(); // funktionsnoder som behöver t
  const manual = [];
  let needMsg = false;
  function skipLiteral(node) {
    const p = node.parent;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isJsxAttribute(p)) return true;
    if (ts.isPropertyAssignment(p) && p.name === node) return true;
    if (ts.isPropertyAssignment(p) && /^(type|kind|mode|status|role|id|key|href|src|url|path|className|method|variant|size|color|icon|slug|field|action|source|layout|align|plan|tab)$/.test(p.name.getText())) return true;
    if (ts.isElementAccessExpression(p) || ts.isCaseClause(p)) return true;
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(p.operatorToken.kind)) return true;
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText();
      if (/^console\./.test(callee) || /\.(includes|startsWith|endsWith|split|match|replace|test|indexOf|getItem|setItem|get|set|append)$/.test(callee) || callee === "fetch" || callee === "RegExp") return true;
    }
    // redan inpackad
    if (ts.isCallExpression(p) && /^(t|msg)$/.test(p.expression.getText())) return true;
    return false;
  }

  function enclosingComponent(node) {
    let n = node.parent;
    let found = null;
    while (n) {
      if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
        let name = null;
        if (ts.isFunctionDeclaration(n) && n.name) name = n.name.text;
        else if (n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) name = n.parent.name.text;
        else if (n.parent && ts.isCallExpression(n.parent)) {
          // memo(forwardRef(...)) – hoppa över
        }
        if (name && /^[A-Z]/.test(name)) found = n;
        else if (name && /^use[A-Z]/.test(name)) found = n;
      }
      n = n.parent;
    }
    // Yttersta komponenten (komponent i komponent är ovanligt, men en
    // yttre funktion som råkar heta med versal räcker för t i hela trädet)
    return found;
  }

  function addWrapEdit(node, start, end, text, key) {
    const comp = enclosingComponent(node);
    if (!comp) {
      manual.push({ line: sf.getLineAndCharacterOfPosition(start).line + 1, why: "utanför komponent", text: key });
      return;
    }
    needT.add(comp);
    edits.push({ start, end, text });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getText();
      if (isTextual(raw) && !/^[\s]*$/.test(raw)) {
        const parent = node.parent;
        // Blandad text + uttryck/element i samma förälder -> manuell
        const siblings = parent.children || [];
        const mixed = siblings.some(
          (c) => c !== node && ((ts.isJsxExpression(c) && c.expression) || ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) 
        );
        const textSiblings = siblings.filter((c) => ts.isJsxText(c) && isTextual(c.getText()) && c !== node);
        const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        if (mixed && /[a-zåäö]/i.test(raw)) {
          // Blandad: kan automatiseras om ENDAST texten står ensam mellan element (t.ex. <label>Text<input/></label>) - lämna manuellt
          manual.push({ line, why: "blandad text och uttryck/element", text: norm(raw) });
        } else {
          const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
          const key = norm(m[2]);
          if (key) {
            report.push(`${file}:${line}: ${key}`);
            addWrapEdit(node, node.getStart(), node.getEnd(), `${m[1]}{t(${q(key)})}${m[3]}`, key);
          }
        }
      }
    } else if (FORCE.size && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && FORCE.has(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${node.text.replace(/\n/g, "\\n").slice(0, 100)}`)) {
      const comp = enclosingComponent(node);
      if (comp) { needT.add(comp); edits.push({ start: node.getStart(), end: node.getEnd(), text: `t(${q(node.text)})` }); }
      else { needMsg = true; edits.push({ start: node.getStart(), end: node.getEnd(), text: `msg(${q(node.text)})` }); }
      report.push(`${file}: ${node.text.slice(0, 60)}`);
    } else if (LITERALS && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !skipLiteral(node)) {
      const v = node.text;
      const swedish = /[åäöÅÄÖ]/.test(v) || /\b(och|att|det|som|för|inte|din|dina|dig|vill|kan|har|till|från|sidan|sidor|konto|spara|skicka|välj|fel|ange|skriv|något)\b/i.test(v);
      if (swedish && /\s/.test(v) && v.length > 3 && !/^[a-z0-9\s:_\-\/\[\]\(\).#%]+$/.test(v)) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const comp = enclosingComponent(node);
        const fn = comp ? "t" : "msg";
        report.push(`${file}:${line}: [${fn}] ${v.replace(/\n/g, "\\n").slice(0, 100)}`);
        if (comp) { needT.add(comp); edits.push({ start: node.getStart(), end: node.getEnd(), text: `t(${q(v)})` }); }
        else { needMsg = true; edits.push({ start: node.getStart(), end: node.getEnd(), text: `msg(${q(v)})` }); }
      }
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ATTRS.has(node.name.getText())) {
      const v = node.initializer.text;
      if (isTextual(v) && /[A-Za-zÅÄÖåäö]{2,}/.test(v) && !/^[a-z0-9_\-:/.#]+$/.test(v)) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        report.push(`${file}:${line}: [${node.name.getText()}] ${v}`);
        addWrapEdit(node, node.initializer.getStart(), node.initializer.getEnd(), `{t(${q(v)})}`, v);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (manual.length) {
    for (const m of manual) report.push(`  MANUELLT ${file}:${m.line} (${m.why}): ${m.text}`);
  }

  if (WRITE && (edits.length || needMsg)) {
    let out = src;
    // Lägg in "const t = ..." i varje komponent som behöver det
    const compEdits = [];
    for (const comp of needT) {
      const body = comp.body;
      if (!body) continue;
      if (ts.isBlock(body)) {
        const hasT = /const\s+t\s*=\s*(useT|getT)\(/.test(body.getText().slice(0, 600));
        if (!hasT) compEdits.push({ start: body.getStart() + 1, end: body.getStart() + 1, text: `\n  const t = ${isClient ? "useT" : "getT"}();` });
      } else {
        report.push(`  MANUELLT ${file}: komponent med uttrycks-kropp behöver block: ${comp.getText().slice(0, 50)}`);
      }
    }
    const all = [...edits, ...compEdits].sort((a, b) => b.start - a.start);
    for (const e of all) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    // import
    if (needMsg && !/\bmsg\b.*from/.test(out)) out = out.replace(/^((?:\s*["']use client["'];?\s*\n)?)/, `$1import { msg } from "@/lib/i18n/config";\n`);
    const importLine = isClient
      ? `import { useT } from "@/components/I18nProvider";`
      : `import { getT } from "@/lib/i18n/server";`;
    const need = isClient ? "useT" : "getT";
    if (!new RegExp(`\\b${need}\\b.*from`).test(out)) {
      // efter "use client" och befintliga importer: lägg först efter direktivet
      if (/^\s*["']use client["'];?/.test(out)) {
        out = out.replace(/^(\s*["']use client["'];?\s*\n)/, `$1${importLine}\n`);
      } else {
        out = importLine + "\n" + out;
      }
    }
    fs.writeFileSync(file, out);
    totalWrapped += edits.length;
  }
}
console.log(report.join("\n"));
console.log(`\n${WRITE ? "Ersatte" : "Hittade"} ${report.filter((r) => !r.startsWith("  ")).length} texter, ${report.filter((r) => r.startsWith("  MANUELLT")).length} kräver handpåläggning.`);
