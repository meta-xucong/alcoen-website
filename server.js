const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const uploadsDir = path.join(publicDir, "uploads");
const siteDataPath = path.join(dataDir, "site.json");
const customLogoWebPath = "/assets/custom/ALCOEN.jpg";
const customLogoFsPath = path.join(publicDir, "assets", "custom", "ALCOEN.jpg");
const customFooterQrWebPath = "/assets/custom/contact_me_qr.png";
const customFooterQrFsPath = path.join(publicDir, "assets", "custom", "contact_me_qr.png");
const sectionWhiteImageWebPath = "/assets/custom/section-white.svg";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const defaultNavItems = [
  { href: "/", label: "HOME" },
  { href: "/about", label: "ABOUT" },
  { href: "/products", label: "PRODUCT" },
  { href: "/news", label: "NEWS" },
  { href: "/downloads", label: "DOWNLOAD" },
  { href: "/contact", label: "CONTACT" }
];

const defaultSiteData = {
  site: {
    title: "ALCOEN",
    subtitle: "ALCOEN",
    domain: "",
    logo: "",
    keywords: "",
    description: "",
    icp: "",
    theme: "english",
    statistical: "",
    copyright: ""
  },
  company: {
    name: "",
    address: "",
    postcode: "",
    contact: "",
    mobile: "",
    phone: "",
    fax: "",
    email: "",
    qq: "",
    weixin: "",
    blicense: "",
    other: ""
  },
  contentSorts: [],
  singles: [],
  news: [],
  products: [],
  slides: [],
  links: [],
  meta: {
    areaCode: "en",
    modelMap: {
      single: { code: 1, name: "single" },
      news: { code: 2, name: "news" },
      product: { code: 3, name: "product" }
    }
  }
};

const asString = (value, fallback = "") => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const asObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

const asInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const coerceBool01 = (value) => (asInt(value, 0) ? 1 : 0);

const TEMPLATE_TYPES = new Set(["hero-overlay", "split-left", "split-right", "banner-center", "text-only"]);

const clampInt = (value, min, max, fallback) => {
  const n = asInt(value, fallback);
  if (n < min) {
    return min;
  }
  if (n > max) {
    return max;
  }
  return n;
};

const sanitizeCssToken = (value, fallback, pattern) => {
  const text = asString(value, fallback).trim();
  if (!text) {
    return fallback;
  }
  return pattern.test(text) ? text : fallback;
};

