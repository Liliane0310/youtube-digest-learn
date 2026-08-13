/**
 * SIDE PANEL LOGIC
 *
 * Handles the UI for youtube-digest-learn: video detection, transcript analysis,
 * rendering results, and export features.
 */

const DEBUG = false;
const OVERVIEW_LOCALE = "adaptive-zh-en";
const OVERVIEW_CACHE_VERSION = 3;
const NOTE_ICON_SVG = `
  <svg class="note-inline-icon" aria-hidden="true" focusable="false" viewBox="0 0 1879 1024">
    <path d="M553.877457 906.654335v-141.021965L1053.891329 254.520231l88.19422 90.117919s27.819653 26.339884 54.455491 0 0-55.639306 0-55.639306l-115.421965-117.937572s-28.707514-26.191908-54.455491 0-534.048555 545.886705-534.048555 545.886705-15.685549 13.465896-15.685549 40.397688v188.67052s1.183815 33.442775 34.478612 39.36185h196.217342s17.313295-1.479769 33.590751-18.05318l614.843931-630.085549s96.776879-108.910983 5.623121-229.364161c0 0-91.449711-123.116763-238.094798-31.815029 0 0-30.927168 21.604624-31.223121 45.428901-0.295954 23.824277 21.308671 42.913295 44.09711 38.917919 0 0 11.83815-2.36763 21.456647-11.098265 0 0 54.603468-58.154913 126.224278-9.322544 0 0 43.061272 31.223121 38.769942 83.606937 0 0 5.475145 38.473988-51.495954 90.561849L691.791908 906.654335h-137.914451z" fill="currentColor"></path>
  </svg>`;
const debugLog = (...args) => {
  if (DEBUG) console.log(...args);
};

// ============================================================
// STATE
// ============================================================

let currentVideoId = null;
let currentVideoUrl = null;
let currentAnalysis = null;
let currentTranscript = null;
let currentTranscriptText = null; // Plain text (for display/export)
let currentTranscriptTimestamped = null; // With timestamps for AI analysis
let currentTranscriptLanguage = null;
let currentVideoTitle = "";
let currentChannelName = "";
let currentVideoDescription = "";
let currentVideoDuration = 0;
let isAnalysisLoading = false; // Track if analysis is in progress
let youtubeTabId = null; // Store the YouTube tab ID for reliable messaging
let errorAction = null;

// --- Translation state ---
// The public transcript control intentionally supports only the original
// subtitles, Chinese, and an aligned source + Chinese view.
let currentTranscriptMode = "original";
let translationGeneration = 0; // Invalidates responses from older UI modes/videos.
let translationWorkCount = 0;
let transcriptScrollObserver = null;
// Stable keys include the video, source mode, language, and semantic segment ID.
let transcriptParagraphCache = new Map();
const TRANSLATION_MESSAGE_TIMEOUT_MS = 130_000;
const TRANSLATION_BATCH_SIZE = 4;
const TRANSLATION_CONCURRENCY = 2;

function setCompletionStatus(id, state, message) {
  const element = document.getElementById(id);
  if (!element) return;
  element.dataset.state = state;
  element.textContent = message;
}

function setOverviewCompletionStatus(state, message) {
  setCompletionStatus("overviewCompletionStatus", state, message);
}

function determineOverviewMode(language, transcriptText = "") {
  const normalizedLanguage = String(language || "").trim().toLowerCase();
  if (/^(?:zh|cmn|zho)(?:-|$)|chinese|mandarin/.test(normalizedLanguage)) {
    return "zh";
  }
  if (/^en(?:-|$)|english/.test(normalizedLanguage)) return "bilingual";

  const sample = String(transcriptText || "").slice(0, 12_000);
  const latinLetters = (sample.match(/[A-Za-z]/g) || []).length;
  const hanCharacters = (sample.match(/[\u3400-\u9fff]/g) || []).length;
  return latinLetters >= 40 && latinLetters > hanCharacters * 2
    ? "bilingual"
    : "zh";
}

function getCurrentOverviewMode() {
  const transcriptLanguage =
    currentTranscriptLanguage || currentTranscript?.find((item) => item?.language)?.language;
  return determineOverviewMode(transcriptLanguage, currentTranscriptText);
}

/**
 * Prevent a stopped service worker or dead message channel from leaving the
 * transcript queue stuck forever. The underlying Chrome message cannot be
 * cancelled, so settled guards deliberately ignore any late response.
 */
function sendTranslationMessage(message) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback(value);
    };

    timeoutId = setTimeout(() => {
      finish(
        reject,
        new Error(
          "Translation request timed out after 130 seconds. Please Retry.",
        ),
      );
    }, TRANSLATION_MESSAGE_TIMEOUT_MS);

    let messagePromise;
    try {
      messagePromise = chrome.runtime.sendMessage(message);
    } catch (error) {
      finish(reject, error);
      return;
    }

    Promise.resolve(messagePromise).then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error),
    );
  });
}

// --- Auto-scroll state (follow video playback in transcript) ---
let autoScrollEnabled = true; // True = scroll transcript to follow video playback
let autoScrollInterval = null; // setInterval ID for polling video time
let lastAutoScrollTime = 0; // Timestamp of last programmatic scroll (ignores scroll events within 1s)

// ============================================================
// TRANSCRIPT GROUPING
// ============================================================

const TRANSCRIPT_SEGMENT_LIMITS = Object.freeze({
  minChars: 60,
  idealChars: 180,
  maxChars: 320,
  maxSeconds: 20,
});

function normalizeCaptionText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, "$1$2")
    .replace(/([，。；：！？])\s+(?=[\u3400-\u9fff])/g, "$1")
    .replace(/\s+([,.;:!?，。；：！？])/g, "$1")
    .trim();
}

/**
 * Splits a single oversized thought at the strongest nearby punctuation.
 * Word boundaries are the final safety valve for captions with no punctuation.
 */
function splitOversizedThought(text, maxChars) {
  const parts = [];
  let rest = normalizeCaptionText(text);

  while (rest.length > maxChars) {
    const windowText = rest.slice(0, maxChars + 1);
    const lowerBound = Math.floor(maxChars * 0.55);
    let cut = -1;

    for (const pattern of [/[;:；：]\s*/g, /[,，]\s*/g, /\s/g]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(windowText))) {
        if (match.index >= lowerBound) cut = match.index + match[0].length;
      }
      if (cut > 0) break;
    }

    if (cut <= 0) cut = maxChars;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) parts.push(rest);
  return parts;
}

/**
 * Reconstructs complete sentences across raw caption boundaries. Each segment
 * keeps the timestamp of the first caption that contributed text. Character
 * and time limits prevent a malformed Supadata entry from becoming one giant
 * row while punctuation remains the preferred boundary.
 */
function groupTranscriptEntries(entries, limits = TRANSCRIPT_SEGMENT_LIMITS) {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const pieces = [];
  entries.forEach((entry, entryIndex) => {
    const text = normalizeCaptionText(entry?.text);
    if (!text) return;
    const start = Number.isFinite(Number(entry.start)) ? Number(entry.start) : 0;
    const duration = Math.max(0, Number(entry.duration) || 0);
    const sentenceParts =
      text.match(/[^.!?;:,。！？；：，]+(?:[.!?;:,。！？；：，]+["')\]”’）】」』]*|$)/g) ||
      [text];
    let consumedChars = 0;

    sentenceParts.forEach((sentencePart) => {
      const cleanPart = normalizeCaptionText(sentencePart);
      if (!cleanPart) return;
      const oversizedParts = splitOversizedThought(cleanPart, limits.maxChars);
      oversizedParts.forEach((part, partIndex) => {
        const ratio = text.length ? Math.min(1, consumedChars / text.length) : 0;
        pieces.push({
          text: part,
          start: start + duration * ratio,
          semanticEnd:
            /[.!?。！？]["')\]”’）】」』]*$/.test(part) ||
            oversizedParts.length > 1,
          clauseEnd: /[;:,；：，]["')\]”’）】」』]*$/.test(part),
          sourceOrder: `${entryIndex}:${partIndex}`,
        });
        consumedChars += part.length + 1;
      });
    });
  });

  const grouped = [];
  let current = null;

  const flush = () => {
    if (!current || !current.text.trim()) return;
    const index = grouped.length;
    const text = normalizeCaptionText(current.text);
    grouped.push({
      id: `segment-${index}-${Math.round(current.start * 1000)}`,
      start: current.start,
      text,
      texts: [text],
    });
    current = null;
  };

  pieces.forEach((piece) => {
    if (!current) current = { start: piece.start, text: "" };
    current.text = normalizeCaptionText(`${current.text} ${piece.text}`);
    const elapsed = Math.max(0, piece.start - current.start);
    const comfortablySized = current.text.length >= limits.minChars;
    const reachedIdeal = current.text.length >= limits.idealChars;
    const atNaturalBoundary =
      piece.semanticEnd ||
      (piece.clauseEnd &&
        (reachedIdeal ||
          current.text.length >= limits.maxChars ||
          elapsed >= limits.maxSeconds));
    const reachedGuardrail =
      atNaturalBoundary &&
      (current.text.length >= limits.maxChars || elapsed >= limits.maxSeconds);
    const reachedHardGuardrail =
      current.text.length >= Math.round(limits.maxChars * 1.2) ||
      elapsed >= limits.maxSeconds + 5;

    if (
      (atNaturalBoundary && (comfortablySized || elapsed >= 8)) ||
      (atNaturalBoundary && reachedIdeal) ||
      reachedGuardrail ||
      reachedHardGuardrail
    ) {
      flush();
    }
  });
  flush();

  return grouped;
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await evictOldCacheEntries(20);

  const configStatus = await chrome.runtime.sendMessage({
    action: "checkConfig",
  });

  if (!configStatus.hasSupadataKey || !configStatus.hasAiKey) {
    showConfigError(configStatus);
    return;
  }

  await checkCurrentTab();
});

// Listen for messages from the Digest button on YouTube page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDigestFromButton") {
    // Load the digest for the current video. Served from cache when we've
    // seen this video before (no API calls); fetched fresh otherwise.
    // (This used to force-clear the cache on every click, which silently
    // burned a transcript credit + analysis tokens per click.)
    checkCurrentTab();
    sendResponse({ success: true });
  }
  if (message.action === "transcriptProgress") {
    // Background is telling us the transcript fetch status changed
    updateLoading(message.title, message.subtitle);
    sendResponse({ success: true });
  }
  if (message.action === "noteSaved") {
    // Refresh notes list when a new note is saved
    const filterAll = document
      .getElementById("notesFilterAll")
      ?.classList.contains("active");
    loadNotes(filterAll ? null : currentVideoId);
    sendResponse({ success: true });
  }
  return false;
});

// Settings are edited in a separate extension tab. If that tab saves the
// required keys while this panel is still alive, recover the main view without
// making the user refresh or reopen the extension.
chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[YTD_SETTINGS.STORAGE_KEY]) return;
  const settings = YTD_SETTINGS.normalize(
    changes[YTD_SETTINGS.STORAGE_KEY].newValue,
  );
  const configStatus = {
    hasSupadataKey: !!settings.supadataApiKey,
    hasAiKey: !!settings.aiApiKey,
  };
  if (!configStatus.hasSupadataKey || !configStatus.hasAiKey) {
    showConfigError(configStatus);
    return;
  }
  errorAction = null;
  checkCurrentTab();
});

