const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "sidepanel.html"), "utf8");
const js = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");

test("transcript exposes a full-text search box with navigation controls", () => {
  assert.match(
    html,
    /<input[^>]*type="search"[^>]*id="transcriptSearchInput"/,
  );
  assert.match(html, /id="transcriptSearchCount"/);
  assert.match(html, /id="transcriptSearchPrev"/);
  assert.match(html, /id="transcriptSearchNext"/);
  assert.match(html, /id="transcriptSearchClear"/);
});

test("transcript search matches the original text and, in translation modes, the translation", () => {
  assert.match(
    js,
    /function getTranscriptSearchText\(segment\)[\s\S]*?currentTranscriptMode !== "original"[\s\S]*?transcriptParagraphCache\.get\(/,
  );
  assert.match(js, /function runTranscriptSearch\(\)/);
  assert.match(js, /getTranscriptSearchText\(segment\)\.toLowerCase\(\)\.includes\(query\)/);
});

test("search results jump to a specific video fragment by timestamp", () => {
  assert.match(
    js,
    /function goToTranscriptMatch\(matchIndex\)[\s\S]*?seekTo\(match\.seconds\);/,
  );
  assert.match(
    js,
    /transcriptSearchMatches\.map\(\(m, i\) => \[m\.index, i\]\)/,
  );
});

test("prev/next and clear controls are wired to search navigation", () => {
  assert.match(
    js,
    /transcriptSearchPrev[\s\S]*?addEventListener\("click"/,
  );
  assert.match(
    js,
    /transcriptSearchNext[\s\S]*?addEventListener\("click"/,
  );
  assert.match(js, /clearTranscriptSearch/);
});

test("revisiting a tab preserves the transcript scroll position instead of jumping to the top", () => {
  assert.match(
    js,
    /lastRenderedTranscriptVideoId === currentVideoId[\s\S]*?transcriptList\.children\.length > 0/,
  );
  assert.match(
    js,
    /function startPlaybackTracking\(\)[\s\S]*?\/\/ Deliberately do NOT force autoScrollEnabled/,
  );
  assert.match(
    js,
    /function stopPlaybackTracking\(\)[\s\S]*?Do not reset autoScrollEnabled/,
  );
});