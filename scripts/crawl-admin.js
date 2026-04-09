const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const USER_DATA_DIR = path.join(__dirname, "..", ".browser-profile");
const OUTPUT_DIR = path.join(__dirname, "..", "tmp-admin");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "https://www.alcochrom.com";

const targets = [
  { name: "home", url: `${BASE}/hsw025.php?p=/Index/home` },
  { name: "site-index", url: `${BASE}/hsw025.php?p=/Site/index` },
  { name: "company-index", url: `${BASE}/hsw025.php?p=/Company/index` },
  { name: "content-sort", url: `${BASE}/hsw025.php?p=/ContentSort/index` },
  { name: "single-index", url: `${BASE}/hsw025.php?p=/Single/index/mcode/1` },
  { name: "news-index", url: `${BASE}/hsw025.php?p=/Content/index/mcode/2` },
  { name: "product-index", url: `${BASE}/hsw025.php?p=/Content/index/mcode/3` },
  { name: "slide-index", url: `${BASE}/hsw025.php?p=/Slide/index` },
  { name: "link-index", url: `${BASE}/hsw025.php?p=/Link/index` }
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function savePage(page, name) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
  const html = await page.content();
  fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.html`), html, "utf8");
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}.png`), fullPage: true });
}

async function extractForms(page) {
  return page.evaluate(() => {
    const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
    const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
      action: form.getAttribute("action") || "",
      method: form.getAttribute("method") || "get",
      fields: Array.from(form.querySelectorAll("input, textarea, select")).map((field) => ({
        tag: field.tagName.toLowerCase(),
        type: field.getAttribute("type") || "",
        name: field.getAttribute("name") || "",
        id: field.id || "",
        placeholder: field.getAttribute("placeholder") || "",
        value: field.value || "",
        text: clean(field.textContent)
      }))
    }));

    const tables = Array.from(document.querySelectorAll("table")).slice(0, 5).map((table) => ({
      text: clean(table.innerText).slice(0, 4000)
    }));

    return {
      title: document.title,
      h1: clean(document.querySelector("h1") && document.querySelector("h1").innerText),
      legends: Array.from(document.querySelectorAll("legend")).map((item) => clean(item.innerText)),
      forms,
      tables
    };
  });
}

async function main() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CHROME_PATH,
    headless: true,
    viewport: { width: 1440, height: 960 },
    ignoreHTTPSErrors: true
  });

  const page = context.pages()[0] || (await context.newPage());
  const report = {};

  for (const target of targets) {
    await page.goto(target.url, { waitUntil: "domcontentloaded" });
    if ((await page.locator("#dologin").count()) > 0) {
      throw new Error(`Session is not logged in when visiting ${target.url}`);
    }
    await savePage(page, target.name);
    report[target.name] = await extractForms(page);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "crawl-report.json"), JSON.stringify(report, null, 2), "utf8");
  await context.close();
  console.log(`Crawled ${targets.length} admin pages.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
