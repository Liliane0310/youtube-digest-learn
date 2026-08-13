/**
 * Pure Merriam-Webster dictionary helpers shared by the service worker and
 * repository tests. No credentials or network calls live in this file.
 */
var YTD_DICTIONARY = (() => {
  const DICTIONARY_CACHE_KEY = "ytd_dictionary_cache_v1";
  const CONTEXT_CACHE_KEY = "ytd_word_context_cache_v1";
  const PRECACHE_STATE_KEY = "ytd_dictionary_precache_v1";
  const CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
  const CACHE_MAX_ENTRIES = 500;
  const CONTEXT_CACHE_MAX_ENTRIES = 500;
  const PRECACHE_WORD_LIMIT = 6;

  const STOP_WORDS = new Set(
    [
      "about", "after", "again", "against", "because", "before", "being",
      "between", "could", "didnt", "doesnt", "doing", "during", "every",
      "first", "going", "having", "heres", "itself", "might", "other",
      "really", "should", "something", "still", "their", "there", "these",
      "thing", "things", "think", "those", "through", "today", "under",
      "using", "wanna", "watch", "were", "whats", "where", "which",
      "while", "would", "youre", "youve",
    ],
  );

  function normalizeLookupWord(value) {
    const normalized = String(value || "")
      .trim()
      .replace(/[’‘]/g, "'")
      .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "")
      .toLowerCase();
    if (
      !normalized ||
      normalized.length > 64 ||
      !/^[a-z]+(?:['-][a-z]+)*$/.test(normalized)
    ) {
      return "";
    }
    return normalized;
  }

  function cleanMwText(value) {
    let text = String(value || "");
    const replacements = {
      bc: ": ",
      ldquo: "“",
      rdquo: "”",
      lsquo: "‘",
      rsquo: "’",
      inf: "",
      sup: "",
    };
    for (const [tag, replacement] of Object.entries(replacements)) {
      text = text.replaceAll(`{${tag}}`, replacement);
      text = text.replaceAll(`{/${tag}}`, "");
    }
    // Link/cross-reference markup stores the visible term after the first pipe.
    text = text.replace(/\{[a-z_]+\|([^{}|]+)(?:\|[^{}]*)?\}/gi, "$1");
    text = text.replace(/\{\/?[a-z_]+\}/gi, "");
    return text.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
  }

  function audioUrl(audioName) {
    const audio = String(audioName || "").trim();
    if (!/^[A-Za-z0-9_-]+$/.test(audio)) return "";
    let subdirectory;
    if (audio.startsWith("bix")) subdirectory = "bix";
    else if (audio.startsWith("gg")) subdirectory = "gg";
    else if (/^[^A-Za-z]/.test(audio)) subdirectory = "number";
    else subdirectory = audio[0].toLowerCase();
    return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audio}.mp3`;
  }

  function collectExamples(node, results = []) {
    if (results.length >= 4 || node === null || node === undefined) return results;
    if (Array.isArray(node)) {
      if (node[0] === "vis" && Array.isArray(node[1])) {
        for (const example of node[1]) {
          const text = cleanMwText(example?.t);
          if (text && !results.includes(text)) results.push(text);
          if (results.length >= 4) break;
        }
        return results;
      }
      for (const child of node) collectExamples(child, results);
      return results;
    }
    if (typeof node === "object") {
      for (const child of Object.values(node)) collectExamples(child, results);
    }
    return results;
  }

  function parseEntry(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const rawHeadword = entry.hwi?.hw || entry.meta?.id || "";
    const headword = cleanMwText(String(rawHeadword).replaceAll("*", "·").split(":")[0]);
    if (!headword) return null;

    const pronunciation = [...(entry.hwi?.prs || []), ...(entry.prs || [])]
      .find((item) => item?.ipa || item?.mw || item?.sound?.audio);
    const definitions = (Array.isArray(entry.shortdef) ? entry.shortdef : [])
      .map(cleanMwText)
      .filter(Boolean)
      .slice(0, 4);
    if (!definitions.length) return null;

    return {
      id: String(entry.meta?.uuid || entry.meta?.id || headword),
      headword,
      partOfSpeech: cleanMwText(entry.fl),
      pronunciation: cleanMwText(pronunciation?.ipa || pronunciation?.mw),
      audioUrl: audioUrl(pronunciation?.sound?.audio),
      definitions,
      examples: collectExamples(entry).slice(0, 3),
    };
  }

  function parseResponse(word, payload, reference) {
    const normalizedWord = normalizeLookupWord(word);
    const sourceItems = Array.isArray(payload) ? payload : [];
    const suggestions = sourceItems
      .filter((item) => typeof item === "string")
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 8);
    const entries = sourceItems.map(parseEntry).filter(Boolean).slice(0, 8);
    return {
      word: normalizedWord,
      reference,
      entries,
      suggestions,
      attributionUrl: "https://www.merriam-webster.com/",
    };
  }

  function choosePrecacheWords(transcriptText, limit = PRECACHE_WORD_LIMIT) {
    const counts = new Map();
    const matches = String(transcriptText || "").match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
    for (const token of matches) {
      const word = normalizeLookupWord(token);
      if (
        word.length < 5 ||
        word.length > 18 ||
        STOP_WORDS.has(word) ||
        word.endsWith("n't")
      ) {
        continue;
      }
      counts.set(word, (counts.get(word) || 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]))
      .slice(0, Math.max(0, Math.min(Number(limit) || 0, PRECACHE_WORD_LIMIT)))
      .map(([word]) => word);
  }

  function hashText(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function contextCacheKey(word, sentence) {
    const normalizedWord = normalizeLookupWord(word);
    const normalizedSentence = String(sentence || "").replace(/\s+/g, " ").trim().toLowerCase();
    return normalizedWord && normalizedSentence
      ? `${normalizedWord}:${hashText(normalizedSentence)}`
      : "";
  }

  return {
    DICTIONARY_CACHE_KEY,
    CONTEXT_CACHE_KEY,
    PRECACHE_STATE_KEY,
    CACHE_TTL_MS,
    CACHE_MAX_ENTRIES,
    CONTEXT_CACHE_MAX_ENTRIES,
    PRECACHE_WORD_LIMIT,
    normalizeLookupWord,
    cleanMwText,
    audioUrl,
    parseResponse,
    choosePrecacheWords,
    contextCacheKey,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_DICTIONARY;
}