// ============================================================
// FOLLOW THE ACTIVE TAB
// ============================================================
// The panel watches which tab is in front of it and reacts:
//   - Front tab is NOT YouTube  -> the panel closes itself (window.close()).
//     We do this OURSELVES rather than relying only on the background
//     script's per-tab enable/disable, because Chrome doesn't reliably
//     apply per-tab panel state to tabs spawned in unusual ways (e.g. a
//     link opened from another app) — which let the panel linger on
//     non-YouTube pages.
//   - Front tab IS YouTube but on a different video -> refresh the digest.
//     YouTube is a single-page app (clicking a video swaps content without
//     a reload), so we track URL changes; startDigest() caches per video,
//     making re-checks instant and free for already-digested videos.
//
// Everything is scoped to the window this panel lives in: tab switches in
// OTHER browser windows must not close this panel or hijack its content.

let navigationRefreshTimer = null;
let panelWindowId = null;
chrome.windows.getCurrent().then((w) => {
  panelWindowId = w.id;
});

function scheduleDigestRefresh() {
  // Small delay lets YouTube finish rendering the new video's title and
  // description before we read them. Also collapses rapid-fire URL events
  // into a single refresh.
  clearTimeout(navigationRefreshTimer);
  navigationRefreshTimer = setTimeout(() => {
    checkCurrentTab();
  }, 600);
}

function panelIsShowingResults() {
  const results = document.getElementById("resultsState");
  return results && results.style.display !== "none";
}

/**
 * Reacts to the URL now in front of the panel: close on non-YouTube,
 * refresh the digest when the video changed.
 */
function handleFrontTabUrl(url) {
  if (!(url || "").startsWith("https://www.youtube.com")) {
    // Panel is a YouTube-only tool — remove itself from non-YouTube tabs.
    window.close();
    return;
  }

  const newVideoId = extractVideoId(url);
  // Refresh when the video changed, or when we're not currently showing
  // results (e.g. user went home, then clicked back into the same video).
  if (newVideoId !== currentVideoId || !panelIsShowingResults()) {
    scheduleDigestRefresh();
  }
}

// Fires when a tab's URL changes — including YouTube's no-reload navigation.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url || !tab.active) return;
  if (panelWindowId !== null && tab.windowId !== panelWindowId) return;
  handleFrontTabUrl(changeInfo.url);
});

// Fires when a different tab comes to the front — switching tabs, or a new
// tab being opened (including ones opened by clicking links in other apps).
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  if (panelWindowId !== null && windowId !== panelWindowId) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    // Brand-new tabs may not have committed their URL yet — fall back to
    // the pending one so we judge where the tab is actually going.
    handleFrontTabUrl(tab.url || tab.pendingUrl || "");
  } catch (e) {
    // Tab closed before we could read it — nothing to do.
  }
});

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Error retry
  document.getElementById("errorBtn").addEventListener("click", () => {
    if (errorAction) {
      errorAction();
      return;
    }
    if (currentVideoId) {
      startDigest(currentVideoId, currentVideoUrl);
    }
  });

  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openOptions" });
  });

  // Transcript actions
  document
    .getElementById("copyTranscriptBtn")
    ?.addEventListener("click", copyTranscript);
  document
    .getElementById("exportTranscriptBtn")
    ?.addEventListener("click", exportTranscript);
  document
    .getElementById("syncTranscriptObsidianBtn")
    ?.addEventListener("click", syncTranscriptToObsidian);
  document.querySelectorAll(".transcript-mode-btn").forEach((button) => {
    button.addEventListener("click", () => {
      handleTranscriptModeChange(button.dataset.transcriptMode);
    });
  });

  // Follow playback button — re-enables auto-scroll after user scrolled away
  document
    .getElementById("followPlaybackBtn")
    ?.addEventListener("click", () => {
      autoScrollEnabled = true;
      document.getElementById("followPlaybackBtn").style.display = "none";
      // Jump straight back to the line currently being spoken. We scroll
      // directly (not via playbackTrackingTick) because the tick skips
      // entries that are already highlighted — and the current line almost
      // always IS highlighted, which made this button appear to do nothing.
      if (!scrollToActiveEntry()) {
        playbackTrackingTick(); // No highlight yet — let a tick establish one
      }
    });

  // Notes filter buttons
  document.getElementById("notesFilterThis")?.addEventListener("click", () => {
    setNotesFilter(false);
    loadNotes(currentVideoId);
  });
  document.getElementById("notesFilterAll")?.addEventListener("click", () => {
    setNotesFilter(true);
    loadNotes(null); // Load all notes
  });
  document
    .getElementById("syncNotesObsidianBtn")
    ?.addEventListener("click", syncCurrentVideoNotesToObsidian);
  document
    .getElementById("refreshVocabularyBtn")
    ?.addEventListener("click", loadVocabularyWords);
}

function setNotesFilter(showAll) {
  const thisVideoButton = document.getElementById("notesFilterThis");
  const allNotesButton = document.getElementById("notesFilterAll");
  thisVideoButton?.classList.toggle("active", !showAll);
  thisVideoButton?.setAttribute("aria-pressed", String(!showAll));
  allNotesButton?.classList.toggle("active", showAll);
  allNotesButton?.setAttribute("aria-pressed", String(showAll));
}

// ============================================================
// VIDEO DETECTION
// ============================================================

async function checkCurrentTab() {
  try {
    // Try multiple strategies to find the YouTube tab
    let tab = null;

    // Strategy 1: Active tab in last focused window
    let tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (tabs[0]?.url?.includes("youtube.com")) {
      tab = tabs[0];
    }

    // Strategy 2: Any active YouTube tab
    if (!tab) {
      tabs = await chrome.tabs.query({
        url: "https://www.youtube.com/*",
        active: true,
      });
      if (tabs[0]) tab = tabs[0];
    }

    // Strategy 3: Any YouTube tab (last resort)
    if (!tab) {
      tabs = await chrome.tabs.query({ url: "https://www.youtube.com/*" });
      if (tabs[0]) tab = tabs[0];
    }

    debugLog("[youtube-digest-learn Panel] Found tab:", tab?.id, tab?.url);

    if (!tab?.url) {
      showState("welcome");
      return;
    }

    // Store the tab ID for reliable messaging later
    youtubeTabId = tab.id;

    const videoId = extractVideoId(tab.url);

    if (videoId) {
      currentVideoUrl = tab.url;

      try {
        // Route through background script for reliable message passing
        const result = await chrome.runtime.sendMessage({
          action: "relayToContent",
          payload: { action: "getVideoInfo" },
        });
        debugLog("[youtube-digest-learn Panel] getVideoInfo result:", result);
        if (result.success && result.response) {
          currentVideoTitle = result.response.title || "";
          currentChannelName = result.response.channelName || "";
          currentVideoDescription = result.response.description || "";
          currentVideoDuration = result.response.duration || 0;
        }
      } catch (e) {
        console.error("[youtube-digest-learn Panel] getVideoInfo error:", e);
        currentVideoTitle = "";
        currentChannelName = "";
        currentVideoDescription = "";
        currentVideoDuration = 0;
      }

      startDigest(videoId, tab.url);
    } else {
      showState("welcome");
    }
  } catch (error) {
    console.error("Tab check error:", error);
    showState("welcome");
  }
}

