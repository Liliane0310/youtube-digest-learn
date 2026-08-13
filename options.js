const YTD_OPTIONS = (() => {
  const LANGUAGE_STORAGE_KEY = "ytd_options_language";
  const PREVIEW_STORAGE_PREFIX = "youtubeDigestPreview:";
  const SUPPORTED_LANGUAGES = new Set(["en", "zh-CN"]);

  const COPY = {
    en: {
      pageTitle: "youtube-digest-learn Settings",
      languageGroupLabel: "Interface language",
      heading: "Bring your own API keys",
      lede:
        "Keys stay in this Chrome profile and are sent only to Supadata, Merriam-Webster, the AI backend you configure, or your local Obsidian API. This open-source extension has no developer server or analytics.",
      transcriptProvider: "Transcript provider",
      supadataApiKeyLabel: "Supadata API key",
      supadataHelp: "Used to fetch timestamped YouTube subtitles. ",
      supadataLink: "Create a Supadata account and key",
      supadataHelpSuffix:
        ". Supadata generates the key during onboarding.",
      dictionaryProvider: "English dictionary",
      dictionaryProviderHelp:
        "Add your own Merriam-Webster keys. They stay in this Chrome profile and are sent only to Merriam-Webster when you look up a word.",
      learnersKeyLabel: "Learner's Dictionary API key",
      learnersKeyHelp:
        "Primary source for learner-friendly definitions, examples, IPA, and pronunciation audio.",
      collegiateKeyLabel: "Collegiate Dictionary API key",
      collegiateKeyHelp:
        "Optional fallback for technical and less common vocabulary. ",
      merriamWebsterKeysLink: "Open Merriam-Webster My Keys",
      dictionaryCacheNote:
        "Dictionary results and AI context explanations are cached locally. Up to six recurring words from each video may be warmed in the background to make later lookups instant.",
      obsidianSyncTitle: "Obsidian sync",
      obsidianSyncHelp:
        "Sync favorite words, timestamped video notes, and bilingual transcripts through Obsidian's Local REST API with MCP community plugin.",
      obsidianEnableLabel: "Enable Obsidian sync",
      obsidianUrlLabel: "Local REST API address",
      obsidianFolderLabel: "Vocabulary Markdown file",
      obsidianVideoFolderLabel: "Video notes folder",
      obsidianApiKeyLabel: "Local REST API key",
      obsidianApiKeyHelp:
        "Stored only in this Chrome profile and sent only to the loopback address above.",
      obsidianAutoSyncLabel:
        "Automatically sync saved words",
      testObsidian: "Test connection",
      syncVocabulary: "Sync all favorites",
      obsidianManagedNoteHelp:
        "Vocabulary, video notes, and transcripts use separate managed blocks. Your text outside those blocks is preserved.",
      aiProvider: "AI provider",
      openAiCompatibleHelp:
        "Use DeepSeek by default, or connect any backend that implements OpenAI-compatible Chat Completions.",
      providerNameLabel: "Provider name",
      modelLabel: "Model",
      baseUrlLabel: "Base URL",
      baseUrlHelp:
        "The extension appends /chat/completions. A full Chat Completions endpoint is also accepted.",
      aiApiKeyLabel: "AI API key",
      aiApiKeyHelp:
        "Used for overviews, explanations, translation, and note polishing. ",
      providerSummaryLabel: "Supported AI provider",
      providerBadge: "Supported in this version",
      deepseekApiKeyLabel: "DeepSeek API key",
      showSecret: "Show API key",
      hideSecret: "Hide API key",
      deepseekHelp:
        "youtube-digest-learn uses DeepSeek V4 Flash for overviews, explanations, translation, and note polishing. ",
      deepseekLink: "Create a DeepSeek API key",
      deepseekHelpSuffix: ".",
      privacyNote:
        "The configured AI backend receives the video transcript and relevant video context. Chrome will ask for access to a custom backend's origin when you save.",
      saveSettings: "Save settings",
      localData: "Local data",
      localDataHelp:
        "Digests, translations, dictionary results, favorite words, word-context explanations, and notes are stored only in this Chrome profile. You can remove them at any time.",
      clearCache: "Clear cached digests",
      clearDictionaryCache: "Clear dictionary cache",
      deleteNotes: "Delete all notes",
      resetData: "Reset extension data",
      footer:
        'Read <a href="PRIVACY.md" target="_blank">PRIVACY.md</a> in the repository for the complete data-flow description.',
      saving: "Saving…",
      addSupadataKey: "Add a Supadata API key.",
      addDeepseekKey: "Add an API key for the AI backend.",
      addProviderName: "Add a provider name.",
      addModel: "Add a model name.",
      invalidBaseUrl: "Enter a valid HTTP or HTTPS Base URL without credentials, a query, or a fragment.",
      permissionDenied:
        "Chrome needs access to this backend origin. Save again and approve the permission request.",
      saved: "Saved. Reopen youtube-digest-learn to use these settings.",
      invalidObsidianUrl:
        "Use a local address such as http://127.0.0.1:27123.",
      addObsidianKey: "Add the Obsidian Local REST API key.",
      addObsidianFolder: "Choose an Obsidian Markdown path ending in .md.",
      invalidObsidianVideoFolder: "Choose a valid Obsidian folder for video notes.",
      testingObsidian: "Testing Obsidian connection…",
      obsidianConnected: ({ service }) => `Connected to ${service}.`,
      obsidianConnectionFailed: ({ error }) => `Connection failed: ${error}`,
      syncingVocabulary: "Syncing saved vocabulary…",
      vocabularySynced: ({ count }) => `Synced ${count} favorite word${count === 1 ? "" : "s"}.`,
      vocabularySyncFailed: ({ synced, failed }) =>
        `Synced ${synced}; ${failed} failed. Check the connection and conflicting notes.`,
      saveFailed: "Could not save settings. Please try again.",
      clearedDigests: ({ count }) =>
        `Cleared ${count} cached digest${count === 1 ? "" : "s"}.`,
      clearedDictionaryCache: "Cleared dictionary and word-context caches.",
      notesDeleted: "Deleted all saved notes.",
      resetConfirm:
        "Delete API keys, cached digests, translations, dictionary results, favorite words, word-context explanations, and saved notes from this Chrome profile? This does not delete the Obsidian Markdown file.",
      allDataDeleted: "All youtube-digest-learn data was deleted.",
      settingsLoadFailed:
        "Could not load saved settings. You can still preview this page.",
    },
    "zh-CN": {
      pageTitle: "youtube-digest-learn 设置",
      languageGroupLabel: "界面语言",
      heading: "使用你自己的 API 密钥",
      lede:
        "密钥仅保存在当前 Chrome 个人资料中，只会发送给 Supadata、Merriam-Webster、你配置的 AI 后端或本机 Obsidian API。本开源扩展没有开发者服务器，也不使用分析服务。",
      transcriptProvider: "字幕服务",
      supadataApiKeyLabel: "Supadata API 密钥",
      supadataHelp: "用于获取带时间戳的 YouTube 字幕。",
      supadataLink: "创建 Supadata 账号并获取密钥",
      supadataHelpSuffix: "。Supadata 会在引导流程中生成密钥。",
      dictionaryProvider: "英语词典",
      dictionaryProviderHelp:
        "填写你自己的 Merriam-Webster 密钥。密钥只保存在当前 Chrome 个人资料中，查词时仅发送给 Merriam-Webster。",
      learnersKeyLabel: "Learner's Dictionary API 密钥",
      learnersKeyHelp:
        "主词典，用于获取适合学习者的释义、例句、音标和发音。",
      collegiateKeyLabel: "Collegiate Dictionary API 密钥",
      collegiateKeyHelp: "可选的补充词典，用于技术词汇和较少见的词汇。",
      merriamWebsterKeysLink: "打开 Merriam-Webster My Keys",
      dictionaryCacheNote:
        "词典结果和 AI 语境解释都会缓存在本地。每个视频最多会在后台预热六个重复出现的单词，让之后的查询更快。",
      obsidianSyncTitle: "Obsidian 同步",
      obsidianSyncHelp:
        "通过 Local REST API with MCP 社区插件同步收藏单词、带时间戳的视频笔记和中英双语逐字稿。",
      obsidianEnableLabel: "启用 Obsidian 同步",
      obsidianUrlLabel: "Local REST API 地址",
      obsidianFolderLabel: "生词本 Markdown 文件",
      obsidianVideoFolderLabel: "视频笔记文件夹",
      obsidianApiKeyLabel: "Local REST API 密钥",
      obsidianApiKeyHelp:
        "密钥只保存在当前 Chrome 个人资料中，并且只发送给上方填写的本机回环地址。",
      obsidianAutoSyncLabel: "自动同步收藏单词",
      testObsidian: "测试连接",
      syncVocabulary: "同步全部收藏",
      obsidianManagedNoteHelp:
        "生词、视频笔记和逐字稿分别使用独立受管区块，区块外的手写内容会保留。",
      aiProvider: "AI 服务",
      openAiCompatibleHelp:
        "默认使用 DeepSeek，也可以连接任何兼容 OpenAI Chat Completions 协议的后端。",
      providerNameLabel: "服务名称",
      modelLabel: "模型",
      baseUrlLabel: "Base URL",
      baseUrlHelp:
        "扩展会自动添加 /chat/completions，也支持直接填写完整的 Chat Completions 地址。",
      aiApiKeyLabel: "AI API 密钥",
      aiApiKeyHelp:
        "用于生成概览、解释、翻译和润色笔记。",
      providerSummaryLabel: "支持的 AI 服务",
      providerBadge: "当前版本支持",
      deepseekApiKeyLabel: "DeepSeek API 密钥",
      showSecret: "显示 API 密钥",
      hideSecret: "隐藏 API 密钥",
      deepseekHelp:
        "youtube-digest-learn 使用 DeepSeek V4 Flash 生成概览、解释内容、翻译字幕和润色笔记。",
      deepseekLink: "创建 DeepSeek API 密钥",
      deepseekHelpSuffix: "。",
      privacyNote:
        "你配置的 AI 后端会收到视频字幕及相关视频上下文。保存自定义后端时，Chrome 会请求访问该后端域名。",
      saveSettings: "保存设置",
      localData: "本地数据",
      localDataHelp:
        "摘要、翻译、词典结果、收藏生词、单词语境解释和笔记仅保存在当前 Chrome 个人资料中。你可以随时删除。",
      clearCache: "清除缓存的摘要",
      clearDictionaryCache: "清除词典缓存",
      deleteNotes: "删除全部笔记",
      resetData: "重置扩展数据",
      footer:
        '完整数据流说明请参阅仓库中的 <a href="PRIVACY.md" target="_blank">PRIVACY.md</a>。',
      saving: "正在保存…",
      addSupadataKey: "请添加 Supadata API 密钥。",
      addDeepseekKey: "请添加 AI 后端的 API 密钥。",
      addProviderName: "请填写服务名称。",
      addModel: "请填写模型名称。",
      invalidBaseUrl: "请输入有效的 HTTP 或 HTTPS Base URL，且不要包含账号密码、查询参数或片段。",
      permissionDenied: "Chrome 需要访问这个后端域名。请再次保存并允许权限请求。",
      saved: "已保存。请重新打开 youtube-digest-learn 以使用这些设置。",
      invalidObsidianUrl: "请使用本机地址，例如 http://127.0.0.1:27123。",
      addObsidianKey: "请填写 Obsidian Local REST API 密钥。",
      addObsidianFolder: "请填写以 .md 结尾的 Obsidian 生词本路径。",
      invalidObsidianVideoFolder: "请填写有效的 Obsidian 视频笔记文件夹。",
      testingObsidian: "正在测试 Obsidian 连接…",
      obsidianConnected: ({ service }) => `已连接到 ${service}。`,
      obsidianConnectionFailed: ({ error }) => `连接失败：${error}`,
      syncingVocabulary: "正在同步收藏的生词…",
      vocabularySynced: ({ count }) => `已同步 ${count} 个收藏单词。`,
      vocabularySyncFailed: ({ synced, failed }) =>
        `已同步 ${synced} 个，${failed} 个失败。请检查连接或同名冲突笔记。`,
      saveFailed: "无法保存设置，请重试。",
      clearedDigests: ({ count }) => `已清除 ${count} 条缓存摘要。`,
      clearedDictionaryCache: "已清除词典、预热记录和单词语境缓存。",
      notesDeleted: "已删除全部已保存的笔记。",
      resetConfirm:
        "要从当前 Chrome 个人资料中删除 API 密钥、缓存摘要、翻译、词典结果、收藏生词、单词语境解释和已保存的笔记吗？这不会删除 Obsidian 中的 Markdown 文件。",
      allDataDeleted: "已删除全部 youtube-digest-learn 数据。",
      settingsLoadFailed: "无法加载已保存的设置，但你仍可预览此页面。",
    },
  };

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.has(language) ? language : "en";
  }

  function translate(language, key, params = {}) {
    const normalizedLanguage = normalizeLanguage(language);
    const value = COPY[normalizedLanguage][key] ?? COPY.en[key] ?? "";
    return typeof value === "function" ? value(params) : value;
  }

  function createStorageAdapter(chromeApi, fallbackStorage) {
    const chromeStorage = chromeApi?.storage?.local;
    const memoryStorage = new Map();

    function fallbackKeys() {
      const keys = [];
      if (!fallbackStorage) return keys;
      try {
        for (let index = 0; index < fallbackStorage.length; index += 1) {
          const key = fallbackStorage.key(index);
          if (key?.startsWith(PREVIEW_STORAGE_PREFIX)) keys.push(key);
        }
      } catch (_error) {
        return [];
      }
      return keys;
    }

    function readFallbackValue(key) {
      try {
        const rawValue = fallbackStorage?.getItem(
          `${PREVIEW_STORAGE_PREFIX}${key}`,
        );
        if (rawValue !== null && rawValue !== undefined) {
          return JSON.parse(rawValue);
        }
      } catch (_error) {
        // Fall through to memory when localStorage is unavailable or malformed.
      }
      return memoryStorage.get(key);
    }

    function writeFallbackValue(key, value) {
      memoryStorage.set(key, value);
      try {
        fallbackStorage?.setItem(
          `${PREVIEW_STORAGE_PREFIX}${key}`,
          JSON.stringify(value),
        );
      } catch (_error) {
        // The in-memory copy keeps a restricted preview functional.
      }
    }

    return {
      async get(keys) {
        if (chromeStorage) return chromeStorage.get(keys);

        const requestedKeys =
          keys === null
            ? [
                ...new Set([
                  ...memoryStorage.keys(),
                  ...fallbackKeys().map((key) =>
                    key.slice(PREVIEW_STORAGE_PREFIX.length),
                  ),
                ]),
              ]
            : Array.isArray(keys)
              ? keys
              : [keys];

        return Object.fromEntries(
          requestedKeys
            .map((key) => [key, readFallbackValue(key)])
            .filter(([, value]) => value !== undefined),
        );
      },

      async set(items) {
        if (chromeStorage) return chromeStorage.set(items);
        for (const [key, value] of Object.entries(items)) {
          writeFallbackValue(key, value);
        }
      },

      async remove(keys) {
        if (chromeStorage) return chromeStorage.remove(keys);
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          memoryStorage.delete(key);
          try {
            fallbackStorage?.removeItem(`${PREVIEW_STORAGE_PREFIX}${key}`);
          } catch (_error) {
            // Memory removal is sufficient for this preview session.
          }
        }
      },

      async clear() {
        if (chromeStorage) return chromeStorage.clear();
        memoryStorage.clear();
        for (const key of fallbackKeys()) {
          try {
            fallbackStorage.removeItem(key);
          } catch (_error) {
            // Continue clearing any remaining preview keys.
          }
        }
      },
    };
  }

  async function readPreferredLanguage(storage) {
    const stored = await storage.get(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(stored[LANGUAGE_STORAGE_KEY]);
  }

  async function persistPreferredLanguage(storage, language) {
    const normalizedLanguage = normalizeLanguage(language);
    await storage.set({ [LANGUAGE_STORAGE_KEY]: normalizedLanguage });
    return normalizedLanguage;
  }

  function updateLanguageButtonState(buttons, language) {
    const normalizedLanguage = normalizeLanguage(language);
    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === normalizedLanguage),
      );
    }
  }

  async function requestOriginPermission(chromeApi, origin) {
    const permissions = chromeApi?.permissions;
    if (!permissions?.request) return true;
    const request = { origins: [origin] };
    if (permissions.contains && (await permissions.contains(request))) {
      return true;
    }
    return permissions.request(request);
  }

  function getSafeLocalStorage(root) {
    try {
      return root.localStorage;
    } catch (_error) {
      return null;
    }
  }

  function initialize(root = globalThis) {
    const doc = root.document;
    const settingsApi = root.YTD_SETTINGS;
    if (!doc || !settingsApi) return;

    const storage = createStorageAdapter(
      root.chrome,
      getSafeLocalStorage(root),
    );
    const form = doc.getElementById("settingsForm");
    const providerInput = doc.getElementById("provider");
    const aiBaseUrlInput = doc.getElementById("aiBaseUrl");
    const aiModelInput = doc.getElementById("aiModel");
    const aiApiKeyInput = doc.getElementById("aiApiKey");
    const supadataApiKeyInput = doc.getElementById("supadataApiKey");
    const merriamWebsterLearnersKeyInput = doc.getElementById(
      "merriamWebsterLearnersKey",
    );
    const merriamWebsterCollegiateKeyInput = doc.getElementById(
      "merriamWebsterCollegiateKey",
    );
    const obsidianSyncEnabledInput = doc.getElementById(
      "obsidianSyncEnabled",
    );
    const obsidianApiBaseUrlInput = doc.getElementById(
      "obsidianApiBaseUrl",
    );
    const obsidianApiKeyInput = doc.getElementById("obsidianApiKey");
    const obsidianVocabularyPathInput = doc.getElementById(
      "obsidianVocabularyPath",
    );
    const obsidianVideoFolderInput = doc.getElementById("obsidianVideoFolder");
    const obsidianAutoSyncInput = doc.getElementById("obsidianAutoSync");
    const saveStatus = doc.getElementById("saveStatus");
    const dataStatus = doc.getElementById("dataStatus");
    const obsidianStatus = doc.getElementById("obsidianStatus");
    const languageButtons = [...doc.querySelectorAll("[data-language]")];
    const statusStates = new Map();
    let currentLanguage = "en";

    const eyeOpenSvg = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path>
        <circle cx="12" cy="12" r="2.75"></circle>
      </svg>`;
    const eyeClosedSvg = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 3l18 18"></path>
        <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15.6 15.6 0 0 1-2.1 2.8"></path>
        <path d="M6.2 6.3C3.8 8 2.5 12 2.5 12s3.4 6 9.5 6a9.7 9.7 0 0 0 3.3-.6"></path>
      </svg>`;

    function updateSecretToggle(button, input, visible) {
      input.type = visible ? "text" : "password";
      button.setAttribute("aria-pressed", String(visible));
      const label = translate(
        currentLanguage,
        visible ? "hideSecret" : "showSecret",
      );
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML = visible ? eyeClosedSvg : eyeOpenSvg;
    }

    for (const button of doc.querySelectorAll("[data-secret-toggle]")) {
      const input = doc.getElementById(button.dataset.secretToggle);
      if (!input) continue;
      updateSecretToggle(button, input, false);
      button.addEventListener("click", () => {
        updateSecretToggle(button, input, input.type === "password");
        input.focus();
      });
    }

    function renderStatus(element) {
      const state = statusStates.get(element);
      element.textContent = state
        ? translate(currentLanguage, state.key, state.params)
        : "";
    }

    function setStatus(element, key, params = {}) {
      statusStates.set(element, { key, params });
      renderStatus(element);
    }

    function applyLanguage(language) {
      currentLanguage = normalizeLanguage(language);
      doc.documentElement.lang = currentLanguage;
      doc.title = translate(currentLanguage, "pageTitle");

      for (const element of doc.querySelectorAll("[data-i18n]")) {
        element.textContent = translate(
          currentLanguage,
          element.dataset.i18n,
        );
      }
      for (const element of doc.querySelectorAll("[data-i18n-html]")) {
        element.innerHTML = translate(
          currentLanguage,
          element.dataset.i18nHtml,
        );
      }
      for (const element of doc.querySelectorAll("[data-i18n-aria-label]")) {
        element.setAttribute(
          "aria-label",
          translate(currentLanguage, element.dataset.i18nAriaLabel),
        );
      }
      for (const button of doc.querySelectorAll("[data-secret-toggle]")) {
        const input = doc.getElementById(button.dataset.secretToggle);
        if (input) updateSecretToggle(button, input, input.type === "text");
      }

      updateLanguageButtonState(languageButtons, currentLanguage);
      for (const element of statusStates.keys()) renderStatus(element);
    }

    async function loadSettings() {
      try {
        const stored = await storage.get(settingsApi.STORAGE_KEY);
        const settings = settingsApi.normalize(stored[settingsApi.STORAGE_KEY]);

        providerInput.value = settings.provider;
        aiBaseUrlInput.value = settings.aiBaseUrl;
        aiModelInput.value = settings.aiModel;
        aiApiKeyInput.value = settings.aiApiKey;
        supadataApiKeyInput.value = settings.supadataApiKey;
        merriamWebsterLearnersKeyInput.value =
          settings.merriamWebsterLearnersKey;
        merriamWebsterCollegiateKeyInput.value =
          settings.merriamWebsterCollegiateKey;
        obsidianSyncEnabledInput.checked = settings.obsidianSyncEnabled;
        obsidianApiBaseUrlInput.value = settings.obsidianApiBaseUrl;
        obsidianApiKeyInput.value = settings.obsidianApiKey;
        obsidianVocabularyPathInput.value = settings.obsidianVocabularyPath;
        obsidianVideoFolderInput.value = settings.obsidianVideoFolder;
        obsidianAutoSyncInput.checked = settings.obsidianAutoSync;
      } catch (_error) {
        setStatus(saveStatus, "settingsLoadFailed");
      }
    }

    async function loadOptions() {
      try {
        applyLanguage(await readPreferredLanguage(storage));
      } catch (_error) {
        applyLanguage("en");
      }
      await loadSettings();
    }

    async function saveSettings(event) {
      event.preventDefault();
      setStatus(saveStatus, "saving");

      if (!providerInput.value.trim()) {
        setStatus(saveStatus, "addProviderName");
        return;
      }
      if (!settingsApi.isValidBaseUrl(aiBaseUrlInput.value)) {
        setStatus(saveStatus, "invalidBaseUrl");
        return;
      }
      if (!aiModelInput.value.trim()) {
        setStatus(saveStatus, "addModel");
        return;
      }
      if (
        obsidianSyncEnabledInput.checked &&
        !settingsApi.isValidObsidianBaseUrl(obsidianApiBaseUrlInput.value)
      ) {
        setStatus(saveStatus, "invalidObsidianUrl");
        return;
      }
      if (
        obsidianSyncEnabledInput.checked &&
        !obsidianApiKeyInput.value.trim()
      ) {
        setStatus(saveStatus, "addObsidianKey");
        return;
      }
      if (
        obsidianSyncEnabledInput.checked &&
        !root.YTD_VOCABULARY?.normalizeNotePath(
          obsidianVocabularyPathInput.value,
        )
      ) {
        setStatus(saveStatus, "addObsidianFolder");
        return;
      }
      if (
        obsidianSyncEnabledInput.checked &&
        !settingsApi.isValidObsidianFolder(obsidianVideoFolderInput.value)
      ) {
        setStatus(saveStatus, "invalidObsidianVideoFolder");
        return;
      }

      const settings = settingsApi.normalize({
        provider: providerInput.value,
        aiBaseUrl: aiBaseUrlInput.value,
        aiModel: aiModelInput.value,
        aiApiKey: aiApiKeyInput.value,
        supadataApiKey: supadataApiKeyInput.value,
        merriamWebsterLearnersKey: merriamWebsterLearnersKeyInput.value,
        merriamWebsterCollegiateKey: merriamWebsterCollegiateKeyInput.value,
        obsidianSyncEnabled: obsidianSyncEnabledInput.checked,
        obsidianApiBaseUrl: obsidianApiBaseUrlInput.value,
        obsidianApiKey: obsidianApiKeyInput.value,
        obsidianVocabularyPath: obsidianVocabularyPathInput.value,
        obsidianVideoFolder: obsidianVideoFolderInput.value,
        obsidianAutoSync: obsidianAutoSyncInput.checked,
      });

      if (!settings.supadataApiKey) {
        setStatus(saveStatus, "addSupadataKey");
        return;
      }
      if (!settings.aiApiKey) {
        setStatus(saveStatus, "addDeepseekKey");
        return;
      }
      try {
        const granted = await requestOriginPermission(
          root.chrome,
          settingsApi.originPermission(settings.aiBaseUrl),
        );
        if (!granted) {
          setStatus(saveStatus, "permissionDenied");
          return;
        }
        if (settings.obsidianSyncEnabled) {
          const obsidianGranted = await requestOriginPermission(
            root.chrome,
            settingsApi.originPermission(settings.obsidianApiBaseUrl),
          );
          if (!obsidianGranted) {
            setStatus(saveStatus, "permissionDenied");
            return;
          }
        }
        await storage.set({ [settingsApi.STORAGE_KEY]: settings });
        setStatus(saveStatus, "saved");
      } catch (_error) {
        setStatus(saveStatus, "saveFailed");
      }
    }

    function currentObsidianConfig() {
      return settingsApi.normalize({
        obsidianSyncEnabled: obsidianSyncEnabledInput.checked,
        obsidianApiBaseUrl: obsidianApiBaseUrlInput.value,
        obsidianApiKey: obsidianApiKeyInput.value,
        obsidianVocabularyPath: obsidianVocabularyPathInput.value,
        obsidianVideoFolder: obsidianVideoFolderInput.value,
        obsidianAutoSync: obsidianAutoSyncInput.checked,
      });
    }

    async function testObsidianConnection() {
      if (!settingsApi.isValidObsidianBaseUrl(obsidianApiBaseUrlInput.value)) {
        setStatus(obsidianStatus, "invalidObsidianUrl");
        return;
      }
      if (!obsidianApiKeyInput.value.trim()) {
        setStatus(obsidianStatus, "addObsidianKey");
        return;
      }
      setStatus(obsidianStatus, "testingObsidian");
      try {
        const config = currentObsidianConfig();
        const granted = await requestOriginPermission(
          root.chrome,
          settingsApi.originPermission(config.obsidianApiBaseUrl),
        );
        if (!granted) {
          setStatus(obsidianStatus, "permissionDenied");
          return;
        }
        const result = await root.chrome.runtime.sendMessage({
          action: "testObsidianConnection",
          config,
        });
        if (result?.success) {
          setStatus(obsidianStatus, "obsidianConnected", {
            service: result.service || "Obsidian Local REST API",
          });
        } else {
          setStatus(obsidianStatus, "obsidianConnectionFailed", {
            error: result?.error || "Unknown error",
          });
        }
      } catch (error) {
        setStatus(obsidianStatus, "obsidianConnectionFailed", {
          error: error.message || "Unknown error",
        });
      }
    }

    async function syncVocabulary() {
      setStatus(obsidianStatus, "syncingVocabulary");
      try {
        const result = await root.chrome.runtime.sendMessage({
          action: "syncVocabularyToObsidian",
        });
        if (result?.success) {
          setStatus(obsidianStatus, "vocabularySynced", {
            count: result.synced || 0,
          });
        } else if (Number.isFinite(result?.failed)) {
          setStatus(obsidianStatus, "vocabularySyncFailed", {
            synced: result.synced || 0,
            failed: result.failed || 0,
          });
        } else {
          setStatus(obsidianStatus, "obsidianConnectionFailed", {
            error: result?.error || "Unknown error",
          });
        }
      } catch (error) {
        setStatus(obsidianStatus, "obsidianConnectionFailed", {
          error: error.message || "Unknown error",
        });
      }
    }

    async function clearCachedDigests() {
      const all = await storage.get(null);
      const keys = Object.keys(all).filter((key) => key.startsWith("digest_"));
      if (keys.length) await storage.remove(keys);
      setStatus(dataStatus, "clearedDigests", { count: keys.length });
    }

    async function clearDictionaryCache() {
      await storage.remove([
        "ytd_dictionary_cache_v1",
        "ytd_word_context_cache_v1",
        "ytd_dictionary_precache_v1",
      ]);
      setStatus(dataStatus, "clearedDictionaryCache");
    }

    async function clearNotes() {
      await storage.remove("ytd_notes");
      setStatus(dataStatus, "notesDeleted");
    }

    async function resetAllData() {
      const confirmed = root.confirm(
        translate(currentLanguage, "resetConfirm"),
      );
      if (!confirmed) return;

      await storage.clear();
      await persistPreferredLanguage(storage, currentLanguage);
      await loadSettings();
      setStatus(dataStatus, "allDataDeleted");
    }

    form.addEventListener("submit", saveSettings);
    doc
      .getElementById("clearCacheBtn")
      .addEventListener("click", clearCachedDigests);
    doc
      .getElementById("clearDictionaryCacheBtn")
      .addEventListener("click", clearDictionaryCache);
    doc.getElementById("clearNotesBtn").addEventListener("click", clearNotes);
    doc
      .getElementById("testObsidianBtn")
      .addEventListener("click", testObsidianConnection);
    doc
      .getElementById("syncVocabularyBtn")
      .addEventListener("click", syncVocabulary);
    doc.getElementById("resetBtn").addEventListener("click", resetAllData);
    for (const button of languageButtons) {
      button.addEventListener("click", async () => {
        const language = button.dataset.language;
        applyLanguage(language);
        await persistPreferredLanguage(storage, language);
      });
    }

    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", loadOptions, { once: true });
    } else {
      void loadOptions();
    }
  }

  return {
    COPY,
    LANGUAGE_STORAGE_KEY,
    requestOriginPermission,
    createStorageAdapter,
    normalizeLanguage,
    persistPreferredLanguage,
    readPreferredLanguage,
    translate,
    updateLanguageButtonState,
    initialize,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_OPTIONS;
}

if (typeof document !== "undefined") {
  YTD_OPTIONS.initialize();
}
