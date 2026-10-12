import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import request from "../../utils/request";
import {
  assetLabel,
  DEFAULT_JOB_VALUES,
  getList,
  nameReplacementsToText,
  parseNameReplacements,
  PROCESS_MODE_OPTIONS,
  RENDER_MODE_OPTIONS,
  STATUS_MAP,
} from "./helpers";

const { Link, Text } = Typography;
const { TextArea } = Input;
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

const T = {
  loadFailed: "加载任务失败",
  required: "请先补全必填项",
  saved: "任务已更新",
  saveFailed: "保存任务失败",
  queuedLocal: "任务已进入本地生成队列",
  queuedServer: "任务已加入服务器生成队列",
  startFailed: "重新生成失败",
  localTitle: "等待本地生成服务领取任务",
  localLine1: "任务创建后会自动进入队列，不需要每条手动点生成。",
  localLine2: "如果状态一直是等待中，说明本地生成服务还没有启动或还没有领取到任务。",
  localLine3: "生成完成后，这里会显示视频、封面和字幕链接。",
  ok: "知道了",
  deleteTitle: "删除任务",
  deleteOk: "删除",
  cancel: "取消",
  deleted: "任务已删除",
  waitWorker: "等待本地生成服务领取",
  running: "生成中",
  failed: "生成失败",
  noResult: "暂无结果",
  video: "视频",
  cover: "封面",
  subtitle: "字幕",
  title: "标题",
  mode: "模式",
  process: "处理方式",
  status: "状态",
  duration: "耗时",
  result: "结果",
  action: "操作",
  scrolling: "全文滚动",
  sentence: "分句推文",
  local: "本地生成",
  server: "服务器生成",
  regenerate: "重新生成",
  edit: "编辑",
  refresh: "刷新",
  newJob: "新建任务",
  editJob: "编辑任务",
  novelText: "小说正文",
  background: "背景素材",
  bgm: "BGM",
  openingAudio: "开头音频",
  openingText: "开头文字",
  openingDuration: "开头时长",
  targetDuration: "目标时长",
  fontSize: "字体大小",
  fontColor: "字体颜色",
  strokeWidth: "描边宽度",
  strokeColor: "描边颜色",
  scrollSpeed: "滚动速度",
  bgmVolume: "BGM 音量",
  bgmSpeed: "BGM 速度",
  ttsEnabled: "自动配音",
  bgmLoop: "BGM 循环",
  ttsRate: "配音语速",
  ttsVoice: "配音声音",
  nameReplace: "人名全局替换",
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
    <Typography.Paragraph style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>
      {localWorkerPrompt}
    </Typography.Paragraph>
    <Text type="secondary">{"这段提示词是给用户电脑上的 AI Agent 使用的。"}</Text>
  </div>
);

function statusTag(status) {
  const item = STATUS_MAP[status] || { text: status || "-", color: "default" };
  return <Tag color={item.color}>{item.text}</Tag>;
}

