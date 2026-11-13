// Kontrollerar att varje toppmapp/fil i app/ som blir en adress finns i
// lib/reservedSlugs.ts. Kör: node scripts/check-reserved-slugs.cjs
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../lib/reservedSlugs.ts"), "utf8");
const names = fs.readdirSync(path.join(__dirname, "../app"))
  .filter((n) => !n.startsWith("(") && !n.startsWith("[") && !n.startsWith("_") && !n.startsWith("@"))
  .map((n) => n.replace(/\.(tsx|ts|css)$/, ""))
  .filter((n) => !["layout", "page", "globals", "template", "loading"].includes(n));
const missing = [...new Set(names)].filter((n) => !src.includes(`"${n}"`));
if (missing.length) { console.error("Saknas i RESERVED_SLUGS:", missing.join(", ")); process.exit(1); }
console.log("OK, alla", names.length, "namn finns med.");
