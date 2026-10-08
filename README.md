# youtube-digest-learn

[English](README.md) | [简体中文](README.zh-CN.md)

Turn every YouTube video into a resource for deep learning. youtube-digest-learn brings transcripts, bilingual translation, AI overviews, explanations, and timestamped notes into one Chrome side panel, so you can study ideas and language without losing your place.

- Turn captions into a readable, searchable learning resource.
- Learn languages with the original transcript, a Simplified Chinese translation, or an aligned bilingual view.
- Select one English word to see Merriam-Webster definitions, pronunciation,
  examples, and an AI explanation of its meaning in that subtitle sentence.
- Favorite useful words in a local vocabulary list and optionally sync all of
  them into one managed Obsidian Markdown note.
- Build understanding with an AI overview, chapters, key quotes, and selected-text explanations.
- Navigate long videos by clicking timestamps in the transcript, overview, or notes.
- Save polished timestamped notes for later study.
- Keep control of your data with your own API keys, local Chrome storage, and no analytics or telemetry.

youtube-digest-learn is a bring-your-own-key project installed locally from GitHub. It is not available through the Chrome Web Store, does not include API credits, and does not run a developer-operated server.

## Install with your coding agent

You do not need to understand the code or use the command line. Send this message to your coding agent:

> Download or clone this project into a permanent folder I choose, tell me its exact full path, and use that same folder for Chrome's Load unpacked step. If I need a suggestion during this first installation, offer `~/Documents/youtube-digest-learn` on macOS or Linux, or `%USERPROFILE%\Documents\youtube-digest-learn` on Windows, but do not assume either path. Walk me through installation and setup in simple terms. https://github.com/zarazhangrui/youtube-digest

Your agent should:

1. Ask where you want to keep the project, download or clone it there, and tell you the exact full path. If you want a suggestion, it can offer `~/Documents/youtube-digest-learn` on macOS or Linux, or `%USERPROFILE%\Documents\youtube-digest-learn` on Windows.
2. Open the official Supadata and DeepSeek pages below and help you create your own accounts.
3. Walk you through selecting the exact project folder you chose in Chrome with **Load unpacked**.
4. Show you where to enter your API keys in the extension's **Settings** page.
5. Open a YouTube video with captions and confirm the transcript and translation work.

Keep this folder in the same place after installation. If you move or delete it, Chrome's unpacked extension stops working until you load the extension again from its new permanent folder.

Never paste an API key into an AI chat, source file, screenshot, or public message. Enter keys yourself, directly in the youtube-digest-learn Settings page. Your coding agent can point to the correct field without seeing the key.

## Install manually

If you prefer to do it yourself:

1. Open [github.com/zarazhangrui/youtube-digest](https://github.com/zarazhangrui/youtube-digest).
2. Choose **Code**, then **Download ZIP**.
3. Choose a permanent folder and unzip the project there. Optional suggestions are `~/Documents/youtube-digest-learn` on macOS or Linux, or `%USERPROFILE%\Documents\youtube-digest-learn` on Windows. You may use a different folder.
4. In Chrome, open `chrome://extensions`.
5. Turn on **Developer mode**.
6. Click **Load unpacked**.
7. Select the exact project folder you chose, which must contain `manifest.json`.
8. Pin youtube-digest-learn from Chrome's Extensions menu if you want quick access.

Because this is an unpacked extension, it does not update automatically. After downloading an update or changing local files, click **Reload** on the youtube-digest-learn card at `chrome://extensions`, then refresh open YouTube tabs. Moving or deleting the source folder breaks the unpacked extension until you load it again from the new location.

## Set up your API keys

youtube-digest-learn needs two keys under your own provider accounts, plus an optional
Merriam-Webster key for English word lookup:

1. A **Supadata API key** to retrieve YouTube transcripts.
2. A **DeepSeek API key** for overviews, explanations, translation, and automatic note polishing.
3. A **Merriam-Webster Learner's Dictionary API key** for learner-friendly
   definitions, examples, and pronunciation. A Collegiate Dictionary key can be
   added as an optional fallback.

### Get a Supadata API key

1. Open the official [Supadata sign-up page](https://dash.supadata.ai/auth/sign-up).
2. Create an account and complete the short onboarding flow.
3. Supadata generates an API key automatically during onboarding.
4. Open the [Supadata dashboard](https://dash.supadata.ai/) whenever you need to find or manage the key.
5. Copy the key and paste it into **Supadata API key** in youtube-digest-learn Settings.

See the [official Supadata documentation](https://docs.supadata.ai/) if the dashboard flow changes.

### Get a DeepSeek API key

1. Open the official [DeepSeek API Keys page](https://platform.deepseek.com/api_keys).
2. Sign in or create a DeepSeek Platform account when prompted.
3. Choose **Create new API key**, give it a recognizable name such as `youtube-digest-learn`, and create it.
4. Copy the key immediately. The full key may only be shown once.
5. Paste it into **AI API key** in youtube-digest-learn Settings.
6. If DeepSeek reports insufficient balance, add credit in your DeepSeek Platform account and try again.

See the [official DeepSeek API documentation](https://api-docs.deepseek.com/) for current account and API details.

### Get Merriam-Webster API keys for word lookup

1. Open the official [Merriam-Webster Dictionary API registration page](https://www.dictionaryapi.com/register/index).
2. Register for a Learner's Dictionary key. If you selected a second product,
   use the Collegiate Dictionary as the optional fallback.
3. Find the keys on [Merriam-Webster My Keys](https://www.dictionaryapi.com/my-keys).
4. Paste them into the matching fields in youtube-digest-learn Settings. The extension
   never contains a shared developer key.

Open **Settings** from the side panel. You can also open the youtube-digest-learn **Options** page from its card at `chrome://extensions` or by right-clicking its toolbar icon. Paste keys only into these Settings fields. Never paste a key into an AI chat, repository file, screenshot, or public message.

DeepSeek V4 Flash remains the default configuration:

```text
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash
```

To use another OpenAI-compatible backend, enter its provider name, Base URL, model, and API key in Settings. The extension calls the Chat Completions endpoint and accepts either a Base URL such as `https://api.example.com/v1` or a full URL ending in `/chat/completions`. Chrome asks for access only to the custom origin you save. youtube-digest-learn sends DeepSeek requests in non-thinking mode; that provider-specific field is never sent to other backends.

Keys and settings are stored in Chrome's local extension storage on your device. Release builds do not include or use `config.js`.

### Optional: connect learning data to Obsidian

1. In Obsidian, install and enable the `Local REST API with MCP` community plugin.
2. Enable its non-encrypted HTTP server and copy its API key.
3. In youtube-digest-learn Settings, enable **Obsidian sync**.
4. Keep the default address `http://127.0.0.1:27123`, or enter the loopback
   address shown by the Obsidian plugin.
5. Choose a vocabulary Markdown path and a video-notes folder, paste the local
   API key, save, and use **Test connection**.

Favorites are written into one managed vocabulary file. Each video gets one
Markdown document with separate managed blocks for timestamped notes and the
transcript. Notes sync automatically; use **Sync Obsidian** in the Transcript tab
to prepare and write a bilingual transcript. Text outside managed blocks is preserved.

## Use youtube-digest-learn

1. Open a standard YouTube watch page with captions.
2. Click the youtube-digest-learn extension icon to open the side panel.
3. Read the timestamped transcript, or choose **Original**, **中文**, or **双语**.
4. Open **Overview** when you want AI-generated chapters and key quotes.
5. Select transcript text when you want an AI explanation.
6. Select one English word and choose **查词** for its dictionary entry and
   Chinese in-context meaning.
7. Use the star in the dictionary card to save it, then revisit it from **生词**.
8. Save a note from the player or a key quote, then revisit it from **Notes**.

## What works today

- Google Chrome 116 or newer, using the Side Panel API.
- Standard `youtube.com/watch` video pages.
- Native subtitle tracks returned by Supadata. youtube-digest-learn prefers English when available, but may show another native language.
- Original, Simplified Chinese, and aligned bilingual transcript views.
- AI overviews, selected-text explanations, translation, and automatic note polishing.
- BYOK Merriam-Webster word lookup with local result caching, per-video warming
  for up to six recurring words, and AI context caching by word plus sentence.
- A local favorite-word list with optional single-file Obsidian synchronization.
- Local timestamped notes and manually triggered bilingual transcript sync to one
  managed Obsidian Markdown document per video.
- DeepSeek V4 Flash for all published AI features. Other providers require a local code adaptation and are not supported by this published version.

Shorts, live streams, private or access-restricted videos, and videos without an available native transcript may not work. Firefox, Safari, mobile browsers, and other Chromium browsers are not currently tested or supported.

youtube-digest-learn forces Supadata's `mode=native`. It does not request AI-generated transcripts or perform local audio transcription when native captions are unavailable.

## Supadata free tier and request costs

Current as of August 9, 2026, the [Supadata pricing page](https://supadata.ai/pricing) lists a free tier with **100 credits per month**, no credit card required. Unused credits do not roll over. Supadata pricing can change, so check the current page before relying on these numbers.

The [Supadata transcript documentation](https://docs.supadata.ai/get-transcript) describes the transcript request modes and credit behavior:

- A native transcript request uses **1 credit**, regardless of video duration.
- A generated transcript costs **2 credits per video minute**. youtube-digest-learn does not use this path because it forces `mode=native`.
- An unavailable native lookup returned as HTTP `206` still uses **1 credit**.

With the current native-only behavior, the free tier can cover roughly 100 transcript lookups per month when each request succeeds once. Retries and unavailable-caption lookups also consume credits, so actual successful-video coverage can be lower.

DeepSeek usage is separate from Supadata. DeepSeek may apply its own free quota, rate limits, or charges. youtube-digest-learn does not collect payments or resell access. Set spending limits and monitor both accounts. The estimate below explains the current DeepSeek translation cost.

## DeepSeek V4 Flash translation cost estimate

Current as of August 10, 2026, DeepSeek lists the following prices per 1 million tokens on its official [pricing page](https://api-docs.deepseek.com/quick_start/pricing/):

- Cache-hit input: **$0.0028 USD**.
- Cache-miss input: **$0.14 USD**.
- Output: **$0.28 USD**.

DeepSeek says these prices may increase soon, so check the current pricing page before relying on this estimate. Its official [token usage guide](https://api-docs.deepseek.com/quick_start/token_usage/) estimates about 0.3 token per English character and about 0.6 token per Chinese character. Its [context caching guide](https://api-docs.deepseek.com/guides/kv_cache/) explains the automatic best-effort disk cache used for repeated prefixes.

A measured 20-minute English talk contained **2,935 spoken English words** and 15,433 transcript characters. With youtube-digest-learn's current grouping, it became 128 semantic segments and 43 requests of three segments each. Repeated prompts and JSON brought the rendered input to about 108,528 English characters, or **about 32,600 input tokens** using DeepSeek's 0.3 token per English character heuristic. The translated Chinese JSON output is estimated at about 3,500 to 4,500 tokens using the 0.6 token per Chinese character heuristic, plus JSON and ID overhead.

If all input is billed as cache miss, input costs about $0.0046 and output costs about $0.0010 to $0.0013, for a total of about $0.0056 to $0.0059. When much of the repeated system prompt hits DeepSeek's automatic best-effort cache, a realistic lower end is about $0.002 to $0.003. A practical estimate for fully translating this talk is therefore **$0.002 to $0.006 USD, about ¥0.02 to ¥0.04**.

Translation starts only after you deliberately choose Chinese or bilingual mode. It then completes the transcript progressively in the background using two small concurrent batches, while prioritizing visible and currently playing rows. Cached segments are reused. Translating a complete transcript uses more AI tokens than the previous scroll-only behavior; retries, provider behavior, and pricing changes can increase the final cost.

## Remix it with your coding agent

This is a personal remix project. Upstream issues and pull requests are not accepted. If something breaks or you want a new feature, download or fork your own copy and ask your coding agent to fix, remix, or personalize it for you.

youtube-digest-learn uses plain HTML, CSS, and JavaScript with no build step, so it is a friendly starting point for agent-assisted projects. Ideas to try:

- Add more translation languages and let each person choose a learning language.
- Create customized summary templates for lectures, interviews, tutorials, reviews, or research talks.
- Customize the vocabulary notebook's review fields or Markdown layout.
- Export notes and vocabulary to Markdown, CSV, Anki, or another study tool.
- Add personal topic filters that highlight the chapters most relevant to a goal.
- Improve support for local OpenAI-compatible models and their different privacy and cost tradeoffs.
- Improve accessibility with keyboard navigation, font controls, and higher-contrast themes.

Ask your agent to preserve the bring-your-own-key model, keep secrets out of source files, run the checks below, and test the remix on real videos.

You can switch to another OpenAI-compatible AI provider directly in youtube-digest-learn Settings without changing the source code. Keep API keys in Settings only, never in source files or chats.

## Privacy and data flow

youtube-digest-learn makes provider requests directly from the extension:

1. It sends a canonical YouTube watch URL to Supadata to request the native transcript.
2. It sends the transcript and relevant video metadata to the AI backend configured in Settings when you request AI features.
3. Focused features send only the content they need, such as selected text with context or small transcript batches for translation.
4. It stores keys, settings, notes, and recent cache entries locally in Chrome.
5. If you enable Obsidian sync, it sends managed vocabulary, video-note, and
   transcript Markdown directly to the loopback Local REST API address you configured.

There is no youtube-digest-learn account system, advertising, analytics, or telemetry. Supadata and your configured AI provider still receive data under their own terms and privacy policies. See [PRIVACY.md](PRIVACY.md) for details.

## Troubleshooting

### The Digest button is missing on a YouTube video

- At `chrome://extensions`, find youtube-digest-learn and click **Reload**, then refresh the YouTube tab.
- Confirm that you are on a standard `https://www.youtube.com/watch?...` page, not a Short, embed, or live page.
- The current version automatically follows YouTube when its responsive action bar changes. Wait a moment after the page finishes loading.
- If you have an older downloaded copy, resizing the YouTube window horizontally once may reveal the button. Then download the latest version so resizing is no longer required.
- If it is still missing, ask your coding agent to inspect the content script on that exact video page.

### The side panel does not open

- Confirm that you are on a standard `https://www.youtube.com/watch?...` page.
- At `chrome://extensions`, confirm youtube-digest-learn is enabled and click **Reload**.
- Refresh the YouTube tab after reloading the extension.
- Ask your coding agent to inspect the extension if the problem continues.

### youtube-digest-learn asks for setup

- Open **Settings** and save both a Supadata key and an AI backend key.
- Confirm the provider name, Base URL, and model match your provider's OpenAI-compatible Chat Completions documentation.
- Approve Chrome's origin permission prompt when saving a custom backend.

### No transcript is found

- Confirm the video is public and has native captions.
- Check your Supadata key, remaining credits, rate limit, and account status.
- Remember that unavailable native lookups and manual retries may still consume credits.

youtube-digest-learn will not fall back to generated transcription.

### AI requests fail

- A `401` or `403` usually means the configured key or account access is invalid.
- A `429` usually means the provider's rate or spending limit was reached.
- Confirm the Base URL includes any required path such as `/v1`, the model name is exact, and the account has available credit.
- Confirm the backend implements OpenAI-compatible `POST /chat/completions`; the Responses API alone is not sufficient.

Never share API keys, private transcripts, or personal notes in chats, screenshots, or logs.

## Checks for coding agents

Ask your coding agent to run these commands after changing the project:

```bash
npm test
npm run check
npm run package
```

The agent should also reload the unpacked extension in Chrome and test several real YouTube videos. Automated checks do not prove that live provider requests and YouTube interactions work.

## License

MIT. See [LICENSE](LICENSE).
