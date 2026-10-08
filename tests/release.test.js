const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("manifest uses minimized install-time permissions", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "116");
  assert.equal(packageJson.version, manifest.version);
  assert.equal(manifest.options_ui.page, "options.html");
  assert.ok(!manifest.permissions.includes("activeTab"));
  assert.ok(manifest.host_permissions.includes("https://api.deepseek.com/*"));
  assert.ok(
    manifest.host_permissions.includes("https://www.dictionaryapi.com/*"),
  );
  assert.ok(
    manifest.host_permissions.includes("https://media.merriam-webster.com/*"),
  );
  assert.deepEqual(manifest.optional_host_permissions, [
    "https://*/*",
    "http://*/*",
  ]);
  assert.equal(manifest.version, "1.2.4");
});

test("install and reload never force-open Settings", () => {
  const background = read("background.js");
  const sidepanel = read("sidepanel.js");

  assert.doesNotMatch(
    background,
    /onInstalled[\s\S]*?openOptionsPage\(/,
    "Settings should open only after an explicit user action",
  );
  assert.match(
    sidepanel,
    /chrome\.storage\?\.onChanged\?\.addListener/,
    "the side panel should recover automatically after settings are saved",
  );
  assert.match(sidepanel, /changes\[YTD_SETTINGS\.STORAGE_KEY\]/);
});

test("note surfaces use the shared custom SVG shape instead of an emoji", () => {
  const files = [read("content.js"), read("sidepanel.html"), read("sidepanel.js")];
  const notePathStart = "M553.877457 906.654335v-141.021965";

  for (const source of files) {
    assert.doesNotMatch(source, /📝/u);
    assert.match(source, new RegExp(notePathStart));
  }
  assert.match(files[0], /fill="currentColor"/);
});

test("release copy documents current scope without em dashes", () => {
  const readme = read("README.md");
  const chineseReadme = read("README.zh-CN.md");
  const manifest = JSON.parse(read("manifest.json"));
  const packageJson = JSON.parse(read("package.json"));

  assert.doesNotMatch(readme, /—/);
  assert.doesNotMatch(chineseReadme, /—/);
  assert.doesNotMatch(manifest.description, /—/);
  assert.doesNotMatch(packageJson.description, /—/);

  assert.equal(manifest.name, "youtube-digest-learn");
  assert.equal(packageJson.name, "youtube-digest-learn");
  assert.match(
    read("scripts/package-extension.sh"),
    /youtube-digest-learn-v\$version\.zip/,
  );
  assert.doesNotMatch(
    [readme, chineseReadme, read("PRIVACY.md"), read("SECURITY.md")].join("\n"),
    /\bYT Digest\b/,
  );
  assert.match(readme, /^# youtube-digest-learn$/m);
  assert.match(
    readme,
    /Turn every YouTube video into a resource for deep learning\./,
  );
  assert.doesNotMatch(readme, /before deciding how much of it to watch/i);
  assert.match(readme, /^## Install with your coding agent$/m);
  assert.match(
    readme,
    /permanent folder I choose[\s\S]*tell me its exact full path[\s\S]*If I need a suggestion during this first installation[\s\S]*`~\/Documents\/youtube-digest-learn`[\s\S]*`%USERPROFILE%\\Documents\\youtube-digest-learn`[\s\S]*do not assume either path/,
  );
  assert.match(
    readme,
    /Moving or deleting the source folder breaks the unpacked extension until you load it again from the new location\./,
  );
  assert.match(
    readme,
    /selecting the exact project folder you chose in Chrome with \*\*Load unpacked\*\*/,
  );
  assert.match(
    readme,
    /Select the exact project folder you chose, which must contain `manifest\.json`/,
  );
  assert.match(readme, /upstream issues and pull requests are not accepted/i);
  assert.doesNotMatch(readme, /^## Contributing$/m);
  assert.match(chineseReadme, /^# youtube-digest-learn$/m);
  assert.match(chineseReadme, /把每个 YouTube 视频变成一份可以深入学习的资料/);
  assert.match(chineseReadme, /^## 让你的编程 Agent 帮你安装$/m);
  assert.match(
    chineseReadme,
    /我选择的长期保留文件夹[\s\S]*告诉我准确的完整路径[\s\S]*第一次安装时需要位置建议[\s\S]*`~\/Documents\/youtube-digest-learn`[\s\S]*`%USERPROFILE%\\Documents\\youtube-digest-learn`[\s\S]*不要假设我一定使用这些路径/,
  );
  assert.match(
    chineseReadme,
    /如果移动或删除源代码文件夹，Chrome 中加载的扩展会失效，需要从新的位置重新加载。/,
  );
  assert.match(
    chineseReadme,
    /“加载已解压的扩展程序”选择你刚才确定的那个准确项目文件夹/,
  );
  assert.match(
    chineseReadme,
    /选择你刚才确定的那个准确项目文件夹，其中必须包含 `manifest\.json`/,
  );
  assert.match(chineseReadme, /不接受上游 Issue 或 Pull Request/);
  assert.match(chineseReadme, /增加更多翻译语言/);

  assert.match(readme, /100 credits per month/i);
  assert.match(readme, /native transcript request uses \*\*1 credit\*\*/i);
  assert.match(readme, /generated transcript costs \*\*2 credits per video minute\*\*/i);
  assert.match(readme, /HTTP `206` still uses \*\*1 credit\*\*/i);
  assert.match(readme, /forces `mode=native`/i);
  assert.match(readme, /roughly 100 transcript lookups per month/i);
  assert.match(readme, /supadata\.ai\/pricing/i);
  assert.match(readme, /docs\.supadata\.ai\/get-transcript/i);
  assert.match(readme, /dash\.supadata\.ai\/auth\/sign-up/i);
  assert.match(readme, /platform\.deepseek\.com\/api_keys/i);
  assert.match(readme, /api-docs\.deepseek\.com/i);
  assert.match(readme, /api-docs\.deepseek\.com\/quick_start\/pricing/i);
  assert.match(readme, /api-docs\.deepseek\.com\/quick_start\/token_usage/i);
  assert.match(readme, /api-docs\.deepseek\.com\/guides\/kv_cache/i);
  assert.match(readme, /\$0\.0028[\s\S]*\$0\.14[\s\S]*\$0\.28/);
  assert.match(readme, /2,935 spoken English words/i);
  assert.match(readme, /about 32,600 input tokens/i);
  assert.match(readme, /\$0\.002[^\n]*\$0\.006 USD/i);
  assert.match(chineseReadme, /api-docs\.deepseek\.com\/quick_start\/pricing/i);
  assert.match(chineseReadme, /api-docs\.deepseek\.com\/quick_start\/token_usage/i);
  assert.match(chineseReadme, /api-docs\.deepseek\.com\/guides\/kv_cache/i);
  assert.match(chineseReadme, /\u00a50\.02[\s\S]*\u00a51[\s\S]*\u00a52/);
  assert.match(chineseReadme, /2,935 \u4e2a\u82f1\u6587\u53e3\u8bed\u8bcd/);
  assert.match(chineseReadme, /\u7ea6 32,600 \u4e2a\u8f93\u5165 token/);
  assert.match(chineseReadme, /\$0\.002[^\n]*\$0\.006 USD/);
  assert.match(chineseReadme, /dash\.supadata\.ai\/auth\/sign-up/i);
  assert.match(chineseReadme, /platform\.deepseek\.com\/api_keys/i);
  assert.match(readme, /^### The Digest button is missing on a YouTube video$/m);
  assert.match(
    chineseReadme,
    /^### YouTube 视频页面没有显示 Digest 按钮$/m,
  );

  const optionsPage = read("options.html");
  const optionsStyles = read("options.css");
  const optionsScript = read("options.js");
  assert.match(optionsPage, /dash\.supadata\.ai\/auth\/sign-up/i);
  assert.match(optionsPage, /platform\.deepseek\.com\/api_keys/i);
  assert.doesNotMatch(optionsPage, /<select\b/i);
  assert.match(optionsPage, /id="provider"/);
  assert.match(optionsPage, /id="aiBaseUrl"/);
  assert.match(optionsPage, /id="aiModel"/);
  assert.match(optionsPage, /OpenAI-compatible Chat Completions/);
  assert.doesNotMatch(optionsPage, /id="customizationPrompt"/);
  assert.match(optionsStyles, /\.field-grid\s*\{/);
  assert.match(optionsStyles, /\.data-card\s*\{[^}]*margin-top:\s*36px;/);
  assert.match(optionsScript, /permissions\.request/);
  assert.match(optionsScript, /originPermission/);

  assert.match(readme, /^## Remix it with your coding agent$/m);
  assert.match(readme, /more translation languages/i);
  assert.match(readme, /customized summary templates/i);
  assert.match(readme, /vocabulary notebook/i);
  assert.match(readme, /switch to another OpenAI-compatible AI provider directly/i);
  assert.match(chineseReadme, /直接在 youtube-digest-learn 设置中切换到其他兼容 OpenAI 协议的 AI 服务/);

  const publishedDocs = [
    readme,
    chineseReadme,
    read("PRIVACY.md"),
    read("SECURITY.md"),
  ].join("\n");
  assert.match(publishedDocs, /OpenAI-compatible/i);
  assert.match(publishedDocs, /optional custom-origin/i);
  assert.match(readme, /DeepSeek V4 Flash remains the default configuration/i);
  assert.match(chineseReadme, /DeepSeek V4 Flash 仍是默认配置/);
});

test("notes filters preserve selected contrast and expose pressed state", () => {
  const html = read("sidepanel.html");
  const css = read("sidepanel.css");
  const js = read("sidepanel.js");

  assert.match(
    html,
    /id="notesFilterThis"[\s\S]*?aria-pressed="true"[\s\S]*?>[\s\S]*?This Video/,
  );
  assert.match(
    html,
    /id="notesFilterAll"[\s\S]*?aria-pressed="false"[\s\S]*?>[\s\S]*?All Notes/,
  );
  assert.match(
    css,
    /\.notes-filter \.enhance-btn\.active:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--accent-hover\);[^}]*color:\s*white;/,
  );
  assert.match(
    css,
    /\.notes-filter \.enhance-btn:hover:not\(:disabled\)\s*\{[^}]*background:\s*transparent;[^}]*color:\s*var\(--text-secondary\);/,
  );
  assert.match(css, /\.notes-filter \.enhance-btn:focus-visible\s*\{[^}]*outline:/);
  assert.match(js, /setNotesFilter\(false\)/);
  assert.match(js, /setNotesFilter\(true\)/);
  assert.match(js, /setAttribute\("aria-pressed", String\(!showAll\)\)/);
  assert.match(js, /setAttribute\("aria-pressed", String\(showAll\)\)/);
});

test("runtime has no source-file credential dependency or retired model", () => {
  const runtime = [
    "background.js",
    "content.js",
    "sidepanel.js",
    "options.js",
    "settings.js",
  ]
    .map(read)
    .join("\n");

  assert.doesNotMatch(runtime, /\bCONFIG\./);
  assert.doesNotMatch(runtime, /importScripts\(["']config\.js/);
  assert.doesNotMatch(runtime, /\bdeepseek-chat\b/);
  assert.match(runtime, /deepseek-v4-flash/);
});

test("retired Remix and reader files are absent", () => {
  for (const file of [
    "reader.html",
    "reader.js",
    "remix-prompts.js",
    "config.example.js",
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
  }
});

test("published prompt files contain runtime sections", () => {
  const expectedSections = {
    "prompts/analysis.md": ["System prompt", "User prompt"],
    "prompts/explain.md": ["System prompt", "User prompt"],
    "prompts/note-cleanup.md": ["System prompt", "User prompt"],
    "prompts/translation.md": [
      "Shared base rules",
      "Chinese rules",
      "Transcript batch translation",
    ],
    "prompts/word-context.md": ["System prompt", "User prompt"],
  };

  for (const [file, sections] of Object.entries(expectedSections)) {
    const markdown = read(file);
    for (const section of sections) {
      assert.match(markdown, new RegExp(`^## ${section}$`, "m"));
    }
  }
});
