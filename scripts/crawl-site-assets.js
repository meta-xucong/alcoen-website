const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ORIGIN = "https://www.alcochrom.com";
const ROOT_DIR = path.resolve(__dirname, "..");
const REFERENCE_DIR = path.join(ROOT_DIR, "reference", "alcochrom");
const ASSET_OUTPUT_DIR = path.join(ROOT_DIR, "public", "assets", "alcochrom");

const PAGE_LIMIT = 800;
const ASSET_LIMIT = 3000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const languageJobs = [
  {
    code: "en",
    cookie: "lg=en",
    seeds: ["/", "/ABOUTen/", "/PRODUCTen/", "/NEWSen/", "/downloaden/", "/contacten/"]
  },
  {
    code: "zh",
    cookie: "lg=cn",
    seeds: ["/", "/about/", "/products/", "/news/", "/download/", "/contact/"]
  }
];

const assetExtPattern =
  /\.(?:css|js|mjs|png|jpe?g|gif|webp|svg|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|pdf|zip)$/i;

const htmlAttrPattern = /\b(?:href|src|data-src|data-background|poster|srcset)=["']([^"'<>]+)["']/gi;
const cssUrlPattern = /url\(([^)]+)\)/gi;

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const normalizeUrl = (rawUrl, baseUrl) => {
  if (!rawUrl) {
    return null;
  }
  const value = String(rawUrl).trim();
  if (!value || value.startsWith("#")) {
    return null;
  }
  if (/^(mailto:|tel:|javascript:)/i.test(value)) {
    return null;
  }

  let urlObj;
  try {
    urlObj = new URL(value, baseUrl);
  } catch (error) {
    return null;
  }

  if (urlObj.origin !== ORIGIN) {
    return null;
  }

  urlObj.hash = "";

  const rawSearch = urlObj.search || "";
  if (rawSearch.includes("p=/Do/area")) {
    return null;
  }

  return urlObj;
};

const safeLocalAssetPath = (urlObj) => {
  const cleanPath = (urlObj.pathname || "/").replace(/^\/+/, "");
  const parts = cleanPath.split("/").filter(Boolean);
  const safeParts = parts.map((seg) =>
    seg
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^_+/, "")
      .replace(/_+$/, "") || "x"
  );
  let relative = safeParts.join("/");
  if (!relative) {
    relative = "index.html";
  }

  if (urlObj.search) {
    const hash = crypto.createHash("md5").update(urlObj.search).digest("hex").slice(0, 8);
    const ext = path.extname(relative);
    if (ext) {
      relative = relative.slice(0, -ext.length) + "__" + hash + ext;
    } else {
      relative = relative + "__" + hash;
    }
  }
  return relative;
};

const safePagePath = (langCode, urlObj) => {
  const rawPath = urlObj.pathname || "/";
  let relative = rawPath;
  if (relative.endsWith("/")) {
    relative += "index.html";
  } else if (!path.extname(relative)) {
    relative += "/index.html";
  }
  relative = relative.replace(/^\/+/, "");
  const parts = relative.split("/").filter(Boolean);
  const safeParts = parts.map((seg) =>
    seg
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^_+/, "")
      .replace(/_+$/, "") || "x"
  );
  let safeRelative = safeParts.join("/");
  if (urlObj.search) {
    const hash = crypto.createHash("md5").update(urlObj.search).digest("hex").slice(0, 8);
    const ext = path.extname(safeRelative);
    safeRelative = safeRelative.slice(0, -ext.length) + "__" + hash + ext;
  }
  return path.join(REFERENCE_DIR, langCode, "pages", safeRelative);
};

const extractReferences = (text) => {
  const refs = new Set();
  let match = null;
  while ((match = htmlAttrPattern.exec(text))) {
    const raw = String(match[1] || "").trim();
    if (!raw) {
      continue;
    }
    if (raw.includes(",")) {
      raw
        .split(",")
        .map((chunk) => chunk.trim().split(/\s+/)[0])
        .filter(Boolean)
        .forEach((item) => refs.add(item));
      continue;
    }
    refs.add(raw);
  }

  while ((match = cssUrlPattern.exec(text))) {
    let raw = String(match[1] || "").trim();
    if (!raw) {
      continue;
    }
    raw = raw.replace(/^['"]|['"]$/g, "");
    if (!raw || raw.startsWith("data:")) {
      continue;
    }
    refs.add(raw);
  }

  return Array.from(refs);
};

const fetchWithRetries = async (url, headers, retries = 2) => {
  let lastErr = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "*/*",
          ...headers
        }
      });
      return response;
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr;
};

