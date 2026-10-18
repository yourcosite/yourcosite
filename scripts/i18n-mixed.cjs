// Gör om JSX där text blandas med länkar, fetstil eller värden
//   <p>Genom att logga in godkänner du våra <Link>villkor</Link> och {namn}.</p>
// till en enda översättningsbar mening:
//   <p>{rich(t, "Genom att logga in godkänner du våra <link>villkor</link> och {namn}.", { link: (c) => <Link>{c}</Link> }, { namn })}</p>
// Användning: node scripts/i18n-mixed.cjs [--write] fil1 fil2 ...
const ts = require("typescript");
const fs = require("fs");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const files = args.filter((a) => !a.startsWith("--"));
const report = [];
const ENT = { "&ldquo;": "\u201c", "&rdquo;": "\u201d", "&nbsp;": "\u00a0", "&middot;": "\u00b7", "&rsquo;": "\u2019", "&lsquo;": "\u2018", "&hellip;": "\u2026", "&mdash;": "\u2014", "&ndash;": "\u2013", "&amp;": "&", "&times;": "\u00d7", "&larr;": "\u2190", "&rarr;": "\u2192" };

function cleanJsxText(text) {
  // Samma regler som React: rader trimmas, tomma rader tas bort, rader slås ihop med mellanslag.
  const lines = text.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) lastNonEmpty = i;
  let str = "";
  for (let i = 0; i < lines.length; i++) {
    const isFirst = i === 0;
    const isLast = i === lines.length - 1;
    const isLastNonEmpty = i === lastNonEmpty;
    let trimmed = lines[i].replace(/\t/g, " ");
    if (!isFirst) trimmed = trimmed.replace(/^[ ]+/, "");
    if (!isLast) trimmed = trimmed.replace(/[ ]+$/, "");
    if (trimmed) {
      if (!isLastNonEmpty) trimmed += " ";
      str += trimmed;
    }
  }
  return str;
}

