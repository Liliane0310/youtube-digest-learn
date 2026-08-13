/**
 * Shared, non-secret configuration helpers.
 *
 * API keys are stored in chrome.storage.local by options.js. This file contains
 * defaults and validation only, so it is safe to publish.
 */
var YTD_SETTINGS = (() => {
  const STORAGE_KEY = "ytd_settings";
  const DEFAULTS = Object.freeze({
    provider: "DeepSeek",
    aiApiKey: "",
    aiBaseUrl: "https://api.deepseek.com",
    aiModel: "deepseek-v4-flash",
    supadataApiKey: "",
    merriamWebsterLearnersKey: "",
    merriamWebsterCollegiateKey: "",
    obsidianSyncEnabled: false,
    obsidianApiBaseUrl: "http://127.0.0.1:27123",
    obsidianApiKey: "",
    obsidianVocabularyPath: "youtube-digest-learn/Vocabulary.md",
    obsidianVideoFolder: "youtube-digest-learn/Videos",
    obsidianAutoSync: true,
  });

  function cleanText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function normalizeBaseUrl(value, fallback = DEFAULTS.aiBaseUrl) {
    const candidate = cleanText(value, fallback);
    try {
      const url = new URL(candidate);
      if (!/^https?:$/.test(url.protocol)) return fallback;
      if (url.username || url.password || url.search || url.hash) return fallback;
      url.pathname = url.pathname.replace(/\/+$/, "");
      return url.toString().replace(/\/$/, "");
    } catch (_error) {
      return fallback;
    }
  }

  function isValidBaseUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    return normalizeBaseUrl(value, "") !== "";
  }

  function normalize(input = {}) {
    return {
      provider: cleanText(input.provider, DEFAULTS.provider).slice(0, 80),
      aiApiKey:
        typeof input.aiApiKey === "string" ? input.aiApiKey.trim() : "",
      aiBaseUrl: normalizeBaseUrl(input.aiBaseUrl),
      aiModel: cleanText(input.aiModel, DEFAULTS.aiModel).slice(0, 200),
      supadataApiKey:
        typeof input.supadataApiKey === "string"
          ? input.supadataApiKey.trim()
          : "",
      merriamWebsterLearnersKey:
        typeof input.merriamWebsterLearnersKey === "string"
          ? input.merriamWebsterLearnersKey.trim()
          : "",
      merriamWebsterCollegiateKey:
        typeof input.merriamWebsterCollegiateKey === "string"
          ? input.merriamWebsterCollegiateKey.trim()
          : "",
      obsidianSyncEnabled: input.obsidianSyncEnabled === true,
      obsidianApiBaseUrl: normalizeObsidianBaseUrl(
        input.obsidianApiBaseUrl,
      ),
      obsidianApiKey:
        typeof input.obsidianApiKey === "string"
          ? input.obsidianApiKey.trim()
          : "",
      obsidianVocabularyPath: cleanText(
        input.obsidianVocabularyPath,
        DEFAULTS.obsidianVocabularyPath,
      ).slice(0, 240),
      obsidianVideoFolder: normalizeObsidianFolder(
        input.obsidianVideoFolder,
      ),
      obsidianAutoSync: input.obsidianAutoSync !== false,
    };
  }

  function normalizeObsidianBaseUrl(
    value,
    fallback = DEFAULTS.obsidianApiBaseUrl,
  ) {
    const candidate = cleanText(value, fallback);
    try {
      const url = new URL(candidate);
      if (!/^https?:$/.test(url.protocol)) return fallback;
      if (url.username || url.password || url.search || url.hash) return fallback;
      const hostname = url.hostname.toLowerCase();
      if (!["127.0.0.1", "localhost", "[::1]"].includes(hostname)) {
        return fallback;
      }
      if (url.pathname && url.pathname !== "/") return fallback;
      return url.origin;
    } catch (_error) {
      return fallback;
    }
  }

  function isValidObsidianBaseUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    return normalizeObsidianBaseUrl(value, "") !== "";
  }

  function normalizeObsidianFolder(
    value,
    fallback = DEFAULTS.obsidianVideoFolder,
  ) {
    const candidate = cleanText(value, fallback)
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/");
    if (!candidate || candidate.length > 220) return fallback;
    const parts = candidate.split("/");
    if (
      parts.some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /[<>:"|?*\u0000-\u001f]/.test(part) ||
          /[. ]$/.test(part),
      )
    ) {
      return fallback;
    }
    return parts.join("/");
  }

  function isValidObsidianFolder(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    return normalizeObsidianFolder(value, "") !== "";
  }

  // Kept as a compatibility boundary for settings saved by older releases.
  function migrateLegacyCustom(input = {}) {
    return {
      settings: normalize(input),
      migrated: false,
    };
  }

  function chatCompletionsUrl(baseUrl = DEFAULTS.aiBaseUrl) {
    const normalized = normalizeBaseUrl(baseUrl);
    return /\/chat\/completions$/i.test(normalized)
      ? normalized
      : `${normalized}/chat/completions`;
  }

  function originPermission(baseUrl) {
    const url = new URL(normalizeBaseUrl(baseUrl));
    return `${url.protocol}//${url.hostname}/*`;
  }

  function isDeepSeek(settings) {
    try {
      return new URL(settings.aiBaseUrl).hostname.toLowerCase() === "api.deepseek.com";
    } catch (_error) {
      return false;
    }
  }

  function canonicalYouTubeUrl(videoId) {
    const normalized = String(videoId || "").trim();
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(normalized)) {
      throw new Error("Invalid YouTube video ID.");
    }
    return `https://www.youtube.com/watch?v=${normalized}`;
  }

  return {
    STORAGE_KEY,
    DEFAULTS,
    normalize,
    normalizeBaseUrl,
    isValidBaseUrl,
    migrateLegacyCustom,
    chatCompletionsUrl,
    originPermission,
    normalizeObsidianBaseUrl,
    isValidObsidianBaseUrl,
    normalizeObsidianFolder,
    isValidObsidianFolder,
    isDeepSeek,
    canonicalYouTubeUrl,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_SETTINGS;
}
