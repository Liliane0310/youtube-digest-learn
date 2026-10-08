const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dictionary = require("../dictionary.js");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("dictionary lookup accepts one normalized English word", () => {
  assert.equal(dictionary.normalizeLookupWord("  Learning! "), "learning");
  assert.equal(dictionary.normalizeLookupWord("mother-in-law"), "mother-in-law");
  assert.equal(dictionary.normalizeLookupWord("DON’T"), "don't");
  assert.equal(dictionary.normalizeLookupWord("two words"), "");
  assert.equal(dictionary.normalizeLookupWord("中文"), "");
});

test("Merriam-Webster pronunciation URLs follow the documented folders", () => {
  assert.equal(
    dictionary.audioUrl("bixword"),
    "https://media.merriam-webster.com/audio/prons/en/us/mp3/bix/bixword.mp3",
  );
  assert.equal(
    dictionary.audioUrl("ggsound"),
    "https://media.merriam-webster.com/audio/prons/en/us/mp3/gg/ggsound.mp3",
  );
  assert.equal(
    dictionary.audioUrl("1word"),
    "https://media.merriam-webster.com/audio/prons/en/us/mp3/number/1word.mp3",
  );
  assert.equal(dictionary.audioUrl("../secret"), "");
});

test("dictionary responses expose learner definitions, examples, and audio", () => {
  const parsed = dictionary.parseResponse(
    "learn",
    [
      {
        meta: { id: "learn:1", uuid: "entry-1" },
        hwi: {
          hw: "learn",
          prs: [{ ipa: "lɝːn", sound: { audio: "learn001" } }],
        },
        fl: "verb",
        shortdef: ["to gain knowledge of something", "to find out"],
        def: [
          {
            sseq: [
              [
                [
                  "sense",
                  { dt: [["vis", [{ t: "She {it}learned{/it} quickly." }]]] },
                ],
              ],
            ],
          },
        ],
      },
    ],
    "learners",
  );

  assert.equal(parsed.reference, "learners");
  assert.equal(parsed.entries[0].headword, "learn");
  assert.equal(parsed.entries[0].partOfSpeech, "verb");
  assert.deepEqual(parsed.entries[0].definitions, [
    "to gain knowledge of something",
    "to find out",
  ]);
  assert.deepEqual(parsed.entries[0].examples, ["She learned quickly."]);
  assert.match(parsed.entries[0].audioUrl, /\/l\/learn001\.mp3$/);
});

test("spelling suggestions are preserved when no entry is returned", () => {
  const parsed = dictionary.parseResponse(
    "lern",
    ["learn", "lean", "learner"],
    "learners",
  );
  assert.deepEqual(parsed.entries, []);
  assert.deepEqual(parsed.suggestions, ["learn", "lean", "learner"]);
});

test("pre-cache chooses recurring meaningful words and caps API warming", () => {
  const transcript = [
    "Caching makes dictionary queries fast.",
    "Dictionary caching avoids repeated dictionary requests.",
    "A learner can study vocabulary and vocabulary in context.",
  ].join(" ");
  const words = dictionary.choosePrecacheWords(transcript, 20);

  assert.ok(words.includes("dictionary"));
  assert.ok(words.includes("caching"));
  assert.ok(words.includes("vocabulary"));
  assert.ok(words.length <= dictionary.PRECACHE_WORD_LIMIT);
  assert.equal(words.includes("makes"), false);
});

test("AI context cache identity is the normalized word plus subtitle sentence", () => {
  const first = dictionary.contextCacheKey(
    "Learn",
    "We   learn from every mistake.",
  );
  const same = dictionary.contextCacheKey(
    "learn",
    "  we learn from every mistake. ",
  );
  const different = dictionary.contextCacheKey(
    "learn",
    "Children learn through play.",
  );

  assert.equal(first, same);
  assert.notEqual(first, different);
  assert.match(first, /^learn:[a-z0-9]+$/);
});

test("public runtime contains BYOK and all three cache layers without a key", () => {
  const background = read("background.js");
  const options = read("options.html");

  assert.match(options, /id="merriamWebsterLearnersKey"/);
  assert.match(options, /id="merriamWebsterCollegiateKey"/);
  assert.match(background, /YTD_DICTIONARY\.DICTIONARY_CACHE_KEY/);
  assert.match(background, /dictionaryReferenceFlights\.has\(flightKey\)/);
  assert.match(background, /choosePrecacheWords\(transcriptText\)/);
  assert.match(background, /YTD_DICTIONARY\.contextCacheKey\(word, sentence\)/);
  assert.doesNotMatch(
    [background, read("settings.js"), read("dictionary.js")].join("\n"),
    /merriamWebster(?:Learners|Collegiate)Key:\s*["'][^"']+["']/,
  );
});