const isHtmlResponse = (contentType = "") => /text\/html|application\/xhtml\+xml/i.test(contentType);

const isCssResponse = (contentType = "") => /text\/css/i.test(contentType);

const isLikelyAssetUrl = (urlObj) => {
  const pathname = urlObj.pathname || "";
  return assetExtPattern.test(pathname);
};

const runLanguageCrawl = async (job) => {
  const pageQueue = [];
  const pageSeen = new Set();
  const assetSeen = new Set();
  const pages = [];
  const assets = [];

  const enqueuePage = (urlObj) => {
    const key = urlObj.toString();
    if (pageSeen.has(key)) {
      return;
    }
    if (pageSeen.size >= PAGE_LIMIT) {
      return;
    }
    pageSeen.add(key);
    pageQueue.push(urlObj);
  };

  const enqueueAsset = (urlObj) => {
    const key = urlObj.toString();
    if (assetSeen.has(key)) {
      return;
    }
    if (assetSeen.size >= ASSET_LIMIT) {
      return;
    }
    assetSeen.add(key);
    assets.push(urlObj);
  };

  for (const seed of job.seeds) {
    const urlObj = normalizeUrl(seed, ORIGIN);
    if (urlObj) {
      enqueuePage(urlObj);
    }
  }

  while (pageQueue.length) {
    const current = pageQueue.shift();
    const response = await fetchWithRetries(current.toString(), { Cookie: job.cookie });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      // ignore broken pages and continue crawling
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const destPath = safePagePath(job.code, current);
    ensureDir(path.dirname(destPath));
    fs.writeFileSync(destPath, bytes);
    pages.push({
      url: current.toString(),
      path: path.relative(REFERENCE_DIR, destPath).replace(/\\/g, "/"),
      contentType
    });

    if (!isHtmlResponse(contentType)) {
      continue;
    }

    const text = bytes.toString("utf8");
    const refs = extractReferences(text);
    for (const ref of refs) {
      const nextUrl = normalizeUrl(ref, current.toString());
      if (!nextUrl) {
        continue;
      }
      if (isLikelyAssetUrl(nextUrl)) {
        enqueueAsset(nextUrl);
      } else {
        enqueuePage(nextUrl);
      }
    }
  }

  for (const assetUrl of assets) {
    const response = await fetchWithRetries(assetUrl.toString(), { Cookie: job.cookie });
    if (!response.ok) {
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    const localRel = safeLocalAssetPath(assetUrl);
    const outputPath = path.join(ASSET_OUTPUT_DIR, localRel);
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, bytes);

    if (isCssResponse(contentType)) {
      const css = bytes.toString("utf8");
      const refs = extractReferences(css);
      for (const ref of refs) {
        const nextUrl = normalizeUrl(ref, assetUrl.toString());
        if (nextUrl && isLikelyAssetUrl(nextUrl)) {
          const key = nextUrl.toString();
          if (!assetSeen.has(key) && assetSeen.size < ASSET_LIMIT) {
            assetSeen.add(key);
            assets.push(nextUrl);
          }
        }
      }
    }
  }

  const manifestPath = path.join(REFERENCE_DIR, job.code, "manifest.json");
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        language: job.code,
        cookie: job.cookie,
        pageCount: pages.length,
        assetCount: assetSeen.size,
        pages
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    language: job.code,
    pageCount: pages.length,
    assetCount: assetSeen.size
  };
};

const main = async () => {
  ensureDir(REFERENCE_DIR);
  ensureDir(ASSET_OUTPUT_DIR);

  const summaries = [];
  for (const job of languageJobs) {
    // eslint-disable-next-line no-console
    console.log(`[crawl] start ${job.code}`);
    const result = await runLanguageCrawl(job);
    summaries.push(result);
    // eslint-disable-next-line no-console
    console.log(`[crawl] done ${job.code}: pages=${result.pageCount}, assets=${result.assetCount}`);
  }

  const reportPath = path.join(REFERENCE_DIR, "crawl-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        origin: ORIGIN,
        generatedAt: new Date().toISOString(),
        summaries
      },
      null,
      2
    ),
    "utf8"
  );

  // eslint-disable-next-line no-console
  console.log(`[crawl] report => ${reportPath}`);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[crawl] failed:", error);
  process.exitCode = 1;
});