function extractVideoId(url) {
  try {
    const urlObj = new URL(url);

    if (
      urlObj.hostname.includes("youtube.com") &&
      urlObj.searchParams.has("v")
    ) {
      return urlObj.searchParams.get("v");
    }

    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }

    if (urlObj.pathname.startsWith("/embed/")) {
      return urlObj.pathname.split("/")[2];
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================
// DIGEST PIPELINE
// ============================================================

async function startDigest(videoId, videoUrl) {
  // Check if we already have this video loaded in memory
  if (videoId === currentVideoId && currentAnalysis) {
    showState("results");
    return;
  }

  // Every video change invalidates observer work and in-flight translations.
  if (videoId !== currentVideoId) {
    translationGeneration += 1;
    translationWorkCount = 0;
    activeTranslationQueue = null;
    if (transcriptScrollObserver) transcriptScrollObserver.disconnect();
    transcriptScrollObserver = null;
    document.getElementById("langSpinner")?.classList.remove("visible");
  }

  // Check cache for this video
  const cached = await loadFromCache(videoId);
  if (cached) {
    debugLog("Loading from cache:", videoId);
    currentVideoId = videoId;
    currentVideoUrl = videoUrl;
    const cachedOverviewMode = determineOverviewMode(
      cached.transcriptLanguage ||
        cached.transcript?.find((item) => item?.language)?.language,
      cached.transcriptText,
    );
    const hasCurrentAdaptiveOverview =
      cached.analysisLocale === OVERVIEW_LOCALE &&
      cached.analysisVersion === OVERVIEW_CACHE_VERSION &&
      cached.analysisMode === cachedOverviewMode;
    currentAnalysis = hasCurrentAdaptiveOverview ? cached.analysis || null : null;
    currentTranscript = cached.transcript;
    currentTranscriptText = cached.transcriptText;
    currentTranscriptTimestamped = cached.transcriptTimestamped;
    currentTranscriptLanguage = cached.transcriptLanguage || null;
    isAnalysisLoading = false;

    // Restore semantic-segment translations from persistent storage.
    if (cached.paragraphCache) {
      for (const [key, value] of Object.entries(cached.paragraphCache)) {
        transcriptParagraphCache.set(key, value);
      }
    }

    if (currentVideoTitle || currentChannelName) {
      const videoInfo = document.getElementById("videoInfo");
      document.getElementById("videoTitle").textContent = currentVideoTitle;
      document.getElementById("videoChannel").textContent = currentChannelName;
      videoInfo.style.display = "block";
    }

    // Always render transcript first
    renderTranscript();

    // Render analysis if we have it cached
    if (currentAnalysis) {
      renderAnalysisResults(currentAnalysis);
      highlightMomentsOnPage(currentAnalysis.keyMoments);
    } else {
      setOverviewCompletionStatus("idle", "打开概览后开始生成");
    }

    showState("results");
    document.getElementById("tabsNav").style.display = "flex";

    // Load notes for this video
    loadNotes(videoId);

    // Setup explain feature
    setupExplainFeature();
    warmDictionaryForCurrentVideo();
    if (currentTranscriptMode !== "original") translateTranscript();
    return;
  }

  currentVideoId = videoId;
  currentVideoUrl = videoUrl;
  currentAnalysis = null;
  currentTranscript = null;
  currentTranscriptText = null;
  currentTranscriptTimestamped = null;
  currentTranscriptLanguage = null;
  isAnalysisLoading = false;
  setOverviewCompletionStatus("idle", "打开概览后开始生成");

  if (currentVideoTitle || currentChannelName) {
    const videoInfo = document.getElementById("videoInfo");
    document.getElementById("videoTitle").textContent = currentVideoTitle;
    document.getElementById("videoChannel").textContent = currentChannelName;
    videoInfo.style.display = "block";
  }

  showState("loading");
  updateLoading("Fetching transcript", "");

  const transcriptResult = await chrome.runtime.sendMessage({
    action: "fetchTranscript",
    videoId: videoId,
  });

  if (!transcriptResult.success) {
    if (transcriptResult.error === "NO_SUPADATA_KEY") {
      showError(
        "API key missing",
        "Add your Supadata API key in youtube-digest-learn Settings.",
      );
      return;
    }
    showError(
      "No transcript found",
      transcriptResult.message || transcriptResult.error,
    );
    return;
  }

  currentTranscript = transcriptResult.transcript;
  currentTranscriptText = transcriptResult.transcriptText;
  currentTranscriptTimestamped = transcriptResult.transcriptTextTimestamped;
  currentTranscriptLanguage = transcriptResult.language || null;

  // Render transcript immediately (no LLM needed)
  renderTranscript();
  showState("results");
  document.getElementById("tabsNav").style.display = "flex";

  // Load notes for this video
  loadNotes(videoId);

  // Setup explain feature for text selection
  setupExplainFeature();
  warmDictionaryForCurrentVideo();
  if (currentTranscriptMode !== "original") translateTranscript();

  // Save transcript to cache (without analysis)
  await saveToCache(videoId);

  // DON'T run LLM analysis automatically - wait for user to click Overview tab
  // This saves tokens when user just wants to see the transcript
}

// ============================================================
// RENDERING
// ============================================================

/**
 * Renders the analysis results into the Overview tab.
 * Shows chapters and key quotes only.
 */
function renderAnalysisResults(analysis) {
  const isBilingual = getCurrentOverviewMode() === "bilingual";
  setOverviewCompletionStatus(
    "complete",
    isBilingual ? "双语概览已完成" : "中文概览已完成",
  );
  // Chapters
  const chapterList = document.getElementById("chapterList");
  chapterList.innerHTML = "";
  (analysis.chapters || []).forEach((chapter) => {
    const li = document.createElement("li");
    li.className = "chapter-item";
    li.dataset.seconds = chapter.timestampSeconds;
    const titleEnglish = isBilingual ? chapter.titleEnglish || "" : "";
    const summaryEnglish = isBilingual ? chapter.summaryEnglish || "" : "";
    li.innerHTML = `
      <span class="chapter-timestamp">${escapeHtml(chapter.timestamp)}</span>
      <div class="chapter-content">
        ${titleEnglish ? `<span class="chapter-title chapter-title-original" lang="en">${escapeHtml(titleEnglish)}</span>` : ""}
        <span class="chapter-title chapter-title-translated" lang="zh-CN">${escapeHtml(chapter.title)}</span>
        ${summaryEnglish ? `<span class="chapter-summary chapter-summary-original" lang="en">${escapeHtml(summaryEnglish)}</span>` : ""}
        <span class="chapter-summary chapter-summary-translated" lang="zh-CN">${escapeHtml(chapter.summary || "")}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      debugLog(
        "[youtube-digest-learn Panel] Chapter clicked:",
        chapter.timestamp,
        chapter.timestampSeconds,
      );
      seekTo(chapter.timestampSeconds);
    });
    chapterList.appendChild(li);
  });

  // Quotes - sort by timestamp (chronological order)
  const quotesList = document.getElementById("quotesList");
  quotesList.innerHTML = "";
  const sortedQuotes = [...(analysis.keyQuotes || [])].sort(
    (a, b) => (a.timestampSeconds || 0) - (b.timestampSeconds || 0),
  );
  sortedQuotes.forEach((quote) => {
    const div = document.createElement("div");
    div.className = "quote-item";
    div.dataset.seconds = quote.timestampSeconds;
    const quoteEnglish = isBilingual ? quote.quoteEnglish || "" : "";
    const copyText = quoteEnglish
      ? `${quoteEnglish}\n${quote.quote}`
      : quote.quote;
    div.innerHTML = `
      ${quoteEnglish ? `<div class="quote-text quote-text-original" lang="en">${escapeHtml(quoteEnglish)}</div>` : ""}
      <div class="quote-text quote-text-translated" lang="zh-CN">${escapeHtml(quote.quote)}</div>
      <div class="quote-meta">
        <span class="quote-timestamp">${escapeHtml(quote.timestamp)}</span>
        <div class="quote-actions">
        <button class="quote-save-note-btn" title="将这条引用保存为笔记">保存笔记</button>
        <button class="quote-copy-btn" title="复制这条引用">复制</button>
        </div>
      </div>
    `;
    div.addEventListener("click", () => {
      debugLog(
        "[youtube-digest-learn Panel] Quote clicked:",
        quote.timestamp,
        quote.timestampSeconds,
      );
      seekTo(quote.timestampSeconds);
    });

    const quoteCopyBtn = div.querySelector(".quote-copy-btn");
    quoteCopyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(copyText);
        quoteCopyBtn.textContent = "已复制";
        setTimeout(() => {
          quoteCopyBtn.textContent = "复制";
        }, 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });

    const quoteSaveNoteBtn = div.querySelector(".quote-save-note-btn");
    quoteSaveNoteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await saveQuoteAsNote(quote, quoteSaveNoteBtn);
    });

    quotesList.appendChild(div);
  });
}

/**
 * Saves a key quote as a timestamped note.
 */
async function saveQuoteAsNote(quote, btn) {
  if (!currentVideoId) return;

  const originalText = btn.textContent;
  btn.textContent = "正在保存…";
  btn.disabled = true;

  try {
    const result = await chrome.runtime.sendMessage({
      action: "saveNote",
      videoId: currentVideoId,
      timestamp: quote.timestampSeconds,
      videoTitle: currentVideoTitle,
      channelName: currentChannelName,
    });

    if (result.success) {
      btn.textContent = "已保存";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
      // Refresh notes list if on Notes tab
      loadNotes(currentVideoId);
    } else {
      console.error("[youtube-digest-learn] Save quote as note failed:", result.error);
      btn.textContent = "保存失败";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
    }
  } catch (error) {
    console.error("[youtube-digest-learn] Save quote as note error:", error);
    btn.textContent = "保存失败";
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1500);
  }
}

/**
 * Legacy function for backwards compatibility with cached data.
 * Renders both transcript and analysis.
 */
function renderResults(analysis) {
  renderAnalysisResults(analysis);

  renderTranscript();

  document.getElementById("tabsNav").style.display = "flex";

  // Setup explain feature for text selection
  setupExplainFeature();
  warmDictionaryForCurrentVideo();
}

/**
 * Returns true while the user has a range of text selected.
 * Transcript row clicks must not seek in that state: the click emitted after
 * selection mouseup belongs to the selection/explain interaction, not playback.
 */
function hasNonCollapsedTextSelection() {
  const selection = window.getSelection();
  return Boolean(
    selection && selection.rangeCount > 0 && !selection.isCollapsed,
  );
}

/**
 * Preserves normal row-click seeking while keeping text selection inert.
 */
function seekFromTranscriptEntryClick(event, seconds) {
  if (hasNonCollapsedTextSelection()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  seekTo(seconds);
}

function renderTranscript() {
  if (!currentTranscript) return;

  const transcriptList = document.getElementById("transcriptList");
  transcriptList.innerHTML = "";

  // Show a small badge indicating the transcript came from the video's
  // existing subtitles. (We no longer AI-transcribe audio, so subtitles
  // are the only source.)
  const existingBadge = document.getElementById("transcriptSourceBadge");
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement("div");
  badge.id = "transcriptSourceBadge";
  badge.className = "transcript-source-badge";
  badge.innerHTML = `<span class="source-dot source-dot--subs"></span> From video subtitles · ${escapeHtml(getOriginalTranscriptLabel())}`;
  transcriptList.parentElement.insertBefore(badge, transcriptList);

  // Group entries using smart sentence-boundary + time-guardrail logic
  const grouped = groupTranscriptEntries(currentTranscript);

  grouped.forEach((group) => {
    const div = document.createElement("div");
    div.className = "transcript-entry";
    div.dataset.seconds = group.start;

    const minutes = Math.floor(group.start / 60);
    const seconds = Math.floor(group.start % 60);
    const timestamp = `${minutes}:${String(seconds).padStart(2, "0")}`;

    div.innerHTML = `
      <span class="transcript-time">${timestamp}</span>
      <span class="transcript-text">${renderSubtitleInlineMarkup(group.text)}</span>
    `;

    div.addEventListener("click", (event) =>
      seekFromTranscriptEntryClick(event, group.start),
    );
    transcriptList.appendChild(div);
  });

  updateTranscriptTranslationStatus();

  // Start tracking video playback for auto-scroll
  startPlaybackTracking();
}

function copyTranscript() {
  copyToClipboardWithFeedback(currentTranscriptText || "", "copyTranscriptBtn");
}

function exportTranscript() {
  const transcriptContent = currentTranscriptText || "";
  const videoUrl = `https://youtube.com/watch?v=${currentVideoId}`;

  let exportText = "";
  exportText += `TRANSCRIPT\n`;
  exportText += `${"=".repeat(60)}\n\n`;
  exportText += `Title: ${currentVideoTitle || "Unknown"}\n`;
  exportText += `Channel: ${currentChannelName || "Unknown"}\n`;
  exportText += `URL: ${videoUrl}\n`;
  exportText += `\n${"—".repeat(60)}\n\n`;

  if (currentVideoDescription) {
    exportText += `DESCRIPTION:\n${currentVideoDescription}\n`;
    exportText += `\n${"—".repeat(60)}\n\n`;
  }

  exportText += `TRANSCRIPT:\n\n${transcriptContent}\n`;
  exportText += `\n${"—".repeat(60)}\n`;
  exportText += `Exported by youtube-digest-learn\n`;

  const filename = `${sanitizeFilename(currentVideoTitle)}-transcript.txt`;
  downloadTextFile(exportText, filename);
}

// ============================================================
// UI STATE MANAGEMENT
// ============================================================

function showState(state) {
  document.getElementById("welcomeState").style.display =
    state === "welcome" ? "flex" : "none";
  document.getElementById("loadingState").style.display =
    state === "loading" ? "block" : "none";
  document.getElementById("errorState").style.display =
    state === "error" ? "block" : "none";
  const uploadEl = document.getElementById("uploadState");
  if (uploadEl) uploadEl.style.display = "none"; // Upload state removed — always hidden
  document.getElementById("resultsState").style.display =
    state === "results" ? "block" : "none";

  // The tab bar only belongs on the results view. We toggle it HERE, in one
  // place, so it tracks the view automatically. Previously each caller had to
  // remember to re-show it after showState("results"), and one path forgot —
  // which is why the tabs could vanish when re-opening an already-analyzed video.
  document.getElementById("tabsNav").style.display =
    state === "results" ? "flex" : "none";

  if (state !== "results") {
    stopPlaybackTracking();
  }
}

function updateLoading(title, subtitle) {
  document.getElementById("loadingText").textContent = title;
  document.getElementById("loadingSubtext").textContent = subtitle;
}

function showError(title, message) {
  errorAction = null;
  showState("error");
  document.getElementById("errorTitle").textContent = title;
  document.getElementById("errorMessage").textContent = message;
  document.getElementById("errorBtn").textContent = "Try Again";
}

function showConfigError(configStatus) {
  const missingKeys = [];
  if (!configStatus.hasSupadataKey) missingKeys.push("Supadata");
  if (!configStatus.hasAiKey) missingKeys.push("AI provider");

  showState("error");
  document.getElementById("errorTitle").textContent = "API Keys Missing";
  document.getElementById("errorMessage").textContent =
    `Add your ${missingKeys.join(" and ")} API key${missingKeys.length === 1 ? "" : "s"} in youtube-digest-learn Settings.`;
  document.getElementById("errorBtn").textContent = "Open Settings";
  errorAction = () => chrome.runtime.sendMessage({ action: "openOptions" });
}

// ============================================================
// TAB SWITCHING
// ============================================================

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });

  if (tabName === "vocabulary") loadVocabularyWords();

  // Start/stop playback tracking based on which tab is active
  if (tabName === "transcript") {
    startPlaybackTracking();
  } else {
    stopPlaybackTracking();
  }

  // Lazy-load LLM analysis when user switches to Overview tab
  if (tabName === "overview" && !currentAnalysis && !isAnalysisLoading) {
    triggerAnalysis();
  }
}

/**
 * Triggers the LLM analysis (lazy-loaded when user clicks Overview or Quotes tab).
 * This saves tokens by not running analysis until needed.
 */
async function triggerAnalysis() {
  if (!currentTranscriptTimestamped) {
    setOverviewCompletionStatus("error", "没有可用逐字稿");
    return;
  }
  if (isAnalysisLoading || currentAnalysis) return;

  isAnalysisLoading = true;
  setOverviewCompletionStatus("working", "正在生成概览…");

  // Show loading indicators in the Overview tab
  const chapterList = document.getElementById("chapterList");
  const quotesList = document.getElementById("quotesList");

  if (chapterList)
    chapterList.innerHTML =
      '<li class="chapter-item" style="color: var(--text-muted); border: none;">正在生成章节…</li>';
  if (quotesList)
    quotesList.innerHTML =
      '<div class="quote-item" style="color: var(--text-muted); border-left-color: var(--border);">正在提取重点引用…</div>';

  try {
    const analysisResult = await chrome.runtime.sendMessage({
      action: "analyzeTranscript",
      transcriptText: currentTranscriptTimestamped,
      videoTitle: currentVideoTitle,
      channelName: currentChannelName,
      videoDescription: currentVideoDescription,
      videoDuration: currentVideoDuration,
      overviewMode: getCurrentOverviewMode(),
    });

    if (!analysisResult.success) {
      if (chapterList)
        chapterList.innerHTML = `<li class="chapter-item" style="color: var(--accent); border: none;">生成失败：${escapeHtml(analysisResult.error || "未知错误")}</li>`;
      isAnalysisLoading = false;
      setOverviewCompletionStatus("error", "概览生成失败");
      return;
    }

    currentAnalysis = analysisResult.analysis;
    renderAnalysisResults(currentAnalysis);
    highlightMomentsOnPage(currentAnalysis.keyMoments);

    // Save to cache now that we have analysis
    await saveToCache(currentVideoId);
  } catch (error) {
    console.error("[youtube-digest-learn Panel] Analysis error:", error);
    if (chapterList)
      chapterList.innerHTML = `<li class="chapter-item" style="color: var(--accent); border: none;">出错了：${escapeHtml(error.message)}</li>`;
    setOverviewCompletionStatus("error", "概览生成失败");
  }

  isAnalysisLoading = false;
}

// ============================================================
// TIMESTAMP / SEEK
// ============================================================

async function seekTo(seconds) {
  debugLog("[youtube-digest-learn Panel] seekTo called with:", seconds);
  if (seconds === undefined || seconds === null) {
    debugLog("[youtube-digest-learn Panel] seekTo aborted - no seconds value");
    return;
  }

  const payload = {
    action: "seekTo",
    seconds: Number(seconds),
  };

  try {
    // Try direct messaging to the stored YouTube tab first (fastest/reliable)
    if (youtubeTabId) {
      try {
        await chrome.tabs.sendMessage(youtubeTabId, payload);
        debugLog("[youtube-digest-learn Panel] seekTo direct success");
        return;
      } catch (directErr) {
        debugLog(
          "[youtube-digest-learn Panel] Direct seekTo failed, falling back to relay:",
          directErr.message,
        );
      }
    }

    // Fallback: route through background script
    const result = await chrome.runtime.sendMessage({
      action: "relayToContent",
      payload,
    });
    debugLog("[youtube-digest-learn Panel] seekTo relay result:", result);
  } catch (error) {
    console.error("[youtube-digest-learn Panel] seekTo error:", error);
  }
}

/**
 * Plays a saved note at its timestamp.
 * - If the note belongs to the video currently open, we seek the player in place.
 * - If it belongs to a DIFFERENT video (e.g. viewing "All Notes"), seeking the
 *   current player would jump to the wrong content, so we open that video in a
 *   new tab at the right timestamp instead.
 */
function playNote(note) {
  if (note.videoId && note.videoId === currentVideoId) {
    seekTo(note.timestampSeconds);
  } else {
    // note.timestampedUrl already includes the &t=<seconds>s anchor
    chrome.tabs.create({ url: note.timestampedUrl });
  }
}

async function highlightMomentsOnPage(moments) {
  if (!moments || !moments.length) return;

  try {
    // Route through background script for reliable message passing
    await chrome.runtime.sendMessage({
      action: "relayToContent",
      payload: {
        action: "highlightMoments",
        moments: moments,
        videoDuration: currentVideoDuration,
      },
    });
  } catch (error) {
    console.error("Highlight error:", error);
  }
}

// ============================================================
// UTILITY
// ============================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

/**
 * Renders the small subset of inline formatting commonly present in subtitle
 * tracks and model translations. Everything is escaped first; only exact,
 * attribute-free allowlisted tags are restored as markup afterwards.
 */
function renderSubtitleInlineMarkup(text) {
  return escapeHtml(text).replace(
    /&lt;(\/?)(i|em|b|strong|u)&gt;|&lt;br(?:\s*\/)?&gt;/gi,
    (_match, closing, tagName) =>
      tagName ? `<${closing}${tagName.toLowerCase()}>` : "<br>",
  );
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Copy failed:", error);
    return false;
  }
}