const normalizeTemplateBlock = (value, index = 0) => {
  const source = asObject(value);
  const id = asString(source.id).trim() || `tpl-${Date.now()}-${index}`;
  const template = asString(source.template, "hero-overlay").trim().toLowerCase();
  return {
    id,
    enabled: typeof source.enabled === "undefined" ? 1 : coerceBool01(source.enabled),
    template: TEMPLATE_TYPES.has(template) ? template : "hero-overlay",
    image: asString(source.image),
    title: asString(source.title),
    body: asString(source.body),
    height: clampInt(source.height, 200, 900, 360),
    overlay: sanitizeCssToken(
      source.overlay,
      "rgba(15, 23, 42, 0.28)",
      /^[-#(),.%\sA-Za-z0-9]{1,64}$/
    ),
    titleFont: sanitizeCssToken(
      source.titleFont,
      "Microsoft YaHei",
      /^[-,.'"\sA-Za-z0-9\u4e00-\u9fa5]{1,64}$/
    ),
    titleSize: clampInt(source.titleSize, 14, 96, 34),
    titleColor: sanitizeCssToken(source.titleColor, "#ffffff", /^[-#(),.%\sA-Za-z0-9]{1,64}$/),
    titleX: clampInt(source.titleX, 0, 90, 10),
    titleY: clampInt(source.titleY, 0, 90, 14),
    titleWidth: clampInt(source.titleWidth, 10, 95, 44),
    bodyFont: sanitizeCssToken(
      source.bodyFont,
      "Microsoft YaHei",
      /^[-,.'"\sA-Za-z0-9\u4e00-\u9fa5]{1,64}$/
    ),
    bodySize: clampInt(source.bodySize, 12, 64, 18),
    bodyColor: sanitizeCssToken(source.bodyColor, "#ffffff", /^[-#(),.%\sA-Za-z0-9]{1,64}$/),
    bodyX: clampInt(source.bodyX, 0, 90, 10),
    bodyY: clampInt(source.bodyY, 0, 95, 34),
    bodyWidth: clampInt(source.bodyWidth, 10, 95, 48),
    align: ["left", "center", "right"].includes(asString(source.align).toLowerCase())
      ? asString(source.align).toLowerCase()
      : "left"
  };
};

const normalizeTemplateBlocks = (value) => asArray(value).map((item, idx) => normalizeTemplateBlock(item, idx));

const entityDecode = (value = "") =>
  String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripHtml = (value = "") =>
  entityDecode(
    normalizeBrandArtifacts(value)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const toParagraphs = (value = "") =>
  stripHtml(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeSiteInfo = (value) => {
  const source = asObject(value);
  const defaults = defaultSiteData.site;
  return {
    title: asString(source.title, defaults.title),
    subtitle: asString(source.subtitle, defaults.subtitle),
    domain: asString(source.domain, defaults.domain),
    logo: asString(source.logo, defaults.logo),
    keywords: asString(source.keywords, defaults.keywords),
    description: asString(source.description, defaults.description),
    icp: asString(source.icp, defaults.icp),
    theme: asString(source.theme, defaults.theme),
    statistical: asString(source.statistical, defaults.statistical),
    copyright: asString(source.copyright, defaults.copyright)
  };
};

const normalizeCompany = (value) => {
  const source = asObject(value);
  const defaults = defaultSiteData.company;
  return {
    name: asString(source.name, defaults.name),
    address: asString(source.address, defaults.address),
    postcode: asString(source.postcode, defaults.postcode),
    contact: asString(source.contact, defaults.contact),
    mobile: asString(source.mobile, defaults.mobile),
    phone: asString(source.phone, defaults.phone),
    fax: asString(source.fax, defaults.fax),
    email: asString(source.email, defaults.email),
    qq: asString(source.qq, defaults.qq),
    weixin: asString(source.weixin, defaults.weixin),
    blicense: asString(source.blicense, defaults.blicense),
    other: asString(source.other, defaults.other)
  };
};

const normalizeContentSort = (value) => {
  const source = asObject(value);
  return {
    id: asInt(source.id, Date.now()),
    parentId: asInt(source.parentId, 0),
    name: asString(source.name),
    filename: asString(source.filename),
    modelCode: asString(source.modelCode),
    listTemplate: asString(source.listTemplate),
    contentTemplate: asString(source.contentTemplate),
    sorting: asInt(source.sorting, 255),
    status: coerceBool01(source.status)
  };
};

const normalizeSingle = (value) => {
  const source = asObject(value);
  return {
    id: asInt(source.id, Date.now()),
    sortId: asInt(source.sortId, 0),
    title: asString(source.title),
    subtitle: asString(source.subtitle),
    filename: asString(source.filename),
    outlink: asString(source.outlink),
    gnote: asString(source.gnote),
    ico: asString(source.ico),
    pic: asString(source.pic),
    keywords: asString(source.keywords),
    description: asString(source.description),
    descriptionZh: asString(source.descriptionZh),
    content: asString(source.content),
    contentZh: asString(source.contentZh),
    picZh: asString(source.picZh),
    layoutBlocks: normalizeTemplateBlocks(source.layoutBlocks),
    layoutBlocksZh: normalizeTemplateBlocks(source.layoutBlocksZh),
    status: coerceBool01(source.status),
    visits: asInt(source.visits, 0),
    date: asString(source.date)
  };
};

const normalizeContentItem = (value) => {
  const source = asObject(value);
  const extParamsSource = asObject(source.extParams);
  return {
    id: asInt(source.id, Date.now()),
    sortId: asInt(source.sortId, 0),
    title: asString(source.title),
    subtitle: asString(source.subtitle),
    filename: asString(source.filename),
    outlink: asString(source.outlink),
    gnote: asString(source.gnote),
    tags: asString(source.tags),
    author: asString(source.author),
    source: asString(source.source),
    ico: asString(source.ico),
    pics: asArray(source.pics).map((item) => asString(item)).filter(Boolean),
    subSortId: source.subSortId == null ? null : asInt(source.subSortId, null),
    titleColor: asString(source.titleColor, "#333333"),
    enclosure: asString(source.enclosure),
    keywords: asString(source.keywords),
    description: asString(source.description),
    summary: asString(source.summary),
    content: asString(source.content),
    layoutBlocks: normalizeTemplateBlocks(source.layoutBlocks),
    layoutBlocksZh: normalizeTemplateBlocks(source.layoutBlocksZh),
    titleZh: asString(source.titleZh),
    summaryZh: asString(source.summaryZh),
    descriptionZh: asString(source.descriptionZh),
    contentZh: asString(source.contentZh),
    icoZh: asString(source.icoZh),
    picsZh: asArray(source.picsZh).map((item) => asString(item)).filter(Boolean),
    categoryKeyZh: asString(source.categoryKeyZh),
    specRows: asArray(source.specRows).map((item) => asString(item)).filter(Boolean),
    specRowsZh: asArray(source.specRowsZh).map((item) => asString(item)).filter(Boolean),
    downloadLink: asString(source.downloadLink),
    downloadLinkZh: asString(source.downloadLinkZh),
    status: coerceBool01(source.status),
    sorting: asInt(source.sorting, 255),
    istop: coerceBool01(source.istop),
    isrecommend: coerceBool01(source.isrecommend),
    isheadline: coerceBool01(source.isheadline),
    visits: asInt(source.visits, 0),
    date: asString(source.date),
    extParams: {
      param1: asString(extParamsSource.param1),
      param2: asString(extParamsSource.param2),
      param3: asString(extParamsSource.param3),
      param4: asString(extParamsSource.param4),
      param5: asString(extParamsSource.param5)
    }
  };
};

const normalizeSlide = (value) => {
  const source = asObject(value);
  return {
    id: asInt(source.id, Date.now()),
    gid: asString(source.gid, "home"),
    pic: asString(source.pic),
    link: asString(source.link),
    title: asString(source.title),
    subtitle: asString(source.subtitle),
    sorting: asInt(source.sorting, 255)
  };
};

const normalizeLink = (value) => {
  const source = asObject(value);
  return {
    id: asInt(source.id, Date.now()),
    gid: asString(source.gid, "default"),
    name: asString(source.name),
    link: asString(source.link),
    logo: asString(source.logo),
    sorting: asInt(source.sorting, 255)
  };
};

const normalizeMeta = (value) => {
  const source = asObject(value);
  const modelMap = asObject(source.modelMap);
  return {
    areaCode: asString(source.areaCode, "en"),
    modelMap: {
      single: {
        code: asInt(asObject(modelMap.single).code, 1),
        name: asString(asObject(modelMap.single).name, "single")
      },
      news: {
        code: asInt(asObject(modelMap.news).code, 2),
        name: asString(asObject(modelMap.news).name, "news")
      },
      product: {
        code: asInt(asObject(modelMap.product).code, 3),
        name: asString(asObject(modelMap.product).name, "product")
      }
    }
  };
};

const normalizeCanonicalSiteData = (input) => {
  const source = asObject(input);
  return {
    site: normalizeSiteInfo(source.site),
    company: normalizeCompany(source.company),
    contentSorts: asArray(source.contentSorts).map(normalizeContentSort),
    singles: asArray(source.singles).map(normalizeSingle),
    news: asArray(source.news).map(normalizeContentItem),
    products: asArray(source.products).map(normalizeContentItem),
    slides: asArray(source.slides).map(normalizeSlide),
    links: asArray(source.links).map(normalizeLink),
    meta: normalizeMeta(source.meta)
  };
};

const normalizeLegacySiteData = (input) => {
  const source = asObject(input);
  const about = asObject(source.about);
  const contact = asObject(source.contact);
  const seo = asObject(source.seo);
  const header = asObject(source.header);
  const footer = asObject(source.footer);

  const contentSorts = [
    { id: 17, parentId: 0, name: "ABOUT", filename: "about", modelCode: "single", listTemplate: "about.html", contentTemplate: "", sorting: 255, status: 1 },
    { id: 18, parentId: 0, name: "PRODUCT", filename: "products", modelCode: "product", listTemplate: "productlist.html", contentTemplate: "product.html", sorting: 255, status: 1 },
    { id: 19, parentId: 0, name: "NEWS", filename: "news", modelCode: "news", listTemplate: "newslist.html", contentTemplate: "news.html", sorting: 255, status: 1 },
    { id: 20, parentId: 0, name: "DOWNLOAD", filename: "downloads", modelCode: "single", listTemplate: "about.html", contentTemplate: "", sorting: 255, status: 1 },
    { id: 21, parentId: 0, name: "CONTACT", filename: "contact", modelCode: "single", listTemplate: "about.html", contentTemplate: "", sorting: 255, status: 1 }
  ];

  const categoryMap = {};
  asArray(source.categories).forEach((item, idx) => {
    const entry = asObject(item);
    const id = 22 + idx;
    categoryMap[asString(entry.slug)] = id;
    contentSorts.push(
      normalizeContentSort({
        id,
        parentId: 18,
        name: asString(entry.name),
        filename: asString(entry.slug),
        modelCode: "product",
        listTemplate: "",
        contentTemplate: "product.html",
        sorting: 255 - idx,
        status: 1
      })
    );
  });

  const canonical = {
    site: normalizeSiteInfo({
      title: asString(source.siteName, "ALCOEN"),
      subtitle: asString(source.tagline, asString(source.siteName, "ALCOEN")),
      logo: "",
      keywords: asString(seo.keywords),
      description: asString(seo.description),
      copyright: asString(footer.copyright),
      theme: "english"
    }),
    company: normalizeCompany({
      name: asString(contact.company),
      address: asString(contact.address),
      phone: asString(contact.phone, asString(header.phone)),
      email: asString(contact.email, asString(header.email)),
      contact: asString(contact.company)
    }),
    contentSorts: contentSorts.map(normalizeContentSort),
    singles: [
      normalizeSingle({
        id: 43,
        sortId: 17,
        title: asString(about.headline, "ABOUT"),
        subtitle: asString(about.subheadline),
        filename: "about",
        pic: asString(about.image),
        description: asString(about.summary),
        content: asArray(about.story).map((line) => `<p>${asString(line)}</p>`).join(""),
        status: 1
      }),
      normalizeSingle({
        id: 44,
        sortId: 20,
        title: "DOWNLOAD",
        subtitle: "DOWNLOAD",
        filename: "downloads",
        description: asArray(source.downloads)
          .map((item) => asString(asObject(item).title))
          .filter(Boolean)
          .join(" | "),
        content: asArray(source.downloads)
          .map((item) => `<p>${asString(asObject(item).title)}</p>`)
          .join(""),
        status: 1
      }),
      normalizeSingle({
        id: 45,
        sortId: 21,
        title: "CONTACT",
        subtitle: "CONTACT",
        filename: "contact",
        pic: asString(contact.mapImage),
        description: asString(contact.address),
        content: `<p>${asString(contact.company)}</p><p>${asString(contact.address)}</p><p>${asString(contact.phone)}</p><p>${asString(
          contact.email
        )}</p>`,
        status: 1
      })
    ],
    news: asArray(source.news).map((item, idx) => {
      const entry = asObject(item);
      return normalizeContentItem({
        id: 1000 + idx,
        sortId: 19,
        title: asString(entry.title),
        filename: asString(entry.slug) || slugify(asString(entry.title)),
        ico: asString(entry.image),
        summary: asString(entry.summary),
        description: asString(entry.summary),
        content: `<p>${asString(entry.content)}</p>`,
        status: 1,
        sorting: 255 - idx,
        date: asString(entry.date)
      });
    }),
    products: asArray(source.products).map((item, idx) => {
      const entry = asObject(item);
      return normalizeContentItem({
        id: 2000 + idx,
        sortId: categoryMap[asString(entry.category)] || 18,
        title: asString(entry.name),
        filename: asString(entry.slug) || slugify(asString(entry.name)),
        ico: asString(entry.image),
        summary: asString(entry.summary),
        description: asString(entry.summary),
        content: `<p>${asString(entry.description)}</p>`,
        status: 1,
        sorting: 255 - idx
      });
    }),
    slides: asArray(source.heroSlides).map((item, idx) => {
      const entry = asObject(item);
      return normalizeSlide({
        id: idx + 1,
        gid: "home",
        pic: asString(entry.image),
        link: asString(entry.buttonLink),
        title: asString(entry.title),
        subtitle: asString(entry.subtitle),
        sorting: 255 - idx
      });
    }),
    links: asArray(footer.links).map((item, idx) => {
      const entry = asObject(item);
      return normalizeLink({
        id: idx + 1,
        gid: "footer",
        name: asString(entry.label),
        link: asString(entry.url),
        sorting: 255 - idx
      });
    }),
    meta: normalizeMeta({
      areaCode: "en",
      modelMap: {
        single: { code: 1, name: "single" },
        news: { code: 2, name: "news" },
        product: { code: 3, name: "product" }
      }
    })
  };

  return canonical;
};

const normalizeSiteData = (input) => {
  const source = asObject(input);
  const looksLegacy =
    typeof source.siteName !== "undefined" ||
    typeof source.heroSlides !== "undefined" ||
    typeof source.about !== "undefined" ||
    typeof source.categories !== "undefined" ||
    typeof source.contact !== "undefined" ||
    typeof source.footer !== "undefined";
  if (looksLegacy) {
    return normalizeLegacySiteData(source);
  }
  return normalizeCanonicalSiteData(source);
};

const readSiteData = () => {
  try {
    const raw = fs.readFileSync(siteDataPath, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);
    return normalizeSiteData(parsed);
  } catch (error) {
    const fallback = normalizeSiteData(defaultSiteData);
    fs.writeFileSync(siteDataPath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
};

const writeSiteData = (data) => {
  const normalized = normalizeSiteData(data);
  fs.writeFileSync(siteDataPath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
};

const sortByDisplay = (a, b) => {
  const bySort = asInt(b.sorting, 0) - asInt(a.sorting, 0);
  if (bySort !== 0) {
    return bySort;
  }
  return asInt(a.id, 0) - asInt(b.id, 0);
};

const findTopSortByName = (contentSorts, name) =>
  contentSorts.find(
    (item) =>
      item.parentId === 0 &&
      item.status === 1 &&
      asString(item.name).trim().toUpperCase() === String(name).trim().toUpperCase()
  );

const firstSingleBySort = (site, sortId) =>
  asArray(site.singles)
    .filter((item) => item.status === 1 && item.sortId === sortId)
    .sort(sortByDisplay)[0];

const normalizeBrandArtifacts = (value = "") =>
  String(value)
    .replace(/ALCOEN\s*([?？])/g, "ALCOEN \u00ae")
    .replace(/ALCOEN\s*庐/g, "ALCOEN \u00ae")
    .replace(/ALCOEN<span[^>]*>\s*([?？庐])\s*<\/span>/gi, "ALCOEN \u00ae")
    .replace(/庐/g, "\u00ae");

const sanitizeRichText = (value = "") =>
  normalizeBrandArtifacts(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");

const canonicalToViewModel = (canonical) => {
  const siteInfo = canonical.site;
  const company = canonical.company;
  const sorts = asArray(canonical.contentSorts).filter((item) => item.status === 1);
  const topSorts = sorts.filter((item) => item.parentId === 0).sort(sortByDisplay);
  const productTopSort = findTopSortByName(topSorts, "PRODUCT");
  const aboutTopSort = findTopSortByName(topSorts, "ABOUT");
  const newsTopSort = findTopSortByName(topSorts, "NEWS");
  const downloadTopSort = findTopSortByName(topSorts, "DOWNLOAD");
  const contactTopSort = findTopSortByName(topSorts, "CONTACT");

  const productChildSorts = sorts
    .filter((item) => item.parentId === (productTopSort ? productTopSort.id : -1))
    .sort(sortByDisplay);
  const productSortNameById = {};
  productChildSorts.forEach((item) => {
    productSortNameById[item.id] = item.name;
  });

  const aboutSingle = aboutTopSort ? firstSingleBySort(canonical, aboutTopSort.id) : null;
  const downloadSingle = downloadTopSort ? firstSingleBySort(canonical, downloadTopSort.id) : null;
  const contactSingle = contactTopSort ? firstSingleBySort(canonical, contactTopSort.id) : null;
  const topSortByName = {};
  topSorts.forEach((item) => {
    topSortByName[asString(item.name).trim().toUpperCase()] = item;
  });
  const orderedTopNames = ["ABOUT", "PRODUCT", "NEWS", "DOWNLOAD", "CONTACT"];
  const dynamicNavItems = [{ href: "/", label: "HOME" }];
  orderedTopNames.forEach((name) => {
    if (!topSortByName[name]) {
      return;
    }
    const mapHref = {
      ABOUT: "/about",
      PRODUCT: "/products",
      NEWS: "/news",
      DOWNLOAD: "/downloads",
      CONTACT: "/contact"
    };
    dynamicNavItems.push({
      href: mapHref[name] || `/${slugify(name)}`,
      label: name
    });
  });

  const slides = asArray(canonical.slides)
    .filter((item) => asString(item.gid, "home") === "home" || !item.gid)
    .sort(sortByDisplay);
  const newsItems = asArray(canonical.news)
    .filter((item) => item.status === 1)
    .sort(sortByDisplay);
  const products = asArray(canonical.products)
    .filter((item) => item.status === 1)
    .sort(sortByDisplay);

  const downloads = [];
  if (downloadSingle) {
    const lines = toParagraphs(downloadSingle.content);
    if (lines.length) {
      lines.forEach((line, idx) => {
        downloads.push({
          title: line,
          date: downloadSingle.date || "",
          summary: downloadSingle.description || line,
          url: idx === 0 && downloadSingle.outlink ? downloadSingle.outlink : "#"
        });
      });
    } else {
      downloads.push({
        title: downloadSingle.title || "DOWNLOAD",
        date: downloadSingle.date || "",
        summary: downloadSingle.description || "",
        url: downloadSingle.outlink || "#",
        richHtml: sanitizeRichText(downloadSingle.content || "")
      });
    }
  }

  const footerLinks = asArray(canonical.links)
    .sort(sortByDisplay)
    .map((item) => ({
      label: item.name,
      url: item.link || "#"
    }));

  const heroSlides = slides.map((item) => ({
    title: item.title || "",
    subtitle: item.subtitle || "",
    image: item.pic || "",
    buttonText: item.link ? "MORE" : "",
    buttonLink: item.link || "/products"
  }));

  if (!heroSlides.length) {
    heroSlides.push({
      title: siteInfo.title || "ALCOEN",
      subtitle: siteInfo.subtitle || "",
      image:
        (aboutSingle && aboutSingle.pic) ||
        (contactSingle && contactSingle.pic) ||
        siteInfo.logo ||
        "",
      buttonText: "",
      buttonLink: "/products"
    });
  }

  return {
    canonical,
    navItems: dynamicNavItems.length > 1 ? dynamicNavItems : defaultNavItems,
    siteName: siteInfo.title || "ALCOEN",
    tagline: siteInfo.subtitle || siteInfo.title || "ALCOEN",
    seo: {
      title: siteInfo.title || "ALCOEN",
      description: siteInfo.description || "",
      keywords: siteInfo.keywords || ""
    },
    header: {
      logo: siteInfo.logo || "",
      logoText: siteInfo.title || "ALCOEN",
      logoSubtext: siteInfo.subtitle || "Chromatography Solutions",
      phone: company.phone || company.mobile || "",
      email: company.email || ""
    },
    heroSlides,
    about: {
      headline: (aboutSingle && aboutSingle.title) || "ABOUT",
      subheadline: (aboutSingle && aboutSingle.subtitle) || "Company Introduction",
      summary: (aboutSingle && aboutSingle.description) || "",
      summaryZh: (aboutSingle && (aboutSingle.descriptionZh || aboutSingle.description)) || "",
      story: toParagraphs(aboutSingle ? aboutSingle.content : ""),
      image: (aboutSingle && (aboutSingle.pic || aboutSingle.ico)) || "",
      imageZh: (aboutSingle && (aboutSingle.picZh || aboutSingle.pic || aboutSingle.ico)) || "",
      stats: [],
      richHtml: sanitizeRichText((aboutSingle && aboutSingle.content) || ""),
      richHtmlZh: sanitizeRichText((aboutSingle && (aboutSingle.contentZh || aboutSingle.content)) || ""),
      layoutBlocks: normalizeTemplateBlocks((aboutSingle && aboutSingle.layoutBlocks) || []),
      layoutBlocksZh: normalizeTemplateBlocks((aboutSingle && aboutSingle.layoutBlocksZh) || [])
    },
    categories: productChildSorts.map((item) => ({
      name: item.name,
      slug: item.filename || slugify(item.name)
    })),
    products: products.map((item) => ({
      name: item.title || "",
      slug: item.filename || slugify(item.title),
      sortId: item.sortId,
      category: asString(
        (productChildSorts.find((sortItem) => sortItem.id === item.sortId) || {}).filename,
        slugify(productSortNameById[item.sortId] || "product")
      ),
      categoryName: asString(
        (productChildSorts.find((sortItem) => sortItem.id === item.sortId) || {}).name,
        productSortNameById[item.sortId] || "PRODUCT"
      ),
      summary: item.summary || stripHtml(item.description || item.content || ""),
      description: stripHtml(item.content || item.description || ""),
      image: item.ico || (item.pics[0] || ""),
      gallery: asArray(item.pics),
      richHtml: sanitizeRichText(item.content || ""),
      layoutBlocks: normalizeTemplateBlocks(item.layoutBlocks),
      layoutBlocksZh: normalizeTemplateBlocks(item.layoutBlocksZh),
      nameZh: item.titleZh || "",
      summaryZh: item.summaryZh || "",
      descriptionZh: item.descriptionZh || "",
      richHtmlZh: sanitizeRichText(item.contentZh || ""),
      imageZh: item.icoZh || "",
      galleryZh: asArray(item.picsZh),
      categoryKeyZh: item.categoryKeyZh || "",
      specRows: asArray(item.specRows).length
        ? asArray(item.specRows)
        : [item.extParams && item.extParams.param1, item.extParams && item.extParams.param2, item.extParams && item.extParams.param3, item.extParams && item.extParams.param4, item.extParams && item.extParams.param5].filter(Boolean),
      specRowsZh: asArray(item.specRowsZh),
      downloadLink: item.downloadLink || item.outlink || "",
      downloadLinkZh: item.downloadLinkZh || "",
      author: item.author || "",
      source: item.source || "",
      date: item.date || ""
    })),
    news: newsItems.map((item) => ({
      title: item.title || "",
      slug: item.filename || slugify(item.title),
      date: item.date || "",
      summary: item.summary || stripHtml(item.description || item.content || ""),
      content: stripHtml(item.content || item.description || ""),
      image: item.ico || (item.pics[0] || ""),
      richHtml: sanitizeRichText(item.content || ""),
      layoutBlocks: normalizeTemplateBlocks(item.layoutBlocks),
      layoutBlocksZh: normalizeTemplateBlocks(item.layoutBlocksZh),
      author: item.author || "",
      source: item.source || ""
    })),
    downloads,
    contact: {
      company: company.name || (contactSingle && contactSingle.title) || "",
      address: company.address || stripHtml((contactSingle && contactSingle.description) || ""),
      phone: company.phone || company.mobile || "",
      email: company.email || "",
      website: siteInfo.domain || "",
      ctaText: "Leave Message",
      ctaLink: "/guestbook",
      mapImage: (contactSingle && (contactSingle.pic || contactSingle.ico)) || (aboutSingle && aboutSingle.pic) || "",
      mapImageZh:
        (contactSingle && (contactSingle.picZh || contactSingle.pic || contactSingle.ico)) ||
        (aboutSingle && (aboutSingle.picZh || aboutSingle.pic)) ||
        "",
      richHtml: sanitizeRichText((contactSingle && contactSingle.content) || ""),
      richHtmlZh: sanitizeRichText((contactSingle && (contactSingle.contentZh || contactSingle.content)) || ""),
      layoutBlocks: normalizeTemplateBlocks((contactSingle && contactSingle.layoutBlocks) || []),
      layoutBlocksZh: normalizeTemplateBlocks((contactSingle && contactSingle.layoutBlocksZh) || [])
    },
    footer: {
      copyright: siteInfo.copyright || "",
      linksTitle: "Links",
      links: footerLinks
    },
    pageModels: {
      topSorts,
      productTopSort,
      productChildSorts,
      productSortNameById,
      aboutTopSort,
      newsTopSort,
      downloadTopSort,
      contactTopSort,
      aboutSingle: aboutSingle || null,
      downloadSingle: downloadSingle || null,
      contactSingle: contactSingle || null
    },
    sanitizeRichText
  };
};

const send = (res, status, body, contentType = "text/html; charset=utf-8") => {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
};

const sendJson = (res, status, payload) => {
  send(res, status, JSON.stringify(payload, null, 2), "application/json; charset=utf-8");
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON payload."));
      }
    });
    req.on("error", reject);
  });

const pickHeroImage = (site, index = 0) =>
  site.heroSlides[index] && site.heroSlides[index].image
    ? site.heroSlides[index].image
    : site.heroSlides[0] && site.heroSlides[0].image
      ? site.heroSlides[0].image
      : site.contact.mapImage;

const uiCopy = {
  en: {
    home: "HOME",
    about: "ABOUT",
    product: "PRODUCT",
    news: "NEWS",
    download: "DOWNLOAD",
    contact: "CONTACT",
    nav: "NAV",
    links: "Links",
    more: "MORE",
    category: "CATEGORY",
    companyUpdates: "Company updates and announcements.",
    productCatalog: "Product catalog and downloadable files.",
    getInTouch: "Get in touch with ALCOCHROM LTD.",
    leaveMessage: "Leave Message",
    notFoundDesc: "The page you requested does not exist.",
    backHome: "Back to Home",
    menu: "MENU"
  },
  zh: {
    home: "首页",
    about: "关于我们",
    product: "产品中心",
    news: "新闻中心",
    download: "下载中心",
    contact: "联系我们",
    nav: "导航",
    links: "友情链接",
    more: "更多",
    category: "分类",
    companyUpdates: "公司动态与公告",
    productCatalog: "产品目录与下载资料",
    getInTouch: "欢迎联系我们",
    leaveMessage: "在线留言",
    notFoundDesc: "您访问的页面不存在。",
    backHome: "返回首页",
    menu: "菜单"
  }
};

const navLabelMap = {
  HOME: { en: "HOME", zh: "首页" },
  ABOUT: { en: "ABOUT", zh: "关于我们" },
  PRODUCT: { en: "PRODUCT", zh: "产品中心" },
  NEWS: { en: "NEWS", zh: "新闻中心" },
  DOWNLOAD: { en: "DOWNLOAD", zh: "下载中心" },
  CONTACT: { en: "CONTACT", zh: "联系我们" }
};

const getLang = (parsedUrl) => (parsedUrl.searchParams.get("lang") === "zh" ? "zh" : "en");

const t = (lang, key) => (asObject(uiCopy[lang])[key] || asObject(uiCopy.en)[key] || key);

const localizeNavLabel = (label, lang) => {
  const key = asString(label).trim().toUpperCase();
  const mapping = navLabelMap[key];
  if (!mapping) {
    return label;
  }
  return mapping[lang] || mapping.en || label;
};

const withLang = (href, lang) => {
  const raw = asString(href, "#");
  if (!raw) {
    return "#";
  }
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(raw)) {
    return raw;
  }
  if (raw.startsWith("#")) {
    return raw;
  }
  const urlObj = new URL(raw, "http://local");
  urlObj.searchParams.set("lang", lang);
  return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
};

const renderFooterGroups = (site, lang) => `
  <div class="footer-brand">
    <h3>${escapeHtml(site.siteName)}</h3>
    <p>${escapeHtml(site.tagline)}</p>
    <p>${escapeHtml(site.contact.company)}</p>
    <p>${escapeHtml(site.contact.phone)} | ${escapeHtml(site.contact.email)}</p>
  </div>
  <div class="footer-group">
    <h4>${escapeHtml(t(lang, "nav"))}</h4>
    <div class="footer-links">
      ${(site.navItems || defaultNavItems)
        .map((item) => `<a href="${withLang(item.href, lang)}">${escapeHtml(localizeNavLabel(item.label, lang))}</a>`)
        .join("")}
    </div>
  </div>
  <div class="footer-group">
    <h4>${escapeHtml(t(lang, "product"))}</h4>
    <div class="footer-links">
      ${site.categories
        .map((item) => `<a href="${withLang(`/products#${item.slug}`, lang)}">${escapeHtml(item.name)}</a>`)
        .join("")}
    </div>
  </div>
  <div class="footer-group">
    <h4>${escapeHtml(t(lang, "news"))}</h4>
    <div class="footer-links">
      ${site.news
        .slice(0, 3)
        .map((item) => `<a href="${withLang(`/news/${item.slug}`, lang)}">${escapeHtml(item.title)}</a>`)
        .join("")}
    </div>
  </div>
  <div class="footer-group">
    <h4>${escapeHtml(t(lang, "download"))}</h4>
    <div class="footer-links">
      ${site.downloads
        .slice(0, 4)
        .map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`)
        .join("")}
    </div>
  </div>
  <div class="footer-group">
    <h4>${escapeHtml(site.footer.linksTitle || t(lang, "links"))}</h4>
    <div class="footer-links">
      ${site.footer.links
        .map((item) => `<a href="${escapeHtml(withLang(item.url, lang))}">${escapeHtml(item.label)}</a>`)
        .join("")}
    </div>
  </div>
`;

const layout = ({ title, description, activePath, content, site, lang, currentPath }) => {
  const nav = (site.navItems || defaultNavItems)
    .map(
      (item) =>
        `<li><a href="${withLang(item.href, lang)}" class="${activePath === item.href ? "is-active" : ""}">${escapeHtml(
          localizeNavLabel(item.label, lang)
        )}</a></li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml(site.seo.keywords)}" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="shell topbar">
        <a href="${withLang("/", lang)}" class="brand" aria-label="${escapeHtml(site.siteName)}">
          <div class="brand-mark" aria-hidden="true"></div>
          <div>
            <div class="brand-title">${escapeHtml(site.header.logoText || site.siteName)}</div>
            <div class="brand-subtitle">${escapeHtml(site.header.logoSubtext)}</div>
          </div>
        </a>
        <div class="header-meta">
          <span>${escapeHtml(site.header.phone)}</span>
          <span>${escapeHtml(site.header.email)}</span>
          <span class="lang-switch">
            <a href="${withLang(currentPath || activePath || "/", "en")}" class="${lang === "en" ? "is-active" : ""}">EN</a>
            <a href="${withLang(currentPath || activePath || "/", "zh")}" class="${lang === "zh" ? "is-active" : ""}">中文</a>
          </span>
        </div>
        <button class="menu-toggle" type="button" data-menu-toggle>${escapeHtml(t(lang, "menu"))}</button>
      </div>
      <div class="nav-wrap" data-nav-wrap>
        <nav class="shell main-nav">
          <ul class="nav-list">${nav}</ul>
        </nav>
      </div>
    </header>
    ${content}
    <footer class="footer">
      <div class="footer-top">
        <div class="shell footer-grid">${renderFooterGroups(site, lang)}</div>
      </div>
      <div class="footer-bottom">
        <div class="shell footer-base">
          <div>${escapeHtml(site.footer.copyright)}</div>
          <div>${escapeHtml(site.contact.address)}</div>
        </div>
      </div>
    </footer>
    <script src="/app.js"></script>
  </body>
</html>`;
};

const pageHero = (title, description, image, siteName) => `
  <section class="page-hero">
    <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
    <div class="page-hero-copy">
      <div class="shell">
        <div>
          <div class="hero-kicker">${escapeHtml(siteName)}</div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
        </div>
      </div>
    </div>
  </section>
`;

const homePage = (site, lang, currentPath) => {
  const heroSlides = site.heroSlides
    .map((slide) => {
      const hasCopy = Boolean(slide.title || slide.subtitle || slide.buttonText);
      const copyBlock = hasCopy
        ? `
          <div class="hero-copy">
            <div class="hero-copy-inner">
              ${site.tagline ? `<div class="hero-kicker">${escapeHtml(site.tagline)}</div>` : ""}
              ${slide.title ? `<h1>${escapeHtml(slide.title)}</h1>` : ""}
              ${slide.subtitle ? `<p>${escapeHtml(slide.subtitle)}</p>` : ""}
              ${
                slide.buttonText
                  ? `<div class="hero-actions"><a class="button-primary" href="${escapeHtml(
                      withLang(slide.buttonLink || "/products", lang)
                    )}">${escapeHtml(slide.buttonText || t(lang, "more"))}</a></div>`
                  : ""
              }
            </div>
          </div>`
        : "";

      return `
        <div class="hero-slide">
          <img src="${escapeHtml(slide.image)}" alt="${escapeHtml(slide.title || site.siteName)}" />
          ${copyBlock}
        </div>`;
    })
    .join("");

  const dots = site.heroSlides
    .map((_, index) => `<button class="hero-dot ${index === 0 ? "is-active" : ""}" data-hero-dot type="button"></button>`)
    .join("");

  const categories = site.categories
    .map(
      (category) => `
        <a class="category-card" id="${escapeHtml(category.slug)}" href="${withLang(`/products#${category.slug}`, lang)}">
          <strong>${escapeHtml(category.name)}</strong>
          <span>${escapeHtml(category.slug)}</span>
        </a>`
    )
    .join("");

  const products = site.products
    .slice(0, 8)
    .map(
      (product) => `
        <article class="card">
          <div class="card-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" /></div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(product.name)}</h3>
            <div class="card-text">${escapeHtml(product.summary)}</div>
            <p><a class="button-inline" href="${withLang(`/products/${product.slug}`, lang)}">${escapeHtml(t(lang, "more"))}</a></p>
          </div>
        </article>`
    )
    .join("");

  const news = site.news
    .slice(0, 2)
    .map(
      (item) => `
        <article class="news-card">
          <div class="news-card-media"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" /></div>
          <div class="news-card-body">
            <div class="news-date">${escapeHtml(item.date)}</div>
            <h3 class="news-title">${escapeHtml(item.title)}</h3>
            <div class="news-text">${escapeHtml(item.summary)}</div>
            <p><a class="button-inline" href="${withLang(`/news/${item.slug}`, lang)}">${escapeHtml(t(lang, "more"))}</a></p>
          </div>
        </article>`
    )
    .join("");

  const stats = site.about.stats
    .map((stat) => `<div class="stat"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`)
    .join("");

  const statsSection = stats ? `<div class="stats-grid">${stats}</div>` : "";

  return layout({
    title: site.seo.title || site.siteName,
    description: site.seo.description || site.tagline,
    activePath: "/",
    lang,
    currentPath,
    site,
    content: `
      <section class="hero" data-hero>
        <div class="hero-track" data-hero-track>${heroSlides}</div>
        <div class="hero-dots">${dots}</div>
      </section>
      <section class="section">
        <div class="shell">
          <div class="section-title">
            <span>${escapeHtml(t(lang, "about"))}</span>
            <h2>${escapeHtml(site.about.headline)}</h2>
            <p>${escapeHtml(site.about.summary)}</p>
          </div>
          <div class="about-layout">
            <div class="about-panel">
              <h3>${escapeHtml(site.about.subheadline)}</h3>
              ${site.about.story.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
              <p><a class="button-inline" href="${withLang("/about", lang)}">${escapeHtml(t(lang, "more"))}</a></p>
            </div>
            <div class="about-visual">
              <img src="${escapeHtml(site.about.image || pickHeroImage(site, 0))}" alt="${escapeHtml(site.about.headline)}" />
            </div>
          </div>
        </div>
      </section>
      <section class="section section-dark">
        <div class="shell">
          <div class="section-title">
            <span>${escapeHtml(t(lang, "product"))}</span>
            <h2>${escapeHtml(t(lang, "product"))}</h2>
          </div>
          <div class="category-grid">${categories}</div>
          <div class="product-grid">${products}</div>
          <div style="text-align:center;margin-top:32px;">
            <a class="button-ghost" href="${withLang("/products", lang)}">${escapeHtml(t(lang, "more"))}</a>
          </div>
        </div>
      </section>
      <section class="section" style="background:linear-gradient(180deg,#eff3fb,#ffffff);">
        <div class="shell">
          <div class="section-title">
            <span>${escapeHtml(t(lang, "news"))}</span>
            <h2>${escapeHtml(t(lang, "news"))}</h2>
          </div>
          <div class="news-grid">${news}</div>
          <div style="text-align:center;margin-top:32px;">
            <a class="button-inline" href="${withLang("/news", lang)}">${escapeHtml(t(lang, "more"))}</a>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="shell">
          <div class="section-title">
            <span>${escapeHtml(t(lang, "contact"))}</span>
            <h2>${escapeHtml(t(lang, "contact"))}</h2>
          </div>
          <div class="contact-grid">
            <article class="contact-card">
              <h3>${escapeHtml(site.contact.company)}</h3>
              <div class="contact-list">
                <div>TEL: ${escapeHtml(site.contact.phone)}</div>
                <div>MAIL: ${escapeHtml(site.contact.email)}</div>
                <div>ADDRESS: ${escapeHtml(site.contact.address)}</div>
                <div>WEBSITE: ${escapeHtml(site.contact.website)}</div>
              </div>
              <a class="button-primary" href="${escapeHtml(withLang(site.contact.ctaLink || "/guestbook", lang))}">${escapeHtml(
                site.contact.ctaText || t(lang, "leaveMessage")
              )}</a>
            </article>
            <div class="map-card">
              <img src="${escapeHtml(site.contact.mapImage || pickHeroImage(site, 0))}" alt="${escapeHtml(site.contact.company)}" />
            </div>
          </div>
          ${statsSection}
        </div>
      </section>
    `
  });
};

const aboutPage = (site, lang, currentPath) =>
  layout({
    title: `${site.about.headline} | ${site.siteName}`,
    description: site.about.summary || site.tagline,
    activePath: "/about",
    lang,
    currentPath,
    site,
    content: `
      ${pageHero(site.about.headline, site.about.subheadline, site.about.image || pickHeroImage(site, 1), site.siteName)}
      <main class="page-shell">
        <section class="page-grid">
          <article class="detail-panel">
            <h2 class="detail-title">${escapeHtml(site.about.headline)}</h2>
            <div class="body-copy">${escapeHtml(site.about.summary)}</div>
            ${
              site.about.richHtml
                ? `<div class="rich-text" style="margin-top:22px;">${site.about.richHtml}</div>`
                : `<div class="rich-text" style="margin-top:22px;">${site.about.story
                    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
                    .join("")}</div>`
            }
          </article>
        </section>
      </main>
    `
  });

const productsPage = (site, lang, currentPath) => {
  const categoryLookup = Object.fromEntries(site.categories.map((item) => [item.slug, item.name]));
  const productsByCategory = site.categories
    .map((category) => {
      const items = site.products.filter((product) => product.category === category.slug);
      if (!items.length) {
        return "";
      }

      return `
        <section id="${escapeHtml(category.slug)}">
          <div class="section-title" style="margin-bottom:24px;">
            <span>${escapeHtml(t(lang, "category"))}</span>
            <h2>${escapeHtml(category.name)}</h2>
          </div>
          <div class="product-grid">
            ${items
              .map(
                (product) => `
                  <article class="card" id="${escapeHtml(product.slug)}">
                    <div class="card-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" /></div>
                    <div class="card-body">
                      <div class="meta-line">${escapeHtml(categoryLookup[product.category] || product.category)}</div>
                      <h3 class="card-title">${escapeHtml(product.name)}</h3>
                      <div class="card-text">${escapeHtml(product.summary)}</div>
                      <p><a class="button-inline" href="${withLang(`/products/${product.slug}`, lang)}">${escapeHtml(t(lang, "more"))}</a></p>
                    </div>
                  </article>`
              )
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");

  return layout({
    title: `${t(lang, "product")} | ${site.siteName}`,
    description: "Product list and detail pages managed from admin.",
    activePath: "/products",
    lang,
    currentPath,
    site,
    content: `
      ${pageHero(t(lang, "product"), "Pharmaceutical, Column, Silica and Accessories.", pickHeroImage(site, 0), site.siteName)}
      <main class="page-shell">
        <section class="page-grid">
          <div class="category-grid">
            ${site.categories
              .map(
                (item) => `
                <a class="category-card" href="#${escapeHtml(item.slug)}">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml(item.slug)}</span>
                </a>`
              )
              .join("")}
          </div>
          ${productsByCategory}
        </section>
      </main>
    `
  });
};

const productDetailPage = (site, product, lang, currentPath) =>
  layout({
    title: `${product.name} | ${site.siteName}`,
    description: product.summary,
    activePath: "/products",
    lang,
    currentPath,
    site,
    content: `
      ${pageHero(product.name, product.summary, product.image || pickHeroImage(site, 0), site.siteName)}
      <main class="page-shell">
        <article class="detail-panel">
          <img class="detail-cover" src="${escapeHtml(product.image || pickHeroImage(site, 0))}" alt="${escapeHtml(product.name)}" />
          ${
            product.gallery && product.gallery.length > 0
              ? `<div class="product-gallery">${product.gallery
                  .map((img) => `<img src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}" />`)
                  .join("")}</div>`
              : ""
          }
          <h2 class="detail-title">${escapeHtml(product.name)}</h2>
          <div class="meta-line">${escapeHtml(product.category)}${product.date ? ` | ${escapeHtml(product.date)}` : ""}</div>
          ${
            product.author || product.source
              ? `<div class="meta-line">${escapeHtml(product.author || "")}${product.author && product.source ? " | " : ""}${escapeHtml(
                  product.source || ""
                )}</div>`
              : ""
          }
          <div class="rich-text" style="margin-top:20px;">
            ${product.richHtml || `<p>${escapeHtml(product.description)}</p>`}
          </div>
        </article>
      </main>
    `
  });

const newsPage = (site, lang, currentPath) => {
  const items = site.news
    .map(
      (item) => `
        <article class="news-card">
          <div class="news-card-media"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" /></div>
          <div class="news-card-body">
            <div class="news-date">${escapeHtml(item.date)}</div>
            <h2 class="news-title">${escapeHtml(item.title)}</h2>
            <div class="news-text">${escapeHtml(item.summary)}</div>
            <p><a class="button-inline" href="${withLang(`/news/${item.slug}`, lang)}">${escapeHtml(t(lang, "more"))}</a></p>
          </div>
        </article>`
    )
    .join("");

  return layout({
    title: `${t(lang, "news")} | ${site.siteName}`,
    description: t(lang, "companyUpdates"),
    activePath: "/news",
    lang,
    currentPath,
    site,
    content: `
      ${pageHero(t(lang, "news"), t(lang, "companyUpdates"), pickHeroImage(site, 1), site.siteName)}
      <main class="page-shell">
        <section class="news-grid">${items}</section>
      </main>
    `
  });
};

const newsDetailPage = (site, item, lang, currentPath) =>
  layout({
    title: `${item.title} | ${site.siteName}`,
    description: item.summary || item.title,
    activePath: "/news",
    lang,
    currentPath,
    site,
    content: `
      ${pageHero(item.title, item.summary || item.title, item.image || pickHeroImage(site, 1), site.siteName)}
      <main class="page-shell">
        <article class="detail-panel">
          <img class="detail-cover" src="${escapeHtml(item.image || pickHeroImage(site, 1))}" alt="${escapeHtml(item.title)}" />
          <div class="news-date">${escapeHtml(item.date)}</div>
          ${
            item.author || item.source
              ? `<div class="meta-line">${escapeHtml(item.author || "")}${item.author && item.source ? " | " : ""}${escapeHtml(
                  item.source || ""
                )}</div>`
              : ""
          }
          <h2 class="detail-title">${escapeHtml(item.title)}</h2>
          <div class="rich-text">
            ${item.richHtml || `<p>${escapeHtml(item.content)}</p>`}
          </div>
        </article>
      </main>
    `
  });

const downloadsPage = (site, lang, currentPath) =>
  layout({
    title: `${t(lang, "download")} | ${site.siteName}`,
    description: t(lang, "productCatalog"),
    activePath: "/downloads",
    lang,
    currentPath,
    site,
    content: `
      ${pageHero(t(lang, "download"), t(lang, "productCatalog"), pickHeroImage(site, 2), site.siteName)}
      <main class="page-shell">
        ${
          site.downloads.length && site.downloads[0].richHtml
            ? `<article class="detail-panel" style="margin-bottom:24px;"><div class="rich-text">${site.downloads[0].richHtml}</div></article>`
            : ""
        }
        <section class="download-grid">
          ${site.downloads
            .map(
              (item) => `
                <article class="download-card">
                  <div class="download-date">${escapeHtml(item.date)}</div>
                  <h2 class="news-title">${escapeHtml(item.title)}</h2>
                  <div class="download-text">${escapeHtml(item.summary)}</div>
                  <p><a class="button-inline" target="_blank" rel="noreferrer" href="${escapeHtml(item.url)}">${escapeHtml(
                    t(lang, "download")
                  )}</a></p>
                </article>`
            )
            .join("")}
        </section>
      </main>
    `
  });

const contactPage = (site, lang, currentPath) =>
  layout({
    title: `${t(lang, "contact")} | ${site.siteName}`,
    description: t(lang, "getInTouch"),
    activePath: "/contact",
    lang,
    currentPath,
    site,
    content: `
      ${pageHero(t(lang, "contact"), t(lang, "getInTouch"), site.contact.mapImage || pickHeroImage(site, 0), site.siteName)}
      <main class="page-shell">
        <section class="contact-grid">
          <article class="contact-card">
            <h3>${escapeHtml(site.contact.company)}</h3>
            <div class="contact-list">
              <div>TEL: ${escapeHtml(site.contact.phone)}</div>
              <div>EMAIL: ${escapeHtml(site.contact.email)}</div>
              <div>ADDRESS: ${escapeHtml(site.contact.address)}</div>
              <div>WEBSITE: ${escapeHtml(site.contact.website)}</div>
            </div>
            ${site.contact.richHtml ? `<div class="rich-text">${site.contact.richHtml}</div>` : ""}
            <a class="button-primary" href="${escapeHtml(withLang(site.contact.ctaLink || "/guestbook", lang))}">${escapeHtml(
              site.contact.ctaText || t(lang, "leaveMessage")
            )}</a>
          </article>
          <div class="map-card">
            <img src="${escapeHtml(site.contact.mapImage || pickHeroImage(site, 0))}" alt="${escapeHtml(site.contact.company)}" />
          </div>
        </section>
      </main>
    `
  });

const notFoundPage = (site, lang, currentPath) =>
  layout({
    title: `Not Found | ${site.siteName}`,
    description: "Requested page is not available.",
    activePath: "",
    lang,
    currentPath,
    site,
    content: `
      <main class="page-shell">
        <article class="detail-panel">
          <h1 class="detail-title">404</h1>
          <p class="body-copy">${escapeHtml(t(lang, "notFoundDesc"))}</p>
          <p><a class="button-primary" href="${withLang("/", lang)}">${escapeHtml(t(lang, "backHome"))}</a></p>
        </article>
      </main>
    `
  });

const toSummary = (value, max = 140) => {
  const text = stripHtml(value || "");
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}...`;
};

const toDisplayDate = (value) => {
  const raw = asString(value).trim();
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : raw;
};

const localAssetUrl = (input) => {
  const raw = asString(input).trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("/uploads/") || raw.startsWith("/assets/")) {
    return raw;
  }
  if (/^(mailto:|tel:|javascript:|data:)/i.test(raw)) {
    return raw;
  }
  const asAssetPath = (pathname, search = "") => {
    if (/^\/(skin|static|core)\//i.test(pathname)) {
      return `/assets/alcochrom${pathname}${search || ""}`;
    }
    return `${pathname}${search || ""}`;
  };

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (u.hostname.toLowerCase() === "www.alcochrom.com") {
        return asAssetPath(u.pathname, u.search);
      }
      return raw;
    } catch (error) {
      return raw;
    }
  }

  if (raw.startsWith("/")) {
    return asAssetPath(raw);
  }

  return raw;
};

const localizeRichHtmlAssets = (html = "", lang = "en") => {
  let output = asString(html);
  output = output.replace(/\b(src|href)=["']([^"']+)["']/gi, (full, attr, url) => {
    const value = asString(url).trim();
    if (!value) {
      return full;
    }
    if (
      value.startsWith("/ABOUT") ||
      value.startsWith("/about") ||
      value.startsWith("/PRODUCT") ||
      value.startsWith("/products") ||
      value.startsWith("/NEWS") ||
      value.startsWith("/news") ||
      value.startsWith("/download") ||
      value.startsWith("/contact") ||
      value.startsWith("/list_") ||
      value.startsWith("/lm") ||
      value.startsWith("/gongsi") ||
      value.startsWith("/hangye")
    ) {
      return `${attr}="${withLang(value, lang)}"`;
    }
    return `${attr}="${localAssetUrl(value)}"`;
  });
  output = output.replace(/url\(([^)]+)\)/gi, (full, value) => {
    const cleaned = asString(value).trim().replace(/^['"]|['"]$/g, "");
    if (!cleaned || cleaned.startsWith("data:")) {
      return full;
    }
    return `url(${localAssetUrl(cleaned)})`;
  });
  return output;
};

const templateCopyHtml = (value = "") => escapeHtml(asString(value)).replace(/\r?\n/g, "<br>");

const templateBackgroundStyle = (block) => {
  const image = localAssetUrl(block.image);
  if (block.template === "text-only" || !image) {
    return "background:#f5f7fb;";
  }
  if (block.template === "split-left") {
    return `background-image:url(${image});background-size:50% 100%;background-position:left center;background-repeat:no-repeat;background-color:#f5f7fb;`;
  }
  if (block.template === "split-right") {
    return `background-image:url(${image});background-size:50% 100%;background-position:right center;background-repeat:no-repeat;background-color:#f5f7fb;`;
  }
  if (block.template === "banner-center") {
    return `background-image:url(${image});background-size:contain;background-position:center center;background-repeat:no-repeat;background-color:#f5f7fb;`;
  }
  return `background-image:url(${image});background-size:cover;background-position:center center;background-repeat:no-repeat;background-color:#f5f7fb;`;
};

const renderTemplateBlocks = (blocks) => {
  const list = normalizeTemplateBlocks(blocks).filter((item) => item.enabled === 1);
  if (!list.length) {
    return "";
  }
  return `<div class="x-template-stack">${list
    .map((block) => {
      const align = block.align || "left";
      const titleStyle = `left:${block.titleX}%;top:${block.titleY}%;width:${block.titleWidth}%;font-family:${escapeHtml(
        block.titleFont
      )};font-size:${block.titleSize}px;color:${escapeHtml(block.titleColor)};text-align:${align};`;
      const bodyStyle = `left:${block.bodyX}%;top:${block.bodyY}%;width:${block.bodyWidth}%;font-family:${escapeHtml(
        block.bodyFont
      )};font-size:${block.bodySize}px;color:${escapeHtml(block.bodyColor)};text-align:${align};`;
      return `<section class="x-template x-template-${block.template}" style="height:${block.height}px;${templateBackgroundStyle(block)}">
        <div class="x-template-mask" style="background:${escapeHtml(block.overlay)};"></div>
        ${block.title ? `<div class="x-template-title" style="${titleStyle}">${templateCopyHtml(block.title)}</div>` : ""}
        ${block.body ? `<div class="x-template-body" style="${bodyStyle}">${templateCopyHtml(block.body)}</div>` : ""}
      </section>`;
    })
    .join("")}</div>`;
};

const composeDetailContent = (richHtml, blocks, lang) => {
  const blockHtml = renderTemplateBlocks(blocks);
  const bodyHtml = localizeRichHtmlAssets(richHtml || "", lang);
  return `${blockHtml}${bodyHtml}`;
};

const pageHrefByKey = {
  home: "/",
  about: "/about",
  product: "/products",
  news: "/news",
  download: "/downloads",
  contact: "/contact"
};

const langThemeAssets = {
  en: {
    logo: "/static/upload/image/20221116/1668593341428641.png",
    innerHero: "/static/upload/image/20220923/1663919576870343.jpg",
    productTitleImage: "/skin/images/1663932018561226.png",
    newsTitleImage: "/skin/images/1663985333355449.png",
    contactPanelImage: "/static/upload/image/20220924/1663991114408447.png",
    formImage: {
      about: "",
      product: "/skin/images/1663932018561226.png",
      news: "/skin/images/1663985333355449.png",
      download: "",
      contact: ""
    },
    footerQr: "",
    newsImage: "/static/upload/image/20230314/1678801250130639.jpg"
  },
  zh: {
    logo: "/static/upload/image/20220924/1663996002876769.png",
    innerHero: "/static/upload/image/20220923/1663919576870343.jpg",
    productTitleImage: "/static/upload/image/20220923/1663932018561225.png",
    newsTitleImage: "/static/upload/image/20220924/1663985333355448.png",
    contactPanelImage: "/skin/images/1663991114408448.png",
    formImage: {
      about: "",
      product: "/static/upload/image/20220923/1663932018561225.png",
      news: "/static/upload/image/20220924/1663985333355448.png",
      download: "",
      contact: ""
    },
    footerQr: "/static/upload/image/20230302/1677734980136710.jpg",
    newsImage: "/static/upload/image/20230314/1678800906375987.jpg"
  }
};

const zhProductFallbackMap = {
  "as-series": {
    name: "AS 系列",
    categoryKey: "lm1",
    categoryLabel: "液相色谱柱",
    image: "/static/upload/image/20230420/1682005691923769.jpg",
    gallery: ["/static/upload/image/20230420/1682005709463019.jpg"],
    summary: "ALCOEN 品牌分析级液相色谱柱，适配多种液相系统。"
  },
  "ps-series": {
    name: "PS 系列",
    categoryKey: "lm1",
    categoryLabel: "液相色谱柱",
    image: "/static/upload/image/20230420/1682005471368620.jpg",
    gallery: ["/static/upload/image/20230420/1682005483242488.jpg"],
    summary: "高性能分离柱型，适用于常规分析与方法开发。"
  },
  "hs-series": {
    name: "HS 系列",
    categoryKey: "lm1",
    categoryLabel: "液相色谱柱",
    image: "/static/upload/image/20221229/1672295426769180.jpg",
    gallery: ["/static/upload/image/20230420/1682005158941366.jpg"],
    summary: "常用分析级液相色谱柱，兼顾稳定性与重现性。"
  },
  "nave-series": {
    name: "NAVE 系列",
    categoryKey: "lm2",
    categoryLabel: "液相色谱填料",
    image: "/static/upload/image/20221229/1672295536662838.jpg",
    gallery: [
      "/static/upload/image/20221229/1672295806443656.jpg",
      "/static/upload/image/20221229/1672295799819700.jpg",
      "/static/upload/image/20221229/1672295802533992.jpg"
    ],
    summary: "制备级与闪蒸液相硅胶填料系列。"
  },
  "alcoen-accessories": {
    name: "ALCOEN 配件",
    categoryKey: "lm3",
    categoryLabel: "液相色谱配件",
    image: "/static/upload/image/20230315/1678895271917821.jpg",
    gallery: ["/static/upload/image/20221229/1672295869756969.jpg", "/static/upload/image/20221229/1672295872599678.jpg"],
    summary: "色谱柱、连接件、在线过滤器等配件产品。"
  }
};

const zhProductCategories = [
  { slug: "lm1", name: "液相色谱柱" },
  { slug: "lm2", name: "液相色谱填料" },
  { slug: "lm3", name: "液相色谱配件" }
];

const zhNewsCategories = [
  { slug: "gongsi", name: "公司新闻" },
  { slug: "hangye", name: "行业新闻" }
];

const langTheme = (lang) => (lang === "zh" ? langThemeAssets.zh : langThemeAssets.en);

const sectionHeadingLabel = (sectionKey, lang) => {
  const labels = {
    about: { en: "ABOUT US", zh: "\u5173\u4e8e\u6211\u4eec" },
    product: { en: "PRODUCT CENTER", zh: "\u4ea7\u54c1\u4e2d\u5fc3" },
    news: { en: "NEWS CENTER", zh: "\u65b0\u95fb\u4e2d\u5fc3" },
    download: { en: "DOWNLOAD CENTER", zh: "\u4e0b\u8f7d\u4e2d\u5fc3" },
    contact: { en: "CONTACT US", zh: "\u8054\u7cfb\u6211\u4eec" }
  };
  const key = asString(sectionKey).toLowerCase();
  const entry = asObject(labels[key]);
  if (!Object.keys(entry).length) {
    return lang === "zh" ? "\u680f\u76ee\u6807\u9898" : "SECTION TITLE";
  }
  return asString(entry[lang] || entry.en);
};

const parseSpecRows = (rows) =>
  asArray(rows)
    .map((line) => normalizeBrandArtifacts(asString(line).trim()))
    .filter(Boolean)
    .map((line) => {
      const divider = line.includes("|") ? "|" : line.includes(":") ? ":" : "";
      if (!divider) {
        return { label: normalizeBrandArtifacts(line), value: "" };
      }
      const idx = line.indexOf(divider);
      return {
        label: normalizeBrandArtifacts(line.slice(0, idx).trim()),
        value: normalizeBrandArtifacts(line.slice(idx + 1).trim())
      };
    });

const zhProductFallbackMapSafe = {
  "as-series": {
    name: "AS \u7cfb\u5217",
    categoryKey: "lm1",
    categoryLabel: "\u6db2\u76f8\u8272\u8c31\u67f1",
    image: "/static/upload/image/20230420/1682005691923769.jpg",
    gallery: ["/static/upload/image/20230420/1682005709463019.jpg"],
    summary: "ALCOEN brand analytical-grade chromatographic columns are compatible with various chromatographs and are often used in a\u00b7\u00b7\u00b7"
  },
  "ps-series": {
    name: "PS \u7cfb\u5217",
    categoryKey: "lm1",
    categoryLabel: "\u6db2\u76f8\u8272\u8c31\u67f1",
    image: "/static/upload/image/20230420/1682005471368620.jpg",
    gallery: ["/static/upload/image/20230420/1682005483242488.jpg"],
    summary: "ALCOEN brand analytical-grade chromatographic columns are compatible with various chromatographs and are often used in a\u00b7\u00b7\u00b7"
  },
  "hs-series": {
    name: "HS \u7cfb\u5217",
    categoryKey: "lm1",
    categoryLabel: "\u6db2\u76f8\u8272\u8c31\u67f1",
    image: "/static/upload/image/20221229/1672295426769180.jpg",
    gallery: ["/static/upload/image/20230420/1682005158941366.jpg"],
    summary: "ALCOEN brand analytical-grade chromatographic columns are compatible with various chromatographs and are often used in a\u00b7\u00b7\u00b7"
  },
  "nave-series": {
    name: "NAVE \u7cfb\u5217",
    categoryKey: "lm2",
    categoryLabel: "\u6db2\u76f8\u8272\u8c31\u586b\u6599",
    image: "/static/upload/image/20221229/1672295536662838.jpg",
    gallery: [
      "/static/upload/image/20221229/1672295806443656.jpg",
      "/static/upload/image/20221229/1672295799819700.jpg",
      "/static/upload/image/20221229/1672295802533992.jpg"
    ],
    summary: "ALCOEN 2023 Product ListSilica Gel for Preparative & Flash Liquid Chromatography"
  },
  "alcoen-accessories": {
    name: "ALCOEN \u914d\u4ef6",
    categoryKey: "lm3",
    categoryLabel: "\u6db2\u76f8\u8272\u8c31\u914d\u4ef6",
    image: "/static/upload/image/20230315/1678895271917821.jpg",
    gallery: ["/static/upload/image/20221229/1672295869756969.jpg", "/static/upload/image/20221229/1672295872599678.jpg"],
    summary:
      "\u6db2\u76f8\u8272\u8c31\u67f1\u7a7a\u67f1\u7ba1-\u5206\u6790\u7ea7\u6db2\u76f8\u8272\u8c31\u67f1\u7a7a\u67f1\u7ba1-\u534a\u5236\u5907\u7ea7\u6db2\u76f8\u8272\u8c31\u67f1\u7a7a\u67f1\u7ba1-\u5236\u5907\u7ea74.6mm/2.1mm;50-250mm;\u67f1\u957f\u53ef\u8ba2\u523610/20/30mm;\u67f1\u957f\u53ef\u8ba2\u00b7\u00b7\u00b7"
  }
};

const zhProductCategoriesSafe = [
  { slug: "lm1", name: "\u6db2\u76f8\u8272\u8c31\u67f1" },
  { slug: "lm2", name: "\u6db2\u76f8\u8272\u8c31\u586b\u6599" },
  { slug: "lm3", name: "\u6db2\u76f8\u8272\u8c31\u914d\u4ef6" }
];

const isBrokenLocalizedText = (value) => {
  const text = asString(value).trim();
  if (!text) {
    return true;
  }
  const qCount = (text.match(/\?/g) || []).length;
  return qCount >= 2 || qCount / Math.max(1, text.length) > 0.2;
};

const preferLocalizedText = (primary, fallback, base = "") => {
  if (!isBrokenLocalizedText(primary)) {
    return asString(primary);
  }
  if (!isBrokenLocalizedText(fallback)) {
    return asString(fallback);
  }
  return asString(base);
};

const localizedProducts = (site, lang) => {
  const allProducts = asArray(site.products).map((item) => ({ ...item }));

  if (lang !== "zh") {
    return allProducts.map((item) => ({
      ...item,
      name: normalizeBrandArtifacts(item.name),
      summary: normalizeBrandArtifacts(item.summary),
      description: normalizeBrandArtifacts(item.description),
      categoryKey: asString(item.category),
      categoryLabel: asString(item.categoryName || item.category),
      specRowsComputed: parseSpecRows(item.specRows),
      downloadLinkComputed: item.downloadLink || "/downloads",
      layoutBlocksResolved: normalizeTemplateBlocks(item.layoutBlocks)
    }));
  }

  const zhCandidates = allProducts.filter((item) => !String(item.category).includes("25"));
  const source = zhCandidates.length ? zhCandidates : allProducts;
  const categoryLabelByKey = zhProductCategoriesSafe.reduce((acc, item) => {
    acc[item.slug] = item.name;
    return acc;
  }, {});

  const zhMapped = source.map((item) => {
    const fallback = zhProductFallbackMapSafe[item.slug] || {};
    const mappedCategoryKey =
      asString(item.categoryKeyZh) ||
      fallback.categoryKey ||
      (String(item.category).includes("22") ? "lm1" : String(item.category).includes("23") ? "lm2" : "lm3");
    const mappedCategoryLabel = fallback.categoryLabel || categoryLabelByKey[mappedCategoryKey] || mappedCategoryKey;
    const fallbackGallery = asArray(fallback.gallery);
    const zhGallery = asArray(item.galleryZh).length
      ? asArray(item.galleryZh)
      : fallbackGallery.length
        ? fallbackGallery
        : asArray(item.gallery);
    const zhSpecs = parseSpecRows(asArray(item.specRowsZh).length ? item.specRowsZh : item.specRows);
    return {
      ...item,
      name: normalizeBrandArtifacts(preferLocalizedText(item.nameZh, fallback.name, item.name)),
      summary: normalizeBrandArtifacts(preferLocalizedText(item.summaryZh, fallback.summary, item.summary)),
      description: normalizeBrandArtifacts(preferLocalizedText(item.descriptionZh, fallback.summary, item.description)),
      richHtml: item.richHtmlZh || item.richHtml,
      image: item.imageZh || fallback.image || item.image,
      gallery: zhGallery,
      categoryKey: mappedCategoryKey,
      categoryLabel: mappedCategoryLabel,
      specRowsComputed: zhSpecs,
      downloadLinkComputed: item.downloadLinkZh || item.downloadLink || "/downloads",
      layoutBlocksResolved: normalizeTemplateBlocks(
        asArray(item.layoutBlocksZh).length ? item.layoutBlocksZh : item.layoutBlocks
      )
    };
  });
  const zhOrder = ["as-series", "ps-series", "hs-series", "nave-series", "alcoen-accessories"];
  return zhMapped.sort((a, b) => {
    const ai = zhOrder.indexOf(a.slug);
    const bi = zhOrder.indexOf(b.slug);
    const av = ai === -1 ? 999 : ai;
    const bv = bi === -1 ? 999 : bi;
    if (av !== bv) {
      return av - bv;
    }
    return asInt(a.id, 0) - asInt(b.id, 0);
  });
};

const localizedNews = (site, lang) => {
  const base = asArray(site.news);
  if (lang !== "zh") {
    return base.map((item) => ({
      ...item,
      layoutBlocksResolved: normalizeTemplateBlocks(item.layoutBlocks)
    }));
  }
  if (!base.length) {
    return [
      {
        title: "VOLUNTARY ANNOUNCEMENT",
        slug: "voluntary-announcement",
        date: "2023-03-14",
        summary: "VOLUNTARY ANNOUNCEMENT",
        content: "VOLUNTARY ANNOUNCEMENT",
        image: langThemeAssets.zh.newsImage,
        richHtml: `<p><img src="${langThemeAssets.zh.newsImage}" alt="VOLUNTARY ANNOUNCEMENT" /></p>`
      }
    ];
  }
  return base.map((item, index) => {
    const resolved = index === 0 ? { ...item, image: langThemeAssets.zh.newsImage } : { ...item };
    resolved.layoutBlocksResolved = normalizeTemplateBlocks(
      asArray(resolved.layoutBlocksZh).length ? resolved.layoutBlocksZh : resolved.layoutBlocks
    );
    return resolved;
  });
};

const buildClassicNavItems = (lang) => [
  { key: "home", label: t(lang, "home"), href: pageHrefByKey.home, children: [] },
  { key: "about", label: t(lang, "about"), href: pageHrefByKey.about, children: [] },
  { key: "product", label: t(lang, "product"), href: pageHrefByKey.product, children: [] },
  { key: "news", label: t(lang, "news"), href: pageHrefByKey.news, children: [] },
  { key: "download", label: t(lang, "download"), href: pageHrefByKey.download, children: [] },
  { key: "contact", label: t(lang, "contact"), href: pageHrefByKey.contact, children: [] }
];

const getClassicLogo = (site, lang) => {
  if (fs.existsSync(customLogoFsPath)) {
    return customLogoWebPath;
  }
  const themed = langTheme(lang).logo;
  if (themed) {
    return localAssetUrl(themed);
  }
  if (site && site.canonical && site.canonical.site && site.canonical.site.logo) {
    return localAssetUrl(site.canonical.site.logo);
  }
  if (site && site.header && site.header.logo) {
    return localAssetUrl(site.header.logo);
  }
  return localAssetUrl("/static/upload/image/20221116/1668593341428641.png");
};

const productChildrenForLang = (site, lang) =>
  (lang === "zh" ? zhProductCategories : asArray(site.categories)).map((item) => ({
    slug: item.slug,
    href: withLang(`/products?cat=${encodeURIComponent(item.slug)}`, lang),
    label: item.name
  }));

const newsChildrenForLang = (site, lang) =>
  (lang === "zh" ? zhNewsCategories : asArray(site.news).slice(0, 2))
    .map((item) => ({
      slug: item.slug,
      href: withLang(`/news#${item.slug}`, lang),
      label: item.name || item.title
    }));

const renderClassicHeader = (site, lang, activeKey, currentPath) => {
  const navItems = buildClassicNavItems(lang);
  const productChildren = productChildrenForLang(site, lang);
  const newsChildren = newsChildrenForLang(site, lang);
  const logo = getClassicLogo(site, lang);
  const isCustomLogo = logo === customLogoWebPath;

  const navHtml = navItems
    .map((item) => {
      const children = item.key === "product" ? productChildren : item.key === "news" && lang === "zh" ? newsChildren : [];
      const childHtml = children.length
        ? `<ul class="h-sub">${children
            .map((child) => `<li><a href="${child.href}">${escapeHtml(child.label)}</a></li>`)
            .join("")}</ul>`
        : "";
      return `<li class="h-g ${item.key === activeKey ? "active" : ""}"><a href="${withLang(item.href, lang)}" class="h-h">${escapeHtml(
        item.label
      )}</a>${childHtml}</li>`;
    })
    .join("");

  return `
  <div class="header">
    <div class="h-a">
      <a href="${withLang("/", lang)}" class="h-b"><img src="${logo}" alt="logo" class="h-c${isCustomLogo ? " h-c-custom" : ""}" /></a>
      <a href="${withLang(currentPath || "/", "zh")}" class="${lang === "zh" ? "active" : ""} bilingual">中文</a>&nbsp;&nbsp;&nbsp;
      <a href="${withLang(currentPath || "/", "en")}" class="${lang === "en" ? "active" : ""} bilingual">English</a>
      <a class="h-menu" title="${escapeHtml(t(lang, "menu"))}"></a>
    </div>
    <div class="h-e">
      <ul class="h-f">${navHtml}</ul>
    </div>
    <div class="h-opa"></div>
  </div>`;
};

const renderClassicFooter = (site, lang) => {
  const nav = buildClassicNavItems(lang);
  const productChildren = productChildrenForLang(site, lang);
  const newsChildren = newsChildrenForLang(site, lang);
  const friendlyLinks = asArray(site.footer.links);
  const themedQr = langTheme(lang).footerQr;
  const qrImage = fs.existsSync(customFooterQrFsPath)
    ? customFooterQrWebPath
    : themedQr || site.contact.mapImage || "";
  return `
  <div class="footer" style="background-image: url(${localAssetUrl("/skin/images/footbg.jpg")});">
    <div class="f-a">
      <div class="f-b">
        ${nav
          .filter((item) => item.key !== "home")
          .map((item) => {
            const children = item.key === "product" ? productChildren : item.key === "news" && lang === "zh" ? newsChildren : [];
            const aboutLinks =
              item.key === "about"
                ? friendlyLinks
                    .map(
                      (link) =>
                        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer" class="f-f f-f-inline">${escapeHtml(link.label)}</a>`
                    )
                    .join("")
                : "";
            return `<div class="f-c"><a href="${withLang(item.href, lang)}" class="f-d">${escapeHtml(item.label)}</a><div class="f-e">${children
              .map((child) => `<a href="${child.href}" class="f-f">${escapeHtml(child.label)}</a>`)
              .join("")}${aboutLinks}</div></div>`;
          })
          .join("")}
        <div class="f-g">${qrImage ? `<div class="f-h f-h1"><img src="${localAssetUrl(qrImage)}" alt="QR" class="f-i"></div>` : ""}</div>
      </div>
    </div>
  </div>`;
};

const classicInitScript = `
<script>
  (function () {
    if (!window.Swiper) return;
    if (document.querySelector('.a-a')) {
      new Swiper('.a-a', { preventClicks: false, autoHeight: true, pagination: '.swiper-pagination', paginationClickable: true, autoplay: 4500, loop: true });
    }
    if (document.querySelector('.b-e')) {
      new Swiper('.b-e', { preventClicks: false, autoHeight: true, slidesPerView: 'auto', breakpoints: { 900: { preventClicks: true } } });
    }
    if (document.querySelector('.s-b')) {
      new Swiper('.s-b', { loop: true, pagination: '.swiper-pagination', paginationClickable: true, autoHeight: true, prevButton: '.swiper-button-prev', nextButton: '.swiper-button-next', effect: 'fade', breakpoints: { 500: { effect: 'slide' } } });
    }
  })();
