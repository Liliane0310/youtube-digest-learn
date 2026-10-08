const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const videoDocs = require("../obsidian-video.js");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const video = {
  videoId: "abc123xyz",
  videoTitle: "How to learn: practical habits?",
  channelName: "Learning Lab",
};

const notes = [
  {
    videoId: video.videoId,
    timestampSeconds: 75,
    text: "A useful idea.",
  },
];

const transcript = [
  {
    start: 12,
    text: "Practice a little every day.",
    translation: "每天练习一点。",
  },
];

test("video documents use a stable safe Markdown path", () => {
  assert.equal(
    videoDocs.buildFilepath("youtube-digest-learn/Videos", video),
    "youtube-digest-learn/Videos/How to learn practical habits - abc123xyz.md",
  );
  assert.equal(videoDocs.normalizeFolderPath(" ../Videos "), "");
  assert.equal(videoDocs.normalizeFolderPath("Videos/Bad:name"), "");
});

test("one video document contains managed notes and bilingual transcript", () => {
  const markdown = videoDocs.createDocument(video, notes, transcript, "bilingual");
  assert.match(markdown, /youtube-digest:video:v1/);
  assert.match(markdown, /youtube-digest:notes:start/);
  assert.match(markdown, /youtube-digest:overview:start/);
  assert.match(markdown, /\[1:15\]\(https:\/\/www\.youtube\.com\/watch\?v=abc123xyz&t=75s\)/);
  assert.match(markdown, /Practice a little every day\./);
  assert.match(markdown, /每天练习一点。/);
});

test("bilingual transcript keeps source and translation in one paragraph without timestamps", () => {
  const segments = [
    { start: 12, text: "First thought.", translation: "第一个想法。" },
    { start: 40, text: "Second thought.", translation: "第二个想法。" },
  ];
  const markdown = videoDocs.createDocument(
    video,
    [],
    segments,
    "bilingual",
  );
  const block = markdown.slice(
    markdown.indexOf(videoDocs.TRANSCRIPT_START),
    markdown.indexOf(videoDocs.TRANSCRIPT_END),
  );
  // One paragraph per segment, no timestamps, source and translation
  // adjacent within the same paragraph.
  assert.match(block, /First thought\.\n第一个想法。/);
  assert.match(block, /Second thought\.\n第二个想法。/);
  // Timestamps belong to notes and overview only, never the transcript body.
  assert.doesNotMatch(block, /\[\d+:\d+\]/);
  assert.doesNotMatch(block, /&gt;/);
  assert.doesNotMatch(block, /\n---\n/);
});

test("overview renders bilingual chapters as callouts and key quotes with links", () => {
  const overview = {
    chapters: [
      {
        title: "起步",
        titleEnglish: "Getting started",
        summary: "如何开始。",
        summaryEnglish: "How to begin.",
        timestampSeconds: 90,
      },
    ],
    keyQuotes: [
      {
        quote: "坚持是关键。",
        quoteEnglish: "Consistency is the key.",
        timestampSeconds: 150,
      },
    ],
  };
  const markdown = videoDocs.createDocument(
    video,
    [],
    [],
    "bilingual",
    overview,
  );
  assert.match(markdown, /youtube-digest:overview:start/);
  assert.match(markdown, /### 章节/);
  assert.match(
    markdown,
    /> \[!chapter\] \*\*\[1:30\]\(https:\/\/www\.youtube\.com\/watch\?v=abc123xyz&t=90s\)\*\* Getting started · 起步/,
  );
  assert.match(markdown, /> How to begin\./);
  assert.match(markdown, /### 重点引用/);
  assert.match(markdown, /> Consistency is the key\./);
  assert.match(markdown, /> 坚持是关键。/);
});

test("overview updates insert into older notes and preserve handwritten content", () => {
  const legacy = videoDocs.createDocument(video, notes, transcript, "bilingual");
  const withoutOverview = legacy.replace(
    `${videoDocs.OVERVIEW_START}\n*概览尚未生成或尚未同步。*\n${videoDocs.OVERVIEW_END}\n\n`,
    "",
  );
  const handwritten = `${withoutOverview}## 我的补充\n\n不要覆盖这里。\n`;
  const merged = videoDocs.mergeDocument(
    handwritten,
    {
      video,
      notes: [],
      transcript: [],
      overview: { chapters: [{ title: "新章节", timestampSeconds: 30 }] },
    },
    { updateOverview: true },
  );
  assert.equal(merged.created, false);
  assert.match(merged.content, /youtube-digest:overview:start/);
  assert.match(merged.content, /新章节/);
  assert.match(merged.content, /不要覆盖这里。/);
  assert.match(merged.content, /Practice a little every day\./);
  // The overview lands before the notes section, not after it.
  assert.ok(
    merged.content.indexOf(videoDocs.OVERVIEW_START) <
      merged.content.indexOf("## 我的笔记"),
  );
});

test("managed video updates preserve handwritten Obsidian content", () => {
  const first = videoDocs.createDocument(video, notes, transcript, "bilingual");
  const handwritten = `${first}\n## 我的补充\n\n不要覆盖这里。\n`;
  const merged = videoDocs.mergeDocument(
    handwritten,
    {
      video,
      notes: [{ ...notes[0], text: "Updated note." }],
      transcript: [],
    },
    { updateNotes: true },
  );
  assert.equal(merged.created, false);
  assert.match(merged.content, /Updated note\./);
  assert.match(merged.content, /不要覆盖这里。/);
  assert.match(merged.content, /Practice a little every day\./);
});

test("video sync refuses to overwrite an unrelated note", () => {
  assert.throws(
    () =>
      videoDocs.mergeDocument(
        "# Existing note",
        { video, notes, transcript },
        { updateNotes: true, updateTranscript: true },
      ),
    (error) => error.code === "OBSIDIAN_VIDEO_NOTE_CONFLICT",
  );
});

test("video notes and transcripts sync manually while vocabulary may auto-sync", () => {
  const panel = read("sidepanel.html");
  const panelScript = read("sidepanel.js");
  const options = read("options.html");
  const background = read("background.js");

  assert.match(panel, /id="syncTranscriptObsidianBtn"/);
  assert.match(panel, /id="syncNotesObsidianBtn"/);
  assert.match(panel, /id="syncOverviewObsidianBtn"/);
  assert.match(panelScript, /action: "syncVideoTranscriptToObsidian"/);
  assert.match(panelScript, /action: "syncVideoNotesToObsidian"/);
  assert.match(panelScript, /action: "syncVideoOverviewToObsidian"/);
  assert.match(panelScript, /async function buildObsidianTranscript/);
  assert.match(options, /id="obsidianVideoFolder"/);
  assert.match(background, /async function handleSyncVideoNotesToObsidian/);
  assert.match(background, /async function handleSyncVideoOverviewToObsidian/);
  assert.doesNotMatch(background, /maybeSyncVideoNotes/);
  assert.match(options, /Automatically sync saved words</);
  assert.doesNotMatch(options, /Automatically sync saved words and video notes/);
  assert.match(background, /importScripts\("obsidian-video\.js"\)/);
});