async function copyToClipboardWithFeedback(text, buttonId) {
  const btn = document.getElementById(buttonId);
  const original = btn.textContent;

  const success = await copyToClipboard(text);
  if (success) {
    btn.textContent = "✓ Copied";
    setTimeout(() => {
      btn.textContent = original;
    }, 2000);
  }
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildObsidianTranscript(statusElement) {
  const segments = getActiveTranscriptSegments();
  if (!segments.length) throw new Error("当前视频没有可同步的逐字稿。");
  const sourceIsChinese = /^zh(?:-|$)/i.test(
    String(currentTranscriptLanguage || ""),
  );
  if (sourceIsChinese) {
    return {
      transcriptMode: "original",
      transcript: segments.map((segment) => ({
        start: segment.start,
        text: segment.text,
        translation: "",
      })),
    };
  }

  const translated = new Map();
  segments.forEach((segment) => {
    const cached = transcriptParagraphCache.get(
      transcriptTranslationCacheKey(segment),
    );
    if (cached) translated.set(segment.id, cached);
  });

  const missingIndices = segments
    .map((segment, index) => (translated.has(segment.id) ? -1 : index))
    .filter((index) => index >= 0);
  for (let offset = 0; offset < missingIndices.length; offset += 3) {
    const indices = missingIndices.slice(offset, offset + 3);
    const sourceBatch = indices.map((index) => segments[index]);
    statusElement.textContent = `正在准备双语逐字稿 ${translated.size}/${segments.length}…`;
    const result = await sendTranslationMessage({
      action: "translateContent",
      content: {
        segments: sourceBatch.map(({ id, text }) => ({ id, text })),
      },
      contentType: "transcriptBatch",
      targetLanguage: "zh",
      videoTitle: currentVideoTitle,
    });
    if (!result?.success) {
      throw new Error(result?.error || "逐字稿翻译失败。");
    }
    const aligned = alignTranslatedSegmentBatch(
      sourceBatch,
      result.translatedContent?.segments,
    );
    for (const item of aligned) {
      if (!item.text) throw new Error(item.error || "部分字幕翻译失败。");
      translated.set(item.id, item.text);
      const segment = sourceBatch.find((candidate) => candidate.id === item.id);
      if (segment) {
        transcriptParagraphCache.set(
          transcriptTranslationCacheKey(segment),
          item.text,
        );
      }
    }
    await updateCache();
  }
  return {
    transcriptMode: "bilingual",
    transcript: segments.map((segment) => ({
      start: segment.start,
      text: segment.text,
      translation: translated.get(segment.id) || "",
    })),
  };
}

async function syncTranscriptToObsidian() {
  const button = document.getElementById("syncTranscriptObsidianBtn");
  const status = document.getElementById("transcriptSyncStatus");
  const modeSelect = document.getElementById("obsidianTranscriptMode");
  if (!button || !status || !currentVideoId || !currentTranscript) return;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "准备中…";
  status.textContent = "正在准备逐字稿…";
  try {
    const transcriptPayload = await buildObsidianTranscript(status);
    const mode = modeSelect?.value === "clean" ? "clean" : transcriptPayload.transcriptMode || "bilingual";
    status.textContent = "正在写入 Obsidian…";
    const result = await chrome.runtime.sendMessage({
      action: "syncVideoTranscriptToObsidian",
      payload: {
        video: {
          videoId: currentVideoId,
          videoTitle: currentVideoTitle,
          channelName: currentChannelName,
        },
        ...transcriptPayload,
        transcriptMode: mode,
      },
    });
    if (!result?.success) throw new Error(result?.error || "同步失败。");
    button.textContent = "已同步";
    status.textContent = `已同步到 ${result.filepath}`;
  } catch (error) {
    button.textContent = "重试同步";
    status.textContent = error.message || "同步失败。";
  } finally {
    button.disabled = false;
    setTimeout(() => {
      button.textContent = originalText;
    }, 1800);
  }
}

function sanitizeFilename(str) {
  return (str || "untitled")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50)
    .toLowerCase();
}

// ============================================================
// TEXT SELECTION — DICTIONARY & EXPLAIN FEATURES
// ============================================================

