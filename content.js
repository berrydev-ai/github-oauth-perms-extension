/*
 * GitHub Authorized Apps - Inline Permissions (content script)
 * Runs on GitHub's application settings tabs.
 * For each Authorized App row, fetches the app's detail page
 * (same-origin, using your session) and injects its Permissions list.
 * READ-ONLY: it never revokes or changes anything.
 */
(() => {
  "use strict";

  const CACHE_PREFIX = "ghperm:v4:";
  const APPLICATIONS_PATH = "/settings/applications";
  const AUTHORIZED_GITHUB_APPS_PATH = "/settings/apps/authorizations";
  const SUPPORTED_APPLICATIONS_PATHS = [APPLICATIONS_PATH, AUTHORIZED_GITHUB_APPS_PATH];
  const FEATURE_ENABLED_KEY = "ghpermEnabled";
  const DEFAULT_ENABLED = true;
  const PERMISSION_ITEM_CLASS = "p-0 listgroup-item border-0 wb-break-word ws-normal";
  const DANGEROUS_PERMISSION_ITEM_CLASS = `${PERMISSION_ITEM_CLASS} color-fg-danger text-bold`;
  const INSTALL_SUMMARY_ITEM_CLASS = "p-0 mt-2 text-small color-fg-muted wb-break-word ws-normal";
  const DANGEROUS_PERMISSION_PATTERNS = [
    /private repositor/i,
    /full control/i,
    /\bdelete\b/i,
    /\badmin\b/i,
    /org(?:anization)?|team/i,
    /workflow|github action/i,
    /webhook/i,
    /ssh key|gpg key|deploy key|public key/i,
    /package/i,
    /personal access token/i,
    /act on your behalf/i,
    /\bmanage\b/i,
  ];

  const normalizeText = (text) => text.replace(/\s+/g, " ").trim();

  const unique = (items) => [...new Set(items.map(normalizeText).filter(Boolean))];

  /**
   * Checks whether the current settings page has authorized app rows to enrich.
   * @param {string} pathname - Current browser path.
   * @returns {boolean} Whether the content script should run.
   */
  const isApplicationsPath = (pathname) => SUPPORTED_APPLICATIONS_PATHS.includes(pathname);

  /**
   * Checks whether a permission label should be visibly marked as risky.
   * @param {string} permission - Permission label from GitHub.
   * @returns {boolean} Whether the permission is dangerous.
   */
  const isDangerousPermission = (permission) =>
    DANGEROUS_PERMISSION_PATTERNS.some((pattern) => pattern.test(permission));

  const storageApi = () => {
    if (typeof chrome === "undefined") return null;
    return chrome.storage?.sync || null;
  };

  const isChromeRuntimeError = () =>
    typeof chrome !== "undefined" && Boolean(chrome.runtime?.lastError);

  /**
   * Reads whether inline permissions should run.
   * @returns {Promise<boolean>} Whether the feature is enabled.
   */
  function featureEnabled() {
    return new Promise((resolve) => {
      const storage = storageApi();
      if (!storage) {
        resolve(DEFAULT_ENABLED);
        return;
      }

      storage.get({ [FEATURE_ENABLED_KEY]: DEFAULT_ENABLED }, (items) => {
        if (isChromeRuntimeError()) {
          console.error("[ghperm] Could not read settings", chrome.runtime.lastError);
          resolve(DEFAULT_ENABLED);
          return;
        }

        resolve(items[FEATURE_ENABLED_KEY] !== false);
      });
    });
  }

  const decodeHtmlEntities = (text) => {
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      return textarea.value;
    }

    return text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  const htmlToText = (html) =>
    normalizeText(
      decodeHtmlEntities(
        html
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " "),
      ),
    );

  const stripTrailingPeriod = (text) => text.replace(/\.$/, "");

  const cleanPermissionText = (text) =>
    normalizeText(text.replace(/\s+[^.?!]*\bcan access your account\b[\s\S]*$/i, ""));

  const permissionSectionMarkup = (html) => {
    const heading = /<h[1-6][^>]*>\s*Permissions\s*<\/h[1-6]>/i.exec(html);
    if (!heading) return "";

    const afterHeading = html.slice(heading.index + heading[0].length);
    const boundary = [
      afterHeading.search(/Applications act on your behalf/i),
    ]
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0];

    return boundary === undefined ? afterHeading : afterHeading.slice(0, boundary);
  };

  const installSummaryParagraphMarkup = (section) => {
    const summaryPattern =
      /<p\b[^>]*>((?:(?!<\/p>)[\s\S])*(?:has been installed on|has not been installed on)(?:(?!<\/p>)[\s\S])*)<\/p>/i;
    const match = summaryPattern.exec(section);
    return match ? match[1] : "";
  };

  /**
   * Extracts the exact visible permission labels from a GitHub OAuth app detail page.
   * @param {string} html - GitHub's OAuth app detail page HTML.
   * @returns {string[]} Permission labels in page order.
   */
  function extractPermissionTextsFromMarkup(html) {
    const section = permissionSectionMarkup(html);
    if (!section) return [];

    const titles = [];
    const checkIconPattern =
      /<svg\b(?=[^>]*\bocticon-check\b)[^>]*>[\s\S]*?<\/svg>([\s\S]*?)(?=<svg\b(?=[^>]*\bocticon-check\b)|<p\b[^>]*>[\s\S]*?(?:\bcan access your account\b[\s\S]*?\bto:|has been installed on|has not been installed on)[\s\S]*?<\/p>|Applications act on your behalf|<h[1-6]\b|$)/gi;

    for (const match of section.matchAll(checkIconPattern)) {
      const text = cleanPermissionText(htmlToText(match[1]));
      if (text && !/revoke access/i.test(text)) titles.push(text);
    }

    if (titles.length === 0) {
      const listItemPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      for (const match of section.matchAll(listItemPattern)) {
        const text = htmlToText(match[1]);
        if (text) titles.push(text);
      }
    }

    return unique(titles);
  }

  /**
   * Extracts the GitHub App installation summary from a detail page.
   * @param {string} html - GitHub's app detail page HTML.
   * @returns {string} Installation summary, or an empty string.
   */
  function extractInstallSummaryFromMarkup(html) {
    const section = permissionSectionMarkup(html);
    if (!section) return "";

    const summaryMarkup = installSummaryParagraphMarkup(section);
    if (!summaryMarkup) return "";

    const text = stripTrailingPeriod(htmlToText(summaryMarkup)).replace(/\s+([,.:;])/g, "$1");
    const installedTo = text.match(/has been installed on \d+ accounts you have access to:\s*(.+)$/i);
    if (installedTo) return `Installed to: ${installedTo[1]}.`;

    if (/has not been installed on any accounts you have access to/i.test(text)) return "No installs.";
    return `${text}.`;
  }

  /**
   * Extracts installed account names from a GitHub App detail page.
   * @param {string} html - GitHub's app detail page HTML.
   * @returns {string[]} Installed account names in page order.
   */
  function extractInstalledAccountNamesFromMarkup(html) {
    const section = permissionSectionMarkup(html);
    if (!section) return [];

    const summaryMarkup = installSummaryParagraphMarkup(section);
    if (!summaryMarkup || !/has been installed on/i.test(summaryMarkup)) return [];

    return unique(
      [...summaryMarkup.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].map((strongMatch) =>
        htmlToText(strongMatch[1]),
      ),
    );
  }

  const isAfter = (earlier, later) => Boolean(earlier.compareDocumentPosition(later) & 4);

  const isBefore = (earlier, later) => Boolean(earlier.compareDocumentPosition(later) & 4);

  const permissionTextFromIcon = (icon) => {
    let el = icon.parentElement;
    for (let depth = 0; el && depth < 4; depth++, el = el.parentElement) {
      const text = normalizeText(el.textContent || "");
      if (text && !/applications act on your behalf|revoke access/i.test(text)) return text;
    }
    return "";
  };

  const extractPermissionTextsFromDocument = (doc) => {
    const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const permHead = headings.find((n) => /^permissions$/i.test(normalizeText(n.textContent || "")));
    if (!permHead) return [];

    const nextHeading = headings.find((n) => n !== permHead && isAfter(permHead, n));
    const icons = [...doc.querySelectorAll("svg.octicon-check, .octicon-check")].filter(
      (icon) => isAfter(permHead, icon) && (!nextHeading || isBefore(icon, nextHeading)),
    );

    return unique(icons.map(permissionTextFromIcon));
  };

  // --- session cache so pagination / re-renders don't refetch ---
  const cacheGet = (id) => {
    try { const v = sessionStorage.getItem(CACHE_PREFIX + id); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  };
  const cacheSet = (id, data) => {
    try { sessionStorage.setItem(CACHE_PREFIX + id, JSON.stringify(data)); } catch (e) {}
  };

  // --- parse the permissions titles out of a detail page's HTML ---
  /**
   * Parses GitHub's OAuth app detail page and returns the exact permission labels.
   * @param {string} html - GitHub's OAuth app detail page HTML.
   * @returns {string[]} Permission labels in page order.
   */
  function parsePermissions(html) {
    const fromMarkup = extractPermissionTextsFromMarkup(html);
    if (fromMarkup.length > 0) return fromMarkup;
    if (typeof DOMParser === "undefined") return [];

    const doc = new DOMParser().parseFromString(html, "text/html");
    return extractPermissionTextsFromDocument(doc);
  }

  function parsePermissionDetails(html) {
    return {
      permissions: parsePermissions(html),
      installSummary: extractInstallSummaryFromMarkup(html),
      installAccountNames: extractInstalledAccountNamesFromMarkup(html),
    };
  }

  async function fetchPerms(url) {
    const id = url.split("/").pop();
    const cached = cacheGet(id);
    if (cached) {
      return Array.isArray(cached)
        ? { permissions: cached, installSummary: "", installAccountNames: [] }
        : { installAccountNames: [], ...cached };
    }
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const details = parsePermissionDetails(await res.text());
    if (details.permissions.length === 0) throw new Error("No permissions found on detail page");
    cacheSet(id, details);
    return details;
  }

  // --- find the full row element for an app link ---
  function rowOf(a) {
    let el =
      a.closest('li, .Box-row, .access-list-item, .listgroup-item, [role="listitem"]') ||
      a.closest("div");
    // walk up until the container includes the "Owned by ..." meta line
    let up = el, tries = 0;
    while (up && tries < 5 && !/owned by/i.test(up.textContent)) {
      up = up.parentElement;
      tries++;
    }
    return up && /owned by/i.test(up.textContent) ? up : el;
  }

  function permissionTargetOf(a) {
    const row = rowOf(a);
    return a.closest(".TableObject-item--primary") || row?.querySelector(".TableObject-item--primary") || row;
  }

  const makeCheckIcon = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("data-component", "Octicon");
    svg.setAttribute("class", "octicon octicon-check color-fg-success mr-1");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("version", "1.1");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z",
    );
    svg.appendChild(path);
    return svg;
  };

  const makeAlertIcon = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("data-component", "Octicon");
    svg.setAttribute("class", "octicon octicon-alert color-fg-danger mr-1");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("version", "1.1");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
    );
    svg.appendChild(path);
    return svg;
  };

  const makePermissionItem = (text) => {
    const dangerous = isDangerousPermission(text);
    const item = document.createElement("div");
    item.className = dangerous ? DANGEROUS_PERMISSION_ITEM_CLASS : PERMISSION_ITEM_CLASS;
    item.append(dangerous ? makeAlertIcon() : makeCheckIcon(), document.createTextNode(" " + text));
    return item;
  };

  const appendBoldedNames = (item, text, names) => {
    let offset = 0;
    for (const name of names) {
      const index = text.indexOf(name, offset);
      if (index < 0) continue;
      item.append(document.createTextNode(text.slice(offset, index)));
      const strong = document.createElement("strong");
      strong.className = "text-bold";
      strong.textContent = name;
      item.append(strong);
      offset = index + name.length;
    }
    item.append(document.createTextNode(text.slice(offset)));
  };

  const makeSummaryItem = (text, names = []) => {
    const item = document.createElement("div");
    item.className = INSTALL_SUMMARY_ITEM_CLASS;
    if (names.length > 0) {
      appendBoldedNames(item, text, names);
    } else {
      item.textContent = text;
    }
    return item;
  };

  const getOrCreateBlock = (row) => {
    if (!row) return null;

    const existing = row.querySelector(":scope > [data-ghperm-block]");
    if (existing) return existing;

    const box = document.createElement("div");
    box.className = "pt-2 wb-break-word ws-normal";
    box.dataset.ghpermBlock = "1";
    row.appendChild(box);
    return box;
  };

  function render(row, details) {
    const box = getOrCreateBlock(row);
    if (!box) return;
    const permissions = Array.isArray(details) ? details : details.permissions;
    const installSummary = Array.isArray(details) ? "" : details.installSummary;
    const installAccountNames = Array.isArray(details) ? [] : details.installAccountNames || [];

    box.replaceChildren();
    permissions.forEach((p) => box.appendChild(makePermissionItem(p)));
    if (installSummary) box.appendChild(makeSummaryItem(installSummary, installAccountNames));
  }

  function renderMessage(row, message) {
    const box = getOrCreateBlock(row);
    if (!box) return;
    box.replaceChildren(makePermissionItem(message));
  }

  function clearRenderedPermissions() {
    document.querySelectorAll("[data-ghperm-block]").forEach((block) => block.remove());
    document.querySelectorAll("[data-ghperm-done]").forEach((row) => {
      delete row.dataset.ghpermDone;
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      APPLICATIONS_PATH,
      DEFAULT_ENABLED,
      DANGEROUS_PERMISSION_ITEM_CLASS,
      FEATURE_ENABLED_KEY,
      INSTALL_SUMMARY_ITEM_CLASS,
      PERMISSION_ITEM_CLASS,
      extractInstalledAccountNamesFromMarkup,
      extractInstallSummaryFromMarkup,
      extractPermissionTextsFromMarkup,
      featureEnabled,
      isApplicationsPath,
      isDangerousPermission,
      parsePermissionDetails,
      parsePermissions,
    };
  }

  if (typeof document === "undefined") return;

  let running = false;
  let queued = false;
  async function process() {
    if (!isApplicationsPath(location.pathname)) return;
    if (!(await featureEnabled())) {
      clearRenderedPermissions();
      return;
    }
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      const anchors = [...document.querySelectorAll('a[href*="/settings/connections/applications/"]')];
      const tasks = [];
      for (const a of anchors) {
        const url = new URL(a.getAttribute("href"), location.origin).href;
        const row = permissionTargetOf(a);
        if (!row || row.dataset.ghpermDone) continue;
        row.dataset.ghpermDone = "1";
        renderMessage(row, "Loading permissions...");
        tasks.push(
          fetchPerms(url)
            .then((perms) => render(row, perms))
            .catch((e) => {
              console.error("[ghperm] Could not load permissions", e);
              renderMessage(row, "Could not load permissions (" + e.message + ")");
            }),
        );
      }
      await Promise.allSettled(tasks);
    } finally {
      running = false;
      if (queued) {
        queued = false;
        debouncedRun();
      }
    }
  }

  // initial run + handle GitHub's Turbo/PJAX navigations and pagination
  const debouncedRun = () => {
    clearTimeout(window.__ghpermTimer);
    window.__ghpermTimer = setTimeout(process, 350);
  };
  process();
  document.addEventListener("turbo:load", debouncedRun);
  document.addEventListener("turbo:render", debouncedRun);
  document.addEventListener("turbo:frame-load", debouncedRun);
  document.addEventListener("pjax:end", debouncedRun);
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes[FEATURE_ENABLED_KEY]) return;
      if (changes[FEATURE_ENABLED_KEY].newValue === false) {
        clearRenderedPermissions();
        return;
      }
      debouncedRun();
    });
  }
  new MutationObserver(debouncedRun).observe(document.body, { childList: true, subtree: true });
})();
