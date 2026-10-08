const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const options = require("../options.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function createLocalStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("Settings copy covers English and Simplified Chinese", () => {
  assert.equal(options.translate("en", "pageTitle"), "youtube-digest-learn Settings");
  assert.equal(options.translate("zh-CN", "pageTitle"), "youtube-digest-learn 设置");
  assert.equal(options.translate("en", "saveSettings"), "Save settings");
  assert.equal(options.translate("zh-CN", "saveSettings"), "保存设置");
  assert.equal(
    options.translate("zh-CN", "clearedDigests", { count: 2 }),
    "已清除 2 条缓存摘要。",
  );

  assert.deepEqual(
    Object.keys(options.COPY.en).sort(),
    Object.keys(options.COPY["zh-CN"]).sort(),
  );

  const html = read("options.html");
  const referencedKeys = [
    ...html.matchAll(/data-i18n(?:-html|-aria-label)?="([^"]+)"/g),
  ].map((match) => match[1]);
  for (const key of referencedKeys) {
    assert.ok(options.COPY.en[key], `Missing English copy for ${key}`);
    assert.ok(options.COPY["zh-CN"][key], `Missing Chinese copy for ${key}`);
  }
  assert.doesNotMatch(JSON.stringify(options.COPY), /—/);
  assert.doesNotMatch(html, /—/);
});

test("language preference persists through extension-compatible storage", async () => {
  const storedValues = {};
  const chromeApi = {
    storage: {
      local: {
        async get(key) {
          return Object.hasOwn(storedValues, key)
            ? { [key]: storedValues[key] }
            : {};
        },
        async set(items) {
          Object.assign(storedValues, items);
        },
        async remove() {},
        async clear() {},
      },
    },
  };
  const storage = options.createStorageAdapter(chromeApi);

  await options.persistPreferredLanguage(storage, "zh-CN");

  assert.equal(storedValues[options.LANGUAGE_STORAGE_KEY], "zh-CN");
  assert.equal(await options.readPreferredLanguage(storage), "zh-CN");
});

test("non-extension preview safely persists language in localStorage", async () => {
  const localStorage = createLocalStorage();
  const firstSession = options.createStorageAdapter(null, localStorage);

  await options.persistPreferredLanguage(firstSession, "zh-CN");

  const reopenedSession = options.createStorageAdapter(null, localStorage);
  assert.equal(await options.readPreferredLanguage(reopenedSession), "zh-CN");
  assert.equal(options.normalizeLanguage("unsupported"), "en");
});

test("language controls expose a labelled group and one pressed button", () => {
  const html = read("options.html");
  assert.match(
    html,
    /class="language-switch"[\s\S]*role="group"[\s\S]*aria-label="Interface language"/,
  );
  assert.match(
    html,
    /data-language="en"[\s\S]*aria-pressed="true"[\s\S]*English/,
  );
  assert.match(
    html,
    /data-language="zh-CN"[\s\S]*aria-pressed="false"[\s\S]*中文/,
  );

  const buttons = ["en", "zh-CN"].map((language) => ({
    dataset: { language },
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  }));
  options.updateLanguageButtonState(buttons, "zh-CN");

  assert.equal(buttons[0].attributes["aria-pressed"], "false");
  assert.equal(buttons[1].attributes["aria-pressed"], "true");
});

test("settings expose custom OpenAI-compatible backend fields", () => {
  const html = read("options.html");
  assert.match(html, /placeholder="Paste your Supadata key"/);
  assert.match(html, /placeholder="Paste the key for this backend"/);
  assert.match(html, /https:\/\/dash\.supadata\.ai\/auth\/sign-up/);
  assert.match(html, /https:\/\/platform\.deepseek\.com\/api_keys/);
  for (const id of ["provider", "aiBaseUrl", "aiModel", "aiApiKey"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /OpenAI-compatible Chat Completions/);
  assert.doesNotMatch(html, /id="customizationPrompt"/);
});

test("custom backend permission requests are scoped to one origin", async () => {
  const calls = [];
  const chromeApi = {
    permissions: {
      async contains(request) {
        calls.push(["contains", request]);
        return false;
      },
      async request(request) {
        calls.push(["request", request]);
        return true;
      },
    },
  };

  assert.equal(
    await options.requestOriginPermission(chromeApi, "https://api.example.com/*"),
    true,
  );
  assert.deepEqual(calls, [
    ["contains", { origins: ["https://api.example.com/*"] }],
    ["request", { origins: ["https://api.example.com/*"] }],
  ]);
});
