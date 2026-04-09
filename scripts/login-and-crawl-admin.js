const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ADMIN_URL = "https://www.alcochrom.com/hsw025.php";
const BASE = "https://www.alcochrom.com";
const USER_DATA_DIR = path.join(__dirname, "..", ".browser-profile-live");
const OUTPUT_DIR = path.join(__dirname, "..", "tmp-admin");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const username = process.env.ADMIN_USER || "";
const password = process.env.ADMIN_PASS || "";

if (!username || !password) {
  console.error("Missing ADMIN_USER or ADMIN_PASS environment variables.");
  process.exit(1);
}

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

fs.mkdirSync(USER_DATA_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function dumpPage(page, name) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
  const html = await page.content();
  fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.html`), html, "utf8");
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}.png`), fullPage: true });
}

async function extractForms(page) {
  return page.evaluate(() => {
    const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
    return {
      title: document.title,
      text: clean(document.body.innerText).slice(0, 8000),
      forms: Array.from(document.querySelectorAll("form")).map((form) => ({
        action: form.getAttribute("action") || "",
        method: form.getAttribute("method") || "get",
        fields: Array.from(form.querySelectorAll("input, textarea, select")).map((field) => ({
          tag: field.tagName.toLowerCase(),
          type: field.getAttribute("type") || "",
          name: field.getAttribute("name") || "",
          id: field.id || "",
          placeholder: field.getAttribute("placeholder") || "",
          value: field.value || ""
        }))
      }))
    };
  });
}

async function main() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CHROME_PATH,
    headless: false,
    viewport: { width: 1440, height: 960 },
    ignoreHTTPSErrors: true
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded" });

  if (await page.locator("#username").count()) {
    await page.fill("#username", username);
    await page.fill("#password", password);
    await dumpPage(page, "login-prefilled-live");
    console.log("Captcha needed. Please solve the captcha and click login in the opened browser.");
    await page.waitForFunction(
      () => !document.querySelector("#dologin"),
      null,
      { timeout: 600000 }
    );
  }

  const report = {};
  for (const target of targets) {
    await page.goto(target.url, { waitUntil: "domcontentloaded" });
    if (await page.locator("#dologin").count()) {
      throw new Error(`Session lost at ${target.url}`);
    }
    await dumpPage(page, target.name);
    report[target.name] = await extractForms(page);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "crawl-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`Crawled ${targets.length} admin pages to ${OUTPUT_DIR}`);
  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
