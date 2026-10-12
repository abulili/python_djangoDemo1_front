import { useEffect, useState } from "react";
import axios from "axios";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderAddOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import request from "../../utils/request";
import { getList, MATERIAL_TYPE_OPTIONS, parseTags, tagsToText } from "./helpers";

const { Link, Text } = Typography;

export default function NovelVideoAssets() {
  const [form] = Form.useForm();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploadFileList, setUploadFileList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const formatBytes = (bytes = 0) => {
    const value = Number(bytes || 0);
    if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
    return `${value} B`;
  };

  const getErrorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (data && typeof data === "object") {
      const firstValue = Object.values(data)[0];
      if (Array.isArray(firstValue)) return firstValue[0];
      if (typeof firstValue === "string") return firstValue;
    }
    if (error?.code === "ECONNABORTED") return "上传超时，请检查文件大小、网络或服务器上传限制";
    if (error?.message === "Network Error") return "网络连接失败，可能是 R2 CORS 或反向代理限制";
    return fallback;
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await request.get("/novel-video/assets/");
      setAssets(getList(response.data));
    } catch (error) {
      message.error("加载素材失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const openCreate = (storageType) => {
    setEditing(null);
    setUploadFileList([]);
    setUploadPercent(0);
    form.resetFields();
    form.setFieldsValue({
      storage_type: storageType,
      material_type: "video",
      commercial_use: true,
      is_shared: false,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setUploadFileList([]);
    setUploadPercent(0);
    form.resetFields();
    form.setFieldsValue({
      ...record,
      tags_text: tagsToText(record.tags),
    });
    setModalOpen(true);
  };

  const uploadAssetDirectly = async (file, values, tags) => {
    const contentType = file.type || "application/octet-stream";
    const prepareResponse = await request.post("/novel-video/assets/direct-upload-url/", {
      filename: file.name,
      content_type: contentType,
      file_size: file.size,
    });

    const prepareData = prepareResponse.data?.data || prepareResponse.data;
    await axios.put(prepareData.upload_url, file, {
      headers: prepareData.headers || { "Content-Type": contentType },
      timeout: 30 * 60 * 1000,
      onUploadProgress: (event) => {
        if (!event.total) return;
        setUploadPercent(Math.min(99, Math.round((event.loaded * 100) / event.total)));
      },
    });

    setUploadPercent(100);
    await request.post("/novel-video/assets/complete-direct-upload/", {
      key: prepareData.key,
      name: values.name,
      material_type: values.material_type,
      style: values.style || "",
      tags,
      is_shared: values.is_shared || false,
      commercial_use: values.commercial_use ?? true,
      file_size: file.size,
      content_type: contentType,
    });
  };

  const saveAsset = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch (error) {
      message.warning(error.errorFields?.[0]?.errors?.[0] || "请先补全必填项");
      return;
    }

    const tags = parseTags(values.tags_text);

    try {
      setSaving(true);
      if (editing) {
        await request.patch(`/novel-video/assets/${editing.id}/`, {
          name: values.name,
          material_type: values.material_type,
          local_path: values.local_path || "",
          style: values.style || "",
          tags,
          is_shared: values.is_shared || false,
          commercial_use: values.commercial_use ?? true,
        });
        message.success("素材已更新");
      } else if (values.storage_type === "upload") {
        const file = uploadFileList[0]?.originFileObj;
        if (!file) {
          message.warning("请选择素材文件");
          return;
        }

        setUploadPercent(0);
        await uploadAssetDirectly(file, values, tags);
        message.success("素材已上传");
      } else {
        await request.post("/novel-video/assets/", {
          name: values.name,
          material_type: values.material_type,
          storage_type: "local",
          local_path: values.local_path,
          style: values.style || "",
          tags,
          is_shared: values.is_shared || false,
          commercial_use: values.commercial_use ?? true,
        });
        message.success("本地素材已登记");
      }

      setModalOpen(false);
      fetchAssets();
    } catch (error) {
      message.error(getErrorMessage(error, "保存素材失败"));
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (record) => {
    Modal.confirm({
      title: "删除素材",
      content: `确定删除「${record.name}」吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await request.delete(`/novel-video/assets/${record.id}/`);
        message.success("素材已删除");
        fetchAssets();
      },
    });
  };

  const probeAsset = async (record) => {
    try {
      await request.post(`/novel-video/assets/${record.id}/probe/`);
      message.success("素材信息已刷新");
      fetchAssets();
    } catch (error) {
      message.error(getErrorMessage(error, "识别素材信息失败"));
    }
  };

  const columns = [
    { title: "名称", dataIndex: "name" },
    {
      title: "类型",
      dataIndex: "material_type",
      render: (value) => MATERIAL_TYPE_OPTIONS.find((item) => item.value === value)?.label || value,
    },
    {
      title: "来源",
      dataIndex: "storage_type",
      render: (value) => <Tag color={value === "upload" ? "blue" : "default"}>{value === "upload" ? "上传" : "本地"}</Tag>,
    },
    { title: "风格", dataIndex: "style", render: (value) => value || "-" },
    { title: "时长", dataIndex: "duration", render: (value) => (value ? `${value}s` : "-") },
    { title: "大小", dataIndex: "file_size", render: (value) => (value ? formatBytes(value) : "-") },
    { title: "共享", dataIndex: "is_shared", render: (value) => (value ? <Tag color="green">共享</Tag> : "-") },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => probeAsset(record)}>识别</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteAsset(record)}>删除</Button>
          {record.url && <Link href={record.url} target="_blank">打开</Link>}
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
            <Button icon={<ReloadOutlined />} onClick={fetchAssets} loading={loading}>刷新</Button>
            <Button icon={<FolderAddOutlined />} onClick={() => openCreate("local")}>登记本地素材</Button>
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => openCreate("upload")}>上传素材</Button>
          </Space>
        </Col>
      </Row>

      <Card bordered={false}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={assets} />
      </Card>

      <Modal
        title={editing ? "编辑素材" : "新增素材"}
        open={modalOpen}
        onOk={saveAsset}
        confirmLoading={saving}
        okButtonProps={{ disabled: saving }}
        cancelButtonProps={{ disabled: saving }}
        maskClosable={!saving}
        keyboard={!saving}
        onCancel={() => {
          if (!saving) setModalOpen(false);
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="storage_type" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: "请输入素材名称" }]}>
            <Input disabled={saving} />
          </Form.Item>
          <Form.Item label="类型" name="material_type" rules={[{ required: true }]}>
            <Select disabled={saving} options={MATERIAL_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.storage_type !== next.storage_type}>
            {({ getFieldValue }) => (
              getFieldValue("storage_type") === "upload" && !editing ? (
                <Form.Item label="素材文件" required>
                  <Upload
                    beforeUpload={() => false}
                    maxCount={1}
                    fileList={uploadFileList}
                    disabled={saving}
                    accept="video/*,audio/*,image/*"
                    onChange={({ fileList }) => {
                      setUploadFileList(fileList);
                      setUploadPercent(0);
                    }}
                  >
                    <Button icon={<CloudUploadOutlined />} loading={saving}>选择文件</Button>
                  </Upload>
                  {uploadFileList[0]?.originFileObj && (
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary">
                        {uploadFileList[0].originFileObj.name} · {formatBytes(uploadFileList[0].originFileObj.size)}
                      </Text>
                      {saving && (
                        <Progress
                          percent={uploadPercent}
                          status={uploadPercent >= 100 ? "success" : "active"}
                          style={{ marginTop: 8 }}
                        />
                      )}
                    </div>
                  )}
                </Form.Item>
              ) : (
                <Form.Item label="本地路径" name="local_path" rules={[{ required: getFieldValue("storage_type") === "local", message: "请输入本地文件路径" }]}>
                  <Input placeholder="E:\\videos\\bg.mp4" disabled={saving || editing?.storage_type === "upload"} />
                </Form.Item>
              )
            )}
          </Form.Item>
          <Form.Item label="风格" name="style">
            <Input disabled={saving} placeholder="都市、玄幻、悬疑、情感" />
          </Form.Item>
          <Form.Item label="标签" name="tags_text">
            <Input disabled={saving} placeholder="逗号分隔，例如：夜景,城市,压抑" />
          </Form.Item>
          <Form.Item label="共享给其他用户" name="is_shared" valuePropName="checked">
            <Switch disabled={saving} />
          </Form.Item>
          <Form.Item label="可商用" name="commercial_use" valuePropName="checked">
            <Switch disabled={saving} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
