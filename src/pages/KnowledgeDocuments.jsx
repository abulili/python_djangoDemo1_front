import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Form,
    Input,
    InputNumber,
    Layout,
    List,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
    ReloadOutlined,
    RobotOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import request from "../utils/request";
import { getLatestTraceId } from "../utils/trace";

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

const searchTypeOptions = [
    { label: "关键词检索", value: "keyword" },
    { label: "向量检索", value: "vector" },
    { label: "混合检索", value: "hybrid" },
];

const toolNameMap = {
    conversation_memory: "会话记忆",
    retrieve_knowledge: "知识检索",
    workflow_summary: "工作流摘要",
};

const KnowledgeDocuments = () => {
    const navigate = useNavigate();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);

    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    /**
    * 等价于
       const formList = Form.useForm();
       const form = formList[0];
    */

    const [chunkDrawerOpen, setChunkDrawerOpen] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(null);

    const [agentForm] = Form.useForm();
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentResult, setAgentResult] = useState(null);
    const [agentTraceId, setAgentTraceId] = useState("");

    const [promptTemplates, setPromptTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);


    const fetchPromptTemplates = async () => {
        try {
            const res = await request.get("/prompt-templates/");
            setPromptTemplates(res.data.results || res.data || []);
        } catch (error) {
            setPromptTemplates([]);
        }
    };

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await request.get("/knowledge-documents/");
            const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setDocuments(list);
        } catch (error) {
            message.error("知识库文档加载失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchPromptTemplates();
    }, []);

    const openCreate = () => {
        form.resetFields();
        setOpen(true);
    };

    const handleSave = async () => {
        const values = await form.validateFields();

        try {
            await request.post("/knowledge-documents/", {
                title: values.title,
                content: values.content,
            });
            message.success("文档创建并自动切片");
            setOpen(false);
            fetchDocuments();
        } catch (error) {
            message.error("文档保存失败");
        }
    };

    const handleDelete = async (id) => {
        try {
            await request.delete(`/knowledge-documents/${id}/`);
            message.success("文档已删除");
            fetchDocuments();
        } catch (error) {
            message.error("文档删除失败");
        }
    };

    const openChunks = (record) => {
        setCurrentDocument(record);
        setChunkDrawerOpen(true);
    };

    const createRequestId = () => {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `agent-${Date.now()}`;
    };

    const handleAgentAsk = async () => {
        const values = await agentForm.validateFields();

        try {
            setAgentLoading(true);
            setAgentTraceId("");

            let askUrl = "/knowledge-documents/agent-ask/";

            if (values.agent_type === "langchain") {
                askUrl = "/knowledge-documents/langchain-agent-ask/";
            }

            if (values.agent_type === "multi_agent") {
                askUrl = "/knowledge-documents/multi-agent-ask/";
            }
            const payload = {
                query: values.query,
                top_k: values.top_k || 3,
                search_type: values.search_type || "hybrid",
                conversation_id: values.conversation_id || undefined,
                request_id: createRequestId(),
            };
            if (values.agent_type === "multi_agent") {
                payload.router_type = values.router_type || "rule";
            }

            const response = await request.post(askUrl, payload);

            setAgentResult(response.data.data);
            setAgentTraceId(response.headers?.["x-trace-id"] || getLatestTraceId());
            message.success("Agent 问答完成");
        } catch (error) {
            message.error(error.response?.data?.message || "Agent 问答失败");
        } finally {
            setAgentLoading(false);
        }
    };

    const displayedTools = agentResult?.tools || (agentResult?.agents || []).map((name) => ({
        tool: name,
        description: `Multi-Agent 调用了 ${name} agent`,
    }));

    const columns = [
        {
            title: "标题",
            dataIndex: "title",
            width: 220,
        },
        {
            title: "内容",
            dataIndex: "content",
            ellipsis: true,
        },
        {
            title: "切片数",
            dataIndex: "chunk_count",
            width: 100,
            render: (value) => <Tag color="blue">{value || 0}</Tag>,
        },
        {
            title: "更新时间",
            dataIndex: "updated_at",
            width: 190,
            render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        },
        {
            title: "操作",
            width: 170,
            render: (_, record) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => openChunks(record)}>
                        切片
                    </Button>
                    <Popconfirm title="确认删除这个文档？" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header style={{ background: "#fff", padding: "0 24px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%" }}>
                    <Title level={3} style={{ margin: 0 }}>
                        知识库文档
                    </Title>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/logs")}>
                            返回日志
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchDocuments}>
                            刷新
                        </Button>
                        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
                            新增文档
                        </Button>
                    </Space>
                </div>
            </Header>

            <Content style={{ padding: 24 }}>
                <Card
                    title={
                        <Space>
                            <RobotOutlined />
                            <span>Agent 工具编排问答</span>
                        </Space>
                    }
                    style={{ marginBottom: 16 }}
                >
                    <Form
                        form={agentForm}
                        layout="vertical"
                        initialValues={{
                            agent_type: "native",
                            search_type: "hybrid",
                            router_type: "rule",
                            top_k: 3,
                        }}
                    >
                        <Form.Item
                            name="query"
                            label="问题"
                            rules={[{ required: true, message: "请输入问题" }]}
                        >
                            <TextArea rows={3} placeholder="例如：这笔付款申请要不要审批？旧 token 为什么会失效？" />
                        </Form.Item>

                        <Space align="start" wrap>
                            <Form.Item name="agent_type" label="Agent 模式">
                                <Select
                                    style={{ width: 180 }}
                                    options={[
                                        { label: "原生 Agent", value: "native" },
                                        { label: "LangChain Agent", value: "langchain" },
                                        { label: "Multi-Agent", value: "multi_agent" },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item
                                noStyle
                                shouldUpdate={(prev, cur) => prev.agent_type !== cur.agent_type}
                            >
                                {({ getFieldValue }) =>
                                    getFieldValue("agent_type") === "multi_agent" ? (
                                        <Form.Item name="router_type" label="路由方式">
                                            <Select
                                                style={{ width: 180 }}
                                                options={[
                                                    { label: "规则路由", value: "rule" },
                                                    { label: "关键词路由", value: "key" },
                                                    { label: "JEV 路由", value: "jev" },
                                                    { label: "Supervisor 路由", value: "supervisor" },
                                                ]}
                                            />
                                        </Form.Item>
                                    ) : null
                                }
                            </Form.Item>
                            <Form.Item name="search_type" label="检索模式">
                                <Select style={{ width: 160 }} options={searchTypeOptions} />
                            </Form.Item>

                            <Form.Item name="top_k" label="召回数量">
                                <InputNumber min={1} max={10} style={{ width: 120 }} />
                            </Form.Item>

                            <Form.Item name="conversation_id" label="会话 ID">
                                <Input style={{ width: 280 }} placeholder="可选，不填由后端生成" />
                            </Form.Item>
                            <Form.Item name="template_name" label="业务模板">
                                <Select
                                    allowClear
                                    placeholder="可选：选择业务 Prompt 模板"
                                    options={promptTemplates.map((item) => ({
                                        label: item.name,
                                        value: item.name,
                                    }))}
                                    onChange={(name) => {
                                        const template = promptTemplates.find((item) => item.name === name);
                                        setSelectedTemplate(template || null);
                                    }}
                                />
                            </Form.Item>
                            {selectedTemplate?.variables?.map((name) => (
                                <Form.Item key={name} name={["template_vars", name]} label={name}>
                                    <Input placeholder={`请输入 ${name}`} />
                                </Form.Item>
                            ))}

                            <Form.Item label=" ">
                                <Button
                                    type="primary"
                                    icon={<SearchOutlined />}
                                    loading={agentLoading}
                                    onClick={handleAgentAsk}
                                >
                                    开始问答
                                </Button>
                            </Form.Item>
                        </Space>
                    </Form>

                    {agentResult && (
                        <div style={{ marginTop: 16 }}>
                            <Alert
                                type="success"
                                showIcon
                                message="Agent 回答"
                                description={<Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{agentResult.answer}</Paragraph>}
                            />

                            <Descriptions
                                size="small"
                                bordered
                                column={3}
                                style={{ marginTop: 16 }}
                                items={[
                                    {
                                        key: "framework",
                                        label: "编排框架",
                                        children: agentResult.framework || "native-agent",
                                    },
                                    {
                                        key: "router_type",
                                        label: "路由方式",
                                        children: agentResult.router_type || "-",
                                    },
                                    {
                                        key: "agents",
                                        label: "调用 Agent",
                                        children: (agentResult.agents || []).join(" / ") || "-",
                                    },
                                    {
                                        key: "supervisor_reason",
                                        label: "Supervisor 理由",
                                        children: agentResult.supervisor_reason || "-",
                                    },
                                    {
                                        key: "jev_usage",
                                        label: "JEV Tokens",
                                        children: agentResult.jev_usage?.total_tokens || "-",
                                    },
                                    { key: "search_type", label: "检索模式", children: agentResult.search_type || "-" },
                                    { key: "conversation_id", label: "会话 ID", children: agentResult.conversation_id || "-" },
                                    { key: "trace_id", label: "Trace ID", children: agentTraceId || "-" },
                                    { key: "idempotent", label: "幂等复用", children: agentResult.idempotent ? "是" : "否" },
                                ]}
                            />
                            {agentTraceId && (
                                <Button
                                    style={{ marginTop: 12 }}
                                    onClick={() => navigate(`/logs?trace_id=${agentTraceId}`)}
                                >
                                    查看链路
                                </Button>
                            )}

                            <Title level={5} style={{ marginTop: 16 }}>
                                工具调用
                            </Title>
                            <List
                                bordered
                                dataSource={displayedTools}
                                renderItem={(tool) => (
                                    <List.Item>
                                        <Space direction="vertical" style={{ width: "100%" }}>
                                            <Space>
                                                <Tag color="purple">{toolNameMap[tool.tool] || tool.tool}</Tag>
                                                <Text code>{tool.tool}</Text>
                                            </Space>
                                            <Text type="secondary">{tool.description}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />

                            <Title level={5} style={{ marginTop: 16 }}>
                                引用片段
                            </Title>
                            <List
                                bordered
                                dataSource={agentResult.references || []}
                                locale={{ emptyText: "暂无引用片段" }}
                                renderItem={(item) => (
                                    <List.Item>
                                        <Space direction="vertical" style={{ width: "100%" }}>
                                            <Space wrap>
                                                <Tag color="blue">{item.document_title}</Tag>
                                                <Tag>chunk {item.chunk_index}</Tag>
                                                <Tag color={item.has_embedding ? "green" : "default"}>
                                                    {item.has_embedding ? "已向量化" : "未向量化"}
                                                </Tag>
                                                <Tag color="gold">总分 {Number(item.score || 0).toFixed(3)}</Tag>
                                                <Tag>关键词 {Number(item.keyword_score || 0).toFixed(3)}</Tag>
                                                <Tag>向量 {Number(item.vector_score || 0).toFixed(3)}</Tag>
                                            </Space>
                                            <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                                                {item.content}
                                            </Paragraph>
                                        </Space>
                                    </List.Item>
                                )}
                            />

                            {agentResult.router_type && (
                                <>
                                    <Title level={5} style={{ marginTop: 16 }}>
                                        路由详情
                                    </Title>
                                    <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 6 }}>
                                        {JSON.stringify({
                                            router_type: agentResult.router_type,
                                            key_evaluation: agentResult.key_evaluation,
                                            jev_evaluation: agentResult.jev_evaluation,
                                            jev_usage: agentResult.jev_usage,
                                            supervisor_reason: agentResult.supervisor_reason,
                                            supervisor_usage: agentResult.supervisor_usage,
                                        }, null, 2)}
                                    </pre>
                                </>
                            )}
                        </div>
                    )}
                </Card>

                <Table
                    loading={loading}
                    columns={columns}
                    dataSource={documents}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 条`,
                    }}
                />
            </Content>

            <Modal
                title="新增知识库文档"
                open={open}
                onOk={handleSave}
                onCancel={() => setOpen(false)}
                okText="保存"
                cancelText="取消"
                width={760}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="title"
                        label="文档标题"
                        rules={[{ required: true, message: "请输入文档标题" }]}
                    >
                        <Input placeholder="例如：AI 日志项目说明" />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="文档内容"
                        rules={[{ required: true, message: "请输入文档内容" }]}
                    >
                        <TextArea rows={12} placeholder="粘贴项目说明、接口文档、面试讲法等内容" />
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title={currentDocument?.title || "文档切片"}
                open={chunkDrawerOpen}
                onClose={() => setChunkDrawerOpen(false)}
                size="large"
            >
                {(currentDocument?.chunks || []).map((chunk) => (
                    <div
                        key={chunk.id}
                        style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}
                    >
                        <Tag color="blue">chunk {chunk.chunk_index}</Tag>
                        <Paragraph style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{chunk.content}</Paragraph>
                    </div>
                ))}
            </Drawer>
        </Layout>
    );
};

export default KnowledgeDocuments;