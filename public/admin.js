(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const isNumberLike = (value) => /^-?\d+$/.test(String(value));
  const asArray = (value) => (Array.isArray(value) ? value : []);
  const asObject = (value) => (isObject(value) ? value : {});
  const asString = (value, fallback = "") => {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return fallback;
  };
  const asInt = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  };
  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const dom = {
    sectionNav: $("#sectionNav"),
    sectionTitle: $("#sectionTitle"),
    sectionDesc: $("#sectionDesc"),
    sectionGuide: $("#sectionGuide"),
    formRoot: $("#formRoot"),
    notice: $("#notice"),
    editor: $("#editor"),
    saveButton: $("#saveButton"),
    reloadButton: $("#reloadButton"),
    applyJsonButton: $("#applyJsonButton"),
    saveJsonButton: $("#saveJsonButton"),
    uploadInput: $("#uploadInput"),
    uploadButton: $("#uploadButton"),
    uploadResult: $("#uploadResult"),
    openSiteLink: $("#openSiteLink"),
    langEnBtn: $("#langEnBtn"),
    langZhBtn: $("#langZhBtn")
  };

  const L = (en, zh) => ({ en, zh });
  const currentText = (value, lang) => {
    if (typeof value === "string") {
      return value;
    }
    if (!value || typeof value !== "object") {
      return "";
    }
    return value[lang] || value.en || value.zh || "";
  };

  const UI_TEXT = {
    en: {
      loading: "Loading site data...",
      saveAll: "Save All",
      saveJson: "Save JSON",
      applyJson: "Apply JSON To Forms",
      reload: "Reload",
      openWebsite: "Open Website",
      upload: "Upload",
      uploadHint: "Upload an image, then click into a field and it will auto-fill the uploaded URL.",
      uploadDone: "Upload successful:",
      uploadNeedFile: "Please choose an image file first.",
      loadFailed: "Failed to load site data:",
      saveFailed: "Failed to save:",
      saveDone: "Saved successfully. Front-end and admin are now synchronized.",
      jsonApplied: "JSON applied to form state. Click Save All to persist.",
      jsonError: "Invalid JSON:",
      sectionHint: "Select a section from the left and edit fields on the right.",
      addItem: "Add Item",
      delete: "Delete",
      moveUp: "Up",
      moveDown: "Down",
      enabled: "Enabled",
      disabled: "Disabled",
      listEmpty: "No data in this section yet.",
      presetTitle: "Template Presets",
      addTemplate: "Add Blank Block",
      saveWarning: "Changes are local until you click Save All.",
      langEN: "EN",
      langZH: "中文"
    },
    zh: {
      loading: "正在加载网站数据...",
      saveAll: "保存全部",
      saveJson: "保存 JSON",
      applyJson: "将 JSON 应用到表单",
      reload: "重新加载",
      openWebsite: "打开前台",
      upload: "上传",
      uploadHint: "先上传图片，再点击任意输入框，系统会自动填入上传后的 URL。",
      uploadDone: "上传成功：",
      uploadNeedFile: "请先选择图片文件。",
      loadFailed: "加载失败：",
      saveFailed: "保存失败：",
      saveDone: "保存成功，前后台数据已同步。",
      jsonApplied: "JSON 已应用到表单，点击“保存全部”后才会写入磁盘。",
      jsonError: "JSON 格式错误：",
      sectionHint: "请从左侧选择模块，在右侧编辑字段。",
      addItem: "新增项",
      delete: "删除",
      moveUp: "上移",
      moveDown: "下移",
      enabled: "启用",
      disabled: "停用",
      listEmpty: "当前模块还没有数据。",
      presetTitle: "标准模板",
      addTemplate: "添加空白模板块",
      saveWarning: "当前改动仅在本地内存，点击“保存全部”才会生效。",
      langEN: "EN",
      langZH: "中文"
    }
  };

  const state = {
    uiLang: "zh",
    activeSection: "site",
    siteData: null,
    focusedField: null,
    isBusy: false
  };

  const TEMPLATE_TYPES = [
    "hero-overlay",
    "split-left",
    "split-right",
    "banner-center",
    "text-only"
  ];

  const SECTION_DEFS = [
    { key: "site", title: L("Site Information", "网站信息"), desc: L("Global site config and SEO.", "全站基础配置与 SEO。") },
    { key: "company", title: L("Company Information", "公司信息"), desc: L("Corporate identity and contact card.", "公司身份与联系方式。") },
    { key: "contentSorts", title: L("Content Categories", "内容分类"), desc: L("Navigation and content architecture.", "导航与内容结构配置。") },
    { key: "singles", title: L("Single Pages", "单页内容"), desc: L("About / Downloads / Contact page content.", "关于我们 / 下载中心 / 联系我们页面内容。") },
    { key: "products", title: L("Products", "产品中心"), desc: L("Product list and product detail source data.", "产品列表和详情页的数据源。") },
    { key: "news", title: L("News", "新闻中心"), desc: L("News list and article detail source data.", "新闻列表和详情页的数据源。") },
    { key: "slides", title: L("Slides", "轮播图"), desc: L("Home hero carousel resources.", "首页大图轮播资源。") },
    { key: "links", title: L("Friendly Links", "友情链接"), desc: L("Footer link groups.", "页脚友链。") }
  ];

  const SECTION_GUIDES = {
    site: [
      {
        area: L("Header / Footer", "页头与页脚"),
        fields: "site.title, site.subtitle, site.logo, site.copyright",
        preview: "/"
      },
      {
        area: L("SEO Meta", "SEO 元信息"),
        fields: "site.keywords, site.description, site.domain",
        preview: "/about"
      }
    ],
    company: [
      {
        area: L("Contact Panel", "联系我们模块"),
        fields: "company.name, company.address, company.phone, company.email",
        preview: "/contact"
      },
      {
        area: L("Footer Contact", "页脚联系信息"),
        fields: "company.*",
        preview: "/"
      }
    ],
    contentSorts: [
      {
        area: L("Main Navigation", "主导航"),
        fields: "contentSorts[parentId=0].name/status/sorting",
        preview: "/"
      },
      {
        area: L("Product Sub Categories", "产品二级分类"),
        fields: "contentSorts[parentId=PRODUCT].*",
        preview: "/products"
      }
    ],
    singles: [
      {
        area: L("Single Page Header", "单页标题区"),
        fields: "singles[].title/subtitle/pic",
        preview: "/about"
      },
      {
        area: L("Single Page Body", "单页正文"),
        fields: "singles[].content + layoutBlocks/layoutBlocksZh",
        preview: "/about"
      }
    ],
    products: [
      {
        area: L("Products List Cards", "产品列表卡片"),
        fields: "products[].title/summary/ico/status/sorting/sortId",
        preview: "/products"
      },
      {
        area: L("Product Detail Top", "产品详情顶部"),
        fields: "products[].pics[0] + title + summary/specRows",
        preview: "/products/:slug"
      },
      {
        area: L("Product Detail Body", "产品详情正文区"),
        fields: "products[].content/contentZh + layoutBlocks/layoutBlocksZh",
        preview: "/products/:slug"
      }
    ],
    news: [
      {
        area: L("News List Cards", "新闻列表卡片"),
        fields: "news[].title/summary/ico/date/status/sorting",
        preview: "/news"
      },
      {
        area: L("News Detail Body", "新闻详情正文"),
        fields: "news[].content/contentZh + layoutBlocks/layoutBlocksZh",
        preview: "/news/:slug"
      }
    ],
    slides: [
      {
        area: L("Home Hero", "首页轮播"),
        fields: "slides[].pic/link/title/subtitle/sorting",
        preview: "/"
      }
    ],
    links: [
      {
        area: L("Footer Links", "页脚友链"),
        fields: "links[].name/link/logo/sorting",
        preview: "/"
      }
    ]
  };

  function t(key) {
    const pack = UI_TEXT[state.uiLang] || UI_TEXT.en;
    return pack[key] || key;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function pathSegments(path) {
    return String(path)
      .split(".")
      .filter(Boolean)
      .map((part) => (isNumberLike(part) ? Number(part) : part));
  }

  function getByPath(root, path, fallback = "") {
    const segs = pathSegments(path);
    let cursor = root;
    for (let i = 0; i < segs.length; i += 1) {
      const seg = segs[i];
      if (cursor == null || typeof cursor !== "object" || !(seg in cursor)) {
        return fallback;
      }
      cursor = cursor[seg];
    }
    return cursor;
  }

  function setByPath(root, path, value) {
    const segs = pathSegments(path);
    if (!segs.length) {
      return;
    }
    let cursor = root;
    for (let i = 0; i < segs.length - 1; i += 1) {
      const seg = segs[i];
      const next = segs[i + 1];
      if (!isObject(cursor[seg]) && !Array.isArray(cursor[seg])) {
        cursor[seg] = typeof next === "number" ? [] : {};
      }
      cursor = cursor[seg];
    }
    cursor[segs[segs.length - 1]] = value;
  }

  function defaultTemplateBlock() {
    return {
      id: `tpl-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      enabled: 1,
      template: "hero-overlay",
      image: "",
      title: "",
      body: "",
      height: 360,
      overlay: "rgba(15, 23, 42, 0.28)",
      titleFont: "Microsoft YaHei",
      titleSize: 34,
      titleColor: "#ffffff",
      titleX: 10,
      titleY: 14,
      titleWidth: 44,
      bodyFont: "Microsoft YaHei",
      bodySize: 18,
      bodyColor: "#ffffff",
      bodyX: 10,
      bodyY: 34,
      bodyWidth: 48,
      align: "left"
    };
  }

  function templatePreset(type) {
    const base = defaultTemplateBlock();
    if (type === "split-left") {
      return { ...base, template: "split-left", overlay: "rgba(255,255,255,0.20)", titleColor: "#1b3065", bodyColor: "#263142", titleX: 55, bodyX: 55 };
    }
    if (type === "split-right") {
      return { ...base, template: "split-right", overlay: "rgba(255,255,255,0.20)", titleColor: "#1b3065", bodyColor: "#263142", titleX: 10, bodyX: 10 };
    }
    if (type === "banner-center") {
      return { ...base, template: "banner-center", overlay: "rgba(17,24,39,0.10)", align: "center", titleX: 20, titleWidth: 60, bodyX: 20, bodyWidth: 60 };
    }
    if (type === "text-only") {
      return { ...base, template: "text-only", height: 260, overlay: "rgba(245,247,251,1)", titleColor: "#1b3065", bodyColor: "#2e3a4f", titleX: 6, titleY: 12, titleWidth: 88, bodyX: 6, bodyY: 34, bodyWidth: 88 };
    }
    return base;
  }

  function defaultSiteData() {
    return {
      site: {
        title: "",
        subtitle: "",
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
  }

  function ensureTemplateBlock(input) {
    const source = asObject(input);
    const base = defaultTemplateBlock();
    return {
      ...base,
      ...source,
      id: asString(source.id, base.id),
      enabled: asInt(source.enabled, 1) ? 1 : 0,
      template: TEMPLATE_TYPES.includes(asString(source.template, base.template)) ? asString(source.template, base.template) : base.template,
      align: ["left", "center", "right"].includes(asString(source.align, base.align)) ? asString(source.align, base.align) : base.align
    };
  }

  function ensureSingle(input) {
    const source = asObject(input);
    return {
      ...source,
      id: asInt(source.id, Date.now()),
      sortId: asInt(source.sortId, 0),
      title: asString(source.title),
      subtitle: asString(source.subtitle),
      filename: asString(source.filename),
      outlink: asString(source.outlink),
      gnote: asString(source.gnote),
      ico: asString(source.ico),
      pic: asString(source.pic),
      picZh: asString(source.picZh),
      keywords: asString(source.keywords),
      description: asString(source.description),
      descriptionZh: asString(source.descriptionZh),
      content: asString(source.content),
      contentZh: asString(source.contentZh),
      layoutBlocks: asArray(source.layoutBlocks).map(ensureTemplateBlock),
      layoutBlocksZh: asArray(source.layoutBlocksZh).map(ensureTemplateBlock),
      status: asInt(source.status, 1) ? 1 : 0,
      visits: asInt(source.visits, 0),
      date: asString(source.date)
    };
  }

  function ensureContentItem(input) {
    const source = asObject(input);
    const ext = asObject(source.extParams);
    return {
      ...source,
      id: asInt(source.id, Date.now()),
      sortId: asInt(source.sortId, 0),
      subtitle: asString(source.subtitle),
      title: asString(source.title),
      filename: asString(source.filename),
      outlink: asString(source.outlink),
      gnote: asString(source.gnote),
      tags: asString(source.tags),
      author: asString(source.author),
      source: asString(source.source),
      ico: asString(source.ico),
      pics: asArray(source.pics).map((v) => asString(v)).filter(Boolean),
      subSortId: source.subSortId == null ? null : asInt(source.subSortId, 0),
      titleColor: asString(source.titleColor, "#333333"),
      enclosure: asString(source.enclosure),
      keywords: asString(source.keywords),
      description: asString(source.description),
      summary: asString(source.summary),
      content: asString(source.content),
      layoutBlocks: asArray(source.layoutBlocks).map(ensureTemplateBlock),
      layoutBlocksZh: asArray(source.layoutBlocksZh).map(ensureTemplateBlock),
      titleZh: asString(source.titleZh),
      summaryZh: asString(source.summaryZh),
      descriptionZh: asString(source.descriptionZh),
      contentZh: asString(source.contentZh),
      icoZh: asString(source.icoZh),
      picsZh: asArray(source.picsZh).map((v) => asString(v)).filter(Boolean),
      categoryKeyZh: asString(source.categoryKeyZh),
      specRows: asArray(source.specRows).map((v) => asString(v)).filter(Boolean),
      specRowsZh: asArray(source.specRowsZh).map((v) => asString(v)).filter(Boolean),
      downloadLink: asString(source.downloadLink),
      downloadLinkZh: asString(source.downloadLinkZh),
      status: asInt(source.status, 1) ? 1 : 0,
      sorting: asInt(source.sorting, 255),
      istop: asInt(source.istop, 0) ? 1 : 0,
      isrecommend: asInt(source.isrecommend, 0) ? 1 : 0,
      isheadline: asInt(source.isheadline, 0) ? 1 : 0,
      visits: asInt(source.visits, 0),
      date: asString(source.date),
      extParams: {
        ...ext,
        param1: asString(ext.param1),
        param2: asString(ext.param2),
        param3: asString(ext.param3),
        param4: asString(ext.param4),
        param5: asString(ext.param5)
      }
    };
  }

  function ensureSiteData(input) {
    const defaults = defaultSiteData();
    const source = asObject(input);
    return {
      ...defaults,
      ...source,
      site: { ...defaults.site, ...asObject(source.site) },
      company: { ...defaults.company, ...asObject(source.company) },
      contentSorts: asArray(source.contentSorts).map((item) => ({
        ...asObject(item),
        id: asInt(asObject(item).id, Date.now()),
        parentId: asInt(asObject(item).parentId, 0),
        name: asString(asObject(item).name),
        filename: asString(asObject(item).filename),
        modelCode: asString(asObject(item).modelCode),
        listTemplate: asString(asObject(item).listTemplate),
        contentTemplate: asString(asObject(item).contentTemplate),
        sorting: asInt(asObject(item).sorting, 255),
        status: asInt(asObject(item).status, 1) ? 1 : 0
      })),
      singles: asArray(source.singles).map(ensureSingle),
      news: asArray(source.news).map(ensureContentItem),
      products: asArray(source.products).map(ensureContentItem),
      slides: asArray(source.slides).map((item) => ({
        ...asObject(item),
        id: asInt(asObject(item).id, Date.now()),
        gid: asString(asObject(item).gid, "home"),
        pic: asString(asObject(item).pic),
        link: asString(asObject(item).link),
        title: asString(asObject(item).title),
        subtitle: asString(asObject(item).subtitle),
        sorting: asInt(asObject(item).sorting, 255)
      })),
      links: asArray(source.links).map((item) => ({
        ...asObject(item),
        id: asInt(asObject(item).id, Date.now()),
        gid: asString(asObject(item).gid, "default"),
        name: asString(asObject(item).name),
        link: asString(asObject(item).link),
        logo: asString(asObject(item).logo),
        sorting: asInt(asObject(item).sorting, 255)
      })),
      meta: {
        ...defaults.meta,
        ...asObject(source.meta),
        modelMap: {
          ...defaults.meta.modelMap,
          ...asObject(asObject(source.meta).modelMap)
        }
      }
    };
  }

  function buildIdFor(list) {
    const maxId = asArray(list).reduce((acc, item) => Math.max(acc, asInt(asObject(item).id, 0)), 0);
    return Math.max(Date.now(), maxId + 1);
  }

  function newSortItem() {
    return {
      id: Date.now(),
      parentId: 0,
      name: "",
      filename: "",
      modelCode: "single",
      listTemplate: "",
      contentTemplate: "",
      sorting: 255,
      status: 1
    };
  }

  function newSingleItem() {
    return ensureSingle({
      id: Date.now(),
      sortId: 0,
      title: "",
      subtitle: "",
      filename: "",
      pic: "",
      description: "",
      content: "",
      status: 1,
      date: new Date().toISOString().slice(0, 10),
      layoutBlocks: [],
      layoutBlocksZh: []
    });
  }

  function newContentItem(sortId = 0) {
    return ensureContentItem({
      id: Date.now(),
      sortId,
      title: "",
      filename: "",
      summary: "",
      description: "",
      content: "",
      status: 1,
      sorting: 255,
      date: new Date().toISOString().slice(0, 10),
      pics: [],
      picsZh: [],
      specRows: [],
      specRowsZh: [],
      layoutBlocks: [],
      layoutBlocksZh: []
    });
  }

  function newSlideItem() {
    return { id: Date.now(), gid: "home", pic: "", link: "", title: "", subtitle: "", sorting: 255 };
  }

  function newLinkItem() {
    return { id: Date.now(), gid: "default", name: "", link: "", logo: "", sorting: 255 };
  }

  function setNotice(message, tone = "info") {
    if (!dom.notice) {
      return;
    }
    dom.notice.classList.remove("is-error", "is-success");
    if (tone === "error") {
      dom.notice.classList.add("is-error");
    } else if (tone === "success") {
      dom.notice.classList.add("is-success");
    }
    dom.notice.textContent = message;
  }

  function serializeEditor() {
    if (!dom.editor || !state.siteData) {
      return;
    }
    dom.editor.value = JSON.stringify(state.siteData, null, 2);
  }

  function parseInputValue(rawValue, kind) {
    if (kind === "int") {
      return asInt(rawValue, 0);
    }
    if (kind === "lines") {
      return String(rawValue)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    }
    if (kind === "bool01") {
      return String(rawValue) === "1" ? 1 : 0;
    }
    return String(rawValue);
  }

  function renderField({ path, label, map, kind = "text", type = "text", rows = 4, full = false, placeholder = "" }) {
    const value = getByPath(state.siteData, path, kind === "lines" ? [] : "");
    const containerClass = `form-field${full ? " full" : ""}`;
    const labelHtml = `<span class="form-label">${escapeHtml(currentText(label, state.uiLang))}${map ? `<span class="field-map">${escapeHtml(currentText(map, state.uiLang))}</span>` : ""}</span>`;

    if (kind === "lines") {
      return `<label class="${containerClass}">${labelHtml}<textarea class="form-input" data-path="${escapeHtml(path)}" data-kind="lines" rows="${rows}" placeholder="${escapeHtml(
        placeholder
      )}">${escapeHtml(asArray(value).join("\n"))}</textarea></label>`;
    }

    if (kind === "textarea") {
      return `<label class="${containerClass}">${labelHtml}<textarea class="form-input" data-path="${escapeHtml(path)}" data-kind="text" rows="${rows}" placeholder="${escapeHtml(
        placeholder
      )}">${escapeHtml(asString(value))}</textarea></label>`;
    }

    if (kind === "bool01") {
      return `<label class="${containerClass}">${labelHtml}
        <select class="form-input" data-path="${escapeHtml(path)}" data-kind="bool01">
          <option value="1" ${asInt(value, 0) === 1 ? "selected" : ""}>${escapeHtml(t("enabled"))}</option>
          <option value="0" ${asInt(value, 0) === 0 ? "selected" : ""}>${escapeHtml(t("disabled"))}</option>
        </select>
      </label>`;
    }

    if (kind === "select-template") {
      return `<label class="${containerClass}">${labelHtml}
        <select class="form-input" data-path="${escapeHtml(path)}" data-kind="text">
          ${TEMPLATE_TYPES.map((item) => `<option value="${item}" ${asString(value) === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </label>`;
    }

    if (kind === "align") {
      const options = ["left", "center", "right"];
      return `<label class="${containerClass}">${labelHtml}
        <select class="form-input" data-path="${escapeHtml(path)}" data-kind="text">
          ${options.map((item) => `<option value="${item}" ${asString(value) === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </label>`;
    }

    return `<label class="${containerClass}">${labelHtml}<input class="form-input" type="${type}" data-path="${escapeHtml(path)}" data-kind="${kind}" value="${escapeHtml(
      asString(value)
    )}" placeholder="${escapeHtml(placeholder)}" /></label>`;
  }

  function renderTemplateEditor(path, blocks, mapPrefix) {
    const list = asArray(blocks);
    const titleText = currentText(mapPrefix, state.uiLang);
    return `
      <div class="template-panel">
        <div class="template-headline">
          <h4>${escapeHtml(titleText)}</h4>
          <div class="mini-actions">
            <button class="chip-neutral" type="button" data-action="add-template" data-path="${escapeHtml(path)}">${escapeHtml(t("addTemplate"))}</button>
          </div>
        </div>
        <div class="template-presets">
          <span>${escapeHtml(t("presetTitle"))}:</span>
          ${TEMPLATE_TYPES.map(
            (type) =>
              `<button class="chip-neutral" type="button" data-action="add-template-preset" data-path="${escapeHtml(path)}" data-preset="${type}">${type}</button>`
          ).join("")}
        </div>
        ${
          !list.length
            ? `<div class="template-empty">${escapeHtml(t("listEmpty"))}</div>`
            : `<div class="template-stack">${list
                .map((block, index) => {
                  const base = `${path}.${index}`;
                  return `
                    <article class="template-card">
                      <div class="object-card-head">
                        <div>#${index + 1} <span class="template-chip">${escapeHtml(asString(block.template))}</span></div>
                        <div class="item-tools">
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="${escapeHtml(path)}" data-index="${index}" data-dir="-1">${escapeHtml(
                            t("moveUp")
                          )}</button>
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="${escapeHtml(path)}" data-index="${index}" data-dir="1">${escapeHtml(
                            t("moveDown")
                          )}</button>
                          <button class="chip-danger" type="button" data-action="remove-array-item" data-path="${escapeHtml(path)}" data-index="${index}">${escapeHtml(
                            t("delete")
                          )}</button>
                        </div>
                      </div>
                      <div class="form-grid">
                        ${renderField({ path: `${base}.template`, label: L("Template Type", "模板类型"), map: L("Front-end style frame", "前台版式框架"), kind: "select-template" })}
                        ${renderField({ path: `${base}.enabled`, label: L("Status", "状态"), map: L("Whether this block is rendered", "是否在前台显示"), kind: "bool01" })}
                        ${renderField({ path: `${base}.image`, label: L("Background Image", "背景图"), map: L("Main visual image", "主视觉图片"), kind: "text", full: true })}
                        ${renderField({ path: `${base}.title`, label: L("Title Text", "标题文本"), map: L("Top text in this block", "模板块顶部标题"), kind: "textarea", rows: 2, full: true })}
                        ${renderField({ path: `${base}.body`, label: L("Body Text", "正文文本"), map: L("Main content text in this block", "模板块正文"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.height`, label: L("Height(px)", "高度(px)"), map: L("Block visual height", "模块可视高度"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.overlay`, label: L("Overlay Color", "遮罩色"), map: L("Background mask color", "背景遮罩颜色"), kind: "text" })}
                        ${renderField({ path: `${base}.align`, label: L("Text Align", "文字对齐"), map: L("Title/body alignment", "标题与正文对齐方式"), kind: "align" })}
                        ${renderField({ path: `${base}.titleFont`, label: L("Title Font", "标题字体"), map: L("Title font family", "标题字体"), kind: "text" })}
                        ${renderField({ path: `${base}.titleSize`, label: L("Title Size", "标题字号"), map: L("Title font size", "标题字体大小"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.titleColor`, label: L("Title Color", "标题颜色"), map: L("Title text color", "标题文字颜色"), kind: "text" })}
                        ${renderField({ path: `${base}.titleX`, label: L("Title X (%)", "标题 X (%)"), map: L("Horizontal position", "水平位置"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.titleY`, label: L("Title Y (%)", "标题 Y (%)"), map: L("Vertical position", "垂直位置"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.titleWidth`, label: L("Title Width (%)", "标题宽度 (%)"), map: L("Text area width", "文本区域宽度"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.bodyFont`, label: L("Body Font", "正文字体"), map: L("Body font family", "正文字体"), kind: "text" })}
                        ${renderField({ path: `${base}.bodySize`, label: L("Body Size", "正文字号"), map: L("Body font size", "正文字体大小"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.bodyColor`, label: L("Body Color", "正文颜色"), map: L("Body text color", "正文颜色"), kind: "text" })}
                        ${renderField({ path: `${base}.bodyX`, label: L("Body X (%)", "正文 X (%)"), map: L("Horizontal position", "水平位置"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.bodyY`, label: L("Body Y (%)", "正文 Y (%)"), map: L("Vertical position", "垂直位置"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.bodyWidth`, label: L("Body Width (%)", "正文宽度 (%)"), map: L("Text area width", "文本区域宽度"), kind: "int", type: "number" })}
                      </div>
                    </article>
                  `;
                })
                .join("")}</div>`
        }
      </div>
    `;
  }

  function renderSectionCard(title, description, bodyHtml) {
    return `
      <section class="admin-section">
        <div class="admin-section-head">
          <h3>${escapeHtml(currentText(title, state.uiLang))}</h3>
          <p>${escapeHtml(currentText(description, state.uiLang))}</p>
        </div>
        ${bodyHtml}
      </section>
    `;
  }

  function renderListHeader(listPath) {
    return `<div class="item-tools section-inline-actions">
      <button class="chip-neutral" type="button" data-action="add-array-item" data-path="${escapeHtml(listPath)}">${escapeHtml(t("addItem"))}</button>
      <span class="section-tip">${escapeHtml(t("saveWarning"))}</span>
    </div>`;
  }

  function renderSiteSection() {
    return renderSectionCard(
      L("Site Information", "网站信息"),
      L("These fields control global title/logo/SEO and footer text.", "这些字段控制全站标题/Logo/SEO 和页脚信息。"),
      `<div class="form-grid">
        ${renderField({ path: "site.title", label: L("Site Title", "网站标题"), map: L("Header brand text and page title", "页头品牌文字与页面标题") })}
        ${renderField({ path: "site.subtitle", label: L("Site Subtitle", "网站副标题"), map: L("Header subtitle", "页头副标题") })}
        ${renderField({ path: "site.logo", label: L("Logo URL", "Logo 地址"), map: L("Header logo asset source", "页头 Logo 资源地址"), full: true })}
        ${renderField({ path: "site.domain", label: L("Domain", "域名"), map: L("Contact website field", "联系页网站字段") })}
        ${renderField({ path: "site.theme", label: L("Theme", "主题"), map: L("Theme code for runtime", "运行时主题标识") })}
        ${renderField({ path: "site.icp", label: L("ICP", "ICP备案"), map: L("Footer legal text", "页脚备案信息") })}
        ${renderField({ path: "site.keywords", label: L("SEO Keywords", "SEO 关键词"), map: L("Meta keywords", "页面关键词 Meta"), full: true })}
        ${renderField({ path: "site.description", label: L("SEO Description", "SEO 描述"), map: L("Meta description", "页面描述 Meta"), kind: "textarea", rows: 3, full: true })}
        ${renderField({ path: "site.statistical", label: L("Statistical Script", "统计脚本"), map: L("Optional analytics script", "可选统计脚本"), kind: "textarea", rows: 3, full: true })}
        ${renderField({ path: "site.copyright", label: L("Copyright", "版权信息"), map: L("Footer copyright text", "页脚版权文案"), full: true })}
      </div>`
    );
  }

  function renderCompanySection() {
    return renderSectionCard(
      L("Company Information", "公司信息"),
      L("Mainly used by contact module and footer area.", "主要用于联系模块与页脚信息。"),
      `<div class="form-grid">
        ${renderField({ path: "company.name", label: L("Company Name", "公司名称"), map: L("Contact title and footer", "联系页标题与页脚") })}
        ${renderField({ path: "company.contact", label: L("Contact Person", "联系人"), map: L("Business contact field", "商务联系人字段") })}
        ${renderField({ path: "company.phone", label: L("Phone", "电话"), map: L("Header and contact card", "页头与联系卡片") })}
        ${renderField({ path: "company.mobile", label: L("Mobile", "手机"), map: L("Backup contact number", "备用联系电话") })}
        ${renderField({ path: "company.email", label: L("Email", "邮箱"), map: L("Header and contact card", "页头与联系卡片") })}
        ${renderField({ path: "company.fax", label: L("Fax", "传真"), map: L("Company detail field", "公司信息展示字段") })}
        ${renderField({ path: "company.address", label: L("Address", "地址"), map: L("Contact page and footer", "联系页与页脚地址"), full: true })}
        ${renderField({ path: "company.postcode", label: L("Postcode", "邮编"), map: L("Contact detail field", "联系信息字段") })}
        ${renderField({ path: "company.weixin", label: L("WeChat", "微信"), map: L("Optional social contact", "可选社交联系方式") })}
        ${renderField({ path: "company.qq", label: L("QQ", "QQ"), map: L("Optional social contact", "可选社交联系方式") })}
        ${renderField({ path: "company.blicense", label: L("Business License", "营业执照"), map: L("Company legal field", "公司法务字段"), full: true })}
        ${renderField({ path: "company.other", label: L("Other", "其他"), map: L("Additional company text", "其他公司信息"), kind: "textarea", rows: 3, full: true })}
      </div>`
    );
  }

  function renderSortsSection() {
    const rows = asArray(state.siteData.contentSorts);
    return renderSectionCard(
      L("Content Categories", "内容分类"),
      L("Controls navigation and content hierarchy. Top-level items appear in header nav.", "控制导航和内容层级。顶级分类会进入页头导航。"),
      `
        ${renderListHeader("contentSorts")}
        <div class="object-list">
          ${
            !rows.length
              ? `<div class="object-card">${escapeHtml(t("listEmpty"))}</div>`
              : rows
                  .map((item, index) => {
                    const base = `contentSorts.${index}`;
                    return `<article class="object-card">
                      <div class="object-card-head">
                        <div>#${index + 1} ${escapeHtml(asString(item.name) || "(unnamed)")}</div>
                        <div class="item-tools">
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="contentSorts" data-index="${index}" data-dir="-1">${escapeHtml(
                            t("moveUp")
                          )}</button>
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="contentSorts" data-index="${index}" data-dir="1">${escapeHtml(
                            t("moveDown")
                          )}</button>
                          <button class="chip-danger" type="button" data-action="remove-array-item" data-path="contentSorts" data-index="${index}">${escapeHtml(
                            t("delete")
                          )}</button>
                        </div>
                      </div>
                      <div class="form-grid">
                        ${renderField({ path: `${base}.id`, label: L("ID", "ID"), map: L("Data identity", "数据标识"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.parentId`, label: L("Parent ID", "父级 ID"), map: L("0 = top nav, else child", "0=顶级导航，其他=子分类"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.name`, label: L("Name", "名称"), map: L("Visible text in nav/list", "导航/列表可见名称") })}
                        ${renderField({ path: `${base}.filename`, label: L("Filename", "别名"), map: L("Slug/route mapping key", "URL / 路由映射关键字") })}
                        ${renderField({ path: `${base}.modelCode`, label: L("Model Code", "模型代码"), map: L("single/news/product", "single/news/product") })}
                        ${renderField({ path: `${base}.sorting`, label: L("Sorting", "排序"), map: L("Higher value appears first", "值越大越靠前"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.listTemplate`, label: L("List Template", "列表模板"), map: L("Reference template id", "模板标识") })}
                        ${renderField({ path: `${base}.contentTemplate`, label: L("Content Template", "内容模板"), map: L("Detail template id", "详情模板标识") })}
                        ${renderField({ path: `${base}.status`, label: L("Status", "状态"), map: L("Whether this category is active", "是否启用该分类"), kind: "bool01" })}
                      </div>
                    </article>`;
                  })
                  .join("")
          }
        </div>
      `
    );
  }

  function renderSinglesSection() {
    const rows = asArray(state.siteData.singles);
    return renderSectionCard(
      L("Single Pages", "单页内容"),
      L("Mainly controls About/Downloads/Contact pages. Supports reusable style blocks.", "主要控制关于我们/下载中心/联系我们页面，并支持模板化区块。"),
      `
        ${renderListHeader("singles")}
        <div class="object-list">
          ${
            !rows.length
              ? `<div class="object-card">${escapeHtml(t("listEmpty"))}</div>`
              : rows
                  .map((item, index) => {
                    const base = `singles.${index}`;
                    return `<article class="object-card">
                      <div class="object-card-head">
                        <div>#${index + 1} ${escapeHtml(asString(item.title) || "(untitled)")}</div>
                        <div class="item-tools">
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="singles" data-index="${index}" data-dir="-1">${escapeHtml(
                            t("moveUp")
                          )}</button>
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="singles" data-index="${index}" data-dir="1">${escapeHtml(
                            t("moveDown")
                          )}</button>
                          <button class="chip-danger" type="button" data-action="remove-array-item" data-path="singles" data-index="${index}">${escapeHtml(
                            t("delete")
                          )}</button>
                        </div>
                      </div>
                      <div class="form-grid">
                        ${renderField({ path: `${base}.id`, label: L("ID", "ID"), map: L("Data identity", "数据标识"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.sortId`, label: L("Sort ID", "分类 ID"), map: L("Maps to contentSorts.id", "映射到 contentSorts.id"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.filename`, label: L("Filename", "别名"), map: L("Route key for page lookup", "页面路由关键字") })}
                        ${renderField({ path: `${base}.status`, label: L("Status", "状态"), map: L("Whether page is active", "页面是否启用"), kind: "bool01" })}
                        ${renderField({ path: `${base}.title`, label: L("Title", "标题"), map: L("Page heading", "页面主标题"), full: true })}
                        ${renderField({ path: `${base}.subtitle`, label: L("Subtitle", "副标题"), map: L("Page secondary title", "页面副标题"), full: true })}
                        ${renderField({ path: `${base}.pic`, label: L("Top Image", "顶部图片"), map: L("Page top visual image", "页面顶部视觉图"), full: true })}
                        ${renderField({ path: `${base}.picZh`, label: L("Top Image (ZH)", "顶部图片（中文）"), map: L("Chinese top visual image", "中文页面顶部视觉图"), full: true })}
                        ${renderField({ path: `${base}.description`, label: L("Description", "描述"), map: L("List intro / SEO helper", "列表简介/SEO 辅助"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.descriptionZh`, label: L("Description (ZH)", "描述（中文）"), map: L("Chinese list intro / SEO helper", "中文列表简介/SEO 辅助"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.content`, label: L("Content HTML", "正文 HTML"), map: L("Main rich content", "页面主要正文"), kind: "textarea", rows: 8, full: true })}
                        ${renderField({ path: `${base}.contentZh`, label: L("Content HTML (ZH)", "正文 HTML（中文）"), map: L("Chinese rich content", "中文页面正文"), kind: "textarea", rows: 8, full: true })}
                        ${renderField({ path: `${base}.date`, label: L("Date", "日期"), map: L("Display date", "展示日期") })}
                        ${renderField({ path: `${base}.visits`, label: L("Visits", "访问量"), map: L("Display/stat field", "展示/统计字段"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.keywords`, label: L("Keywords", "关键词"), map: L("SEO keyword helper", "SEO 关键词辅助"), full: true })}
                        ${renderField({ path: `${base}.outlink`, label: L("Outlink", "外链"), map: L("Optional external URL", "可选外部链接"), full: true })}
                      </div>
                      ${renderTemplateEditor(`${base}.layoutBlocks`, item.layoutBlocks, L("Template Blocks (EN)", "模板块（英文）"))}
                      ${renderTemplateEditor(`${base}.layoutBlocksZh`, item.layoutBlocksZh, L("Template Blocks (ZH)", "模板块（中文）"))}
                    </article>`;
                  })
                  .join("")
          }
        </div>
      `
    );
  }

  function renderProductsSection() {
    const rows = asArray(state.siteData.products);
    return renderSectionCard(
      L("Products", "产品中心"),
      L("Each item maps to both product list card and detail page. Includes bilingual body templates.", "每个产品同时映射产品列表和详情页，支持双语正文模板。"),
      `
        ${renderListHeader("products")}
        <div class="object-list">
          ${
            !rows.length
              ? `<div class="object-card">${escapeHtml(t("listEmpty"))}</div>`
              : rows
                  .map((item, index) => {
                    const base = `products.${index}`;
                    return `<article class="object-card">
                      <div class="object-card-head">
                        <div>#${index + 1} ${escapeHtml(asString(item.title) || "(untitled)")}</div>
                        <div class="item-tools">
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="products" data-index="${index}" data-dir="-1">${escapeHtml(
                            t("moveUp")
                          )}</button>
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="products" data-index="${index}" data-dir="1">${escapeHtml(
                            t("moveDown")
                          )}</button>
                          <button class="chip-danger" type="button" data-action="remove-array-item" data-path="products" data-index="${index}">${escapeHtml(
                            t("delete")
                          )}</button>
                        </div>
                      </div>
                      <div class="form-grid">
                        ${renderField({ path: `${base}.id`, label: L("ID", "ID"), map: L("Data identity", "数据标识"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.sortId`, label: L("Sort ID", "分类 ID"), map: L("Product category ID", "产品分类 ID"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.filename`, label: L("Slug", "别名"), map: L("Detail route /products/:slug", "详情页路由 /products/:slug") })}
                        ${renderField({ path: `${base}.status`, label: L("Status", "状态"), map: L("Whether visible on front-end", "是否在前台显示"), kind: "bool01" })}
                        ${renderField({ path: `${base}.sorting`, label: L("Sorting", "排序"), map: L("List order", "列表顺序"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.date`, label: L("Date", "日期"), map: L("Display date", "展示日期") })}
                        ${renderField({ path: `${base}.title`, label: L("Title (EN)", "标题（英文）"), map: L("Detail title / list card title", "详情标题 / 列表卡片标题"), full: true })}
                        ${renderField({ path: `${base}.titleZh`, label: L("Title (ZH)", "标题（中文）"), map: L("Chinese detail/list title", "中文详情/列表标题"), full: true })}
                        ${renderField({ path: `${base}.summary`, label: L("Summary (EN)", "概括（英文）"), map: L("Right-side summary in detail and list excerpt", "详情页右侧摘要与列表摘要"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.summaryZh`, label: L("Summary (ZH)", "概括（中文）"), map: L("Chinese summary", "中文摘要"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.description`, label: L("Description (EN)", "描述（英文）"), map: L("Fallback summary/content source", "摘要与正文备用来源"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.descriptionZh`, label: L("Description (ZH)", "描述（中文）"), map: L("Chinese fallback description", "中文备用描述"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.ico`, label: L("Card Image (EN)", "列表图（英文）"), map: L("Products list card cover", "产品列表卡片封面"), full: true })}
                        ${renderField({ path: `${base}.icoZh`, label: L("Card Image (ZH)", "列表图（中文）"), map: L("Chinese products list card cover", "中文产品列表封面"), full: true })}
                        ${renderField({ path: `${base}.pics`, label: L("Detail Gallery (EN)", "详情图库（英文）"), map: L("First image used on detail left side", "第一张用于详情页左侧"), kind: "lines", rows: 3, full: true })}
                        ${renderField({ path: `${base}.picsZh`, label: L("Detail Gallery (ZH)", "详情图库（中文）"), map: L("Chinese detail gallery", "中文详情图库"), kind: "lines", rows: 3, full: true })}
                        ${renderField({ path: `${base}.specRows`, label: L("Specs (EN)", "规格表（英文）"), map: L("Right-side spec rows: label|value", "右侧参数：label|value"), kind: "lines", rows: 4, full: true })}
                        ${renderField({ path: `${base}.specRowsZh`, label: L("Specs (ZH)", "规格表（中文）"), map: L("Chinese spec rows", "中文参数表"), kind: "lines", rows: 4, full: true })}
                        ${renderField({ path: `${base}.downloadLink`, label: L("Download Link (EN)", "下载链接（英文）"), map: L("Detail right-side download button", "详情右侧下载按钮"), full: true })}
                        ${renderField({ path: `${base}.downloadLinkZh`, label: L("Download Link (ZH)", "下载链接（中文）"), map: L("Chinese download button URL", "中文下载按钮链接"), full: true })}
                        ${renderField({ path: `${base}.categoryKeyZh`, label: L("ZH Category Key", "中文分类键"), map: L("Chinese category mapping key", "中文分类映射键") })}
                        ${renderField({ path: `${base}.author`, label: L("Author", "作者"), map: L("Metadata field", "元信息字段") })}
                        ${renderField({ path: `${base}.source`, label: L("Source", "来源"), map: L("Metadata field", "元信息字段") })}
                        ${renderField({ path: `${base}.content`, label: L("Content HTML (EN)", "正文 HTML（英文）"), map: L("Detail page lower body", "详情页下半区正文"), kind: "textarea", rows: 10, full: true })}
                        ${renderField({ path: `${base}.contentZh`, label: L("Content HTML (ZH)", "正文 HTML（中文）"), map: L("Chinese detail body", "中文详情正文"), kind: "textarea", rows: 10, full: true })}
                      </div>
                      ${renderTemplateEditor(`${base}.layoutBlocks`, item.layoutBlocks, L("Detail Template Blocks (EN)", "详情模板块（英文）"))}
                      ${renderTemplateEditor(`${base}.layoutBlocksZh`, item.layoutBlocksZh, L("Detail Template Blocks (ZH)", "详情模板块（中文）"))}
                    </article>`;
                  })
                  .join("")
          }
        </div>
      `
    );
  }

  function renderNewsSection() {
    const rows = asArray(state.siteData.news);
    return renderSectionCard(
      L("News", "新闻中心"),
      L("Controls news listing cards and news detail pages.", "控制新闻列表卡片与新闻详情页。"),
      `
        ${renderListHeader("news")}
        <div class="object-list">
          ${
            !rows.length
              ? `<div class="object-card">${escapeHtml(t("listEmpty"))}</div>`
              : rows
                  .map((item, index) => {
                    const base = `news.${index}`;
                    return `<article class="object-card">
                      <div class="object-card-head">
                        <div>#${index + 1} ${escapeHtml(asString(item.title) || "(untitled)")}</div>
                        <div class="item-tools">
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="news" data-index="${index}" data-dir="-1">${escapeHtml(
                            t("moveUp")
                          )}</button>
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="news" data-index="${index}" data-dir="1">${escapeHtml(
                            t("moveDown")
                          )}</button>
                          <button class="chip-danger" type="button" data-action="remove-array-item" data-path="news" data-index="${index}">${escapeHtml(
                            t("delete")
                          )}</button>
                        </div>
                      </div>
                      <div class="form-grid">
                        ${renderField({ path: `${base}.id`, label: L("ID", "ID"), map: L("Data identity", "数据标识"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.sortId`, label: L("Sort ID", "分类 ID"), map: L("Category mapping", "分类映射"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.filename`, label: L("Slug", "别名"), map: L("Detail route /news/:slug", "详情页路由 /news/:slug") })}
                        ${renderField({ path: `${base}.status`, label: L("Status", "状态"), map: L("Whether visible on front-end", "是否在前台显示"), kind: "bool01" })}
                        ${renderField({ path: `${base}.sorting`, label: L("Sorting", "排序"), map: L("List order", "列表顺序"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.date`, label: L("Date", "日期"), map: L("News date text", "新闻日期文案") })}
                        ${renderField({ path: `${base}.title`, label: L("Title (EN)", "标题（英文）"), map: L("List and detail title", "列表与详情标题"), full: true })}
                        ${renderField({ path: `${base}.titleZh`, label: L("Title (ZH)", "标题（中文）"), map: L("Chinese list and detail title", "中文列表与详情标题"), full: true })}
                        ${renderField({ path: `${base}.summary`, label: L("Summary (EN)", "摘要（英文）"), map: L("List excerpt", "列表摘要"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.summaryZh`, label: L("Summary (ZH)", "摘要（中文）"), map: L("Chinese list excerpt", "中文列表摘要"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.description`, label: L("Description (EN)", "描述（英文）"), map: L("Fallback text", "备用文本"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.descriptionZh`, label: L("Description (ZH)", "描述（中文）"), map: L("Chinese fallback text", "中文备用文本"), kind: "textarea", rows: 3, full: true })}
                        ${renderField({ path: `${base}.ico`, label: L("List Image (EN)", "列表图（英文）"), map: L("List card image", "列表卡片图片"), full: true })}
                        ${renderField({ path: `${base}.icoZh`, label: L("List Image (ZH)", "列表图（中文）"), map: L("Chinese list card image", "中文列表卡片图片"), full: true })}
                        ${renderField({ path: `${base}.pics`, label: L("Gallery (EN)", "图库（英文）"), map: L("Optional detail gallery", "可选详情图库"), kind: "lines", rows: 3, full: true })}
                        ${renderField({ path: `${base}.picsZh`, label: L("Gallery (ZH)", "图库（中文）"), map: L("Chinese detail gallery", "中文详情图库"), kind: "lines", rows: 3, full: true })}
                        ${renderField({ path: `${base}.author`, label: L("Author", "作者"), map: L("Metadata field", "元信息字段") })}
                        ${renderField({ path: `${base}.source`, label: L("Source", "来源"), map: L("Metadata field", "元信息字段") })}
                        ${renderField({ path: `${base}.content`, label: L("Content HTML (EN)", "正文 HTML（英文）"), map: L("Detail body content", "详情正文"), kind: "textarea", rows: 10, full: true })}
                        ${renderField({ path: `${base}.contentZh`, label: L("Content HTML (ZH)", "正文 HTML（中文）"), map: L("Chinese detail body content", "中文详情正文"), kind: "textarea", rows: 10, full: true })}
                      </div>
                      ${renderTemplateEditor(`${base}.layoutBlocks`, item.layoutBlocks, L("Detail Template Blocks (EN)", "详情模板块（英文）"))}
                      ${renderTemplateEditor(`${base}.layoutBlocksZh`, item.layoutBlocksZh, L("Detail Template Blocks (ZH)", "详情模板块（中文）"))}
                    </article>`;
                  })
                  .join("")
          }
        </div>
      `
    );
  }

  function renderSlidesSection() {
    const rows = asArray(state.siteData.slides);
    return renderSectionCard(
      L("Slides", "轮播图"),
      L("Home page hero slider resources.", "首页轮播区资源。"),
      `
        ${renderListHeader("slides")}
        <div class="object-list">
          ${
            !rows.length
              ? `<div class="object-card">${escapeHtml(t("listEmpty"))}</div>`
              : rows
                  .map((item, index) => {
                    const base = `slides.${index}`;
                    return `<article class="object-card">
                      <div class="object-card-head">
                        <div>#${index + 1} ${escapeHtml(asString(item.title) || "(slide)")}</div>
                        <div class="item-tools">
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="slides" data-index="${index}" data-dir="-1">${escapeHtml(
                            t("moveUp")
                          )}</button>
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="slides" data-index="${index}" data-dir="1">${escapeHtml(
                            t("moveDown")
                          )}</button>
                          <button class="chip-danger" type="button" data-action="remove-array-item" data-path="slides" data-index="${index}">${escapeHtml(
                            t("delete")
                          )}</button>
                        </div>
                      </div>
                      <div class="form-grid">
                        ${renderField({ path: `${base}.id`, label: L("ID", "ID"), map: L("Data identity", "数据标识"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.gid`, label: L("Group", "分组"), map: L("Usually home", "通常为 home") })}
                        ${renderField({ path: `${base}.sorting`, label: L("Sorting", "排序"), map: L("Slide order", "轮播顺序"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.link`, label: L("Link URL", "跳转链接"), map: L("Click action URL", "点击跳转地址"), full: true })}
                        ${renderField({ path: `${base}.title`, label: L("Title", "标题"), map: L("Overlay title text", "叠加标题文本"), full: true })}
                        ${renderField({ path: `${base}.subtitle`, label: L("Subtitle", "副标题"), map: L("Overlay subtitle text", "叠加副标题文本"), full: true })}
                        ${renderField({ path: `${base}.pic`, label: L("Image URL", "图片地址"), map: L("Slide background image", "轮播背景图"), full: true })}
                      </div>
                    </article>`;
                  })
                  .join("")
          }
        </div>
      `
    );
  }

  function renderLinksSection() {
    const rows = asArray(state.siteData.links);
    return renderSectionCard(
      L("Friendly Links", "友情链接"),
      L("Footer external links.", "页脚外链。"),
      `
        ${renderListHeader("links")}
        <div class="object-list">
          ${
            !rows.length
              ? `<div class="object-card">${escapeHtml(t("listEmpty"))}</div>`
              : rows
                  .map((item, index) => {
                    const base = `links.${index}`;
                    return `<article class="object-card">
                      <div class="object-card-head">
                        <div>#${index + 1} ${escapeHtml(asString(item.name) || "(link)")}</div>
                        <div class="item-tools">
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="links" data-index="${index}" data-dir="-1">${escapeHtml(
                            t("moveUp")
                          )}</button>
                          <button class="chip-neutral" type="button" data-action="move-array-item" data-path="links" data-index="${index}" data-dir="1">${escapeHtml(
                            t("moveDown")
                          )}</button>
                          <button class="chip-danger" type="button" data-action="remove-array-item" data-path="links" data-index="${index}">${escapeHtml(
                            t("delete")
                          )}</button>
                        </div>
                      </div>
                      <div class="form-grid">
                        ${renderField({ path: `${base}.id`, label: L("ID", "ID"), map: L("Data identity", "数据标识"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.gid`, label: L("Group", "分组"), map: L("Link group key", "链接分组键") })}
                        ${renderField({ path: `${base}.sorting`, label: L("Sorting", "排序"), map: L("Display order", "显示顺序"), kind: "int", type: "number" })}
                        ${renderField({ path: `${base}.name`, label: L("Name", "名称"), map: L("Footer visible label", "页脚可见名称"), full: true })}
                        ${renderField({ path: `${base}.link`, label: L("URL", "链接"), map: L("Target URL", "跳转地址"), full: true })}
                        ${renderField({ path: `${base}.logo`, label: L("Logo", "图标"), map: L("Optional link icon", "可选链接图标"), full: true })}
                      </div>
                    </article>`;
                  })
                  .join("")
          }
        </div>
      `
    );
  }

  function renderGuide() {
    const rows = SECTION_GUIDES[state.activeSection] || [];
    dom.sectionGuide.innerHTML = `<div class="guide-grid">${
      rows.length
        ? rows
            .map(
              (item) => `<article class="guide-card">
                <h4>${escapeHtml(currentText(item.area, state.uiLang))}</h4>
                <div class="guide-meta"><strong>Fields:</strong> ${escapeHtml(item.fields)}</div>
                <div class="guide-meta"><strong>Preview:</strong> <a href="${escapeHtml(item.preview)}?lang=${
                state.uiLang
              }" target="_blank" rel="noreferrer">${escapeHtml(item.preview)}</a></div>
              </article>`
            )
            .join("")
        : `<article class="guide-card">${escapeHtml(t("sectionHint"))}</article>`
    }</div>`;
  }

  function renderNav() {
    dom.sectionNav.innerHTML = SECTION_DEFS.map((sec) => {
      const active = sec.key === state.activeSection ? "is-active" : "";
      return `<button class="section-tab ${active}" type="button" data-action="switch-section" data-section="${sec.key}">${escapeHtml(
        currentText(sec.title, state.uiLang)
      )}</button>`;
    }).join("");
  }

  function renderMainSection() {
    const section = SECTION_DEFS.find((s) => s.key === state.activeSection) || SECTION_DEFS[0];
    dom.sectionTitle.textContent = currentText(section.title, state.uiLang);
    dom.sectionDesc.textContent = currentText(section.desc, state.uiLang);

    if (section.key === "site") {
      dom.formRoot.innerHTML = renderSiteSection();
    } else if (section.key === "company") {
      dom.formRoot.innerHTML = renderCompanySection();
    } else if (section.key === "contentSorts") {
      dom.formRoot.innerHTML = renderSortsSection();
    } else if (section.key === "singles") {
      dom.formRoot.innerHTML = renderSinglesSection();
    } else if (section.key === "products") {
      dom.formRoot.innerHTML = renderProductsSection();
    } else if (section.key === "news") {
      dom.formRoot.innerHTML = renderNewsSection();
    } else if (section.key === "slides") {
      dom.formRoot.innerHTML = renderSlidesSection();
    } else if (section.key === "links") {
      dom.formRoot.innerHTML = renderLinksSection();
    } else {
      dom.formRoot.innerHTML = "";
    }
    renderGuide();
  }

  function updateStaticTexts() {
    dom.saveButton.textContent = t("saveAll");
    dom.reloadButton.textContent = t("reload");
    dom.openSiteLink.textContent = t("openWebsite");
    dom.uploadButton.textContent = t("upload");
    dom.uploadResult.textContent = t("uploadHint");
    dom.applyJsonButton.textContent = t("applyJson");
    dom.saveJsonButton.textContent = t("saveJson");
    dom.langEnBtn.textContent = t("langEN");
    dom.langZhBtn.textContent = t("langZH");
    dom.langEnBtn.classList.toggle("is-active", state.uiLang === "en");
    dom.langZhBtn.classList.toggle("is-active", state.uiLang === "zh");
    dom.openSiteLink.href = `/?lang=${state.uiLang}`;
  }

  function renderAll() {
    updateStaticTexts();
    renderNav();
    renderMainSection();
    serializeEditor();
  }

  async function loadSiteData() {
    setNotice(t("loading"));
    const response = await fetch("/api/site");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    state.siteData = ensureSiteData(payload);
    renderAll();
    setNotice(t("sectionHint"));
  }

  async function saveSiteData() {
    if (!state.siteData) {
      return;
    }
    const response = await fetch("/api/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.siteData)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    state.siteData = ensureSiteData(payload.site || state.siteData);
    renderAll();
    setNotice(t("saveDone"), "success");
  }

  function moveArrayItem(path, index, dir) {
    const list = getByPath(state.siteData, path, null);
    if (!Array.isArray(list)) {
      return;
    }
    const target = index + dir;
    if (target < 0 || target >= list.length) {
      return;
    }
    const current = list[index];
    list[index] = list[target];
    list[target] = current;
  }

  function removeArrayItem(path, index) {
    const list = getByPath(state.siteData, path, null);
    if (!Array.isArray(list)) {
      return;
    }
    list.splice(index, 1);
  }

  function addArrayItem(path) {
    const list = getByPath(state.siteData, path, null);
    if (!Array.isArray(list)) {
      return;
    }
    if (path === "contentSorts") {
      const item = newSortItem();
      item.id = buildIdFor(list);
      list.push(item);
      return;
    }
    if (path === "singles") {
      const item = newSingleItem();
      item.id = buildIdFor(list);
      list.push(item);
      return;
    }
    if (path === "products") {
      const item = newContentItem();
      item.id = buildIdFor(list);
      list.push(item);
      return;
    }
    if (path === "news") {
      const item = newContentItem();
      item.id = buildIdFor(list);
      list.push(item);
      return;
    }
    if (path === "slides") {
      const item = newSlideItem();
      item.id = buildIdFor(list);
      list.push(item);
      return;
    }
    if (path === "links") {
      const item = newLinkItem();
      item.id = buildIdFor(list);
      list.push(item);
    }
  }

  function addTemplate(path, presetType = "hero-overlay") {
    const list = getByPath(state.siteData, path, null);
    if (!Array.isArray(list)) {
      return;
    }
    list.push(templatePreset(presetType));
  }

  async function handleUpload() {
    const file = dom.uploadInput.files && dom.uploadInput.files[0];
    if (!file) {
      setNotice(t("uploadNeedFile"), "error");
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("File read failed."));
      reader.readAsDataURL(file);
    });
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, dataUrl })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    const url = asString(payload.url);
    dom.uploadResult.textContent = `${t("uploadDone")} ${url}`;
    if (state.focusedField && state.focusedField.dataset && state.focusedField.dataset.path) {
      const path = state.focusedField.dataset.path;
      const kind = state.focusedField.dataset.kind || "text";
      if (kind === "lines") {
        const current = asArray(getByPath(state.siteData, path, []));
        current.push(url);
        setByPath(state.siteData, path, current);
      } else {
        setByPath(state.siteData, path, url);
      }
      renderAll();
      setNotice(`${t("uploadDone")} ${url}`, "success");
    }
  }

  function bindEvents() {
    document.body.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.classList.contains("form-input") && target.dataset.path) {
        state.focusedField = target;
      }
    });

    dom.formRoot.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains("form-input")) {
        return;
      }
      const path = target.dataset.path;
      const kind = target.dataset.kind || "text";
      if (!path || !state.siteData) {
        return;
      }
      const rawValue = "value" in target ? target.value : "";
      setByPath(state.siteData, path, parseInputValue(rawValue, kind));
      serializeEditor();
    });

    document.body.addEventListener("click", (event) => {
      const trigger = event.target instanceof HTMLElement ? event.target.closest("[data-action]") : null;
      if (!trigger || !state.siteData) {
        return;
      }
      const action = trigger.dataset.action;
      if (action === "switch-section") {
        state.activeSection = trigger.dataset.section || "site";
        renderAll();
        return;
      }
      if (action === "add-array-item") {
        addArrayItem(trigger.dataset.path || "");
        renderAll();
        return;
      }
      if (action === "remove-array-item") {
        removeArrayItem(trigger.dataset.path || "", asInt(trigger.dataset.index, -1));
        renderAll();
        return;
      }
      if (action === "move-array-item") {
        moveArrayItem(trigger.dataset.path || "", asInt(trigger.dataset.index, -1), asInt(trigger.dataset.dir, 0));
        renderAll();
        return;
      }
      if (action === "add-template") {
        addTemplate(trigger.dataset.path || "", "hero-overlay");
        renderAll();
        return;
      }
      if (action === "add-template-preset") {
        addTemplate(trigger.dataset.path || "", trigger.dataset.preset || "hero-overlay");
        renderAll();
      }
    });

    dom.saveButton.addEventListener("click", async () => {
      try {
        await saveSiteData();
      } catch (error) {
        setNotice(`${t("saveFailed")} ${error.message}`, "error");
      }
    });

    dom.reloadButton.addEventListener("click", async () => {
      try {
        await loadSiteData();
      } catch (error) {
        setNotice(`${t("loadFailed")} ${error.message}`, "error");
      }
    });

    dom.applyJsonButton.addEventListener("click", () => {
      try {
        state.siteData = ensureSiteData(JSON.parse(dom.editor.value || "{}"));
        renderAll();
        setNotice(t("jsonApplied"), "success");
      } catch (error) {
        setNotice(`${t("jsonError")} ${error.message}`, "error");
      }
    });

    dom.saveJsonButton.addEventListener("click", async () => {
      try {
        state.siteData = ensureSiteData(JSON.parse(dom.editor.value || "{}"));
        await saveSiteData();
      } catch (error) {
        setNotice(`${t("saveFailed")} ${error.message}`, "error");
      }
    });

    dom.uploadButton.addEventListener("click", async () => {
      try {
        await handleUpload();
      } catch (error) {
        setNotice(`${t("saveFailed")} ${error.message}`, "error");
      }
    });

    dom.langEnBtn.addEventListener("click", () => {
      state.uiLang = "en";
      renderAll();
    });

    dom.langZhBtn.addEventListener("click", () => {
      state.uiLang = "zh";
      renderAll();
    });
  }

  async function init() {
    bindEvents();
    updateStaticTexts();
    try {
      await loadSiteData();
    } catch (error) {
      setNotice(`${t("loadFailed")} ${error.message}`, "error");
    }
  }

  init();
})();
