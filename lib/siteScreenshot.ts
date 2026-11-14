import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// Tar en skärmdump (1200 x 630, JPEG) av en publicerad sajt med en riktig
// webbläsare. På Vercel används @sparticuz/chromium; lokalt kan man sätta
// CHROMIUM_PATH till en egen Chrome/Chromium. Cookiebannern döljs genom att
// besökarens val sätts till "bara nödvändiga" innan sidan laddas, så inga
// spårningskoder körs heller.
export async function screenshotUrl(url: string): Promise<Buffer> {
  const local = process.env.CHROMIUM_PATH;
  const browser = await puppeteer.launch(
    local
      ? { executablePath: local, headless: true, args: ["--no-sandbox", "--disable-gpu"], defaultViewport: { width: 1200, height: 630, deviceScaleFactor: 1 } }
      : {
          args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
          defaultViewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
          executablePath: await chromium.executablePath(),
          headless: "shell",
        }
  );
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      try { window.localStorage.setItem("yc_cookie_consent", "necessary"); } catch {}
    });
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 25000 });
    } catch {
      /* ta bilden ändå om sidan inte blev helt stilla */
    }
    await new Promise((r) => setTimeout(r, 1500));
    const shot = await page.screenshot({ type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    return Buffer.from(shot);
  } finally {
    await browser.close().catch(() => {});
  }
}
