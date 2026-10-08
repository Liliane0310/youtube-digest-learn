const test = require("node:test");
const assert = require("node:assert/strict");

const settings = require("../settings.js");

test("DeepSeek remains the default OpenAI-compatible backend", () => {
  const normalized = settings.normalize({
    aiApiKey: "  example-key  ",
    supadataApiKey: "  example-supadata  ",
  });

  assert.equal(normalized.provider, "DeepSeek");
  assert.equal(normalized.aiBaseUrl, "https://api.deepseek.com");
  assert.equal(normalized.aiModel, "deepseek-v4-flash");
  assert.equal(normalized.aiApiKey, "example-key");
  assert.equal(normalized.supadataApiKey, "example-supadata");
  assert.equal(
    settings.chatCompletionsUrl(normalized.aiBaseUrl),
    "https://api.deepseek.com/chat/completions",
  );
  assert.equal(settings.isDeepSeek(normalized), true);
});

test("custom OpenAI-compatible backend settings are preserved", () => {
  const normalized = settings.normalize({
    provider: "  OpenRouter  ",
    aiApiKey: " custom-secret ",
    aiBaseUrl: "https://openrouter.ai/api/v1/",
    aiModel: " openai/gpt-4.1-mini ",
    supadataApiKey: " supadata-secret ",
  });

  assert.deepEqual(normalized, {
    provider: "OpenRouter",
    aiApiKey: "custom-secret",
    aiBaseUrl: "https://openrouter.ai/api/v1",
    aiModel: "openai/gpt-4.1-mini",
    supadataApiKey: "supadata-secret",
    merriamWebsterLearnersKey: "",
    merriamWebsterCollegiateKey: "",
    obsidianSyncEnabled: false,
    obsidianApiBaseUrl: "http://127.0.0.1:27123",
    obsidianApiKey: "",
    obsidianVocabularyPath: "youtube-digest-learn/Vocabulary.md",
    obsidianVideoFolder: "youtube-digest-learn/Videos",
    obsidianAutoSync: true,
  });
  assert.equal(
    settings.chatCompletionsUrl(normalized.aiBaseUrl),
    "https://openrouter.ai/api/v1/chat/completions",
  );
  assert.equal(settings.originPermission(normalized.aiBaseUrl), "https://openrouter.ai/*");
  assert.equal(settings.isDeepSeek(normalized), false);
});

test("full Chat Completions URLs and local HTTP backends are accepted", () => {
  assert.equal(
    settings.chatCompletionsUrl("https://example.com/v1/chat/completions/"),
    "https://example.com/v1/chat/completions",
  );
  assert.equal(settings.isValidBaseUrl("http://127.0.0.1:11434/v1"), true);
  assert.equal(
    settings.originPermission("http://127.0.0.1:11434/v1"),
    "http://127.0.0.1/*",
  );
  assert.equal(settings.isValidBaseUrl("file:///tmp/model"), false);
  assert.equal(settings.isValidBaseUrl("https://user:pass@example.com/v1"), false);
  assert.equal(settings.isValidBaseUrl("https://example.com/v1?token=secret"), false);
});

test("legacy custom settings keep their credentials and endpoint", () => {
  const legacy = {
    provider: "custom",
    aiApiKey: "custom-secret",
    aiBaseUrl: "https://api.example.com/v1",
    aiModel: "example-model",
    supadataApiKey: "supadata-secret",
  };
  const migration = settings.migrateLegacyCustom(legacy);

  assert.equal(migration.migrated, false);
  assert.deepEqual(migration.settings, {
    ...legacy,
    merriamWebsterLearnersKey: "",
    merriamWebsterCollegiateKey: "",
    obsidianSyncEnabled: false,
    obsidianApiBaseUrl: "http://127.0.0.1:27123",
    obsidianApiKey: "",
    obsidianVocabularyPath: "youtube-digest-learn/Vocabulary.md",
    obsidianVideoFolder: "youtube-digest-learn/Videos",
    obsidianAutoSync: true,
  });
});

test("Merriam-Webster BYOK values are trimmed and default to empty", () => {
  const configured = settings.normalize({
    merriamWebsterLearnersKey: "  learner-key  ",
    merriamWebsterCollegiateKey: "  collegiate-key  ",
  });
  assert.equal(configured.merriamWebsterLearnersKey, "learner-key");
  assert.equal(configured.merriamWebsterCollegiateKey, "collegiate-key");
  assert.equal(settings.normalize({}).merriamWebsterLearnersKey, "");
});

test("Obsidian sync accepts only a loopback Local REST API", () => {
  const configured = settings.normalize({
    obsidianSyncEnabled: true,
    obsidianApiBaseUrl: " http://localhost:27123/ ",
    obsidianApiKey: " local-secret ",
    obsidianVocabularyPath: " Learning/Vocabulary.md ",
    obsidianVideoFolder: " Learning/Videos ",
    obsidianAutoSync: false,
  });
  assert.equal(configured.obsidianSyncEnabled, true);
  assert.equal(configured.obsidianApiBaseUrl, "http://localhost:27123");
  assert.equal(configured.obsidianApiKey, "local-secret");
  assert.equal(configured.obsidianVocabularyPath, "Learning/Vocabulary.md");
  assert.equal(configured.obsidianVideoFolder, "Learning/Videos");
  assert.equal(configured.obsidianAutoSync, false);
  assert.equal(settings.isValidObsidianBaseUrl("https://127.0.0.1:27124"), true);
  assert.equal(settings.isValidObsidianBaseUrl("http://192.168.1.2:27123"), false);
  assert.equal(settings.isValidObsidianBaseUrl("https://example.com"), false);
  assert.equal(settings.isValidObsidianFolder("Learning/Videos"), true);
  assert.equal(settings.isValidObsidianFolder("../Videos"), false);
});

test("Supadata receives a canonical YouTube URL", () => {
  assert.equal(
    settings.canonicalYouTubeUrl("ydTeb_I0b94"),
    "https://www.youtube.com/watch?v=ydTeb_I0b94",
  );
  assert.throws(
    () => settings.canonicalYouTubeUrl('\"><script>'),
    /Invalid YouTube video ID/,
  );
});