function normalizeSelectedWord(value) {
  if (globalThis.YTD_DICTIONARY?.normalizeLookupWord) {
    return globalThis.YTD_DICTIONARY.normalizeLookupWord(value);
  }
  const word = String(value || "").trim().toLowerCase();
  return /^[a-z]+(?:['-][a-z]+)*$/.test(word) ? word : "";
}

function getSelectionSubtitleContext(selection) {
  const anchor = selection?.anchorNode;
  const element =
    anchor?.nodeType === 1 ? anchor : anchor?.parentElement || null;
  const entry = element?.closest?.(".transcript-entry");
  const source =
    entry?.querySelector?.(".transcript-original") ||
    entry?.querySelector?.(".transcript-text");
  return {
    sentence: String(source?.textContent || "").replace(/\s+/g, " ").trim(),
    timestamp: Math.max(0, Math.floor(Number(entry?.dataset?.seconds) || 0)),
  };
}

function warmDictionaryForCurrentVideo() {
  if (!currentVideoId || !currentTranscriptText) return;
  chrome.runtime
    .sendMessage({
      action: "precacheDictionaryWords",
      videoId: currentVideoId,
      transcriptText: currentTranscriptText,
    })
    .catch(() => {});
}

/**
 * Sets up text selection handling in the transcript.
 * When user selects text, shows an "Explain" button.
 */
function setupExplainFeature() {
  const transcriptList = document.getElementById("transcriptList");
  if (!transcriptList) return;

  // Remove existing tooltip if any
  const existingTooltip = document.getElementById("explainTooltip");
  if (existingTooltip) existingTooltip.remove();

  // Create the explain tooltip/button
  const tooltip = document.createElement("div");
  tooltip.id = "explainTooltip";
  tooltip.className = "explain-tooltip";
  tooltip.innerHTML = `
    <button class="dictionary-btn" type="button" style="display: none">查词</button>
    <button class="explain-btn" type="button">解释</button>
  `;
  tooltip.style.display = "none";
  document.body.appendChild(tooltip);

  let selectedText = "";
  let selectedWord = "";
  let selectedSentence = "";
  let selectedTimestamp = 0;

  // Interacting with Explain must preserve the transcript selection and stay
  // isolated from document/row click behavior.
  tooltip.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  tooltip.addEventListener("mouseup", (event) => {
    event.stopPropagation();
  });
  tooltip.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  // Listen for text selection
  document.addEventListener("mouseup", (e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    // Only show if selecting within transcript
    const isInTranscript = transcriptList.contains(selection.anchorNode);

    // Allow any selection length (removed 10+ char requirement)
    if (text.length > 0 && isInTranscript) {
      selectedText = text;
      selectedWord = normalizeSelectedWord(text);
      const subtitleContext = getSelectionSubtitleContext(selection);
      selectedSentence = subtitleContext.sentence;
      selectedTimestamp = subtitleContext.timestamp;
      tooltip.querySelector(".dictionary-btn").style.display = selectedWord
        ? "inline-flex"
        : "none";

      // Position the tooltip near the selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      tooltip.style.display = "block";
      tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
    } else {
      tooltip.style.display = "none";
    }
  });

  // Hide tooltip when clicking elsewhere
  document.addEventListener("mousedown", (e) => {
    if (!tooltip.contains(e.target)) {
      tooltip.style.display = "none";
    }
  });

  // Handle dictionary button click for a single selected English word.
  tooltip
    .querySelector(".dictionary-btn")
    .addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedWord) return;

      tooltip.style.display = "none";
      await showDictionaryLookup(
        selectedWord,
        selectedSentence,
        selectedTimestamp,
      );
    });

  // Handle explain button click
  tooltip
    .querySelector(".explain-btn")
    .addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedText) return;

      tooltip.style.display = "none";
      await showExplanation(selectedText);
    });
}

function dictionaryEntryHtml(entry) {
  const definitions = (entry.definitions || [])
    .map((definition) => `<li>${escapeHtml(definition)}</li>`)
    .join("");
  const examples = (entry.examples || [])
    .map((example) => `<li>${escapeHtml(example)}</li>`)
    .join("");
  const audioButton = entry.audioUrl
    ? `<button class="dictionary-audio-btn" type="button" data-audio-url="${escapeHtml(entry.audioUrl)}">播放发音</button>`
    : "";
  return `
    <article class="dictionary-entry">
      <div class="dictionary-entry-heading">
        <div>
          <span class="dictionary-headword">${escapeHtml(entry.headword)}</span>
          ${entry.partOfSpeech ? `<span class="dictionary-part">${escapeHtml(entry.partOfSpeech)}</span>` : ""}
        </div>
        ${audioButton}
      </div>
      ${entry.pronunciation ? `<div class="dictionary-pronunciation">/${escapeHtml(entry.pronunciation.replace(/^\/+|\/+$/g, ""))}/</div>` : ""}
      <ol class="dictionary-definitions">${definitions}</ol>
      ${examples ? `<div class="dictionary-example-label">例句</div><ul class="dictionary-examples">${examples}</ul>` : ""}
    </article>
  `;
}

function renderDictionaryContent(dictionary, sentence) {
  const entries = (dictionary.entries || [])
    .slice(0, 4)
    .map(dictionaryEntryHtml)
    .join("");
  const suggestions = (dictionary.suggestions || [])
    .map((suggestion) => `<span>${escapeHtml(suggestion)}</span>`)
    .join("");
  const referenceLabel =
    dictionary.reference === "collegiate"
      ? "Collegiate Dictionary 补充词典"
      : "Learner's Dictionary 学习词典";

  if (!entries) {
    return `
      <div class="dictionary-empty">没有找到完整词条。</div>
      ${suggestions ? `<div class="dictionary-suggestions"><strong>你是不是想查：</strong>${suggestions}</div>` : ""}
      <a class="dictionary-attribution" href="${escapeHtml(dictionary.attributionUrl)}" target="_blank" rel="noreferrer">Merriam-Webster</a>
    `;
  }

  return `
    ${sentence ? `<div class="dictionary-source-sentence"><span>字幕原句</span>${escapeHtml(sentence)}</div>` : ""}
    ${sentence ? `<section class="word-context-section" id="wordContextSection">
      <div class="word-context-label">此处意为</div>
      <div class="word-context-loading">正在结合字幕判断具体含义…</div>
    </section>` : ""}
    <div class="dictionary-reference-label">${referenceLabel}</div>
    ${entries}
    <a class="dictionary-attribution" href="${escapeHtml(dictionary.attributionUrl)}" target="_blank" rel="noreferrer">Powered by Merriam-Webster</a>
  `;
}

