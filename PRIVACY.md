# Privacy

Effective: July 28, 2026

youtube-digest-learn is a GitHub-only, bring-your-own-key Chrome extension. It has no youtube-digest-learn account, developer-operated backend, analytics, advertising, or telemetry.

## Data the extension handles

Depending on the feature you use, youtube-digest-learn handles:

- the canonical URL and video ID of the active YouTube video;
- transcript text and timestamps;
- video metadata such as title, channel, description, and duration;
- text you select in the transcript and nearby transcript context;
- transcript context around a timestamped note;
- content you ask to translate;
- notes you save;
- English words you favorite, their dictionary entries, contextual explanations,
  source subtitle sentences, video titles, video IDs, and timestamps;
- Supadata, Merriam-Webster, and the configured AI backend settings, including
  API keys;
- optional local Obsidian REST API settings and API key; and
- cached transcript, digest, translation, dictionary, and word-context results.

## Where data goes

### Supadata

youtube-digest-learn sends the canonical YouTube video URL to `https://api.supadata.ai` with your Supadata API key. Supadata returns the transcript and timestamps. A Supadata key is required for transcript retrieval.

### Configured AI backend

The extension sends AI feature content to the OpenAI-compatible backend selected in Settings. DeepSeek V4 Flash at `https://api.deepseek.com` is the default:

- transcript plus relevant title, channel, description, or duration for an overview;
- selected text plus nearby transcript context for an explanation;
- small semantic transcript batches currently needed for progressive Chinese
  translation, or requested overview or explanation content;
- nearby transcript context and video metadata when polishing a saved note.
- one selected English word, its subtitle sentence, dictionary definitions,
  and the video title when generating a Chinese in-context explanation.

You can configure the provider name, Base URL, model, and API key. Chrome requests optional host access for the exact custom origin when you save it. The extension uses the OpenAI-compatible Chat Completions request and response shape.

### Merriam-Webster

When you look up a word, youtube-digest-learn sends that word directly to the
Merriam-Webster Dictionary API with the Learner's Dictionary or Collegiate
Dictionary key you supplied. After a transcript loads, the extension may also
pre-fetch up to six recurring English words from that video using the Learner's
Dictionary key. Merriam-Webster returns definitions, pronunciation information,
examples, and related suggestions.

Requests go directly from the extension to Supadata, Merriam-Webster, or the
configured AI backend. They are authenticated with the keys you supply. YouTube
Digest's developer does not proxy or receive these requests.

### Optional local Obsidian API

If you enable Obsidian sync, youtube-digest-learn sends generated Markdown for the
vocabulary list and per-video notes to the loopback Local REST API address you
configured, authenticated with your Obsidian API key. A transcript is sent only
when you press the transcript sync button. The address is restricted to
`127.0.0.1`, `localhost`, or `::1`; public and local-network hosts are rejected.

The extension reads a target Markdown file before writing. It replaces only its
managed vocabulary, video-note, or transcript blocks and preserves content
outside those blocks. If an existing file does not contain the expected markers,
the extension refuses to overwrite it. This traffic stays on the device unless
other software, including your Obsidian configuration or vault-sync provider,
copies the resulting file elsewhere.

Those services process data under their own terms, privacy policies, retention practices, and account settings. Do not send confidential, personal, or regulated content unless their terms and your obligations permit it.

## Local storage and retention

youtube-digest-learn uses Chrome's local extension storage, not a youtube-digest-learn cloud service.

- Supadata, Merriam-Webster, and AI backend settings and API keys remain on the
  device in Chrome's extension storage.
- Saved notes remain until you delete them or remove/clear the extension's data. The extension keeps up to 100 notes.
- Favorite words remain until you remove them or clear the extension's data. The
  local vocabulary list is limited to 500 words and keeps up to 6 source
  contexts per word.
- Recent transcript, digest, and per-segment translation cache entries are stored
  locally. The cache is limited to 20 videos, and entries older than 30 days are
  removed when the side panel opens.
- Up to 500 dictionary entries and 500 AI word-context explanations are cached
  locally for up to 180 days. Per-video pre-fetch markers are limited to 100
  videos.

Chrome extension storage is not a password vault. Anyone with sufficient access to your browser profile or device may be able to recover locally stored keys or content. Use scoped keys where providers support them, set spending limits, and rotate or revoke a key if the device or browser profile is compromised.

To remove data:

- delete individual saved notes in youtube-digest-learn;
- use the Options page to clear cached digests, clear dictionary caches, delete
  all notes, or reset all extension data;
- remove the extension or clear its stored data from Chrome to delete all local settings, keys, notes, and cache entries; and
- remove unwanted words from the **生词** tab; this updates the managed Obsidian
  block on the next successful synchronization but does not delete the Markdown
  file itself; and
- revoke keys in the Supadata or AI provider dashboard to stop their future use.

Clearing local data does not delete information already processed or retained by Supadata or the configured AI provider. Use each service's controls for service-side requests.

## Permissions

youtube-digest-learn uses Chrome permissions for these purposes:

- `sidePanel`: display the youtube-digest-learn interface beside YouTube.
- `storage`: store settings, keys, notes, and cached results locally.
- `tabs`: identify and interact with the active YouTube tab.
- `scripting`: coordinate the extension's YouTube page controls.
- YouTube host access: read the active video's URL and metadata and provide timestamp controls.
- Supadata host access: retrieve transcripts.
- DeepSeek host access: provide AI features with the default backend.
- Merriam-Webster host access: retrieve dictionary entries and pronunciation audio.
- Optional custom-origin access: provide AI features through the OpenAI-compatible backend you explicitly save. Chrome asks before granting this access.
- Optional loopback-host access: test and use the Obsidian Local REST API only
  after you enable the feature and approve access.

youtube-digest-learn does not use these permissions to monitor general browsing activity.

## No sale or advertising use

youtube-digest-learn does not sell personal information, build advertising profiles, or share data with data brokers. It does not include analytics SDKs.

## Changes

Privacy-relevant changes will be documented in this file and in the repository history. Review updates before installing a new version.

## Questions

This repository does not provide a public support or issue channel. Review this policy, the source code, and each provider's documentation before using the extension. For a vulnerability or accidental secret exposure, follow the private process in [SECURITY.md](SECURITY.md).
