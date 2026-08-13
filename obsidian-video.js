/**
 * Pure helpers for one managed Obsidian Markdown document per YouTube video.
 */
var YTD_OBSIDIAN_VIDEO = (() => {
  const SIGNATURE = "<!-- youtube-digest:video:v1 -->";
  const NOTES_START = "<!-- youtube-digest:notes:start -->";
  const NOTES_END = "<!-- youtube-digest:notes:end -->";
  const TRANSCRIPT_START = "<!-- youtube-digest:transcript:start -->";
  const TRANSCRIPT_END = "<!-- youtube-digest:transcript:end -->";
  const MAX_TRANSCRIPT_SEGMENTS = 3000;

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

  function renderTranscript(segments, video, mode = "bilingual") {
    const safeMode = ["original", "zh", "bilingual", "clean"].includes(mode)
      ? mode
      : "bilingual";
    const normalized = normalizeTranscriptSegments(segments);
    if (!normalized.length) return "*逐字稿尚未同步。*";

    // 干净模式：合并为连续段落，不带时间戳和分隔线，方便内容创作者提炼选题
    if (safeMode === "clean") {
      const originalText = normalized
        .map((segment) => segment.text)
        .filter(Boolean)
        .join("\n\n");
      const translationText = normalized
        .map((segment) => segment.translation)
        .filter(Boolean)
        .join("\n\n");

      if (!translationText) {
        return originalText || "*逐字稿尚未同步。*";
      }

      return (
        `**原文**\n\n${originalText}\n\n` +
        `**中文翻译**\n\n${translationText}`
      );
    }

    return normalized
      .map((segment) => {
        const timestamp = `**[${formatTimestamp(segment.start)}](${videoUrl(video.videoId, segment.start)})**`;
        if (safeMode === "original") return `${timestamp}\n\n${segment.text}`;
        if (safeMode === "zh") {
          return `${timestamp}\n\n${segment.translation || "*翻译暂不可用。*"}`;
        }
        const translation = segment.translation
          ? `\n\n> ${segment.translation.replace(/\n/g, "\n> ")}`
          : "\n\n> *翻译暂不可用。*";
        return `${timestamp}\n\n${segment.text}${translation}`;
      })
      .join("\n\n---\n\n");
  }

  function createDocument(video, notes = [], transcript = [], mode = "bilingual") {
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

  function mergeDocument(
    existingContent,
    { video, notes = [], transcript = [], transcriptMode = "bilingual" },
    { updateNotes = false, updateTranscript = false } = {},
  ) {
    const existing = String(existingContent || "");
    if (!existing.trim()) {
      return {
        content: createDocument(video, notes, transcript, transcriptMode),
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
    normalizeFolderPath,
    buildFilepath,
    formatTimestamp,
    normalizeTranscriptSegments,
    renderNotes,
    renderTranscript,
    createDocument,
    mergeDocument,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_OBSIDIAN_VIDEO;
}
