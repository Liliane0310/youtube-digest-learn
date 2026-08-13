/**
 * Pure vocabulary and Obsidian note helpers. Network calls and API keys stay
 * in the background service worker.
 */
var YTD_VOCABULARY = (() => {
  const STORAGE_KEY = "ytd_vocabulary_v1";
  const MAX_WORDS = 500;
  const MAX_CONTEXTS_PER_WORD = 6;
  const MANAGED_START = "<!-- youtube-digest:vocabulary:start -->";
  const MANAGED_END = "<!-- youtube-digest:vocabulary:end -->";

  function cleanLine(value, maxLength = 1000) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function normalizeNotePath(value) {
    const normalized = String(value || "")
      .trim()
      .replaceAll("\\", "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/")
      .trim();
    if (!normalized) return "";
    const segments = normalized.split("/");
    if (
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          /[\x00-\x1f:*?"<>|#^\[\]]/.test(segment),
      )
    ) {
      return "";
    }
    const path = segments.join("/").slice(0, 240);
    return /\.md$/i.test(path) ? path : "";
  }

  function encodeVaultPath(filepath) {
    return String(filepath || "")
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  function yamlString(value) {
    return JSON.stringify(cleanLine(value, 500));
  }

  function markdownText(value) {
    return cleanLine(value, 2000).replace(/([\\`*_[\]<>])/g, "\\$1");
  }

  function quoteMarkdown(value) {
    return cleanLine(value, 3000)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  function formatTimestamp(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  function sourceUrl(context) {
    const videoId = cleanLine(context?.videoId, 30);
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return "";
    const seconds = Math.max(0, Math.floor(Number(context?.timestamp) || 0));
    return `https://www.youtube.com/watch?v=${videoId}${seconds ? `&t=${seconds}s` : ""}`;
  }

  function buildWordSection(record) {
    const entries = Array.isArray(record?.dictionary?.entries)
      ? record.dictionary.entries.slice(0, 4)
      : [];
    const definitions = entries
      .flatMap((entry) => entry?.definitions || [])
      .map((definition) => cleanLine(definition, 600))
      .filter(Boolean)
      .slice(0, 8);
    const examples = entries
      .flatMap((entry) => entry?.examples || [])
      .map((example) => cleanLine(example, 800))
      .filter(Boolean)
      .slice(0, 5);
    const firstEntry = entries[0] || {};
    const contexts = Array.isArray(record?.contexts)
      ? record.contexts.slice(0, MAX_CONTEXTS_PER_WORD)
      : [];
    const lines = [`## ${markdownText(record.word)}`, ""];

    const pronunciation = cleanLine(firstEntry.pronunciation, 120);
    const partOfSpeech = cleanLine(firstEntry.partOfSpeech, 120);
    if (pronunciation || partOfSpeech) {
      lines.push(
        [pronunciation ? `/${markdownText(pronunciation)}/` : "", markdownText(partOfSpeech)]
          .filter(Boolean)
          .join(" · "),
        "",
      );
    }
    if (record?.context?.meaningZh) {
      lines.push("### 此处意为", "", quoteMarkdown(record.context.meaningZh), "");
      if (record.context.usageNote) {
        lines.push(`学习提示：${markdownText(record.context.usageNote)}`, "");
      }
    }
    if (definitions.length) {
      lines.push(
        "### 词典释义",
        "",
        ...definitions.map((definition, index) => `${index + 1}. ${markdownText(definition)}`),
        "",
      );
    }
    if (examples.length) {
      lines.push(
        "### 例句",
        "",
        ...examples.map((example) => `- ${markdownText(example)}`),
        "",
      );
    }
    if (contexts.length) {
      lines.push("### 字幕语境", "");
      contexts.forEach((context) => {
        const title = markdownText(context.videoTitle || "YouTube video");
        const url = sourceUrl(context);
        const time = formatTimestamp(context.timestamp);
        lines.push(`#### ${url ? `[${title} · ${time}](${url})` : `${title} · ${time}`}`);
        if (context.sentence) lines.push("", quoteMarkdown(context.sentence));
        lines.push("");
      });
    }
    return lines.join("\n");
  }

  function buildManagedBlock(records) {
    const sorted = (Array.isArray(records) ? records : [])
      .filter((record) => record?.word)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    const sections = sorted.map(buildWordSection);
    return [
      MANAGED_START,
      sections.length ? sections.join("\n\n---\n\n") : "_还没有收藏单词。_",
      "",
      `_共 ${sorted.length} 个单词 · 由 youtube-digest-learn 同步 · ${new Date().toISOString()}_`,
      MANAGED_END,
    ].join("\n");
  }

  function createNote(records) {
    const created = new Date().toISOString();
    return [
      "---",
      "type: vocabulary-list",
      "source: youtube-digest-learn",
      `created: ${yamlString(created)}`,
      "tags:",
      "  - youtube-digest-learn",
      "  - vocabulary",
      "---",
      "",
      "# youtube-digest-learn 生词本",
      "",
      buildManagedBlock(records),
      "",
      "## 我的笔记",
      "",
    ].join("\n");
  }

  function mergeManagedNote(existingContent, records) {
    const existing = String(existingContent || "");
    if (!existing.trim()) return { content: createNote(records), created: true };
    const start = existing.indexOf(MANAGED_START);
    const end = existing.indexOf(MANAGED_END);
    if (start === -1 || end === -1 || end < start) {
      const error = new Error(
        "An existing Obsidian note at this path is not managed by youtube-digest-learn.",
      );
      error.code = "OBSIDIAN_NOTE_CONFLICT";
      throw error;
    }
    const after = end + MANAGED_END.length;
    return {
      content: `${existing.slice(0, start)}${buildManagedBlock(records)}${existing.slice(after)}`,
      created: false,
    };
  }

  return {
    STORAGE_KEY,
    MAX_WORDS,
    MAX_CONTEXTS_PER_WORD,
    MANAGED_START,
    MANAGED_END,
    normalizeNotePath,
    encodeVaultPath,
    sourceUrl,
    buildWordSection,
    buildManagedBlock,
    createNote,
    mergeManagedNote,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_VOCABULARY;
}