async function showDictionaryLookup(word, sentence, timestamp = 0) {
  document.getElementById("explainModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "explainModal";
  modal.className = "explain-modal-overlay";
  modal.innerHTML = `
    <div class="explain-modal dictionary-modal">
      <div class="explain-modal-header">
        <div class="explain-modal-title">查词</div>
        <button class="explain-modal-close" id="closeExplain" type="button" aria-label="关闭">✕</button>
      </div>
      <div class="dictionary-query-row">
        <div class="dictionary-query-word">${escapeHtml(word)}</div>
        <button class="vocabulary-favorite-btn" id="vocabularyFavoriteBtn" type="button" disabled>☆ 收藏</button>
      </div>
      <div class="vocabulary-save-status" id="vocabularySaveStatus"></div>
      <div class="explain-modal-content" id="dictionaryContent">
        <div class="explain-loading">
          <div class="loading-bar"></div>
          <span>正在查询 Merriam-Webster…</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#closeExplain").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });

  const content = modal.querySelector("#dictionaryContent");
  const favoriteButton = modal.querySelector("#vocabularyFavoriteBtn");
  const favoriteStatus = modal.querySelector("#vocabularySaveStatus");
  let dictionary = null;
  let context = null;
  let isFavorite = false;
  let favoriteBusy = false;
  let favoriteStateChanged = false;

  function updateFavoriteButton() {
    favoriteButton.classList.toggle("active", isFavorite);
    favoriteButton.textContent = isFavorite ? "★ 已收藏" : "☆ 收藏";
    favoriteButton.disabled = favoriteBusy || (!dictionary && !isFavorite);
  }

  async function persistFavorite({ quiet = false } = {}) {
    if (!dictionary?.entries?.length) return;
    const wasFavorite = isFavorite;
    favoriteBusy = true;
    isFavorite = true;
    favoriteStateChanged = true;
    updateFavoriteButton();
    if (!quiet) favoriteStatus.textContent = "正在保存收藏…";
    try {
      const result = await chrome.runtime.sendMessage({
        action: "saveVocabularyWord",
        payload: {
          word,
          dictionary,
          context,
          source: {
            sentence,
            timestamp,
            videoId: currentVideoId,
            videoTitle: currentVideoTitle,
          },
        },
      });
      if (!result?.success) throw new Error(result?.error || "保存失败");
      isFavorite = true;
      const sync = result.entry?.obsidian;
      favoriteStatus.textContent =
        sync?.status === "error"
          ? "已收藏到本地；Obsidian 暂未同步。"
          : "已收藏。";
      loadVocabularyWords();
    } catch (error) {
      isFavorite = wasFavorite;
      favoriteStatus.textContent = error.message || "收藏失败。";
    } finally {
      favoriteBusy = false;
      updateFavoriteButton();
    }
  }

  favoriteButton.addEventListener("click", async () => {
    if (favoriteBusy) return;
    if (!isFavorite) {
      await persistFavorite();
      return;
    }
    favoriteBusy = true;
    favoriteStateChanged = true;
    updateFavoriteButton();
    try {
      const result = await chrome.runtime.sendMessage({
        action: "removeVocabularyWord",
        word,
      });
      if (!result?.success) throw new Error(result?.error || "取消收藏失败");
      isFavorite = false;
      favoriteStatus.textContent = result.obsidian?.success === false
        ? "已取消本地收藏；Obsidian 暂未同步。"
        : "已取消收藏。";
      loadVocabularyWords();
    } catch (error) {
      favoriteStatus.textContent = error.message || "取消收藏失败。";
    } finally {
      favoriteBusy = false;
      updateFavoriteButton();
    }
  });

  chrome.runtime
    .sendMessage({ action: "getVocabularyWords", word })
    .then((result) => {
      if (!modal.isConnected) return;
      if (!favoriteStateChanged) isFavorite = !!result?.entry;
      updateFavoriteButton();
    })
    .catch(() => updateFavoriteButton());

  try {
    const result = await chrome.runtime.sendMessage({
      action: "lookupDictionaryWord",
      word,
    });
    if (!result?.success) {
      content.innerHTML = `
        <div class="explain-error">${escapeHtml(result?.error || "查词失败，请稍后重试。")}</div>
        ${result?.code === "NO_DICTIONARY_KEY" ? '<button class="dictionary-open-settings" type="button">打开设置</button>' : ""}
      `;
      content
        .querySelector(".dictionary-open-settings")
        ?.addEventListener("click", () =>
          chrome.runtime.sendMessage({ action: "openOptions" }),
        );
      return;
    }

    dictionary = result.dictionary;
    updateFavoriteButton();
    content.innerHTML = renderDictionaryContent(dictionary, sentence);
    for (const button of content.querySelectorAll(".dictionary-audio-btn")) {
      button.addEventListener("click", async () => {
        try {
          await new Audio(button.dataset.audioUrl).play();
        } catch (_error) {
          button.textContent = "发音播放失败";
        }
      });
    }

    if (!dictionary.entries?.length || !sentence) return;
    const definitions = dictionary.entries
      .flatMap((entry) => entry.definitions || [])
      .slice(0, 8);
    const contextResult = await chrome.runtime.sendMessage({
      action: "explainWordContext",
      word,
      sentence,
      definitions,
      videoTitle: currentVideoTitle,
    });
    const contextSection = modal.querySelector("#wordContextSection");
    if (!contextSection) return;
    if (contextResult?.success) {
      context = contextResult.context;
      contextSection.innerHTML = `
        <div class="word-context-label">此处意为</div>
        <div class="word-context-meaning">${escapeHtml(contextResult.context.meaningZh)}</div>
        ${contextResult.context.usageNote ? `<div class="word-context-note">${escapeHtml(contextResult.context.usageNote)}</div>` : ""}
      `;
      if (isFavorite) await persistFavorite({ quiet: true });
    } else {
      contextSection.innerHTML = `
        <div class="word-context-label">此处意为</div>
        <div class="word-context-unavailable">${escapeHtml(contextResult?.error || "暂时无法生成语境解释。")}</div>
      `;
    }
  } catch (error) {
    content.innerHTML = `<div class="explain-error">${escapeHtml(error.message || "查词失败，请稍后重试。")}</div>`;
  }
}

/**
 * Shows the explanation modal and fetches it from the configured AI provider.
 */
async function showExplanation(selectedText) {
  // Create modal
  const modal = document.createElement("div");
  modal.id = "explainModal";
  modal.className = "explain-modal-overlay";
  modal.innerHTML = `
    <div class="explain-modal">
      <div class="explain-modal-header">
        <div class="explain-modal-title">Explain</div>
        <button class="explain-modal-close" id="closeExplain">✕</button>
      </div>
      <div class="explain-selected-text">"${escapeHtml(selectedText.substring(0, 200))}${selectedText.length > 200 ? "..." : ""}"</div>
      <div class="explain-modal-content" id="explanationContent">
        <div class="explain-loading">
          <div class="loading-bar"></div>
          <span>Analyzing...</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  document
    .getElementById("closeExplain")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // Get some context around the selection from the transcript
  const transcriptContext = getTranscriptContext(selectedText);

  // Fetch explanation
  try {
    const result = await chrome.runtime.sendMessage({
      action: "explainSelection",
      selectedText: selectedText,
      transcriptContext: transcriptContext,
      videoTitle: currentVideoTitle,
    });

    const contentDiv = document.getElementById("explanationContent");
    if (result.success) {
      contentDiv.innerHTML = `<div class="explain-text">${escapeHtml(result.explanation).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</div>`;
    } else {
      contentDiv.innerHTML = `<div class="explain-error">Failed to get explanation: ${escapeHtml(result.error)}</div>`;
    }
  } catch (error) {
    const contentDiv = document.getElementById("explanationContent");
    contentDiv.innerHTML = `<div class="explain-error">Error: ${escapeHtml(error.message)}</div>`;
  }
}

/**
 * Gets surrounding context from the transcript for the selected text.
 */
function getTranscriptContext(selectedText) {
  const fullText = currentTranscriptText || "";
  const index = fullText.indexOf(selectedText);

  if (index === -1) return "";

  // Get 200 chars before and after
  const start = Math.max(0, index - 200);
  const end = Math.min(fullText.length, index + selectedText.length + 200);

  return fullText.substring(start, end);
}

// ============================================================
// CACHING
// ============================================================

/**
 * Saves the current digest results to persistent local storage.
 * Results survive browser restarts — reopening the same video loads from cache
 * without consuming API tokens or Supadata calls.
 * Cache expires after 30 days. Oldest entries evicted when > 20 videos cached.
 */
async function saveToCache(videoId) {
  if (!videoId || !currentTranscript) return;

  try {
    // Persist semantic-segment translations for this video.
    const paragraphCacheForVideo = {};
    for (const [key, value] of transcriptParagraphCache.entries()) {
      if (key.startsWith(`${videoId}:`)) {
        paragraphCacheForVideo[key] = value;
      }
    }

    const cacheData = {
      analysis: currentAnalysis, // May be null if not yet analyzed
      analysisLocale: currentAnalysis ? OVERVIEW_LOCALE : null,
      analysisVersion: currentAnalysis ? OVERVIEW_CACHE_VERSION : null,
      analysisMode: currentAnalysis ? getCurrentOverviewMode() : null,
      transcript: currentTranscript,
      transcriptText: currentTranscriptText,
      transcriptTimestamped: currentTranscriptTimestamped,
      transcriptLanguage: currentTranscriptLanguage,
      videoTitle: currentVideoTitle,
      channelName: currentChannelName,
      paragraphCache: paragraphCacheForVideo,
      timestamp: Date.now(),
    };

    await chrome.storage.local.set({ [`digest_${videoId}`]: cacheData });
    debugLog(
      "Saved to cache:",
      videoId,
      currentAnalysis ? "(with analysis)" : "(transcript only)",
    );

    // Evict old entries if we have more than 20 videos cached
    await evictOldCacheEntries(20);
  } catch (error) {
    console.error("Cache save error:", error);
  }
}

/**
 * Keeps the cache from growing unbounded.
 * Removes the oldest entries when we exceed maxEntries videos.
 *
 * @param {number} maxEntries - Maximum number of cached videos to keep
 */
async function evictOldCacheEntries(maxEntries) {
  try {
    const allData = await chrome.storage.local.get(null);
    let digestKeys = Object.keys(allData).filter((k) =>
      k.startsWith("digest_"),
    );
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const expired = digestKeys.filter((key) => {
      const timestamp = Number(allData[key]?.timestamp) || 0;
      return Date.now() - timestamp > THIRTY_DAYS;
    });
    if (expired.length) {
      await chrome.storage.local.remove(expired);
      const expiredSet = new Set(expired);
      digestKeys = digestKeys.filter((key) => !expiredSet.has(key));
    }

    if (digestKeys.length <= maxEntries) return;

    // Sort by timestamp (oldest first) and remove excess
    const sorted = digestKeys
      .map((k) => ({ key: k, ts: allData[k]?.timestamp || 0 }))
      .sort((a, b) => a.ts - b.ts);

    const toRemove = sorted
      .slice(0, sorted.length - maxEntries)
      .map((e) => e.key);
    if (toRemove.length > 0) {
      await chrome.storage.local.remove(toRemove);
      debugLog(`[youtube-digest-learn] Evicted ${toRemove.length} old cache entries`);
    }
  } catch (error) {
    console.error("Cache eviction error:", error);
  }
}

/**
 * Loads digest results from persistent local storage.
 * Returns null if not cached or expired (30-day expiry).
 */
async function loadFromCache(videoId) {
  if (!videoId) return null;

  try {
    const result = await chrome.storage.local.get(`digest_${videoId}`);
    const cached = result[`digest_${videoId}`];

    if (!cached) return null;

    // Cache expires after 30 days
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cached.timestamp > THIRTY_DAYS) {
      await chrome.storage.local.remove(`digest_${videoId}`);
      return null;
    }

    return cached;
  } catch (error) {
    console.error("Cache load error:", error);
    return null;
  }
}

/**
 * Updates the cache after enhance or translation operations.
 */
async function updateCache() {
  if (currentVideoId) {
    await saveToCache(currentVideoId);
  }
}

// ============================================================
// SAVED VOCABULARY
// ============================================================

function vocabularySourceUrl(context) {
  const videoId = String(context?.videoId || "");
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return "";
  const seconds = Math.max(0, Math.floor(Number(context?.timestamp) || 0));
  return `https://www.youtube.com/watch?v=${videoId}${seconds ? `&t=${seconds}s` : ""}`;
}