</script>`;

const classicLayout = ({ site, lang, title, description, activeKey, currentPath, content }) => `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, minimal-ui" />
  <title>${escapeHtml(title)}</title>
  <meta name="keywords" content="${escapeHtml(site.seo.keywords)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black"/>
  <meta name="format-detection" content="telephone=no, email=no"/>
  <link href="${localAssetUrl("/skin/css/swiper.min.css")}" type="text/css" rel="stylesheet"/>
  <link href="${localAssetUrl("/skin/css/style.css")}" type="text/css" rel="stylesheet"/>
  <style>
    .b-a:after { background-image: url(${localAssetUrl("/skin/images/bg1.jpg")}); }
    @media(min-width: 900px) { .h-e { width:100%; background-image: url(${localAssetUrl("/skin/images/navbg.jpg")}); } }
    .h-b { height: .66rem; overflow: hidden; }
    .h-c { display: block; width: 100%; height: 100%; object-fit: contain; }
    .h-c-custom { transform: scale(1.22); transform-origin: left center; }
    @media(max-width: 900px) {
      .h-b { height: 20px; }
      .h-c { width: 100%; height: 100%; }
      .h-c-custom { transform: scale(1.25); transform-origin: left center; }
    }
    .k-visual { width: 6.4rem; height: 4rem; background: #fff; position: relative; overflow: hidden; }
    .k-visual .k-e { width: 100%; height: 100%; object-fit: contain; display: block; }
    @media(max-width: 900px) {
      .k-visual { width: 100%; height: auto; aspect-ratio: 16 / 10; }
    }
    .j-dx {
      width: 3.34rem;
      height: .56rem;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      color: #1b3065;
      font-size: .26rem;
      font-weight: 700;
      letter-spacing: .02rem;
      text-transform: uppercase;
      line-height: 1;
    }
    .j-dx:after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      width: 2.2rem;
      height: 1px;
      background: rgba(27, 48, 101, .45);
    }
    @media(max-width: 900px) {
      .j-dx {
        width: 220px;
        height: 42px;
        font-size: 20px;
        letter-spacing: 1px;
      }
    }
    .x-template-stack { margin-bottom: .26rem; display: grid; gap: .18rem; }
    .x-template { position: relative; overflow: hidden; border: 1px solid rgba(11, 31, 68, .12); }
    .x-template-mask { position: absolute; inset: 0; pointer-events: none; }
    .x-template-title,
    .x-template-body { position: absolute; z-index: 1; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .x-template-title { font-weight: 700; }
    .f-f-inline {
      display: inline-block;
      width: auto;
      margin-right: .26rem;
      margin-bottom: .08rem;
      white-space: nowrap;
    }
    .f-f-inline:last-child { margin-right: 0; }
    @media(max-width: 900px) {
      .x-template { height: auto !important; min-height: 2.2rem; }
      .x-template-title,
      .x-template-body { width: 86% !important; left: 7% !important; }
      .f-f-inline { margin-right: 12px; white-space: normal; }
    }
  </style>
  <script src="${localAssetUrl("/skin/js/jquery.js")}"></script>
  <script src="${localAssetUrl("/skin/js/layer.js")}"></script>
</head>
<body>
${renderClassicHeader(site, lang, activeKey, currentPath)}
<div class="main">${content}</div>
${renderClassicFooter(site, lang)}
<script src="${localAssetUrl("/skin/js/ifie8.js")}"></script>
<script src="${localAssetUrl("/skin/js/fastclick.js")}"></script>
<script src="${localAssetUrl("/skin/js/placeholder.min.js")}"></script>
<script src="${localAssetUrl("/skin/js/swiper-3.4.1.min.js")}"></script>
<script src="${localAssetUrl("/skin/js/js.js")}"></script>
${classicInitScript}
</body>
</html>`;

const renderClassicCrumb = (site, lang, crumbLabel, activeKey, subLinks = [], options = {}) => `
<div class="g-a">
  <div class="g-b">
    <div class="g-c"><a href="${withLang("/", lang)}">${escapeHtml(t(lang, "home"))}</a> >> <a href="${withLang(pageHrefByKey[activeKey], lang)}">${escapeHtml(
      crumbLabel
    )}</a>${options.extraCrumb ? ` >> <a href="${options.extraCrumb.href}">${escapeHtml(options.extraCrumb.label)}</a>` : ""}</div>
    <div class="g-e">${subLinks
      .map((item) => `<a class="g-f ${item.slug === options.activeSubSlug ? "active" : ""}" href="${item.href}">${escapeHtml(item.label)}</a>`)
      .join("")}</div>
  </div>
</div>`;

const renderClassicFormBar = (site, lang, sectionKey, imageUrl) => {
  const heading = sectionHeadingLabel(sectionKey, lang);
  return `<div class="j-c"><div class="j-dx">${escapeHtml(heading)}</div>
  <form class="j-e" name="formsearch" action="${withLang("/products", lang)}" method="get">
    <input type="text" class="j-f" name="keyword" id="keyw" placeholder="search">
    <input type="submit" id="articlesub" class="j-g j-search" value=''>
  </form>
</div>`;
};

const renderClassicPagebar = (currentPage, totalPages, hrefForPage) => {
  const safeTotal = Math.max(1, asInt(totalPages, 1));
  const safeCurrent = Math.min(safeTotal, Math.max(1, asInt(currentPage, 1)));
  const pageLinks = Array.from({ length: safeTotal }, (_, idx) => {
    const page = idx + 1;
    const cls = page === safeCurrent ? "page-num page-num-current" : "page-num";
    return `<a href="${hrefForPage(page)}" class="${cls}">${page}</a>`;
  }).join("");
  const prevHref = safeCurrent > 1 ? hrefForPage(safeCurrent - 1) : "javascript:;";
  const nextHref = safeCurrent < safeTotal ? hrefForPage(safeCurrent + 1) : "javascript:;";
  return `<div class="pagebar"><div class="pagination">
    <a class="page-item page-link st" href="${prevHref}" title="上一页"><<</a>
    ${pageLinks}
    <a class="page-item page-link" href="javascript:;" title="当前页/总页数">${safeCurrent}/${safeTotal}</a>
    <a class="page-item page-link st" href="${nextHref}" title="下一页">>></a>
    </div></div>`;
};

const classicHomePage = (site, lang, currentPath) =>
{
  const products = localizedProducts(site, lang);
  const news = localizedNews(site, lang);
  const theme = langTheme(lang);
  return classicLayout({
    site,
    lang,
    title: site.seo.title,
    description: site.seo.description,
    activeKey: "home",
    currentPath,
    content: `
      <div class="swiper-container a-a"><div class="swiper-wrapper">
        ${site.heroSlides
          .map((slide) => `<div class="swiper-slide"><a class="a-b a-b1" style="background-image:url(${localAssetUrl(slide.image)});"></a></div>`)
          .join("")}
      </div><div class="swiper-pagination"></div></div>
      <div class="swiper-container a-a2"><div class="swiper-wrapper"></div><div class="swiper-pagination"></div></div>
      <div class="b-a"><div class="b-b">
        <div class="b-c teaser"><img src="${localAssetUrl(theme.productTitleImage)}" alt="bg" class="b-d"></div>
        <div class="swiper-container b-e"><div class="swiper-wrapper">
          ${products
            .map(
              (product) => `<div class="swiper-slide b-o teaser"><a href="${withLang(`/products/${product.slug}`, lang)}" class="b-f">
            <div class="b-g"><img src="${localAssetUrl(product.image)}" alt="${escapeHtml(product.name)}" class="b-h"></div>
            <div class="b-i"><div class="b-j">${escapeHtml(product.name)}</div><div class="b-k">${escapeHtml(toSummary(product.summary, 120))}</div></div>
          </a></div>`
            )
            .join("")}
        </div></div>
        <div class="b-l teaser"></div>
        <div class="b-m teaser"><a class="b-n" href="${withLang("/products", lang)}" style="border:1px solid #fff">${escapeHtml(t(lang, "more"))}</a></div>
      </div></div>
      <div class="d-a" style="background-image:url(${localAssetUrl("/skin/images/newsbg.png")});"><div class="d-b">
        <div class="d-c teaser"><img src="${localAssetUrl(theme.newsTitleImage)}" alt="bg" class="d-d" style="filter:drop-shadow(0 0 1px #fff);"></div>
        <div class="d-e">${news
          .slice(0, 3)
          .map(
            (item) => `<a href="${withLang(`/news/${item.slug}`, lang)}" class="d-f teaser"><div class="d-g"><img src="${localAssetUrl(item.image)}" alt="${escapeHtml(
              item.title
            )}" class="d-h"></div><div class="d-i"><div class="d-j">${escapeHtml(item.title)}</div><div class="d-k">${escapeHtml(
              toDisplayDate(item.date)
            )}</div></div></a>`
          )
          .join("")}</div>
        <div class="b-m teaser"><a class="b-n" href="${withLang("/news", lang)}" style="border:1px solid #fff;">${escapeHtml(t(lang, "more"))}</a></div>
      </div></div>
      <div class="e-a"><div class="e-b"><div class="e-c teaser"><img src="${localAssetUrl(theme.contactPanelImage)}" alt="bg" class="e-d"></div>
      <div class="e-e">
        <div class="e-left lter"><div class="e-g"><img src="${localAssetUrl("/skin/images/yx.jpg")}" class="e-h"></div>
          <div class="e-i"><div class="e-j"><img src="${localAssetUrl("/skin/images/yx_title.png")}" alt="center" class="e-k"></div>
          <div class="e-l yxzx"><p>${escapeHtml(site.contact.company)}</p><p>${escapeHtml(site.contact.phone)}</p><p>${escapeHtml(site.contact.email)}</p><p>${escapeHtml(
      site.contact.address
    )}</p></div><a class="e-m" href="${withLang("/guestbook", lang)}" style="border:1px solid #1b3065;">${escapeHtml(t(lang, "leaveMessage"))}</a></div>
        </div>
        <div class="e-right rter"><img src="${localAssetUrl(site.contact.mapImage)}" alt="map" class="e-map"></div>
      </div></div></div>
    `
  });
};

const classicSinglePage = (site, lang, currentPath, activeKey, sectionKey, heading, richHtml, topImage, templateBlocks = []) => {
  const hero = topImage || langTheme(lang).innerHero || "";
  const detailHtml = composeDetailContent(richHtml, templateBlocks, lang);
  return classicLayout({
    site,
    lang,
    title: `${heading} - ${site.seo.title}`,
    description: site.seo.description,
    activeKey,
    currentPath,
    content: `
      <div class="i-a" style="background-image:url(${localAssetUrl(hero)});"></div>
      ${renderClassicCrumb(site, lang, heading, activeKey)}
      <div class="j-a"><div class="j-b">
        ${renderClassicFormBar(site, lang, sectionKey, topImage)}
        <div class="p-a"><div class="p-b">${escapeHtml(heading)}</div><div class="p-d" id="maximg">${detailHtml}</div></div>
      </div></div>
    `
  });
};

const classicProductsPage = (site, lang, currentPath, categoryFilter = "", pageNumber = 1) => {
  const products = localizedProducts(site, lang);
  const visibleProducts = categoryFilter
    ? products.filter((item) => asString(item.categoryKey) === asString(categoryFilter))
    : products;
  const perPage = 6;
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / perPage));
  const currentPage = Math.min(totalPages, Math.max(1, asInt(pageNumber, 1)));
  const start = (currentPage - 1) * perPage;
  const pagedProducts = visibleProducts.slice(start, start + perPage);
  const pagebar = renderClassicPagebar(currentPage, totalPages, (page) => {
    const params = new URLSearchParams();
    if (categoryFilter) {
      params.set("cat", categoryFilter);
    }
    if (page > 1) {
      params.set("page", String(page));
    }
    const query = params.toString();
    return withLang(`/products${query ? `?${query}` : ""}`, lang);
  });
  const hero = langTheme(lang).innerHero || "";
  const subLinks = productChildrenForLang(site, lang);
  return classicLayout({
    site,
    lang,
    title: `${t(lang, "product")} - ${site.seo.title}`,
    description: site.seo.description,
    activeKey: "product",
    currentPath,
    content: `
      <div class="i-a" style="background-image:url(${localAssetUrl(hero)});"></div>
      ${renderClassicCrumb(site, lang, t(lang, "product"), "product", subLinks, { activeSubSlug: categoryFilter })}
      <div class="j-a"><div class="j-b">
        ${renderClassicFormBar(site, lang, "product", langTheme(lang).productTitleImage)}
        <div class="j-h">
          ${pagedProducts
            .map(
              (item) => `<a href="${withLang(`/products/${item.slug}`, lang)}" class="j-i teaser">
            <div class="j-j"><img src="${localAssetUrl(item.image)}" alt="${escapeHtml(item.name)}" class="j-k"></div>
            <div class="j-l"><div class="j-m">${escapeHtml(item.name)}</div><div class="j-n">${escapeHtml(toSummary(item.summary, 130))}</div><div class="j-o">${escapeHtml(
                t(lang, "more")
              )}</div></div>
          </a>`
            )
            .join("")}
        </div>
        ${pagebar}
      </div></div>
    `
  });
};

const classicProductDetailPage = (site, lang, currentPath, product) => {
  const hero = langTheme(lang).innerHero || "";
  const products = localizedProducts(site, lang);
  const resolved = products.find((item) => item.slug === product.slug) || product;
  const subLinks = productChildrenForLang(site, lang);
  const detailImage = asString(asArray(resolved.gallery)[0] || resolved.image);
  const specs = asArray(resolved.specRowsComputed)
    .map((row) => ({
      label: asString(row.label),
      value: asString(row.value)
    }))
    .filter((row) => row.label || row.value);
  const hideRightIntro = asString(resolved.slug || product.slug) === "alcoen-accessories";
  const displaySpecs = hideRightIntro
    ? []
    : specs.length
    ? specs
    : [{ label: lang === "zh" ? "\u5206\u7c7b" : "Category", value: asString(resolved.categoryLabel || resolved.categoryKey) }];
  const activeSubSlug = asString(resolved.categoryKey);
  const activeSub = subLinks.find((item) => item.slug === activeSubSlug);
  const introTitle = lang === "zh" ? "\u4ea7\u54c1\u4ecb\u7ecd" : "INTRODUCTION";
  const downloadLabel = lang === "zh" ? "\u8d44\u6599\u4e0b\u8f7d" : t(lang, "download");
  const rightSummary = asString(resolved.summary || resolved.description).trim();
  const showSummary = !hideRightIntro && Boolean(rightSummary) && specs.length === 0;
  const baseHtml = resolved.richHtml || `<p>${escapeHtml(resolved.description || rightSummary)}</p>`;
  const detailHtml = composeDetailContent(baseHtml, resolved.layoutBlocksResolved, lang);
  return classicLayout({
    site,
    lang,
    title: `${resolved.name} - ${site.seo.title}`,
    description: resolved.summary || site.seo.description,
    activeKey: "product",
    currentPath,
    content: `
      <div class="i-a" style="background-image:url(${localAssetUrl(hero)});"></div>
      ${renderClassicCrumb(site, lang, t(lang, "product"), "product", subLinks, {
        activeSubSlug,
        extraCrumb: activeSub ? { href: activeSub.href, label: activeSub.label } : null
      })}
      <div class="k-a"><div class="k-b">
        <div class="k-c">
          <div class="k-left"><div class="k-visual"><img src="${localAssetUrl(detailImage)}" alt="${escapeHtml(resolved.name)}" class="k-e"></div></div>
          <div class="k-right">
            <div class="k-g" style="font-weight:bold;font-size:22px;">${escapeHtml(resolved.name)}</div>
            ${showSummary ? `<div class="k-j">${escapeHtml(rightSummary)}</div>` : ""}
            ${displaySpecs
              .map(
                (row) => `<div class="k-k"><div class="k-l">${escapeHtml(asString(row.label))}</div><div class="k-m">${escapeHtml(
                  asString(row.value)
                )}</div></div>`
              )
              .join("")}
            <a href="${withLang(resolved.downloadLinkComputed || "/downloads", lang)}" class="k-n">${escapeHtml(downloadLabel)}</a>
          </div>
        </div>
        <div class="k-o"><div class="k-p"><div class="k-q">${escapeHtml(introTitle)}</div></div><div class="k-r" id="maximg">${detailHtml}</div></div>
      </div></div>
    `
  });
};

const classicNewsPage = (site, lang, currentPath, pageNumber = 1) =>
{
  const news = localizedNews(site, lang);
  const perPage = 6;
  const totalPages = Math.max(1, Math.ceil(news.length / perPage));
  const currentPage = Math.min(totalPages, Math.max(1, asInt(pageNumber, 1)));
  const start = (currentPage - 1) * perPage;
  const pagedNews = news.slice(start, start + perPage);
  const pagebar = renderClassicPagebar(currentPage, totalPages, (page) => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set("page", String(page));
    }
    const query = params.toString();
    return withLang(`/news${query ? `?${query}` : ""}`, lang);
  });
  const hero = langTheme(lang).innerHero || "";
  const subLinks = lang === "zh" ? newsChildrenForLang(site, lang) : [];
  return classicLayout({
    site,
    lang,
    title: `${t(lang, "news")} - ${site.seo.title}`,
    description: site.seo.description,
    activeKey: "news",
    currentPath,
    content: `
      <div class="i-a" style="background-image:url(${localAssetUrl(hero)});"></div>
      ${renderClassicCrumb(site, lang, t(lang, "news"), "news", subLinks)}
      <div class="j-a"><div class="j-b">
        ${renderClassicFormBar(site, lang, "news", langTheme(lang).newsTitleImage)}
        <div class="s-a"><div class="swiper-container s-b teaser"><div class="swiper-wrapper"></div><div class="swiper-pagination"></div><div class="swiper-button-prev"></div><div class="swiper-button-next"></div></div>
          <div class="s-l">
          ${pagedNews
            .map(
              (item) => `<a href="${withLang(`/news/${item.slug}`, lang)}" class="s-m teaser"><div class="s-n"><img src="${localAssetUrl(item.image)}" alt="${escapeHtml(
                item.title
              )}" class="s-o"></div><div class="s-p"><div class="s-box"><div class="s-q">${escapeHtml(item.title)}</div><div class="s-r"></div></div><div class="s-s">${escapeHtml(
                toDisplayDate(item.date)
              )}</div></div></a>`
            )
            .join("")}
          </div>
          ${pagebar}
        </div>
      </div></div>
    `
  });
};

const classicNewsDetailPage = (site, lang, currentPath, item) =>
{
  const news = localizedNews(site, lang);
  const hero = langTheme(lang).innerHero || "";
  const resolved = news.find((n) => n.slug === item.slug) || item;
  const subLinks = lang === "zh" ? newsChildrenForLang(site, lang) : [];
  const currentIndex = news.findIndex((n) => n.slug === resolved.slug);
  const prevItem = currentIndex > 0 ? news[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < news.length - 1 ? news[currentIndex + 1] : null;
  return classicLayout({
    site,
    lang,
    title: `${resolved.title} - ${site.seo.title}`,
    description: resolved.summary || site.seo.description,
    activeKey: "news",
    currentPath,
    content: `
      <div class="i-a" style="background-image:url(${localAssetUrl(hero)});"></div>
      ${renderClassicCrumb(site, lang, t(lang, "news"), "news", subLinks)}
      <div class="t-b">
        <div class="t-left"><div class="t-c">${escapeHtml(resolved.title)}</div><div class="t-d"><div class="t-e t-e1">${escapeHtml(toDisplayDate(resolved.date))}</div></div>
          <div class="t-i" id="maximg">${composeDetailContent(
            resolved.richHtml || `<p>${escapeHtml(resolved.content)}</p>`,
            resolved.layoutBlocksResolved,
            lang
          )}</div>
          <div class="t-j">
            <div class="t-k">
              <a href="${prevItem ? withLang(`/news/${prevItem.slug}`, lang) : "javascript:;"}" class="t-l"><span class="t-m">上一篇：</span><span class="t-n">${escapeHtml(
        prevItem ? prevItem.title : "没有了！"
      )}</span></a>
              <a href="${nextItem ? withLang(`/news/${nextItem.slug}`, lang) : "javascript:;"}" class="t-l"><span class="t-m">下一篇：</span><span class="t-n">${escapeHtml(
        nextItem ? nextItem.title : "没有了！"
      )}</span></a>
            </div>
            <a class="t-o" href="${withLang("/news", lang)}">返回列表</a>
          </div>
        </div>
        <div class="t-right"><a class="t-p" href="${withLang("/news", lang)}">热门新闻<span class="t-q">查看更多</span></a>
          ${news
            .slice(0, 4)
            .map(
              (n) => `<a class="t-r" href="${withLang(`/news/${n.slug}`, lang)}"><div class="t-s"><img src="${localAssetUrl(n.image)}" alt="${escapeHtml(
                n.title
              )}" class="t-t"></div><div class="t-u">${escapeHtml(n.title)}</div></a>`
            )
            .join("")}
        </div>
      </div>
    `
  });
};

const classicNotFoundPage = (site, lang, currentPath) =>
  classicLayout({
    site,
    lang,
    title: `404 - ${site.seo.title}`,
    description: site.seo.description,
    activeKey: "home",
    currentPath,
    content: `<div class="j-a"><div class="j-b"><div class="p-a"><div class="p-b">404</div><div class="p-d"><p>${escapeHtml(
      t(lang, "notFoundDesc")
    )}</p><p><a class="e-m" href="${withLang("/", lang)}">${escapeHtml(t(lang, "backHome"))}</a></p></div></div></div></div>`
  });

const serveFile = (reqPath, res) => {
  const cleanPath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.normalize(path.join(publicDir, cleanPath));

  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".html": "text/html; charset=utf-8"
  };

  send(res, 200, fs.readFileSync(filePath), contentTypes[ext] || "application/octet-stream");
  return true;
};

const handleUpload = async (req, res) => {
  try {
    const payload = await parseBody(req);
    if (!payload.filename || !payload.dataUrl) {
      sendJson(res, 400, { error: "Missing filename or dataUrl." });
      return;
    }

    const match = String(payload.dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      sendJson(res, 400, { error: "Only image data URLs are supported." });
      return;
    }

    const mime = match[1];
    const base64 = match[2];
    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const baseName = slugify(path.parse(payload.filename).name) || "image";
    const filename = `${Date.now()}-${baseName}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
    sendJson(res, 200, { url: `/uploads/${filename}` });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
};