export default function NovelVideoJobs() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [jobs, setJobs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [workerHelpOpen, setWorkerHelpOpen] = useState(false);
  const editRenderMode = Form.useWatch("render_mode", form) || editing?.render_mode || DEFAULT_JOB_VALUES.render_mode;
  const editProcessMode = Form.useWatch("process_mode", form) || editing?.process_mode || DEFAULT_JOB_VALUES.process_mode;
  const editOpeningEnabled = Form.useWatch("opening_enabled", form) ?? editing?.opening_enabled ?? DEFAULT_JOB_VALUES.opening_enabled;
  const editOpeningAudioMode = Form.useWatch("opening_audio_mode", form) || editing?.opening_audio_mode || DEFAULT_JOB_VALUES.opening_audio_mode;

  const backgroundAssets = useMemo(() => assets.filter((item) => ["video", "image"].includes(item.material_type)), [assets]);
  const audioAssets = useMemo(() => assets.filter((item) => item.material_type === "audio"), [assets]);
  const assetOptions = (items) => items.map((item) => ({ label: assetLabel(item), value: item.id }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsResponse, assetsResponse] = await Promise.all([
        request.get("/novel-video/jobs/"),
        request.get("/novel-video/assets/"),
      ]);
      setJobs(getList(jobsResponse.data));
      setAssets(getList(assetsResponse.data));
    } catch (error) {
      message.error(T.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (record) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      ...record,
      opening_lines: record.opening_lines?.length ? record.opening_lines : DEFAULT_JOB_VALUES.opening_lines,
      opening_audio_mode: record.opening_audio_mode || DEFAULT_JOB_VALUES.opening_audio_mode,
      background_asset: record.background_asset || undefined,
      bgm_asset: record.bgm_asset || undefined,
      opening_audio_asset: record.opening_audio_asset || undefined,
      name_replacements_editor: nameReplacementsToText(record.name_replacements),
    });
    setModalOpen(true);
  };

  const saveJob = async () => {
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
      await request.patch(`/novel-video/jobs/${editing.id}/`, payload);
      message.success(T.saved);
      setModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.detail || T.saveFailed);
    }
  };

  const regenerateJob = async (record) => {
    try {
      await request.post(`/novel-video/jobs/${record.id}/start/`);
      if (record.process_mode === "local") {
        message.success(T.queuedLocal);
        Modal.info({
          title: T.localTitle,
          content: (
            <div>
              <p>{T.localLine1}</p>
              <p>{T.localLine2}</p>
              <p>{T.localLine3}</p>
            </div>
          ),
          okText: T.ok,
        });
      } else {
        message.success(T.queuedServer);
      }
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || T.startFailed);
    }
  };

  const deleteJob = (record) => {
    Modal.confirm({
      title: T.deleteTitle,
      content: `确定删除「${record.title}」吗？生成结果文件也会一起删除。`,
      okText: T.deleteOk,
      okButtonProps: { danger: true },
      cancelText: T.cancel,
      onOk: async () => {
        await request.delete(`/novel-video/jobs/${record.id}/`);
        message.success(T.deleted);
        fetchData();
      },
    });
  };

  const renderResult = (record) => {
    const hasOutput = record.final_url || record.cover_url || record.subtitle_url || record.final_path;
    if (!hasOutput) {
      if (record.process_mode === "local" && record.status === "pending") return <Text type="secondary">{T.waitWorker}</Text>;
      if (record.status === "running") return <Text type="secondary">{T.running}</Text>;
      if (record.status === "failed") return <Text type="danger">{T.failed}: {record.error_message && <Text type="danger">{record.error_message.slice(0, 36)}</Text>}</Text>;
      return <Text type="secondary">{T.noResult}</Text>;
    }
    return (
      <Space direction="vertical" size={2}>
        <Space>
          {record.final_url && (
            <>
              <Button size="small" icon={<EyeOutlined />} href={record.final_url} target="_blank">
                View
              </Button>
              <Button size="small" icon={<DownloadOutlined />} href={record.final_url} download>
                Download
              </Button>
            </>
          )}
          {record.cover_url && <Link href={record.cover_url} target="_blank">{T.cover}</Link>}
          {record.subtitle_url && <Link href={record.subtitle_url} target="_blank">{T.subtitle}</Link>}
        </Space>
        {/* {record.final_path && <Text copyable type="secondary" style={{ maxWidth: 360 }} ellipsis>{record.final_path}</Text>} */}
      </Space>
    );
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    { title: T.title, dataIndex: "title" },
    { title: T.mode, dataIndex: "render_mode", render: (value) => (value === "scrolling_text" ? T.scrolling : T.sentence), width:70 },
    { title: T.process, dataIndex: "process_mode", render: (value) => (value === "local" ? <Tag color="gold">{T.local}</Tag> : <Tag color="blue">{T.server}</Tag>) },
    { title: T.status, dataIndex: "status", render: statusTag },
    { title: T.duration, dataIndex: "duration", render: (value) => (value ? `${value}s` : "-") },
    { title: T.result, width: 420, render: (_, record) => renderResult(record) },
    {
      title: T.action,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<PlayCircleOutlined />} disabled={record.status === "running"} onClick={() => regenerateJob(record)}>
            {T.regenerate}
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>{T.edit}</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteJob(record)}>{T.deleteOk}</Button>
          
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f6f8fb", minHeight: "calc(100vh - 64px)" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col />
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>{T.refresh}</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/novel-video/create")}>{T.newJob}</Button>
          </Space>
        </Col>
      </Row>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={jobs} />

      <Modal title={T.editJob} open={modalOpen} onOk={saveJob} onCancel={() => setModalOpen(false)} width={920} destroyOnClose>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={14}><Form.Item label={T.title} name="title" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={10}><Form.Item label={T.mode} name="render_mode" rules={[{ required: true }]}><Select options={RENDER_MODE_OPTIONS} /></Form.Item></Col>
          </Row>
          <Form.Item
            label={
              <Space size={4}>
                <span>{T.process}</span>
                {editProcessMode === "local" && (
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
          <Form.Item label={T.novelText} name="novel_text" rules={[{ required: true }]}><TextArea rows={5} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item label={T.background} name="background_asset" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={assetOptions(backgroundAssets)} /></Form.Item></Col>
            <Col span={12}><Form.Item label={T.bgm} name="bgm_asset"><Select allowClear showSearch optionFilterProp="label" options={assetOptions(audioAssets)} /></Form.Item></Col>
          </Row>
          <Form.Item label="增加开头" name="opening_enabled" valuePropName="checked"><Switch /></Form.Item>
          {editOpeningEnabled && (
            <>
              <Row gutter={12}>
                <Col span={12}><Form.Item label="开头配音" name="opening_audio_mode"><Select options={OPENING_AUDIO_MODE_OPTIONS} /></Form.Item></Col>
                {editOpeningAudioMode === "uploaded" && (
                  <Col span={12}><Form.Item label={T.openingAudio} name="opening_audio_asset"><Select allowClear showSearch optionFilterProp="label" options={assetOptions(audioAssets)} /></Form.Item></Col>
                )}
              </Row>
              {[0, 1, 2, 3].map((index) => (
                <Row gutter={8} key={index} align="middle">
                  <Col span={8}><Form.Item label={`开头文字 ${index + 1}`} name={["opening_lines", index, "text"]}><Input /></Form.Item></Col>
                  <Col span={4}><Form.Item label="字号" name={["opening_lines", index, "font_size"]}><InputNumber min={20} max={140} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                  <Col span={4}><Form.Item label="颜色" name={["opening_lines", index, "font_color"]}><Input type="color" /></Form.Item></Col>
                  <Col span={4}><Form.Item label="描边" name={["opening_lines", index, "stroke_width"]}><InputNumber min={0} max={12} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                  <Col span={4}><Form.Item label="描边色" name={["opening_lines", index, "stroke_color"]}><Input type="color" /></Form.Item></Col>
                </Row>
              ))}
            </>
          )}
          <Row gutter={12}>
            <Col span={6}><Form.Item label={T.targetDuration} name="target_duration"><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}><Form.Item label={T.fontSize} name="font_size"><InputNumber min={20} max={120} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={6}><Form.Item label={T.fontColor} name="font_color"><Input type="color" /></Form.Item></Col>
            <Col span={6}><Form.Item label={T.strokeWidth} name="font_stroke_width"><InputNumber min={0} max={12} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={6}><Form.Item label={T.strokeColor} name="font_stroke_color"><Input type="color" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}><Form.Item label="文字出现时间(秒)" name="text_start_time"><InputNumber min={0} max={600} step={0.5} style={{ width: "100%" }} /></Form.Item></Col>
            {editRenderMode === "scrolling_text" && (
              <Col span={6}><Form.Item label="滚动开始位置" name="scrolling_start_y"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            )}
            {editRenderMode === "scrolling_text" && (
              <Col span={6}><Form.Item label="滚动结束位置" name="scrolling_end_y"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            )}
            {editRenderMode === "scrolling_text" && (
              <Col span={6}><Form.Item label={T.scrollSpeed} name="scrolling_speed"><InputNumber min={0.5} max={2} step={0.1} style={{ width: "100%" }} /></Form.Item></Col>
            )}
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item label={T.bgmVolume} name="bgm_volume"><InputNumber min={0} max={1} step={0.05} style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={8}><Form.Item label={T.bgmSpeed} name="bgm_speed"><InputNumber min={0.5} max={2} step={0.1} style={{ width: "100%" }} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}><Form.Item label={T.ttsEnabled} name="tts_enabled" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={6}><Form.Item label={T.bgmLoop} name="bgm_loop" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={6}><Form.Item label={T.ttsRate} name="tts_rate"><Select options={[{ label: "-20%", value: "-20%" }, { label: "+0%", value: "+0%" }, { label: "+20%", value: "+20%" }]} /></Form.Item></Col>
            <Col span={6}><Form.Item label={T.ttsVoice} name="tts_voice"><Select showSearch options={[{ label: "Xiaoxiao", value: "zh-CN-XiaoxiaoNeural" }, { label: "Yunxi", value: "zh-CN-YunxiNeural" }, { label: "Xiaoyi", value: "zh-CN-XiaoyiNeural" }, { label: "Yunyang", value: "zh-CN-YunyangNeural" }]} /></Form.Item></Col>
          </Row>
          <Form.Item label={T.nameReplace}>
            <Form.List name="name_replacements_editor">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={8} key={key} align="middle">
                      <Col span={10}>
                        <Form.Item {...restField} name={[name, "from"]} style={{ marginBottom: 0 }}>
                          <Input placeholder="要替换的名字" />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item {...restField} name={[name, "to"]} style={{ marginBottom: 0 }}>
                          <Input placeholder="替换成的名字" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
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
        </Form>
      </Modal>
      <Drawer
        title="本地生成服务安装提示词"
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
