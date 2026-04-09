const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ADMIN_URL = "https://www.alcochrom.com/hsw025.php";
const USER_DATA_DIR = path.join(__dirname, "..", ".browser-profile");
const OUTPUT_DIR = path.join(__dirname, "..", "tmp-admin");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const username = process.env.ADMIN_USER || "";
const password = process.env.ADMIN_PASS || "";

if (!username || !password) {
  console.error("Missing ADMIN_USER or ADMIN_PASS environment variables.");
  process.exit(1);
}

fs.mkdirSync(USER_DATA_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function dumpPage(page, suffix) {
  const safeSuffix = suffix.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  const html = await page.content();
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${safeSuffix}.png`), fullPage: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, `${safeSuffix}.html`), html, "utf8");
}

async function summarizeMenus(page) {
  return page.evaluate(() => {
    const text = (node) => (node ? (node.textContent || "").replace(/\s+/g, " ").trim() : "");
    const links = Array.from(document.querySelectorAll("a"));
    return links
      .map((link) => ({
        text: text(link),
        href: link.getAttribute("href") || ""
      }))
      .filter((item) => item.text || item.href)
      .slice(0, 300);
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

  const loginField = page.locator("#username");
  await loginField.waitFor({ timeout: 15000 });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await dumpPage(page, "login-prefilled");

  console.log("Login page is ready. Please solve the captcha and click the login button in the opened browser.");

  try {
    await page.waitForFunction(
      () => {
        const url = location.href;
        const loginForm = document.querySelector("#dologin");
        return !loginForm || !/hsw025\.php($|\?)/.test(url) || document.body.innerText.includes("退出") || document.body.innerText.includes("欢迎");
      },
      { timeout: 300000 }
    );
  } catch (error) {
    console.error("Timed out waiting for a successful login.");
    await dumpPage(page, "login-timeout");
    await context.close();
    process.exit(1);
  }

  await page.waitForLoadState("networkidle").catch(() => {});
  await dumpPage(page, "after-login");

  const menus = await summarizeMenus(page);
  fs.writeFileSync(path.join(OUTPUT_DIR, "menus.json"), JSON.stringify(menus, null, 2), "utf8");
  console.log(`Login success. Saved page dumps to ${OUTPUT_DIR}`);

  // Keep the logged-in browser available for follow-up exploration.
  console.log("The browser will stay open for follow-up inspection. Close it manually when we are done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