const localizedSingleBlocks = (single, lang) => {
  const source = asObject(single);
  if (lang === "zh" && asArray(source.layoutBlocksZh).length) {
    return normalizeTemplateBlocks(source.layoutBlocksZh);
  }
  return normalizeTemplateBlocks(source.layoutBlocks);
};

const localizedSingleHtml = (single, lang) => {
  const source = asObject(single);
  if (lang === "zh") {
    return sanitizeRichText(source.contentZh || source.content || "");
  }
  return sanitizeRichText(source.content || "");
};

const localizedSingleImage = (single, lang) => {
  const source = asObject(single);
  if (lang === "zh") {
    return asString(source.picZh || source.pic || source.ico);
  }
  return asString(source.pic || source.ico);
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const lang = getLang(parsedUrl);
  const categoryFilter = asString(parsedUrl.searchParams.get("cat"));
  const pageNumber = Math.max(1, asInt(parsedUrl.searchParams.get("page"), 1));
  const currentPath = `${pathname}${parsedUrl.search}`;

  if (pathname.startsWith("/uploads/") || pathname.startsWith("/assets/") || pathname === "/styles.css" || pathname === "/app.js" || pathname === "/admin.js") {
    if (serveFile(pathname, res)) {
      return;
    }
  }

  if ((pathname === "/admin" || pathname === "/admin.html") && req.method === "GET") {
    if (serveFile("/admin.html", res)) {
      return;
    }
  }

  if (pathname === "/api/site" && req.method === "GET") {
    sendJson(res, 200, readSiteData());
    return;
  }

  if (pathname === "/api/site" && req.method === "POST") {
    try {
      const payload = await parseBody(req);
      const normalized = writeSiteData(payload);
      sendJson(res, 200, { ok: true, site: normalized });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (pathname === "/api/upload" && req.method === "POST") {
    await handleUpload(req, res);
    return;
  }

  const canonical = readSiteData();
  const site = canonicalToViewModel(canonical);

  if (pathname === "/" && req.method === "GET") {
    send(res, 200, classicHomePage(site, lang, currentPath));
    return;
  }

  if (pathname === "/about" && req.method === "GET") {
    const aboutSingle = site.pageModels.aboutSingle || null;
    send(
      res,
      200,
      classicSinglePage(
        site,
        lang,
        currentPath,
        "about",
        "about",
        t(lang, "about"),
        localizedSingleHtml(aboutSingle, lang),
        "",
        localizedSingleBlocks(aboutSingle, lang)
      )
    );
    return;
  }

  if (pathname === "/products" && req.method === "GET") {
    send(res, 200, classicProductsPage(site, lang, currentPath, categoryFilter, pageNumber));
    return;
  }

  if (pathname.startsWith("/products/") && req.method === "GET") {
    const slug = pathname.split("/").pop();
    const product = site.products.find((item) => item.slug === slug);
    if (product) {
      send(res, 200, classicProductDetailPage(site, lang, currentPath, product));
      return;
    }
  }

  if (pathname === "/news" && req.method === "GET") {
    send(res, 200, classicNewsPage(site, lang, currentPath, pageNumber));
    return;
  }

  if (pathname.startsWith("/news/") && req.method === "GET") {
    const slug = pathname.split("/").pop();
    const item = site.news.find((newsItem) => newsItem.slug === slug);
    if (item) {
      send(res, 200, classicNewsDetailPage(site, lang, currentPath, item));
      return;
    }
  }

  if (pathname === "/downloads" && req.method === "GET") {
    const downloadSingle = site.pageModels.downloadSingle || null;
    send(
      res,
      200,
      classicSinglePage(
        site,
        lang,
        currentPath,
        "download",
        "download",
        t(lang, "download"),
        localizedSingleHtml(downloadSingle, lang),
        localizedSingleImage(downloadSingle, lang),
        localizedSingleBlocks(downloadSingle, lang)
      )
    );
    return;
  }

  if (pathname === "/contact" && req.method === "GET") {
    const contactSingle = site.pageModels.contactSingle || null;
    send(
      res,
      200,
      classicSinglePage(
        site,
        lang,
        currentPath,
        "contact",
        "contact",
        t(lang, "contact"),
        localizedSingleHtml(contactSingle, lang),
        "",
        localizedSingleBlocks(contactSingle, lang)
      )
    );
    return;
  }

  if (pathname === "/guestbook" && req.method === "GET") {
    const contactSingle = site.pageModels.contactSingle || null;
    send(
      res,
      200,
      classicSinglePage(
        site,
        lang,
        currentPath,
        "contact",
        "contact",
        t(lang, "contact"),
        localizedSingleHtml(contactSingle, lang),
        "",
        localizedSingleBlocks(contactSingle, lang)
      )
    );
    return;
  }

  send(res, 404, classicNotFoundPage(site, lang, currentPath));
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
