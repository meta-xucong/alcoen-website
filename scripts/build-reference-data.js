const fs = require("fs");
const path = require("path");
const https = require("https");

const root = "E:/AI/www.alcochrom.cn";
const base = "https://www.alcochrom.com";

const decodeEntities = (value) =>
  String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value) =>
  decodeEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

const toAbsoluteUrl = (url) => {
  if (!url) {
    return "";
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const fetchHtml = (urlPath) =>
  new Promise((resolve, reject) => {
    https
      .get(`${base}${urlPath}`, (res) => {
        let html = "";
        res.on("data", (chunk) => {
          html += chunk;
        });
        res.on("end", () => resolve(html));
      })
      .on("error", reject);
  });

const getMeta = (html, name) => {
  const match = html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([\\s\\S]*?)"`, "i"));
  return decodeEntities((match && match[1]) || "").trim();
};

const extractParagraphs = (htmlChunk) => {
  const rows = [];
  const regex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match = regex.exec(htmlChunk);
  while (match) {
    const text = stripHtml(match[1]).replace(/\s+/g, " ").trim();
    if (text && text !== "-") {
      rows.push(text);
    }
    match = regex.exec(htmlChunk);
  }
  return rows;
};

const categoryMap = {
  "25": "pharmaceutical",
  "22": "column",
  "23": "silica",
  "24": "accessories"
};

const categoryNameMap = {
  pharmaceutical: "Pharmaceutical",
  column: "Column",
  silica: "Silica",
  accessories: "Accessories"
};

const build = async () => {
  const [home, about, contactPage, downloadPage, newsPage] = await Promise.all([
    fetchHtml("/"),
    fetchHtml("/ABOUTen/"),
    fetchHtml("/contacten/"),
    fetchHtml("/downloaden/"),
    fetchHtml("/NEWSen/")
  ]);

  const title = stripHtml((home.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "ALCOEN");

  const heroSlides = [...home.matchAll(/class="a-b a-b1" style="background-image: url\(([^)]+)\);"/gi)].map((m) => ({
    title: "",
    subtitle: "",
    image: toAbsoluteUrl(m[1]),
    buttonText: "",
    buttonLink: "/products"
  }));

  const categories = [...home.matchAll(/<li><a href="\/list_(\d+)\/">([\s\S]*?)<\/a><\/li>/gi)].map((m) => {
    const categorySlug = categoryMap[m[1]] || slugify(stripHtml(m[2]));
    return {
      name: stripHtml(m[2]),
      slug: categorySlug
    };
  });

  const productCardRegex =
    /<div class="swiper-slide b-o teaser">\s*<a href="([^"]+)" class="b-f">[\s\S]*?<img src="([^"]+)" alt="([^"]*)" class="b-h">[\s\S]*?<div class="b-j">([\s\S]*?)<\/div>[\s\S]*?<div class="b-k">([\s\S]*?)<\/div>/gi;
  const productCards = [];
  let cardMatch = productCardRegex.exec(home);
  while (cardMatch) {
    productCards.push({
      href: cardMatch[1],
      image: toAbsoluteUrl(cardMatch[2]),
      alt: stripHtml(cardMatch[3]),
      name: stripHtml(cardMatch[4]),
      summary: stripHtml(cardMatch[5])
    });
    cardMatch = productCardRegex.exec(home);
  }

  const detailByHref = {};
  for (const card of productCards) {
    const html = await fetchHtml(card.href);
    const metaDescription = getMeta(html, "description");
    const detailImage = toAbsoluteUrl((html.match(/<img src="([^"]+)" alt="" class="k-e">/i) || [])[1] || card.image);
    detailByHref[card.href] = {
      description: metaDescription || card.summary,
      detailImage
    };
  }

  const products = productCards.map((card) => {
    const listMatch = card.href.match(/\/list_(\d+)\//);
    const categorySlug = categoryMap[(listMatch && listMatch[1]) || ""] || "column";
    const preferredName = card.name || card.alt || "Product";
    return {
      name: preferredName,
      slug: slugify(preferredName),
      category: categorySlug,
      summary: card.summary,
      description: detailByHref[card.href] ? detailByHref[card.href].description : card.summary,
      image: detailByHref[card.href] ? detailByHref[card.href].detailImage : card.image
    };
  });

  const newsItemMatch = newsPage.match(
    /<a href="(\/NEWSen\/\d+\.html)" class="s-m[\s\S]*?<img src="([^"]+)" alt="([^"]*)" class="s-o"[\s\S]*?<div class="s-q">([\s\S]*?)<\/div>[\s\S]*?<div class="s-r">([\s\S]*?)<\/div>[\s\S]*?<div class="s-s">([\s\S]*?)<\/div>/i
  );

  let news = [];
  if (newsItemMatch) {
    const newsHref = newsItemMatch[1];
    const detailHtml = await fetchHtml(newsHref);
    const detailBody = stripHtml((detailHtml.match(/<div class="t-i" id="maximg">([\s\S]*?)<\/div>/i) || [])[1] || "");
    news = [
      {
        title: stripHtml(newsItemMatch[4]),
        slug: slugify(stripHtml(newsItemMatch[4])),
        date: stripHtml(newsItemMatch[6]),
        summary: stripHtml(newsItemMatch[5]),
        content: detailBody || stripHtml(newsItemMatch[4]),
        image: toAbsoluteUrl(newsItemMatch[2])
      }
    ];
  }

  const aboutBodyChunk = (about.match(/<div class="p-d" id="maximg">([\s\S]*?)<\/div>/i) || [])[1] || "";
  const aboutParagraphs = extractParagraphs(aboutBodyChunk).filter((line) => line !== "Company Introduction" && line !== "S incerely");
  const aboutSummary = aboutParagraphs.slice(0, 2).join(" ");

  const homeContactChunk = (home.match(/<div class="e-l yxzx">([\s\S]*?)<\/div>/i) || [])[1] || "";
  const homeContactLines = extractParagraphs(homeContactChunk);

  const contactBodyChunk = (contactPage.match(/<div class="p-d" id="maximg">([\s\S]*?)<\/div>/i) || [])[1] || "";
  const contactLines = extractParagraphs(contactBodyChunk);

  const homeTelLine = homeContactLines.find((line) => /TEL/i.test(line)) || "";
  const homeMailLine = homeContactLines.find((line) => /Mail/i.test(line)) || "";
  const homeAddressLine = homeContactLines.find((line) => /Adress/i.test(line)) || "";

  const contactCompany = contactLines[0] || "ALCOCHROM LTD";
  const contactEmailLine = contactLines.find((line) => /Email/i.test(line)) || homeMailLine;
  const parsedEmail = (contactEmailLine.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || "sales@alcochrom.com";

  const parsedPhoneCandidate = homeTelLine
    .replace(/^TEL[:：]?\s*/i, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .trim();
  const parsedPhone = parsedPhoneCandidate || "(+853) 62182838";
  const parsedAddress = homeAddressLine.replace(/^Adress[:：]\s*/i, "").trim() || "Chase Business Centre,39-41 Chase Side,London,United Kingdom,N14 5BP";

  const mapImage =
    toAbsoluteUrl((home.match(/<img src="([^"]+)"[^>]*class="e-map"/i) || [])[1] || "") ||
    "https://www.alcochrom.com/static/upload/image/20220924/1663996999128479.png";

  const downloadBodyChunk = (downloadPage.match(/<div class="p-d" id="maximg">([\s\S]*?)<\/div>/i) || [])[1] || "";
  const downloadParagraphs = extractParagraphs(downloadBodyChunk);
  const downloadLinkMatch = downloadBodyChunk.match(/href="([^"]+\.pdf)"/i);
  const downloadTitle = stripHtml(downloadParagraphs.slice(0, 3).join(" "));
  const downloadDateSource = (downloadLinkMatch && downloadLinkMatch[1].match(/\/(20\d{2})(\d{2})(\d{2})\//)) || null;
  const downloadDate = downloadDateSource
    ? `${downloadDateSource[1]}-${downloadDateSource[2]}-${downloadDateSource[3]}`
    : "2024-12-06";

  const downloads = [
    {
      title: downloadTitle || "ALCOEN Product series",
      date: downloadDate,
      summary: "ALCOEN Product series, chromatography column series and chromatography silica gel packing series.",
      url: toAbsoluteUrl((downloadLinkMatch && downloadLinkMatch[1]) || "/")
    }
  ];

  const footerLinks = [];

  const site = {
    siteName: title || "ALCOEN",
    tagline: "Alcochrom is a nanotechnology company originating from the UK.",
    seo: {
      title: title || "ALCOEN",
      description: getMeta(about, "description") || aboutSummary,
      keywords: getMeta(home, "keywords")
    },
    header: {
      logoText: title || "ALCOEN",
      logoSubtext: "Chromatography Solutions",
      phone: parsedPhone,
      email: parsedEmail
    },
    heroSlides,
    about: {
      headline: "ABOUT",
      subheadline: "Company Introduction",
      summary: aboutSummary,
      story: aboutParagraphs,
      image: mapImage,
      stats: []
    },
    categories:
      categories.length > 0
        ? categories
        : Object.keys(categoryNameMap).map((key) => ({
            name: categoryNameMap[key],
            slug: key
          })),
    products,
    news,
    downloads,
    contact: {
      company: contactCompany,
      address: parsedAddress,
      phone: parsedPhone,
      email: parsedEmail,
      website: base,
      ctaText: "Leave Message",
      ctaLink: "/guestbook",
      mapImage
    },
    footer: {
      copyright: "Copyright © 2026 ALCOCHROM. All rights reserved.",
      linksTitle: "Links",
      links: footerLinks
    }
  };

  fs.writeFileSync(path.join(root, "data", "site.json"), JSON.stringify(site, null, 2), "utf8");
  console.log("data/site.json updated from reference site.");
};

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