function isWrappedLiteral(expr) {
  // {t("...")} med ren sträng
  return (
    expr &&
    ts.isCallExpression(expr) &&
    expr.expression.getText() === "t" &&
    expr.arguments.length === 1 &&
    ts.isStringLiteral(expr.arguments[0])
  );
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  let usedRich = false;

  function enclosingComponent(node) {
    let n = node.parent;
    let found = null;
    while (n) {
      if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
        let name = null;
        if (ts.isFunctionDeclaration(n) && n.name) name = n.name.text;
        else if (n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) name = n.parent.name.text;
        if (name && /^[A-Z]/.test(name)) found = n;
      }
      n = n.parent;
    }
    return found;
  }

  function hasRawText(c) {
    return ts.isJsxText(c) && /[A-Za-zÅÄÖåäöÜüÉé]/.test(c.getText());
  }

  function convertParent(parent, children) {
    const hasRaw = children.some(hasRawText);
    if (!hasRaw) return false;
    const others = children.filter(
      (c) => !ts.isJsxText(c) && !(ts.isJsxExpression(c) && (isWrappedLiteral(c.expression) || (c.expression && ts.isStringLiteral(c.expression) && c.expression.text === " ")))
    );
    if (others.length === 0) return false; // ren text, redan hanterad
    // Bygg mall
    let tpl = "";
    const tags = []; // [name, source]
    const values = []; // [name, source]
    const usedNames = new Set();
    function uniq(base) {
      let n = base, i = 2;
      while (usedNames.has(n)) n = base + i++;
      usedNames.add(n);
      return n;
    }
    for (const c of children) {
      if (ts.isJsxText(c)) {
        tpl += cleanJsxText(src.slice(c.getFullStart(), c.getEnd()));
      } else if (ts.isJsxExpression(c)) {
        const e = c.expression;
        if (!e) continue;
        if (ts.isStringLiteral(e) && e.text === " ") tpl += " ";
        else if (isWrappedLiteral(e)) tpl += e.arguments[0].text;
        else {
          const base = ts.isIdentifier(e) ? e.text : "v";
          const name = uniq(base === "v" ? "v" + (values.length + 1) : base);
          values.push([name, e.getText()]);
          tpl += `{${name}}`;
        }
      } else if (ts.isJsxElement(c)) {
        // Inre element: bara text eller redan inpackad text som barn
        let inner = "";
        let ok = true;
        for (const ic of c.children) {
          if (ts.isJsxText(ic)) inner += cleanJsxText(src.slice(ic.getFullStart(), ic.getEnd()));
          else if (ts.isJsxExpression(ic) && ic.expression && isWrappedLiteral(ic.expression)) inner += ic.expression.arguments[0].text;
          else if (ts.isJsxExpression(ic) && ic.expression && ts.isStringLiteral(ic.expression) && ic.expression.text === " ") inner += " ";
          else ok = false;
        }
        if (!ok) {
          // Element med dynamiskt innehåll -> värde
          const name = uniq("v" + (values.length + 1));
          values.push([name, c.getText()]);
          tpl += `{${name}}`;
        } else {
          const tag = c.openingElement.tagName.getText().replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "x";
          const name = uniq(tag);
          const open = c.openingElement.getText();
          const close = c.closingElement.getText();
          tags.push([name, `(c) => ${open}{c}${close}`]);
          tpl += `<${name}>${inner}</${name}>`;
        }
      } else if (ts.isJsxSelfClosingElement(c)) {
        const name = uniq(c.tagName.getText().toLowerCase().replace(/[^a-z0-9]/g, "") || "x");
        values.push([name, c.getText()]);
        tpl += `{${name}}`;
      } else {
        return false;
      }
    }
    tpl = tpl.trim();
    for (const [k, v] of Object.entries(ENT)) tpl = tpl.split(k).join(v);
    if (!tpl) return false;
    const letters = tpl.replace(/\{\w+\}/g, "").replace(/<\/?\w+>/g, "").replace(/[^A-Za-zÅÄÖåäöÜüÉéß]/g, "");
    if (letters.length < 5 || /yourcosite\.com/.test(tpl)) return false;
    const comp = enclosingComponent(parent);
    if (!comp) {
      report.push(`${file}:${sf.getLineAndCharacterOfPosition(parent.getStart()).line + 1}: UTANFÖR KOMPONENT: ${tpl}`);
      return false;
    }
    const tagsArg = tags.length ? `{ ${tags.map(([n, s]) => `${n}: ${s}`).join(", ")} }` : "{}";
    const valsArg = values.length ? `, { ${values.map(([n, s]) => (n === s ? n : `${n}: ${s}`)).join(", ")} }` : "";
    const call = `{rich(t, ${JSON.stringify(tpl)}, ${tagsArg}${valsArg})}`;
    const first = children[0];
    const last = children[children.length - 1];
    // behåll inledande/avslutande radbrytning/indrag runt
    edits.push({ start: first.getFullStart(), end: last.getEnd(), text: call });
    usedRich = true;
    report.push(`${file}:${sf.getLineAndCharacterOfPosition(parent.getStart()).line + 1}: ${tpl}`);
    return true;
  }

  function visit(node) {
    if ((ts.isJsxElement(node) || ts.isJsxFragment(node)) && node.children.length) {
      const kids = Array.from(node.children);
      // trimma tomma text-ändar
      while (kids.length && ts.isJsxText(kids[0]) && !/\S/.test(kids[0].getText())) kids.shift();
      while (kids.length && ts.isJsxText(kids[kids.length - 1]) && !/\S/.test(kids[kids.length - 1].getText())) kids.pop();
      if (kids.length) {
        const did = convertParent(node, kids);
        if (did) return; // gå inte in i det som ersatts
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (WRITE && edits.length) {
    let out = src;
    edits.sort((a, b) => b.start - a.start);
    for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    if (usedRich && !/\brich\b.*from/.test(out)) {
      if (/^\s*["']use client["'];?/.test(out)) out = out.replace(/^(\s*["']use client["'];?\s*\n)/, `$1import { rich } from "@/lib/i18n/rich";\n`);
      else out = `import { rich } from "@/lib/i18n/rich";\n` + out;
    }
    fs.writeFileSync(file, out);
  }
}
console.log(report.join("\n"));
console.log(`\n${WRITE ? "Ersatte" : "Hittade"} ${report.length} blandade stycken.`);
