// Kontrollerar att varje layout i lib/contentModel.ts finns i
// lib/sectionCatalog.ts (mallgalleriet). Kör: node scripts/check-section-catalog.cjs
const fs = require("fs");
const model = fs.readFileSync(__dirname + "/../lib/contentModel.ts", "utf8");
const cat = fs.readFileSync(__dirname + "/../lib/sectionCatalog.ts", "utf8");
const ids = new Set();
for (const m of model.matchAll(/export type (?:Hero|About|Grid|Testimonials|Cta|Contact|Faq|Booking|Map|Image|Gallery|Team|ContactForm|Menu|Fixtures)Layout =([^;]+);/g)) {
  for (const x of m[1].matchAll(/"([a-z-]+)"/g)) ids.add(x[1]);
}
const missing = [...ids].filter((id) => !cat.includes(`"${id}"`));
if (missing.length) { console.error("Saknas i katalogen:", missing.join(", ")); process.exit(1); }
console.log("OK, katalogen täcker", ids.size, "layoutnamn.");