function formatVocabularyTimestamp(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function loadVocabularyWords() {
  const list = document.getElementById("vocabularyList");
  if (!list) return;
  try {
    const result = await chrome.runtime.sendMessage({
      action: "getVocabularyWords",
    });
    if (result?.success) renderVocabularyWords(result.entries || []);
  } catch (error) {
    list.innerHTML = `<div class="vocabulary-empty">${escapeHtml(error.message || "无法读取收藏。")}</div>`;
  }
}

function renderVocabularyWords(entries) {
  const list = document.getElementById("vocabularyList");
  if (!list) return;
  if (!entries.length) {
    list.innerHTML = '<div class="vocabulary-empty">还没有收藏单词。<br>从字幕中选中一个英文单词开始吧。</div>';
    return;
  }

  list.innerHTML = entries
    .map((entry) => {
      const dictionaryEntry = entry.dictionary?.entries?.[0] || {};
      const definition = dictionaryEntry.definitions?.[0] || "";
      const latestContext = entry.contexts?.[0] || null;
      const sourceUrl = vocabularySourceUrl(latestContext);
      const meta = [dictionaryEntry.pronunciation ? `/${dictionaryEntry.pronunciation}/` : "", dictionaryEntry.partOfSpeech]
        .filter(Boolean)
        .join(" · ");
      const syncState =
        entry.obsidian?.status === "synced"
          ? "已同步到 Obsidian 生词本"
          : entry.obsidian?.status === "error"
            ? "已保存在本地 · Obsidian 待同步"
            : "已保存在本地";
      return `
        <article class="vocabulary-card" data-vocabulary-word="${escapeHtml(entry.word)}">
          <div class="vocabulary-card-header">
            <div>
              <div class="vocabulary-card-word">${escapeHtml(entry.word)}</div>
              ${meta ? `<div class="vocabulary-card-meta">${escapeHtml(meta)}</div>` : ""}
            </div>
            <button class="vocabulary-remove-btn" type="button">取消收藏</button>
          </div>
          ${entry.context?.meaningZh ? `<div class="vocabulary-card-meaning">${escapeHtml(entry.context.meaningZh)}</div>` : ""}
          ${definition ? `<div class="vocabulary-card-definition">${escapeHtml(definition)}</div>` : ""}
          ${latestContext?.sentence ? `<div class="vocabulary-card-sentence">${escapeHtml(latestContext.sentence)}</div>` : ""}
          ${sourceUrl ? `<a class="vocabulary-card-source" href="${sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(latestContext.videoTitle || "YouTube")} · ${formatVocabularyTimestamp(latestContext.timestamp)}</a>` : ""}
          <div class="vocabulary-sync-state">${syncState}</div>
        </article>
      `;
    })
    .join("");

  for (const card of list.querySelectorAll(".vocabulary-card")) {
    card.querySelector(".vocabulary-remove-btn")?.addEventListener(
      "click",
      async () => {
        const button = card.querySelector(".vocabulary-remove-btn");
        button.disabled = true;
        button.textContent = "正在取消…";
        const result = await chrome.runtime.sendMessage({
          action: "removeVocabularyWord",
          word: card.dataset.vocabularyWord,
        });
        if (result?.success) loadVocabularyWords();
        else {
          button.disabled = false;
          button.textContent = "重试";
        }
      },
    );
  }
}

// ============================================================
// NOTES
// ============================================================

/**
 * Loads and renders notes from storage.
 * @param {string|null} videoId - Filter by video ID, or null for all notes
 */
async function loadNotes(videoId) {
  try {
    const result = await chrome.runtime.sendMessage({
      action: "getNotes",
      videoId: videoId,
    });

    if (result.success) {
      renderNotes(result.notes, videoId);
    }
  } catch (error) {
    console.error("[youtube-digest-learn Panel] Load notes error:", error);
  }
}

/**
 * Renders the notes list in the Notes tab.
 */
function renderNotes(notes, filteredVideoId) {
  const notesList = document.getElementById("notesList");
  const notesIntro = document.getElementById("notesIntro");

  if (!notesList) return;

  notesList.innerHTML = "";

  if (!notes || notes.length === 0) {
    notesIntro.style.display = "block";
    const emptyMessage = filteredVideoId
      ? "No notes for this video yet."
      : "No notes saved yet.";
    notesIntro.innerHTML = `${emptyMessage} Hover over the video and click <span class="note-inline-label">${NOTE_ICON_SVG} Note</span> to save.`;
    return;
  }

  notesIntro.style.display = "none";

  notes.forEach((note) => {
    const noteEl = document.createElement("div");
    noteEl.className = "note-item";
    noteEl.innerHTML = `
      <div class="note-header">
        <span class="note-timestamp" data-url="${escapeHtml(note.timestampedUrl)}" data-seconds="${Number(note.timestampSeconds) || 0}">${escapeHtml(note.timestamp)}</span>
        ${!filteredVideoId ? `<span class="note-video-title">${escapeHtml(note.videoTitle)}</span>` : ""}
        <button class="note-delete" data-id="${escapeHtml(note.id)}" title="Delete note">✕</button>
      </div>
      <div class="note-text">"${escapeHtml(note.text)}"</div>
      <div class="note-actions">
        <button class="note-action-btn note-copy-text">⧉ Copy text</button>
        <button class="note-action-btn note-copy-link" data-url="${escapeHtml(note.timestampedUrl)}">🔗 Copy timestamp</button>
        <button class="note-action-btn note-play" data-seconds="${Number(note.timestampSeconds) || 0}">▶ Play</button>
      </div>
    `;

    // Timestamp click - play from this point (in this tab or a new one)
    noteEl.querySelector(".note-timestamp").addEventListener("click", () => {
      playNote(note);
    });

    // Delete button
    noteEl
      .querySelector(".note-delete")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteNote(note.id);
        loadNotes(filteredVideoId);
      });

    // Copy text button — copies just the note's text
    noteEl
      .querySelector(".note-copy-text")
      .addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(note.text);
          const btn = noteEl.querySelector(".note-copy-text");
          btn.textContent = "✓ Copied!";
          setTimeout(() => {
            btn.textContent = "⧉ Copy text";
          }, 2000);
        } catch (err) {
          console.error("Copy failed:", err);
        }
      });

    // Copy timestamp button — copies the timestamped YouTube link
    noteEl
      .querySelector(".note-copy-link")
      .addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(note.timestampedUrl);
          const btn = noteEl.querySelector(".note-copy-link");
          btn.textContent = "✓ Copied!";
          setTimeout(() => {
            btn.textContent = "🔗 Copy timestamp";
          }, 2000);
        } catch (err) {
          console.error("Copy failed:", err);
        }
      });

    // Play button (in this tab if it's the current video, else a new tab)
    noteEl.querySelector(".note-play").addEventListener("click", () => {
      playNote(note);
    });

    notesList.appendChild(noteEl);
  });
}

async function syncCurrentVideoNotesToObsidian() {
  const button = document.getElementById("syncNotesObsidianBtn");
  const status = document.getElementById("notesSyncStatus");
  if (!button || !status) return;
  if (!currentVideoId) {
    status.textContent = "请先打开一个 YouTube 视频。";
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "正在同步…";
  status.textContent = "";
  try {
    const result = await chrome.runtime.sendMessage({
      action: "syncVideoNotesToObsidian",
      payload: {
        videoId: currentVideoId,
        videoTitle: currentVideoTitle,
        channelName: currentChannelName,
      },
    });
    status.textContent = result?.success
      ? `已同步到 Obsidian：${result.filepath || "视频笔记"}`
      : `同步失败：${result?.error || "未知错误"}`;
  } catch (error) {
    status.textContent = `同步失败：${error.message || "未知错误"}`;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

/**
 * Deletes a note by ID.
 */
async function deleteNote(noteId) {
  try {
    await chrome.runtime.sendMessage({
      action: "deleteNote",
      noteId: noteId,
    });
  } catch (error) {
    console.error("[youtube-digest-learn Panel] Delete note error:", error);
  }
}

// ============================================================
// AUTO-SCROLL — Follow video playback in transcript
// ============================================================
// While a video plays, the transcript automatically scrolls to show which
// 30-second chunk is currently being spoken. If the user manually scrolls
// (e.g., to read ahead), auto-scroll pauses and a "Follow playback" button
// appears so they can resume it. Highlight always stays active regardless.

/**
 * Starts polling the video's current time and highlighting/scrolling
 * to the matching transcript entry.
 */
function startPlaybackTracking() {
  if (!currentTranscript || !currentTranscript.length) return;

  // Don't restart if already tracking (preserves user's auto-scroll state)
  if (autoScrollInterval) return;

  autoScrollEnabled = true;
  document.getElementById("followPlaybackBtn").style.display = "none";

  // Poll video time every 500ms
  autoScrollInterval = setInterval(() => playbackTrackingTick(), 500);

  // Listen for manual scrolls on the content area
  const contentArea = document.getElementById("contentArea");
  contentArea.removeEventListener("scroll", onContentAreaScroll);
  contentArea.addEventListener("scroll", onContentAreaScroll);
}

/**
 * Stops playback tracking entirely. Called when leaving transcript tab,
 * starting a new digest, or leaving results state.
 */
function stopPlaybackTracking() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
  autoScrollEnabled = true; // Reset for next time
  lastAutoScrollTime = 0;
  document.getElementById("followPlaybackBtn").style.display = "none";

  // Remove active highlights
  document
    .querySelectorAll(".transcript-entry.active-playback")
    .forEach((el) => {
      el.classList.remove("active-playback");
    });
}

/**
 * One tick of the playback tracker. Gets current video time from the
 * YouTube tab and highlights + scrolls to the matching transcript entry.
 */
async function playbackTrackingTick() {
  try {
    const result = await chrome.runtime.sendMessage({
      action: "relayToContent",
      payload: { action: "getCurrentTime" },
    });

    if (!result.success || !result.response) return;

    const currentTime = result.response.currentTime || 0;
    highlightActiveEntry(currentTime);
  } catch (error) {
    // Silently ignore — YouTube tab might be closed or navigated away
  }
}

/**
 * Scrolls the transcript to the entry currently being spoken (the one
 * carrying the active-playback highlight). Returns false if nothing is
 * highlighted yet. Stamps lastAutoScrollTime BEFORE scrolling so the scroll
 * events from our own smooth animation aren't mistaken for the user
 * scrolling away (which would re-disable auto-scroll immediately).
 */
function scrollToActiveEntry() {
  const activeEntry = document.querySelector(
    "#transcriptList .transcript-entry.active-playback",
  );
  if (!activeEntry) return false;

  lastAutoScrollTime = Date.now();
  activeEntry.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

/**
 * Finds the transcript entry matching the current playback time,
 * highlights it, and scrolls to it (if auto-scroll is enabled).
 *
 * @param {number} currentSeconds - Current video playback time in seconds
 */
function highlightActiveEntry(currentSeconds) {
  const transcriptList = document.getElementById("transcriptList");
  if (!transcriptList) return;

  const entries = transcriptList.querySelectorAll(".transcript-entry");
  if (entries.length === 0) return;

  // Find the entry whose time range contains the current playback time
  let activeEntry = null;
  let activeIndex = -1;
  entries.forEach((entry, index) => {
    const entrySeconds = parseInt(entry.dataset.seconds);
    const nextEntry = entries[index + 1];
    const nextSeconds = nextEntry
      ? parseInt(nextEntry.dataset.seconds)
      : Infinity;

    if (currentSeconds >= entrySeconds && currentSeconds < nextSeconds) {
      activeEntry = entry;
      activeIndex = index;
    }
  });

  if (!activeEntry) return;

  // Playback can jump to a row before the viewport observer queues it.
  // Promote the current sentence, then warm the following one.
  if (
    currentTranscriptMode !== "original" &&
    activeTranslationQueue &&
    !activeEntry.classList.contains("translated")
  ) {
    activeTranslationQueue.enqueue(activeIndex, false, true);
    activeTranslationQueue.enqueue(activeIndex + 1);
  }

  // Skip if this entry is already highlighted (no DOM thrashing)
  if (activeEntry.classList.contains("active-playback")) return;

  // Remove old highlight, add new one
  entries.forEach((e) => e.classList.remove("active-playback"));
  activeEntry.classList.add("active-playback");

  // Only scroll if auto-scroll is enabled
  if (autoScrollEnabled) {
    lastAutoScrollTime = Date.now();
    activeEntry.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Scroll event handler for the content area.
 * Detects manual scrolling and disables auto-scroll so the user
 * can read at their own pace without being yanked back.
 */
function onContentAreaScroll() {
  // Ignore scroll events within 1 second of a programmatic scroll
  // (smooth scroll animations can last longer than a simple boolean flag)
  if (Date.now() - lastAutoScrollTime < 1000) return;

  // User scrolled manually — disable auto-scroll and show the button
  if (autoScrollEnabled && autoScrollInterval) {
    autoScrollEnabled = false;
    document.getElementById("followPlaybackBtn").style.display = "block";
  }
}

// ============================================================
// TRANSCRIPT MODE UI — Original / Chinese / aligned bilingual
// ============================================================

function getOriginalTranscriptLabel() {
  const language = String(currentTranscriptLanguage || "").trim();
  return /^[A-Za-z0-9-]{1,20}$/.test(language)
    ? `Original (${language})`
    : "Original";
}

function getActiveTranscriptSegments() {
  return groupTranscriptEntries(currentTranscript || []);
}

function transcriptTranslationCacheKey(segment) {
  return `${currentVideoId}:zh:semantic:${segment.id}`;
}

function setTranscriptModeButtons(mode) {
  document.querySelectorAll(".transcript-mode-btn").forEach((button) => {
    const active = button.dataset.transcriptMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

async function handleTranscriptModeChange(mode) {
  if (!["original", "zh", "bilingual"].includes(mode)) return;
  if (mode === currentTranscriptMode) return;

  currentTranscriptMode = mode;
  translationGeneration += 1;
  translationWorkCount = 0;
  setTranslatingSpinner(false);
  if (transcriptScrollObserver) transcriptScrollObserver.disconnect();
  transcriptScrollObserver = null;
  setTranscriptModeButtons(mode);

  if (mode === "original") {
    renderTranscript();
    return;
  }

  await translateTranscript();
}

function renderTranscriptSegmentContent(segment, mode, translated, error) {
  const original = renderSubtitleInlineMarkup(segment.text);
  let translationHtml = "";
  if (translated) {
    translationHtml = renderSubtitleInlineMarkup(translated);
  } else if (error) {
    translationHtml = `${escapeHtml(error)}<button class="translation-retry-btn" type="button">Retry</button>`;
  } else {
    translationHtml = "Waiting for translation…";
  }

  if (mode === "bilingual") {
    return `<span class="transcript-copy"><span class="transcript-original">${original}</span><span class="transcript-translation ${translated ? "" : error ? "translation-error" : "translation-pending"}">${translationHtml}</span></span>`;
  }

  return `<span class="transcript-copy"><span class="transcript-translation ${translated ? "" : error ? "translation-error" : "translation-pending"}">${translationHtml}</span></span>`;
}

function renderTranscriptModeRows(segments, mode) {
  const transcriptList = document.getElementById("transcriptList");
  if (!transcriptList) return [];
  transcriptList.innerHTML = "";

  const existingBadge = document.getElementById("transcriptSourceBadge");
  if (existingBadge) existingBadge.remove();
  const badge = document.createElement("div");
  badge.id = "transcriptSourceBadge";
  badge.className = "transcript-source-badge";
  const originalLabel = getOriginalTranscriptLabel();
  const modeLabel =
    mode === "bilingual"
      ? `${originalLabel} + 简体中文`
      : `简体中文 · translated from ${originalLabel}`;
  badge.innerHTML = `<span class="source-dot source-dot--subs"></span> From video subtitles · ${modeLabel}`;
  transcriptList.parentElement.insertBefore(badge, transcriptList);

  const rows = [];
  segments.forEach((segment, index) => {
    const div = document.createElement("div");
    const cached = transcriptParagraphCache.get(
      transcriptTranslationCacheKey(segment),
    );
    div.className = `transcript-entry ${cached ? "translated" : "translating"}`;
    div.dataset.seconds = segment.start;
    div.dataset.segmentId = segment.id;
    div.dataset.segmentIndex = index;

    const minutes = Math.floor(segment.start / 60);
    const seconds = Math.floor(segment.start % 60);
    const timestamp = `${minutes}:${String(seconds).padStart(2, "0")}`;
    div.innerHTML = `
      <span class="transcript-time">${timestamp}</span>
      ${renderTranscriptSegmentContent(segment, mode, cached, "")}
    `;
    div.addEventListener("click", (event) =>
      seekFromTranscriptEntryClick(event, segment.start),
    );
    transcriptList.appendChild(div);
    rows.push(div);
  });

  updateTranscriptTranslationStatus();
  startPlaybackTracking();
  return rows;
}

/**
 * Rebuilds a provider response in source order. Unknown IDs are ignored and
 * missing IDs remain explicit errors, never positional guesses.
 */
function alignTranslatedSegmentBatch(sourceSegments, responseSegments) {
  const translatedById = new Map();
  if (Array.isArray(responseSegments)) {
    responseSegments.forEach((item) => {
      if (!item || typeof item.id !== "string" || typeof item.text !== "string")
        return;
      const text = item.text.trim();
      if (text && !translatedById.has(item.id)) {
        translatedById.set(item.id, text);
      }
    });
  }

  return sourceSegments.map((segment) => ({
    id: segment.id,
    text: translatedById.get(segment.id) || "",
    error: translatedById.has(segment.id) ? "" : "Translation unavailable.",
  }));
}

function updateTranslatedRow(segment, index, alignedItem, generation) {
  if (generation !== translationGeneration) return;
  const row = document.querySelector(
    `.transcript-entry[data-segment-id="${CSS.escape(segment.id)}"]`,
  );
  if (!row) return;

  if (alignedItem.text) {
    transcriptParagraphCache.set(
      transcriptTranslationCacheKey(segment),
      alignedItem.text,
    );
  }

  const copy = row.querySelector(".transcript-copy");
  if (copy) {
    copy.outerHTML = renderTranscriptSegmentContent(
      segment,
      currentTranscriptMode,
      alignedItem.text,
      alignedItem.error,
    );
  }
  row.classList.toggle("translated", !!alignedItem.text);
  row.classList.toggle("translating", false);
  row.classList.toggle("translation-failed", !alignedItem.text);

  const retry = row.querySelector(".translation-retry-btn");
  if (retry) {
    ["mousedown", "mouseup"].forEach((eventName) => {
      retry.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    retry.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      retryTranslationSegment(index, generation);
    });
  }
  updateTranscriptTranslationStatus();
}

let activeTranslationQueue = null;

async function requestTranscriptTranslationBatch(
  indices,
  segments,
  generation,
  videoId,
  mode,
) {
  const sourceBatch = indices.map((index) => segments[index]);
  setTranslatingSpinner(true);
  try {
    const result = await sendTranslationMessage({
      action: "translateContent",
      content: {
        segments: sourceBatch.map(({ id, text }) => ({ id, text })),
      },
      contentType: "transcriptBatch",
      targetLanguage: "zh",
      videoTitle: currentVideoTitle,
    });

    const isStale =
      generation !== translationGeneration ||
      videoId !== currentVideoId ||
      mode !== currentTranscriptMode;
    if (isStale) return;

    const responseSegments = result?.success
      ? result.translatedContent?.segments
      : [];
    const aligned = alignTranslatedSegmentBatch(sourceBatch, responseSegments);
    aligned.forEach((item, batchIndex) => {
      if (!result?.success) {
        item.error = result?.error || "Translation failed.";
      }
      updateTranslatedRow(
        sourceBatch[batchIndex],
        indices[batchIndex],
        item,
        generation,
      );
    });
    await updateCache();
  } catch (error) {
    if (generation !== translationGeneration) return;
    sourceBatch.forEach((segment, batchIndex) => {
      updateTranslatedRow(
        segment,
        indices[batchIndex],
        { id: segment.id, text: "", error: error.message || "Translation failed." },
        generation,
      );
    });
  } finally {
    // A mode or video change resets the counter for the new generation. An
    // older request must not decrement that new generation's active count.
    if (generation === translationGeneration) setTranslatingSpinner(false);
  }
}

function retryTranslationSegment(index, generation) {
  if (generation !== translationGeneration || !activeTranslationQueue) return;
  const row = document.querySelector(
    `.transcript-entry[data-segment-index="${index}"]`,
  );
  if (row) {
    row.classList.add("translating");
    row.classList.remove("translation-failed");
    const translation = row.querySelector(".transcript-translation");
    if (translation) {
      translation.className = "transcript-translation translation-pending";
      translation.textContent = "Retrying…";
    }
  }
  activeTranslationQueue.enqueue(index, true);
}

/**
 * Renders immediately, then translates every uncached segment in the
 * background. Visible and currently-playing rows can still jump to the front.
 * Two small concurrent batches keep the UI moving without flooding the API.
 */
async function translateTranscript() {
  const segments = getActiveTranscriptSegments();
  if (!segments.length || currentTranscriptMode === "original") return;

  translationGeneration += 1;
  const generation = translationGeneration;
  const videoId = currentVideoId;
  const mode = currentTranscriptMode;
  if (transcriptScrollObserver) transcriptScrollObserver.disconnect();

  const rows = renderTranscriptModeRows(segments, mode);
  const queue = [];
  const queued = new Set();
  const inFlight = new Set();
  let activeBatches = 0;
  let pumpScheduled = false;

  const processQueue = () => {
    if (generation !== translationGeneration) return;
    while (
      activeBatches < TRANSLATION_CONCURRENCY &&
      queue.length > 0
    ) {
      const indices = queue.splice(0, TRANSLATION_BATCH_SIZE);
      indices.forEach((index) => {
        queued.delete(index);
        inFlight.add(index);
      });
      activeBatches += 1;
      requestTranscriptTranslationBatch(
        indices,
        segments,
        generation,
        videoId,
        mode,
      ).finally(() => {
        indices.forEach((index) => inFlight.delete(index));
        activeBatches = Math.max(0, activeBatches - 1);
        if (generation === translationGeneration) processQueue();
      });
    }
  };

  const scheduleQueue = () => {
    if (pumpScheduled) return;
    pumpScheduled = true;
    Promise.resolve().then(() => {
      pumpScheduled = false;
      processQueue();
    });
  };

  const enqueue = (index, force = false, priority = false) => {
    if (!Number.isInteger(index) || !segments[index]) return;
    if (inFlight.has(index)) return;
    const cached = transcriptParagraphCache.has(
      transcriptTranslationCacheKey(segments[index]),
    );
    if (!force && cached) return;
    if (queued.has(index)) {
      if (!priority) return;
      const queuedIndex = queue.indexOf(index);
      if (queuedIndex >= 0) queue.splice(queuedIndex, 1);
    }
    if (priority) queue.unshift(index);
    else queue.push(index);
    queued.add(index);
    updateTranscriptTranslationStatus();
    // Let all entries added in the same turn collect before workers start.
    scheduleQueue();
  };
  activeTranslationQueue = { enqueue };

  transcriptScrollObserver = new IntersectionObserver(
    (observerEntries) => {
      observerEntries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            Number(a.target.dataset.segmentIndex) -
            Number(b.target.dataset.segmentIndex),
        )
        .forEach((entry) => enqueue(Number(entry.target.dataset.segmentIndex)));
    },
    {
      root: document.getElementById("contentArea"),
      rootMargin: "320px 0px",
      threshold: 0,
    },
  );

  rows.forEach((row, index) => {
    if (!row.classList.contains("translated")) transcriptScrollObserver.observe(row);
    // A deliberate switch to Chinese/bilingual authorizes translating the
    // complete transcript. Cached rows are skipped by enqueue().
    enqueue(index);
  });
  updateTranscriptTranslationStatus();
}

function updateTranscriptTranslationStatus() {
  if (currentTranscriptMode === "original") {
    setCompletionStatus(
      "transcriptTranslationStatus",
      "idle",
      "原文无需翻译",
    );
    return;
  }
  const segments = getActiveTranscriptSegments();
  const total = segments.length;
  if (!total) {
    setCompletionStatus(
      "transcriptTranslationStatus",
      "idle",
      "暂无逐字稿",
    );
    return;
  }
  const translated = segments.reduce(
    (count, segment) =>
      count +
      (transcriptParagraphCache.has(transcriptTranslationCacheKey(segment))
        ? 1
        : 0),
    0,
  );
  const failed = document.querySelectorAll(
    "#transcriptList .transcript-entry.translation-failed",
  ).length;
  if (translated === total) {
    setCompletionStatus(
      "transcriptTranslationStatus",
      "complete",
      `翻译完成 · ${total}/${total}`,
    );
    return;
  }
  if (failed > 0 && translated + failed >= total) {
    setCompletionStatus(
      "transcriptTranslationStatus",
      "error",
      `已翻译 ${translated}/${total} · ${failed} 句失败`,
    );
    return;
  }
  setCompletionStatus(
    "transcriptTranslationStatus",
    translationWorkCount > 0 ? "working" : "idle",
    `${translationWorkCount > 0 ? "正在翻译" : "已翻译"} · ${translated}/${total}`,
  );
}

function setTranslatingSpinner(show) {
  if (show) translationWorkCount += 1;
  else translationWorkCount = Math.max(0, translationWorkCount - 1);
  const isTranslating = translationWorkCount > 0;
  const spinner = document.getElementById("langSpinner");
  if (spinner) spinner.classList.toggle("visible", isTranslating);
  updateTranscriptTranslationStatus();
}

// Pure helpers are exposed for the repository's Node tests. The extension does
// not read this object at runtime.
globalThis.__YTD_TRANSCRIPT_TESTING__ = {
  sendTranslationMessage,
  determineOverviewMode,
  groupTranscriptEntries,
  splitOversizedThought,
  alignTranslatedSegmentBatch,
  renderSubtitleInlineMarkup,
  renderTranscriptSegmentContent,
};
