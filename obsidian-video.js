/**
 * Pure helpers for one managed Obsidian Markdown document per YouTube video.
 */
var YTD_OBSIDIAN_VIDEO = (() => {
  const SIGNATURE = "<!-- youtube-digest:video:v1 -->";
  const NOTES_START = "<!-- youtube-digest:notes:start -->";
  const NOTES_END = "<!-- youtube-digest:notes:end -->";
  const TRANSCRIPT_START = "<!-- youtube-digest:transcript:start -->";
  const TRANSCRIPT_END = "<!-- youtube-digest:transcript:end -->";
  const OVERVIEW_START = "<!-- youtube-digest:overview:start -->";
  const OVERVIEW_END = "<!-- youtube-digest:overview:end -->";
  const MAX_TRANSCRIPT_SEGMENTS = 3000;
  const MAX_OVERVIEW_ITEMS = 200;

  function cleanText(value, maxLength = 4000) {
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\t ]+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function cleanInline(value, maxLength = 500) {
    return cleanText(value, maxLength).replace(/\s+/g, " ").trim();
  }

  function normalizeFolderPath(value) {
    const path = String(value || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/");
    if (!path || path.length > 220) return "";
    const parts = path.split("/");
    if (
      parts.some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /[<>:"|?*\u0000-\u001f]/.test(part) ||
          /[. ]$/.test(part),
      )
    ) {
      return "";
    }
    return parts.join("/");
  }

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  }

  function sanitizeFilenamePart(value) {
    const cleaned = cleanInline(value, 180)
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim();
    return (cleaned || "Untitled Video").slice(0, 110).trim();
  }

  function buildFilepath(folder, video) {
    const safeFolder = normalizeFolderPath(folder);
    const videoId = safeVideoId(video?.videoId);
    if (!safeFolder || !videoId) return "";
    return `${safeFolder}/${sanitizeFilenamePart(video?.videoTitle)} - ${videoId}.md`;
  }

  function formatTimestamp(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    if (hours) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function videoUrl(videoId, timestamp = null) {
    const id = safeVideoId(videoId);
    if (!id) return "";
    const base = `https://www.youtube.com/watch?v=${id}`;
    return timestamp === null
      ? base
      : `${base}&t=${Math.max(0, Math.floor(Number(timestamp) || 0))}s`;
  }

  function yamlString(value) {
    return JSON.stringify(cleanInline(value, 1000));
  }

  function managedBlock(start, body, end) {
    return `${start}\n${body.trim()}\n${end}`;
  }

  function renderNotes(notes, video) {
    const safeNotes = (Array.isArray(notes) ? notes : [])
      .filter((note) => note && note.videoId === video.videoId)
      .slice(0, 500)
      .sort(
        (a, b) =>
          Number(a.timestampSeconds || 0) - Number(b.timestampSeconds || 0),
      );
    if (!safeNotes.length) return "*还没有保存笔记。*";
    return safeNotes
      .map((note) => {
        const seconds = Math.max(0, Math.floor(Number(note.timestampSeconds) || 0));
        const text = cleanText(note.text, 3000).replace(/\n+/g, "<br>");
        return `- **[${formatTimestamp(seconds)}](${videoUrl(video.videoId, seconds)})** ${text}`;
      })
      .join("\n");
  }

  function normalizeTranscriptSegments(segments) {
    return (Array.isArray(segments) ? segments : [])
      .slice(0, MAX_TRANSCRIPT_SEGMENTS)
      .map((segment) => ({
        start: Math.max(0, Math.floor(Number(segment?.start) || 0)),
        text: cleanText(segment?.text, 4000),
        translation: cleanText(segment?.translation, 4000),
      }))
      .filter((segment) => segment.text);
  }

  /**
   * Render grouped segments as one Markdown paragraph each, without
   * timestamps: source text on the first line, translation as the
   * immediately following line (a lazy continuation of the same paragraph).
   * Paragraphs are separated by blank lines, so every segment stays intact
   * and merging text into sentence paragraphs works cleanly.
   */
  function renderTranscript(segments, video, mode = "bilingual") {
    const safeMode = ["original", "zh", "bilingual"].includes(mode)
      ? mode
      : "bilingual";
    const normalized = normalizeTranscriptSegments(segments);
    if (!normalized.length) return "*逐字稿尚未同步。*";
    return normalized
      .map((segment) => {
        if (safeMode === "original") return segment.text;
        if (safeMode === "zh") {
          return segment.translation || "*翻译暂不可用。*";
        }
        const translation = segment.translation || "*翻译暂不可用。*";
        return `${segment.text}\n${translation}`;
      })
      .join("\n\n");
  }

  function normalizeOverview(overview) {
    if (!overview || typeof overview !== "object") return null;
    const chapters = (
      Array.isArray(overview.chapters) ? overview.chapters : []
    )
      .slice(0, MAX_OVERVIEW_ITEMS)
      .map((chapter) => ({
        title: cleanInline(chapter?.title, 300),
        summary: cleanInline(chapter?.summary, 1500),
        titleEnglish: cleanInline(chapter?.titleEnglish, 300),
        summaryEnglish: cleanInline(chapter?.summaryEnglish, 1500),
        timestampSeconds: Math.max(
          0,
          Math.floor(Number(chapter?.timestampSeconds) || 0),
        ),
      }))
      .filter((chapter) => chapter.title || chapter.titleEnglish)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    const keyQuotes = (
      Array.isArray(overview.keyQuotes) ? overview.keyQuotes : []
    )
      .slice(0, MAX_OVERVIEW_ITEMS)
      .map((quote) => ({
        quote: cleanText(quote?.quote, 3000),
        quoteEnglish: cleanText(quote?.quoteEnglish, 3000),
        timestampSeconds: Math.max(
          0,
          Math.floor(Number(quote?.timestampSeconds) || 0),
        ),
      }))
      .filter((quote) => quote.quote || quote.quoteEnglish)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    if (!chapters.length && !keyQuotes.length) return null;
    return { chapters, keyQuotes };
  }

  function renderOverview(overview, video) {
    const normalized = normalizeOverview(overview);
    if (!normalized) return "*概览尚未生成或尚未同步。*";
    const { videoId } = video;
    const lines = [];

    if (normalized.chapters.length) {
      lines.push("### 章节", "");
      normalized.chapters.forEach((chapter) => {
        const seconds = chapter.timestampSeconds;
        const stamp = `**[${formatTimestamp(seconds)}](${videoUrl(videoId, seconds)})**`;
        const title = [chapter.titleEnglish, chapter.title]
          .filter(Boolean)
          .join(" · ");
        lines.push(`> [!chapter] ${stamp} ${title}`);
        [chapter.summaryEnglish, chapter.summary]
          .filter(Boolean)
          .forEach((text, index) => {
            if (index) lines.push(">");
            text.split("\n").forEach((part) => {
              lines.push(part.trim() ? `> ${part}` : ">");
            });
          });
        lines.push("");
      });
    }

    if (normalized.keyQuotes.length) {
      lines.push("### 重点引用", "");
      normalized.keyQuotes.forEach((quote) => {
        const seconds = quote.timestampSeconds;
        const stamp = `**[${formatTimestamp(seconds)}](${videoUrl(videoId, seconds)})**`;
        lines.push(stamp, "");
        if (quote.quoteEnglish) {
          quote.quoteEnglish.split("\n").forEach((part) => {
            if (part.trim()) lines.push(`> ${part}`);
          });
        }
        if (quote.quote) {
          if (quote.quoteEnglish) lines.push(">");
          quote.quote.split("\n").forEach((part) => {
            if (part.trim()) lines.push(`> ${part}`);
          });
        }
        lines.push("");
      });
    }

    return lines.join("\n").trim();
  }

  function createDocument(
    video,
    notes = [],
    transcript = [],
    mode = "bilingual",
    overview = null,
  ) {
    const title = cleanInline(video?.videoTitle, 500) || "Untitled Video";
    const channel = cleanInline(video?.channelName, 300);
    const videoId = safeVideoId(video?.videoId);
    if (!videoId) throw new Error("A valid YouTube video ID is required.");
    const header = [
      "---",
      `title: ${yamlString(title)}`,
      `channel: ${yamlString(channel)}`,
      `source: ${yamlString(videoUrl(videoId))}`,
      `video_id: ${yamlString(videoId)}`,
      "---",
      "",
      SIGNATURE,
      `# ${title}`,
      "",
      `> [在 YouTube 中打开](${videoUrl(videoId)})${channel ? ` · ${channel}` : ""}`,
      "",
      managedBlock(
        OVERVIEW_START,
        renderOverview(overview, { ...video, videoId }),
        OVERVIEW_END,
      ),
      "",
      "## 我的笔记",
      "",
      managedBlock(NOTES_START, renderNotes(notes, { ...video, videoId }), NOTES_END),
      "",
      "## 逐字稿",
      "",
      managedBlock(
        TRANSCRIPT_START,
        renderTranscript(transcript, { ...video, videoId }, mode),
        TRANSCRIPT_END,
      ),
      "",
    ];
    return header.join("\n");
  }

  function replaceBlock(content, start, end, body) {
    const startIndex = content.indexOf(start);
    const endIndex = content.indexOf(end);
    if (startIndex < 0 || endIndex < startIndex) {
      const error = new Error("The existing video note is missing its managed sections.");
      error.code = "OBSIDIAN_VIDEO_NOTE_CONFLICT";
      throw error;
    }
    const after = endIndex + end.length;
    return `${content.slice(0, startIndex)}${managedBlock(start, body, end)}${content.slice(after)}`;
  }

  /**
   * Replaces the overview block, or inserts one into documents created by
   * older versions of the extension (which had no overview section) instead
   * of failing the whole sync.
   */
  function upsertOverviewBlock(content, body) {
    if (content.includes(OVERVIEW_START)) {
      return replaceBlock(content, OVERVIEW_START, OVERVIEW_END, body);
    }
    const block = managedBlock(OVERVIEW_START, body, OVERVIEW_END);
    const headingIndex = content.indexOf("## 我的笔记");
    if (headingIndex >= 0) {
      return `${content.slice(0, headingIndex)}${block}\n\n${content.slice(headingIndex)}`;
    }
    const notesIndex = content.indexOf(NOTES_START);
    if (notesIndex >= 0) {
      return `${content.slice(0, notesIndex)}${block}\n\n${content.slice(notesIndex)}`;
    }
    return `${content.trimEnd()}\n\n${block}\n`;
  }

  function mergeDocument(
    existingContent,
    { video, notes = [], transcript = [], transcriptMode = "bilingual", overview = null },
    { updateNotes = false, updateTranscript = false, updateOverview = false } = {},
  ) {
    const existing = String(existingContent || "");
    if (!existing.trim()) {
      return {
        content: createDocument(video, notes, transcript, transcriptMode, overview),
        created: true,
      };
    }
    if (!existing.includes(SIGNATURE)) {
      const error = new Error(
        "An unrelated Obsidian note already exists at this video path.",
      );
      error.code = "OBSIDIAN_VIDEO_NOTE_CONFLICT";
      throw error;
    }
    let content = existing;
    if (updateOverview) {
      content = upsertOverviewBlock(
        content,
        renderOverview(overview, video),
      );
    }
    if (updateNotes) {
      content = replaceBlock(
        content,
        NOTES_START,
        NOTES_END,
        renderNotes(notes, video),
      );
    }
    if (updateTranscript) {
      content = replaceBlock(
        content,
        TRANSCRIPT_START,
        TRANSCRIPT_END,
        renderTranscript(transcript, video, transcriptMode),
      );
    }
    return { content, created: false };
  }

  return {
    SIGNATURE,
    NOTES_START,
    NOTES_END,
    TRANSCRIPT_START,
    TRANSCRIPT_END,
    OVERVIEW_START,
    OVERVIEW_END,
    normalizeFolderPath,
    buildFilepath,
    formatTimestamp,
    normalizeTranscriptSegments,
    normalizeOverview,
    renderNotes,
    renderTranscript,
    renderOverview,
    createDocument,
    mergeDocument,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_OBSIDIAN_VIDEO;
}
