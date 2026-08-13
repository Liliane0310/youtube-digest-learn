# youtube-digest-learn

![youtube-digest-learn cover](youtube-digest-learn-cover-21x9.png)

[English](README.md) | [简体中文](README.zh-CN.md)

Turn every YouTube video into a resource for deep learning. youtube-digest-learn is a Chrome extension that brings YouTube transcripts, bilingual translation, AI overviews, explanations, and timestamped notes into one side panel, so you can study ideas and language without losing your place.

---

## Table of Contents

- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
  - [Option 1: Install with a Coding Agent (Recommended)](#option-1-install-with-a-coding-agent-recommended)
  - [Option 2: Manual Installation](#option-2-manual-installation)
- [Get API Keys](#get-api-keys)
  - [Supadata API Key (Required)](#supadata-api-key-required)
  - [DeepSeek API Key (Required)](#deepseek-api-key-required)
  - [Merriam-Webster API Key (Optional)](#merriam-webster-api-key-optional)
- [Configure the Extension](#configure-the-extension)
- [How to Use](#how-to-use)
- [Obsidian Sync (Optional)](#obsidian-sync-optional)
- [Pricing and Cost Estimates](#pricing-and-cost-estimates)
- [Troubleshooting](#troubleshooting)
- [Privacy](#privacy)
- [Customization and Remixing](#customization-and-remixing)
- [License](#license)

---

## Features

- **Transcripts as learning material**: Convert fragmented YouTube captions into readable, searchable, timestamped learning text.
- **Multiple subtitle views**: Original transcript, Simplified Chinese, and aligned bilingual view.
- **AI overviews and chapters**: Auto-generate summaries, chapters, and key quotes to quickly understand the video structure.
- **Selected-text explanation**: Select any transcript text and get an AI explanation based on its context.
- **Word lookup and favorites**: Select an English word to see Merriam-Webster definitions, pronunciation, examples, and AI-generated Chinese in-context meaning. Save words to a local vocabulary list.
- **Timestamped notes**: Save notes tied to specific moments in the video, with automatic polishing for later review.
- **Obsidian sync**: Optionally sync vocabulary, notes, and bilingual transcripts to local Obsidian Markdown files.
- **Data autonomy**: Bring your own API keys. All settings and data are stored locally in Chrome. No accounts, no ads, no analytics, no telemetry.

---

## System Requirements

- **Browser**: Google Chrome 116 or newer (requires Side Panel API support).
- **Page**: Standard `https://www.youtube.com/watch?...` video pages.
- **Video**: Public videos with native captions available through Supadata (English preferred when available).
- **Not supported**: YouTube Shorts, live streams, private or restricted videos, videos without native captions.
- **Other browsers**: Firefox, Safari, mobile browsers, and other Chromium-based browsers are not currently tested or supported.

---

## Installation

This is a locally loaded unpacked extension and is not available on the Chrome Web Store.

> Before installation
>
> 1. Prepare a [Supadata](#supadata-api-key-required) and a [DeepSeek](#deepseek-api-key-required) API key (see below).
> 2. Do not move or delete the project folder after loading the extension, or it will stop working.
> 3. After updating, you need to reload the extension in `chrome://extensions`.

### Option 1: Install with a Coding Agent (Recommended)

If you don't want to use the command line, send the following message to your coding agent:

> Please download or clone this project https://github.com/Liliane0310/youtube-digest-learn into a permanent folder I choose, tell me the exact full path, and then guide me to install it in Chrome using "Load unpacked" with that same folder. If I'm not sure where to put it, you can suggest `~/Documents/youtube-digest-learn` on macOS/Linux or `%USERPROFILE%\Documents\youtube-digest-learn` on Windows. Please walk me through the installation and setup in simple terms.

The agent should help you:

1. Ask where you want to keep the project, then download or clone it there.
2. Guide you to sign up for Supadata and DeepSeek accounts and create API keys.
3. Open Chrome, go to `chrome://extensions`, and turn on "Developer mode" in the top right.
4. Click "Load unpacked" and select the project folder that contains `manifest.json`.
5. Enter your API keys in the extension's Settings page.
6. Open a YouTube video with captions and test the features.

### Option 2: Manual Installation

1. Visit the repository at [github.com/Liliane0310/youtube-digest-learn](https://github.com/Liliane0310/youtube-digest-learn).
2. Click **Code** → **Download ZIP** to download the project.
3. Unzip the archive to a folder where you plan to keep it long-term, for example:
   - macOS / Linux: `~/Documents/youtube-digest-learn`
   - Windows: `%USERPROFILE%\Documents\youtube-digest-learn`
4. Open Chrome and navigate to `chrome://extensions`.
5. Turn on "Developer mode" in the top-right corner.
6. Click "Load unpacked" that appears in the top-left.
7. In the file picker, select the project folder that contains `manifest.json`, then click "Select Folder".
8. You should now see a youtube-digest-learn card on the `chrome://extensions` page.
9. Pin the extension to your Chrome toolbar for easy access.

#### Updating or Reloading

- After downloading a new version or editing files, go to `chrome://extensions`, find youtube-digest-learn, and click **Reload**.
- Then refresh any open YouTube tabs.
- If you move or delete the project folder, the extension will stop working. Re-load it from the new location.

---

## Get API Keys

youtube-digest-learn uses a Bring Your Own Key (BYOK) model. You need to prepare the following keys:

| Service | Purpose | Required |
|---------|---------|----------|
| Supadata | Fetch YouTube transcripts | Required |
| DeepSeek | AI overviews, translation, explanations, note polishing | Required |
| Merriam-Webster | English definitions, pronunciation, examples | Optional |

> Security tip
>
> Never paste API keys into AI chats, screenshots, source files, or public messages. Enter them only in the youtube-digest-learn Settings page.

### Supadata API Key (Required)

Supadata is used to fetch native captions from YouTube videos.

1. Open the official Supadata sign-up page: [dash.supadata.ai/auth/sign-up](https://dash.supadata.ai/auth/sign-up).
2. Register an account using email or Google.
3. Complete the short onboarding flow. An API key will be generated automatically.
4. You can view or manage the key anytime in the [Supadata dashboard](https://dash.supadata.ai/).
5. Copy the key and paste it into the **Supadata API key** field in youtube-digest-learn Settings.

See the [official Supadata documentation](https://docs.supadata.ai/) for more details.

### DeepSeek API Key (Required)

DeepSeek powers AI overviews, translation, explanations, and automatic note polishing.

1. Open the DeepSeek platform: [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys).
2. Sign up or log in with your email or phone number.
3. Click **Create new API key**.
4. Give it a recognizable name such as `youtube-digest-learn`, then create it.
5. **Copy the full key immediately** — it is usually shown only once.
6. Paste it into the **AI API key** field in youtube-digest-learn Settings.
7. If you see a balance error, add credit in the DeepSeek platform and try again.

Default configuration:

```text
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash
```

To use another OpenAI-compatible backend, enter its name, Base URL, model name, and API key in Settings.

### Merriam-Webster API Key (Optional)

Merriam-Webster provides learner-friendly English definitions, pronunciation, and examples.

1. Open the [Merriam-Webster Dictionary API registration page](https://www.dictionaryapi.com/register/index).
2. Fill out the registration form (all fields are required):
   - **First Name / Last Name**: your real name.
   - **E-mail Address / Confirm E-mail Address**: the email you will use to log in and receive the verification message.
   - **Password / Confirm Password**: a password of at least 7 characters.
   - **Estimated Monthly Unique Users**: for personal use, enter `1` or `1-10`.
   - **Role/Occupation**: for example, `Independent Developer` or `Student`.
   - **Request API Key (1)**: check **Learners Dictionary** (recommended as the primary dictionary).
   - **Request API Key (2)** (optional): check **Collegiate Dictionary** as a fallback. Each account can request up to 2 keys.
   - **Company or Organization Name**: independent developers should enter `self`.
   - **Application Name**: enter `youtube-digest-learn`.
   - **Application Description**: a brief description, for example `A Chrome extension that helps users learn languages from YouTube videos with dictionary lookup.`.
   - **Application URL**: you can use the project repository `https://github.com/Liliane0310/youtube-digest-learn`, or enter `N/A`.
   - **Application Launch Date**: select the current month or your estimated launch month.
3. Submit the form, then check your email for a verification message and click the link to complete registration.
4. After registration, log in to the [My Keys](https://www.dictionaryapi.com/my-keys) page to view your keys.
5. Paste them into the matching fields in youtube-digest-learn Settings.

---

## Configure the Extension

After installation, you need to configure the extension before using it:

1. Click the youtube-digest-learn icon in the Chrome toolbar to open the side panel.
2. Click **Settings** in the side panel.
3. Fill in:
   - **Supadata API key**: copied from the Supadata dashboard.
   - **AI API key**: copied from DeepSeek or another compatible backend.
   - If using a custom AI backend, fill in the Base URL, model name, and key.
   - If using Merriam-Webster, fill in the corresponding keys.
4. Click **Save**.
5. If Chrome asks for permission to access the API origin, click "Allow".

Once configured, open any YouTube video with captions to start using the extension.

---

## How to Use

### 1. Open the Side Panel

1. Open a standard YouTube video page (`https://www.youtube.com/watch?...`).
2. After the page loads, click the youtube-digest-learn icon in the Chrome toolbar to open the side panel.
3. The extension will automatically request the transcript for the current video.

### 2. Read the Transcript

In the side panel, the **Transcript** tab is selected by default:

- **Original**: show the original transcript.
- **中文**: show the Simplified Chinese translation.
- **双语**: show the original and Chinese side by side.
- Click any timestamp to jump to that position in the video.
- Use the search box to find keywords in the transcript.

### 3. Get an AI Overview

Switch to the **Overview** tab:

- The extension auto-generates chapters, key quotes, and a summary.
- Click any timestamp in the quotes to jump to that part of the video.
- Use this to quickly understand the video structure before or after watching.

### 4. Explain Selected Text

- Select any text in the transcript.
- Click the **Explain** button that appears.
- The AI will explain the selected text based on its context.

### 5. Look Up and Save Words

- Select a single English word in the transcript.
- Click the **查词** (Lookup) button.
- View the definition, pronunciation, examples, and AI-generated Chinese meaning in context.
- Click the star icon to add the word to your local vocabulary list.
- Open the **Vocabulary** tab to review saved words.

### 6. Save Timestamped Notes

- While watching, click the **Save note** button near the player, or save a key quote from the Overview tab.
- The note is automatically tagged with the current timestamp.
- Open the **Notes** tab to view, edit, or polish your notes.
- Click the timestamp on any note to return to that moment in the video.

### 7. Export and Sync

- If Obsidian sync is enabled, vocabulary and notes will sync to local Obsidian files.
- In the Transcript tab, click **Sync Obsidian** to manually export the bilingual transcript.

---

## Obsidian Sync (Optional)

To sync your learning data to Obsidian, follow these steps:

1. In Obsidian, go to Settings → Community plugins → Browse, and install `Local REST API with MCP`.
2. Enable the plugin and turn on the unencrypted HTTP server.
3. Copy the API key generated by the plugin.
4. In youtube-digest-learn Settings, enable **Obsidian sync**.
5. Keep the default address `http://127.0.0.1:27123`, or enter the address shown by the plugin.
6. Set the vocabulary Markdown path and the video-notes folder.
7. Paste the Obsidian API key, save, and click **Test connection**.

Sync behavior:

- Saved words are written to a single managed vocabulary Markdown file.
- Each video gets its own Markdown file with separate managed blocks for notes and transcript.
- Notes sync automatically; transcripts need to be synced manually.
- Any handwritten content outside managed blocks is preserved.

---

## Pricing and Cost Estimates

### Supadata Costs

As of August 2026, the [Supadata pricing page](https://supadata.ai/pricing) lists a free tier with **100 credits per month**, no credit card required. Unused credits do not roll over.

- Native transcript request: **1 credit** per video, regardless of length.
- AI-generated transcript: **2 credits per minute** (not used by this extension).
- An unavailable native transcript returned as HTTP 206: **1 credit**.

With native-only usage, the free tier covers roughly 100 successful transcript lookups per month. Retries and unavailable-caption lookups also consume credits, so actual coverage may be lower.

### DeepSeek Costs

As of August 2026, DeepSeek V4 Flash reference pricing is (check the official page for current rates):

- Cache-hit input: ~$0.0028 / million tokens
- Cache-miss input: ~$0.14 / million tokens
- Output: ~$0.28 / million tokens

Actual cost depends on how often you use translation, overviews, explanations, and the length of the transcript. As a rough estimate, fully translating a 20-minute English video costs around **$0.002 to $0.006 USD**.

---

## Troubleshooting

### The Digest button does not appear on a YouTube video

- Go to `chrome://extensions`, find youtube-digest-learn, and click **Reload**, then refresh the YouTube tab.
- Make sure you are on a standard `https://www.youtube.com/watch?...` page, not Shorts, live streams, or embeds.
- The current version automatically repositions the button when YouTube's action bar changes. Wait a moment after the page finishes loading.
- If still missing, ask your coding agent to inspect the content script on that video page.

### The side panel does not open

- Make sure you are on a standard YouTube watch page.
- In `chrome://extensions`, confirm the extension is enabled and click **Reload**.
- Refresh the YouTube tab after reloading the extension.
- Ask your coding agent to inspect the extension if the issue continues.

### The extension asks for setup

- Open **Settings** and save both a Supadata key and an AI backend key.
- If using a custom backend, confirm the provider name, Base URL, and model name are correct.
- Approve Chrome's origin permission prompt when saving a custom backend.

### No transcript is found

- Confirm the video is public and has native captions.
- Check your Supadata key, remaining credits, rate limits, and account status.
- Remember that unavailable native lookups and retries may still consume credits.
- This extension will not fall back to AI-generated transcripts when native captions are unavailable.

### AI requests fail

- `401` or `403`: usually means the key or account access is invalid.
- `429`: usually means you hit the provider's rate or spending limit.
- Make sure the Base URL includes any required path such as `/v1`, and the model name is exact.
- Confirm the backend supports OpenAI-compatible `POST /chat/completions`; the Responses API alone is not enough.
- Check that your account has available credit.

### Obsidian sync fails

- Confirm the `Local REST API with MCP` plugin is enabled and the unencrypted HTTP server is running.
- Make sure the address and API key match what the plugin shows.
- Make sure Obsidian is running and no firewall is blocking the local loopback address.
- Click **Test connection** to see the specific error.

---

## Privacy

youtube-digest-learn has no account system, advertising, analytics, or telemetry. Data flows as follows:

1. **Supadata**: sends the YouTube video URL to request native captions.
2. **AI backend**: sends transcripts and necessary context when you use AI features.
3. **Local storage**: API keys, settings, notes, and recent cache are stored in Chrome's local extension storage.
4. **Obsidian**: if enabled, sends Markdown to the loopback address you configured for the Obsidian plugin.

Supadata and your configured AI provider process data under their own terms and privacy policies. See [PRIVACY.md](PRIVACY.md) for more details.

---

## Customization and Remixing

youtube-digest-learn is built with plain HTML, CSS, and JavaScript with no build step, making it a friendly project for agent-assisted customization.

Ideas for remixing:

- Add more translation languages and let users choose their learning language.
- Create custom summary templates for lectures, interviews, tutorials, reviews, or research talks.
- Customize the vocabulary notebook's review fields or Markdown layout.
- Export notes and vocabulary to Markdown, CSV, Anki, or other study tools.
- Add topic filters to highlight chapters relevant to a goal.
- Improve support for local OpenAI-compatible models.
- Improve accessibility with keyboard navigation, font controls, and high-contrast themes.

After modifying the project, run:

```bash
npm test
npm run check
npm run package
```

Then reload the extension in Chrome and test on real YouTube videos.

---

## License

MIT. See [LICENSE](LICENSE).
