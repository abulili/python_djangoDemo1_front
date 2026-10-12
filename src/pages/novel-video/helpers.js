export const STATUS_MAP = {
  pending: { text: "等待中", color: "processing" },
  running: { text: "生成中", color: "blue" },
  success: { text: "成功", color: "success" },
  failed: { text: "失败", color: "error" },
};

export const MATERIAL_TYPE_OPTIONS = [
  { label: "视频背景", value: "video" },
  { label: "音频/BGM", value: "audio" },
  { label: "图片背景", value: "image" },
];

export const RENDER_MODE_OPTIONS = [
  { label: "全文滚动", value: "scrolling_text" },
  { label: "分句推文", value: "sentence_card" },
];

export const PROCESS_MODE_OPTIONS = [
  { label: "本地电脑生成", value: "local" },
  { label: "服务器生成", value: "server" },
];

export const DEFAULT_JOB_VALUES = {
  render_mode: "sentence_card",
  process_mode: "local",
  font_size: 54,
  font_color: "#ffffff",
  font_stroke_width: 3,
  font_stroke_color: "#000000",
  text_start_time: 0,
  opening_enabled: false,
  opening_audio_mode: "tts",
  opening_lines: [
    { text: "", font_size: 72, font_color: "#ffffff", stroke_width: 4, stroke_color: "#000000" },
    { text: "", font_size: 60, font_color: "#ffffff", stroke_width: 3, stroke_color: "#000000" },
    { text: "", font_size: 54, font_color: "#ffffff", stroke_width: 3, stroke_color: "#000000" },
    { text: "", font_size: 48, font_color: "#ffffff", stroke_width: 2, stroke_color: "#000000" },
  ],
  opening_duration: 3,
  target_duration: 0,
  scrolling_start_y: 1600,
  scrolling_end_y: -1600,
  scrolling_speed: 1,
  bgm_loop: true,
  bgm_volume: 0.25,
  bgm_speed: 1,
  tts_enabled: true,
  tts_voice: "zh-CN-XiaoxiaoNeural",
  tts_rate: "+0%",
  tts_volume: "+0%",
  text_rules: {
    replace_colon_with_space: true,
    remove_quotes: true,
    remove_extra_newlines: true,
    normalize_spaces: true,
  },
  name_replacements_editor: [],
};

export function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  return [];
}

export function assetLabel(asset) {
  if (!asset) return "-";
  const typeText = asset.material_type === "audio" ? "音频" : asset.material_type === "image" ? "图片" : "视频";
  const storageText = asset.storage_type === "local" ? "本地" : "上传";
  return `${asset.name} - ${typeText} - ${storageText}`;
}

export function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function tagsToText(value) {
  return Array.isArray(value) ? value.join(",") : "";
}

export function parseNameReplacements(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        from: String(item?.from || "").trim(),
        to: String(item?.to || "").trim(),
      }))
      .filter((item) => item.from);
  }

  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [from, ...rest] = line.split("=>");
      return { from: (from || "").trim(), to: rest.join("=>").trim() };
    })
    .filter((item) => item.from);
}

export function nameReplacementsToText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => ({ from: item.from || "", to: item.to || "" }));
  }

  return Array.isArray(value)
    ? value.map((item) => `${item.from || ""}=>${item.to || ""}`).join("\n")
    : "";
}
