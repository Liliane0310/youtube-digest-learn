const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const vocabulary = require("../vocabulary.js");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function record(word, updatedAt, meaningZh) {
  return {
    word,
    updatedAt,
    createdAt: updatedAt - 1000,
    context: { meaningZh, usageNote: "常见搭配" },
    dictionary: {
      entries: [
        {
          headword: word,
          partOfSpeech: "verb",
          pronunciation: "test",
          definitions: [`definition of ${word}`],
          examples: [`Example using ${word}.`],
        },
      ],
    },
    contexts: [
      {
        sentence: `We ${word} from this subtitle.`,
        videoId: "abc123xyz",
        videoTitle: "Learning video",
        timestamp: 75,
      },
    ],
  };
}

test("Obsidian vocabulary targets one safe Markdown path", () => {
  assert.equal(
    vocabulary.normalizeNotePath(" /youtube-digest-learn/Vocabulary.md/ "),
    "youtube-digest-learn/Vocabulary.md",
  );
  assert.equal(vocabulary.normalizeNotePath("Vocabulary"), "");
  assert.equal(vocabulary.normalizeNotePath("../Vocabulary.md"), "");
  assert.equal(vocabulary.normalizeNotePath("Notes/Bad:name.md"), "");
  assert.equal(
    vocabulary.encodeVaultPath("youtube-digest-learn/Vocabulary.md"),
    "youtube-digest-learn/Vocabulary.md",
  );
});

test("all favorite words are rendered inside one managed Markdown block", () => {
  const markdown = vocabulary.createNote([
    record("learn", 2000, "学习"),
    record("cache", 3000, "缓存"),
  ]);

  assert.equal((markdown.match(/youtube-digest:vocabulary:start/g) || []).length, 1);
  assert.equal((markdown.match(/youtube-digest:vocabulary:end/g) || []).length, 1);
  assert.match(markdown, /^# youtube-digest-learn 生词本$/m);
  assert.match(markdown, /^## cache$/m);
  assert.match(markdown, /^## learn$/m);
  assert.match(markdown, /共 2 个单词/);
  assert.match(markdown, /watch\?v=abc123xyz&t=75s/);
});

test("sync replaces only the managed block and preserves Obsidian notes", () => {
  const first = vocabulary.createNote([record("learn", 2000, "学习")]);
  const edited = `${first}\n我在 Obsidian 里补充的内容。\n`;
  const merged = vocabulary.mergeManagedNote(edited, [
    record("cache", 3000, "缓存"),
  ]);

  assert.equal(merged.created, false);
  assert.match(merged.content, /^## cache$/m);
  assert.doesNotMatch(merged.content, /^## learn$/m);
  assert.match(merged.content, /我在 Obsidian 里补充的内容。/);
});

test("sync refuses to overwrite an unrelated existing Markdown note", () => {
  assert.throws(
    () =>
      vocabulary.mergeManagedNote(
        "# My existing vocabulary\n\nDo not overwrite this.",
        [record("learn", 2000, "学习")],
      ),
    (error) => error.code === "OBSIDIAN_NOTE_CONFLICT",
  );
});

test("side panel and settings expose favorites and single-file sync", () => {
  const panel = read("sidepanel.html");
  const panelScript = read("sidepanel.js");
  const options = read("options.html");
  const background = read("background.js");

  assert.match(panel, /data-tab="vocabulary"/);
  assert.match(panelScript, /action: "saveVocabularyWord"/);
  assert.match(panelScript, /action: "removeVocabularyWord"/);
  assert.match(
    panelScript,
    /async function loadVocabularyWords\s*\(/,
    "the packaged side panel must include the favorites loader it calls",
  );
  assert.match(options, /id="obsidianVocabularyPath"/);
  assert.match(options, /youtube-digest-learn\/Vocabulary\.md/);
  assert.match(background, /syncVocabularyCollection\(entries, settings\)/);
  assert.doesNotMatch(background, /syncVocabularyRecord/);
});
