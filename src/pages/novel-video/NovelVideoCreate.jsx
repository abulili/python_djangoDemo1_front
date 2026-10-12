import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Tabs,
  Typography,
} from "antd";
import { CopyOutlined, PlayCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";

import request from "../../utils/request";
import {
  assetLabel,
  DEFAULT_JOB_VALUES,
  getList,
  parseNameReplacements,
  PROCESS_MODE_OPTIONS,
  RENDER_MODE_OPTIONS,
} from "./helpers";

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

const T = {
  loadAssetsFailed: "加载素材失败",
  required: "请先补全必填项",
  created: "任务已创建，已自动进入生成队列",
  createFailed: "创建任务失败",
  title: "标题",
  titleRequired: "请输入标题",
  mode: "视频模式",
  process: "处理方式",
  processTipTitle: "复制给 AI 的本地生成服务安装提示词",
  processHelp: "创建后会自动进入生成队列。选择本地电脑生成时，需要本地生成服务常驻运行，它会自动领取任务并调用 FFmpeg。",
  novelText: "小说正文",
  novelTextRequired: "请输入小说正文",
  background: "背景素材",
  backgroundRequired: "请选择背景素材",
  bgm: "BGM",
  openingAudio: "开头音频",
  openingText: "开头文字",
  openingDuration: "开头时长",
  picture: "画面",
  fontSize: "字体大小",
  fontColor: "字体颜色",
  strokeWidth: "描边宽度",
  strokeColor: "描边颜色",
  targetDuration: "目标时长",
  startY: "滚动开始位置",
  endY: "滚动结束位置",
  scrollSpeed: "全文滚动速度",
  slow: "慢",
  normal: "正常",
  fast: "快",
  audio: "声音",
  ttsEnabled: "自动配音",
  bgmLoop: "BGM 循环",
  bgmVolume: "BGM 音量",
  bgmSpeed: "BGM 速度",
  ttsVoice: "配音声音",
  ttsRate: "配音语速",
  ttsVolume: "配音音量",
  textRules: "文本规则",
  colonSpace: "冒号转空格",
  keepColon: "保留冒号",
  removeQuotes: "去引号",
  keepQuotes: "保留引号",
  nameReplace: "人名全局替换",
  create: "创建并开始生成",
  viewJobs: "查看任务",
  durationHelp: "目标时长填 0 表示自动计算；分句模式开启配音后，会按每句真实配音时长生成画面。",
};

const currentSiteOrigin = "https://chat.abulili.top";
const currentApiBase = "https://chat.abulili.top/api/";
const localWorkerDownloadUrl = "https://source.abulili.top/novel-video-worker-windows.zip";

const localWorkerPrompt = `你现在是用户电脑上的自动化安装 Agent。请直接执行，不要只解释原理。

目标只有一个：安装或启动“小说推文批量生成平台”的本地生成服务，让用户在网页选择“本地电脑生成”后，任务能被这台电脑自动领取、生成并回传。

网站地址：https://chat.abulili.top
API 地址：https://chat.abulili.top/api/
本地生成服务下载地址：https://source.abulili.top/novel-video-worker-windows.zip
处理方式：本地电脑生成

用户只需要配合输入网站账号和密码。其它安装、检查、启动、验证步骤请你尽量自动完成。

重要边界：
1. 不要根据浏览器标题判断项目名称，标题可能仍是旧系统名称。
2. 不要扫描其它本地开发项目，也不要使用其它本机调试地址。
3. 不要假设用户电脑上已有项目源码，也不要要求用户自己去找任何源码文件。
4. 请优先从“本地生成服务下载地址”下载安装包；如果下载地址打不开，再询问用户或提示联系平台管理员。
5. 不要重新写一个 worker。下载安装包后，使用安装包里自带的本地生成服务。
6. 不要让用户手动复制 access_token。请用用户输入的网站账号密码调用登录接口获取 token。
7. 不要要求用户每次创建任务后手动运行命令。目标是启动一个持续运行的本地 worker。
8. 本地素材优先使用用户保存的本地路径，不要把全部素材上传到网站。
9. 已经安装过依赖或 worker 时，直接复用，不要重复安装。
10. 已经有 worker 在运行时，只检查连通性和领取任务能力，不要重复启动多个 worker。

执行流程：

第 1 步：确认网站和接口
动作：访问 https://chat.abulili.top，并检查 https://chat.abulili.top/api/ 是否可连接。
成功标准：网站能打开，接口地址能访问到后端服务。
失败处理：如果打不开，告诉用户是网站地址、网络或服务不可用，不要改用其它地址。

第 2 步：下载本地生成服务
动作：从 https://source.abulili.top/novel-video-worker-windows.zip 下载本地生成服务安装包。
成功标准：安装包下载成功，并能解压或启动。
失败处理：如果下载地址打不开，请提示用户联系平台管理员获取本地生成服务安装包，不要自己编写新的 worker。

第 3 步：确认运行环境
动作：检查 Python 3.11 或更高版本、pip、ffmpeg、ffprobe；如果安装包已经自带运行环境，就优先使用安装包自带环境。
成功标准：Python、pip、ffmpeg、ffprobe 都能正常运行，或者安装包自带的 worker 能直接启动。
失败处理：缺什么就安装什么，安装后必须重新验证。

第 4 步：安装或复用依赖
动作：按安装包说明安装依赖；如果安装包内有一键启动脚本，优先使用一键启动脚本。
成功标准：本地生成服务可以启动。
失败处理：依赖失败时说明失败包名和原因，并尝试修复后重试。

第 5 步：登录网站
动作：向用户索要网站账号和密码，调用 https://chat.abulili.top/api/ 的登录接口获取 token。
成功标准：获取到可用 token，并能访问小说推文任务接口。
失败处理：如果登录失败，只提示账号密码错误、接口错误或网站服务异常；不要要求用户手动复制 access_token。

第 6 步：启动持续运行的 worker
动作：启动本地生成服务，让它使用 https://chat.abulili.top/api/ 主动轮询任务。
成功标准：worker 持续运行，并显示正在等待或领取“本地电脑生成”的任务。
失败处理：如果启动失败，说明具体原因，例如依赖缺失、Python 路径错误、ffmpeg 不可用、账号登录失败、安装包损坏。

第 7 步：验证任务闭环
动作：让用户在网页创建一个“本地电脑生成”的测试任务。
成功标准：worker 能领取任务，状态从等待中变为生成中，生成 final.mp4、cover.png、subtitle.srt，并把结果回传网站。
失败处理：如果失败，必须把失败原因回传到任务记录，并告诉用户失败发生在素材路径、ffmpeg、TTS、上传结果、登录凭证还是接口连接。

第 8 步：设置方便下次启动
动作：创建一个用户能双击启动的方式，例如桌面快捷方式或启动脚本。
成功标准：用户下次不用记命令，只需要双击即可启动本地生成服务。
失败处理：如果不能设置开机启动，至少创建一个清晰命名的双击启动入口。

最终汇报：
请用简短中文告诉用户：
1. 网站地址是否可访问。
2. API 地址是否可连接。
3. 本地生成服务安装包是否下载成功。
4. Python、ffmpeg、ffprobe 是否可用，或安装包是否自带可用环境。
5. worker 是否已经启动。
6. 是否能领取本地生成任务。
7. 是否完成一次测试生成。
8. 如果任务一直等待中，用户下一步应该检查什么。`;

const openLocalWorkerDownload = () => {
  window.open(localWorkerDownloadUrl, "_blank", "noopener,noreferrer");
};

const copyLocalWorkerPrompt = async () => {
  try {
    await navigator.clipboard.writeText(localWorkerPrompt);
    message.success("提示词已复制");
  } catch (error) {
    message.error("复制失败，请手动选择提示词复制");
  }
};

const localWorkerHelp = (
  <div style={{ maxWidth: 520 }}>
    <Space style={{ marginBottom: 16 }} wrap>
      <Button type="primary" icon={<CopyOutlined />} onClick={copyLocalWorkerPrompt}>
        一键复制提示词
      </Button>
      <Button onClick={openLocalWorkerDownload}>
        下载本地生成服务
      </Button>
    </Space>
    <Paragraph style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>
      {localWorkerPrompt}
    </Paragraph>
    <Text type="secondary">{"这段提示词是给用户电脑上的 AI Agent 使用的。"}</Text>
  </div>
);

function getPreviewSentence(text = "") {
  const source = String(text || "").trim();
  if (!source) return "Preview text";
  const first = source.split(/[，。！？；：,.!?;:\n]/).find((item) => item.trim());
  return (first || source).trim().slice(0, 44);
}

const PREVIEW_WIDTH = 260;
const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;
const PREVIEW_SCALE = PREVIEW_WIDTH / DESIGN_WIDTH;
const OPENING_AUDIO_MODE_OPTIONS = [
  { label: "上传音频", value: "uploaded" },
  { label: "文字自动配音", value: "tts" },
];

function normalizeOpeningLines(lines = []) {
  return (Array.isArray(lines) ? lines : [])
    .slice(0, 4)
    .map((item) => ({
      text: String(item?.text || "").trim(),
      font_size: Number(item?.font_size) || 54,
      font_color: item?.font_color || "#ffffff",
      stroke_width: Number(item?.stroke_width) || 0,
      stroke_color: item?.stroke_color || "#000000",
    }))
    .filter((item) => item.text);
}

function PreviewText({ children, values, variant = "main" }) {
  const fontSize = Number(values.font_size) || 54;
  const strokeWidth = Math.max(0, Number(values.font_stroke_width) || 0);
  const color = values.font_color || "#ffffff";
  const strokeColor = values.font_stroke_color || "#000000";
  return (
    <div
      style={{
        color,
        fontSize,
        fontWeight: 700,
        lineHeight: 1.35,
        textAlign: values.render_mode === "scrolling_text" ? "left" : "center",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxHeight: variant === "opening" ? 360 : 980,
        overflow: "hidden",
        WebkitTextStroke: strokeWidth ? `${strokeWidth}px ${strokeColor}` : "0 transparent",
        paintOrder: "stroke fill",
      }}
    >
      {children}
    </div>
  );
}

function StylePreview({ values, backgroundAsset }) {
  const [activePreview, setActivePreview] = useState("opening");
  const openingLines = normalizeOpeningLines(values.opening_lines);
  const hasOpeningPreview = Boolean(values.opening_enabled && openingLines.length);
  const previewMode = hasOpeningPreview ? activePreview : "main";
  const mainText =
    values.render_mode === "scrolling_text"
      ? String(values.novel_text || "Full text preview area").slice(0, 120)
      : getPreviewSentence(values.novel_text);
  const backgroundUrl = backgroundAsset?.url || "";
  const canPreviewBackground = Boolean(backgroundUrl);
  const scrollingStartY = Number.isFinite(Number(values.scrolling_start_y))
    ? Number(values.scrolling_start_y)
    : 1600;
  const scrollingEndY = Number.isFinite(Number(values.scrolling_end_y))
    ? Number(values.scrolling_end_y)
    : -1600;
  const scrollingPreviewY = Math.max(-900, Math.min(1850, scrollingStartY));

  return (
    <Card size="small" title="Style preview" className="novel-video-preview-card">
      {hasOpeningPreview && (
        <Tabs
          size="small"
          activeKey={activePreview}
          onChange={setActivePreview}
          items={[
            { key: "opening", label: "开头预览" },
            { key: "main", label: "正文预览" },
          ]}
        />
      )}
      <div
        style={{
          width: "100%",
          maxWidth: PREVIEW_WIDTH,
          aspectRatio: "9 / 16",
          margin: "0 auto",
          borderRadius: 8,
          overflow: "hidden",
          background: "linear-gradient(160deg, #243447 0%, #0f172a 52%, #111827 100%)",
          position: "relative",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
        }}
      >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            {canPreviewBackground && backgroundAsset?.material_type === "image" && (
              <img
                src={backgroundUrl}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            {canPreviewBackground && backgroundAsset?.material_type === "video" && (
              <video
                src={backgroundUrl}
                muted
                loop
                autoPlay
                playsInline
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            {!canPreviewBackground && backgroundAsset && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 72,
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 52,
                  textAlign: "center",
                  background: "linear-gradient(160deg, #243447 0%, #0f172a 52%, #111827 100%)",
                }}
              >
                {backgroundAsset.name}
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)" }} />
            <div style={{ position: "absolute", inset: 64 }}>
              {previewMode === "opening" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    {openingLines.map((line, index) => (
                      <div
                        key={index}
                        style={{
                          color: line.font_color,
                          fontSize: line.font_size,
                          fontWeight: 700,
                          lineHeight: 1.35,
                          WebkitTextStroke: line.stroke_width ? `${line.stroke_width}px ${line.stroke_color}` : "0 transparent",
                          paintOrder: "stroke fill",
                        }}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {previewMode === "main" && values.render_mode === "scrolling_text" && (
                <div style={{ position: "absolute", left: 0, right: 0, top: scrollingPreviewY - 64 }}>
                  <PreviewText values={values}>{mainText}</PreviewText>
                </div>
              )}
              {previewMode === "main" && values.render_mode !== "scrolling_text" && (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PreviewText values={values}>{mainText}</PreviewText>
                </div>
              )}
            </div>
            {previewMode === "main" && values.render_mode === "scrolling_text" && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: scrollingStartY,
                    borderTop: "6px solid rgba(34,197,94,0.9)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: scrollingEndY,
                    borderTop: "6px solid rgba(239,68,68,0.9)",
                  }}
                />
              </>
            )}
          </div>
      </div>
      <Text type="secondary" style={{ display: "block", marginTop: 10 }}>
        Preview only checks background, text size, stroke and layout.
      </Text>
    </Card>
  );
}

export default function NovelVideoCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [assets, setAssets] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [workerHelpOpen, setWorkerHelpOpen] = useState(false);
  const previewValues = Form.useWatch([], form) || DEFAULT_JOB_VALUES;
  const currentValues = { ...DEFAULT_JOB_VALUES, ...previewValues };

  const backgroundAssets = useMemo(() => assets.filter((item) => ["video", "image"].includes(item.material_type)), [assets]);
  const audioAssets = useMemo(() => assets.filter((item) => item.material_type === "audio"), [assets]);
  const assetOptions = (items) => items.map((item) => ({ label: assetLabel(item), value: item.id }));
  const selectedBackgroundAsset = useMemo(
    () => backgroundAssets.find((item) => item.id === currentValues.background_asset),
    [backgroundAssets, currentValues.background_asset],
  );

  useEffect(() => {
    request.get("/novel-video/assets/")
      .then((response) => setAssets(getList(response.data)))
      .catch(() => message.error(T.loadAssetsFailed));
  }, []);

  const submit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch (error) {
      message.warning(error.errorFields?.[0]?.errors?.[0] || T.required);
      return;
    }
    const openingLines = normalizeOpeningLines(values.opening_lines);
    if (values.opening_enabled && !openingLines.length) {
      message.warning("请至少填写一行开头文字");
      return;
    }
    if (values.opening_enabled && values.opening_audio_mode === "uploaded" && !values.opening_audio_asset) {
      message.warning("请选择开头配音音频");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        target_duration: values.target_duration || 0,
        name_replacements: parseNameReplacements(values.name_replacements_editor),
      };
      if (payload.opening_enabled) {
        payload.opening_lines = openingLines;
        payload.opening_text = openingLines.map((item) => item.text).join("\n");
        if (payload.opening_audio_mode === "tts") {
          payload.opening_audio_asset = null;
        }
      } else {
        payload.opening_text = "";
        payload.opening_lines = [];
        payload.opening_audio_asset = null;
        payload.opening_duration = 0;
      }
      delete payload.name_replacements_editor;
      await request.post("/novel-video/jobs/", payload);
      message.success(T.created);
      navigate("/novel-video/jobs");
    } catch (error) {
      message.error(error.response?.data?.detail || T.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, background: "#f6f8fb", minHeight: "100vh" }}>
      <Row gutter={16} align="top">
        <Col xs={24} lg={17}>
      <Card bordered={false}>
        <Form form={form} layout="vertical" initialValues={DEFAULT_JOB_VALUES}>
          <Row gutter={12}>
            <Col xs={24} md={14}><Form.Item label={T.title} name="title" rules={[{ required: true, message: T.titleRequired }]}><Input placeholder="例如：重生后我不再退让" /></Form.Item></Col>
            <Col xs={24} md={10}><Form.Item label={T.mode} name="render_mode" rules={[{ required: true }]}><Select options={RENDER_MODE_OPTIONS} /></Form.Item></Col>
          </Row>

          <Form.Item
            label={
              <Space size={4}>
                <span>{T.process}</span>
                {currentValues.process_mode === "local" && (
                  <QuestionCircleOutlined
                    style={{ color: "#8c8c8c", cursor: "pointer" }}
                    onClick={() => setWorkerHelpOpen(true)}
                  />
                )}
              </Space>
            }
            name="process_mode"
            rules={[{ required: true }]}
          >
            <Select options={PROCESS_MODE_OPTIONS} />
          </Form.Item>
          {/* <Alert type="info" showIcon style={{ marginBottom: 16 }} message={T.processHelp} /> */}
          <Form.Item label={T.novelText} name="novel_text" rules={[{ required: true, message: T.novelTextRequired }]}><TextArea rows={8} placeholder="粘贴小说片段" /></Form.Item>
          <Form.Item label={T.nameReplace}>
            <Form.List name="name_replacements_editor">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={8} key={key} align="middle">
                      <Col xs={24} md={10}>
                        <Form.Item {...restField} name={[name, "from"]} style={{ marginBottom: 0 }}>
                          <Input placeholder="要替换的名字" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={10}>
                        <Form.Item {...restField} name={[name, "to"]} style={{ marginBottom: 0 }}>
                          <Input placeholder="替换成的名字" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Button danger onClick={() => remove(name)}>删除</Button>
                      </Col>
                    </Row>
                  ))}
                  <Button onClick={() => add({ from: "", to: "" })} block style={{ color: "#1677ff", borderColor: "#1677ff", background: "#ffffff" }}>
                    增加替换
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item label={T.background} name="background_asset" rules={[{ required: true, message: T.backgroundRequired }]}><Select showSearch optionFilterProp="label" options={assetOptions(backgroundAssets)} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label={T.bgm} name="bgm_asset"><Select allowClear showSearch optionFilterProp="label" options={assetOptions(audioAssets)} /></Form.Item></Col>
          </Row>

          <Divider orientation="left">开头</Divider>
          <Form.Item label="增加开头" name="opening_enabled" valuePropName="checked"><Switch /></Form.Item>
          {currentValues.opening_enabled && (
            <>
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item label="开头配音" name="opening_audio_mode"><Select options={OPENING_AUDIO_MODE_OPTIONS} /></Form.Item></Col>
                {currentValues.opening_audio_mode === "uploaded" && (
                  <Col xs={24} md={12}><Form.Item label={T.openingAudio} name="opening_audio_asset"><Select allowClear showSearch optionFilterProp="label" options={assetOptions(audioAssets)} /></Form.Item></Col>
                )}
              </Row>
              {[0, 1, 2, 3].map((index) => (
                <Row gutter={8} key={index} align="middle">
                  <Col xs={24} md={8}><Form.Item label={`开头文字 ${index + 1}`} name={["opening_lines", index, "text"]}><Input placeholder={index === 0 ? "第一行必填，其他可选" : "可选"} /></Form.Item></Col>
                  <Col xs={8} md={4}><Form.Item label="字号" name={["opening_lines", index, "font_size"]}><InputNumber min={20} max={140} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                  <Col xs={8} md={4}><Form.Item label="颜色" name={["opening_lines", index, "font_color"]}><Input type="color" /></Form.Item></Col>
                  <Col xs={8} md={4}><Form.Item label="描边" name={["opening_lines", index, "stroke_width"]}><InputNumber min={0} max={12} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                  <Col xs={8} md={4}><Form.Item label="描边色" name={["opening_lines", index, "stroke_color"]}><Input type="color" /></Form.Item></Col>
                </Row>
              ))}
            </>
          )}

          <Divider orientation="left">{T.picture}</Divider>
          <Row gutter={12}>
            <Col xs={12} md={6}><Form.Item label={T.fontSize} name="font_size"><InputNumber min={20} max={120} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label={T.fontColor} name="font_color"><Input type="color" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label={T.strokeWidth} name="font_stroke_width"><InputNumber min={0} max={12} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label={T.strokeColor} name="font_stroke_color"><Input type="color" /></Form.Item></Col>
          </Row>
          {/* <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item label={T.targetDuration} name="target_duration"><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="文字出现时间(秒)" name="text_start_time"><InputNumber min={0} max={600} step={0.5} style={{ width: "100%" }} /></Form.Item></Col>
            {currentValues.render_mode === "scrolling_text" && (
              <Col xs={24} md={8}><Form.Item label={T.startY} name="scrolling_start_y"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            )}
            {currentValues.render_mode === "scrolling_text" && (
              <Col xs={24} md={8}><Form.Item label={T.endY} name="scrolling_end_y"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            )}
          </Row> */}
          <Form.Item label={T.scrollSpeed} name="scrolling_speed"><Slider min={0.5} max={2} step={0.1} marks={{ 0.5: T.slow, 1: T.normal, 2: T.fast }} /></Form.Item>

          <Divider orientation="left">{T.audio}</Divider>
          <Row gutter={12}>
            <Col xs={12} md={6}><Form.Item label={T.ttsEnabled} name="tts_enabled" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label={T.bgmLoop} name="bgm_loop" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label={T.bgmVolume} name="bgm_volume"><InputNumber min={0} max={1} step={0.05} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label={T.bgmSpeed} name="bgm_speed"><InputNumber min={0.5} max={2} step={0.1} style={{ width: "100%" }} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item label={T.ttsVoice} name="tts_voice"><Select showSearch options={[{ label: "Xiaoxiao", value: "zh-CN-XiaoxiaoNeural" }, { label: "Yunxi", value: "zh-CN-YunxiNeural" }, { label: "Xiaoyi", value: "zh-CN-XiaoyiNeural" }, { label: "Yunyang", value: "zh-CN-YunyangNeural" }]} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label={T.ttsRate} name="tts_rate"><Select options={[{ label: "-20%", value: "-20%" }, { label: "-10%", value: "-10%" }, { label: "+0%", value: "+0%" }, { label: "+10%", value: "+10%" }, { label: "+20%", value: "+20%" }]} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label={T.ttsVolume} name="tts_volume"><Select options={[{ label: "+0%", value: "+0%" }, { label: "+20%", value: "+20%" }, { label: "-20%", value: "-20%" }]} /></Form.Item></Col>
          </Row>

          <Divider orientation="left">{T.textRules}</Divider>
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item name={["text_rules", "replace_colon_with_space"]} valuePropName="checked"><Switch checkedChildren={T.colonSpace} unCheckedChildren={T.keepColon} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name={["text_rules", "remove_quotes"]} valuePropName="checked"><Switch checkedChildren={T.removeQuotes} unCheckedChildren={T.keepQuotes} /></Form.Item></Col>
          </Row>
          {/* <Alert type="info" showIcon style={{ marginBottom: 16 }} message={T.durationHelp} /> */}
          <Space>
            <Button type="primary" icon={<PlayCircleOutlined />} loading={submitting} onClick={submit}>{T.create}</Button>
            <Button onClick={() => navigate("/novel-video/jobs")}>{T.viewJobs}</Button>
          </Space>
        </Form>
      </Card>
        </Col>
        <Col xs={24} lg={7} style={{ minHeight: 520 }}>
          <StylePreview values={currentValues} backgroundAsset={selectedBackgroundAsset} />
        </Col>
      </Row>
      <Drawer
        title={T.processTipTitle}
        width={560}
        open={workerHelpOpen}
        onClose={() => setWorkerHelpOpen(false)}
        bodyStyle={{ maxHeight: "calc(100vh - 108px)", overflowY: "auto" }}
      >
        {localWorkerHelp}
      </Drawer>
    </div>
  );
}
