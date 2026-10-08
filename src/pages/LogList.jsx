import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    AppstoreOutlined,
    ApiOutlined,
    ApartmentOutlined,
    BookOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    DollarOutlined,
    FileTextOutlined,
    LogoutOutlined,
    PlusOutlined,
    ReloadOutlined,
    RobotOutlined,
    ThunderboltOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import {
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
    Input,
    Layout,
    Row,
    Segmented,
    Select,
    Space,
    Spin,
    Statistic,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
} from "antd";
import request, { handleLogout } from "../utils/request";

const { Content, Header, Sider } = Layout;
const { Text, Title } = Typography;

const stepLabelMap = {
    task_start: "任务开始",
    call_model_start: "开始调用模型",
    task_retry: "任务重试",
    task_failed: "任务失败",
    task_done: "任务完成",
    task_timeout: "任务超时",
    task_recovered: "任务恢复",
    retrieve_chunks: "知识库检索",
    build_prompt: "构建提示词",
    call_model: "调用模型",
    save_result: "保存结果",
    idempotent_hit: "幂等命中",
    stream_start: "流式开始",
    load_history: "加载上下文",
    build_messages: "构建消息",
    stream_done: "流式完成",
    stream_failed: "流式失败",
    notify_feishu: "飞书通知",
    agent_start: "Agent开始",
    agent_memory_tool: "会话记忆",
    agent_knowledge_tool: "知识检索",
    agent_workflow_tool: "工作流查询",
    agent_tools: "工具汇总",
    agent_build_prompt: "构建提示词",
    agent_done: "Agent完成",
    agent_failed: "Agent失败",
    agent_idempotent_hit: "Agent幂等命中",
    langchain_agent_start: "LangChain开始",
    langchain_tool_memory: "LangChain记忆工具",
    langchain_tool_retriever: "LangChain检索工具",
    langchain_tool_workflow: "LangChain工作流工具",
    langchain_prompt_build: "LangChain构建提示词",
    langchain_parallel_context_done: "LangChain并行上下文完成",
    langchain_agent_done: "LangChain完成",
    langchain_agent_failed: "LangChain失败",
    langchain_agent_idempotent_hit: "LangChain幂等命中",
    langchain_business_prompt: "LangChain业务模板",
    multi_agent_start: "Multi-Agent开始",
    multi_agent_key_router: "关键词路由",
    multi_agent_jev_router: "JEV 路由",
    multi_agent_supervisor: "Supervisor路由",
    multi_agent_parallel_context_done: "并行上下文完成",
    multi_agent_memory: "会话记忆Agent",
    multi_agent_retriever: "知识检索Agent",
    multi_agent_workflow: "工作流Agent",
    multi_agent_done: "Multi-Agent完成",
    multi_agent_failed: "Multi-Agent失败",
    multi_agent_answer_prompt_build: "AnswerAgent 构建提示词",
};

const isTraceFinished = (detail) => {
    const steps = detail?.steps || detail?.rag_steps || [];
    return steps.some((step) =>
        [
            "task_done",
            "task_failed",
            "stream_done",
            "task_timeout",
            "stream_failed",
            "rag_done",
            "rag_no_hit",
            "agent_done",
            "agent_failed",
        ].includes(step.step),
    );
};

const formatDetailValue = (value) => {
    if (Array.isArray(value)) {
        return value.join(" / ");
    }

    if (typeof value === "object" && value !== null) {
        return JSON.stringify(value);
    }

    return String(value);
};

const MetricCard = ({ title, value, suffix, prefix, precision, trend, tone = "blue" }) => (
    <Card className="metric-card">
        <Statistic
            title={title}
            value={value}
            suffix={suffix}
            prefix={prefix}
            precision={precision}
            styles={{ content: { color: tone === "danger" ? "#cf1322" : "#111827" } }}
        />
        <div className="metric-trend">{trend}</div>
    </Card>
);

const AppNavigation = ({ navigate }) => {
    const items = [
        { label: "主页", icon: <DashboardOutlined />, active: true, onClick: () => navigate("/logs") },
        { label: "AI 对话", icon: <RobotOutlined />, onClick: () => navigate("/chat") },
        { label: "Prompt 模板", icon: <FileTextOutlined />, onClick: () => navigate("/prompt-templates") },
        { label: "知识库", icon: <BookOutlined />, onClick: () => navigate("/knowledge-documents") },
        { label: "工作流", icon: <ApartmentOutlined />, onClick: () => navigate("/workflows") },
        { label: "模板配置", icon: <AppstoreOutlined />, onClick: () => navigate("/workflow-templates") },
    ];

    return (
        <Sider width={232} className="saas-sider">
            <div className="brand-lockup">
                <div className="brand-mark">AI</div>
                <div>
                    <div className="brand-title">观测平台</div>
                    <div className="brand-subtitle">AI 调用观测平台</div>
                </div>
            </div>
            <div className="saas-menu">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className={`saas-menu-item${item.active ? " active" : ""}`}
                        onClick={item.onClick}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </Sider>
    );
};

const StatsOverview = () => {
    const [stats, setStats] = useState({});
    const [observability, setObservability] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const [statsResponse, observabilityResponse] = await Promise.all([
                    request.get("/logs/stats/"),
                    request.get("/logs/observability-summary/").catch(() => ({ data: { data: null } })),
                ]);
                setStats(statsResponse.data?.data || {});
                setObservability(observabilityResponse.data?.data || null);
            } catch (error) {
                if (error.response?.status === 401) {
                    navigate("/");
                    return;
                }
                message.error("加载统计数据失败");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [navigate]);

    if (loading) {
        return <Spin style={{ display: "block", margin: "28px 0" }} />;
    }

    return (
        <>
            <Row gutter={[16, 16]} className="metric-grid">
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="总调用次数"
                        value={stats?.total || 0}
                        prefix={<RobotOutlined />}
                        trend={`今日 ${stats?.today_total || 0} 次`}
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="成功率"
                        value={stats?.success_rate || "0%"}
                        prefix={<CheckCircleOutlined />}
                        trend="稳定性核心指标"
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="平均耗时"
                        value={stats?.avg_duration || 0}
                        suffix="s"
                        prefix={<ClockCircleOutlined />}
                        trend="越低代表响应越快"
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="总费用"
                        value={stats?.total_cost || 0}
                        prefix={<DollarOutlined />}
                        precision={2}
                        trend={`今日 ￥${stats?.today_cost || 0}`}
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="总 Token"
                        value={stats?.total_tokens || 0}
                        prefix={<ThunderboltOutlined />}
                        trend={`今日 ${stats?.today_tokens || 0}`}
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="重试次数"
                        value={observability?.retry_count || 0}
                        prefix={<ReloadOutlined />}
                        trend="关注限流与不稳定调用"
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="恢复查询"
                        value={observability?.recovered_count || 0}
                        prefix={<ApiOutlined />}
                        trend="已从异步任务中恢复"
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="超时任务"
                        value={observability?.timeout_count || 0}
                        prefix={<WarningOutlined />}
                        trend="建议优先排查"
                        tone="danger"
                    />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <MetricCard
                        title="失败步骤"
                        value={observability?.failed_step_count || 0}
                        prefix={<ApiOutlined />}
                        trend="链路中存在异常节点"
                        tone="danger"
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} xl={12}>
                    <Card className="panel-card panel-card-100" title="模型调用分布" size="small">
                        <Table
                            size="small"
                            rowKey="model_name"
                            pagination={false}
                            dataSource={stats?.model_stats || []}
                            columns={[
                                { title: "模型", dataIndex: "model_name" },
                                { title: "调用", dataIndex: "total" },
                                { title: "成功", dataIndex: "success_count" },
                                { title: "平均耗时", dataIndex: "avg_duration", render: (value) => `${value || 0}s` },
                                { title: "Token", dataIndex: "total_tokens" },
                                { title: "费用", dataIndex: "total_cost", render: (value) => `￥${value || 0}` },
                            ]}
                        />
                    </Card>
                </Col>
                <Col xs={24} xl={12}>
                    <Card className="panel-card" title="近 7 天趋势" size="small">
                        <Table
                            size="small"
                            rowKey="day"
                            pagination={false}
                            dataSource={stats?.daily_stats || []}
                            columns={[
                                { title: "日期", dataIndex: "day" },
                                { title: "调用", dataIndex: "total" },
                                { title: "成功", dataIndex: "success_count" },
                                { title: "Token", dataIndex: "total_tokens" },
                                { title: "费用", dataIndex: "total_cost", render: (value) => `￥${value || 0}` },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </>
    );
};

const LogList = ({ traceRefreshIntervalMs = 3000 }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        keyword: "",
        model_name: "",
        success: "",
        conversation_id: "",
        trace_id: "",
    });
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
    const [traceLoading, setTraceLoading] = useState(false);
    const [traceDetail, setTraceDetail] = useState(null);
    const [currentTraceId, setCurrentTraceId] = useState("");
    const [traceAutoRefresh, setTraceAutoRefresh] = useState(false);
    const [stepFilter, setStepFilter] = useState("all");

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const traceIdFromUrl = searchParams.get("trace_id") || "";
    const traceAutoRefreshCountRef = useRef(0);

    const fetchLogs = async (
        nextFilters = filters,
        page = pagination.current,
        pageSize = pagination.pageSize,
    ) => {
        try {
            setLoading(true);
            const params = Object.fromEntries(
                Object.entries(nextFilters).filter(([, value]) => value !== ""),
            );
            params.page = page;

            const res = await request.get("/logs/", { params });
            setLogs(res.data?.results || []);
            setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize,
                total: res.data?.count || 0,
            }));
        } catch (error) {
            if (error.response?.status === 401) {
                navigate("/");
                return;
            }
            message.error("加载调用日志失败");
        } finally {
            setLoading(false);
        }
    };

    const openTraceDetail = async (traceId, options = {}) => {
        if (!traceId) return;

        const { resetFilter = true, autoRefreshByStatus = true } = options;

        try {
            setCurrentTraceId(traceId);
            if (resetFilter) {
                setStepFilter("all");
                traceAutoRefreshCountRef.current = 0;
            }
            setTraceLoading(true);
            setTraceDrawerOpen(true);

            const res = await request.get(`/logs/trace/${traceId}/`);
            const nextTraceDetail = res.data?.data || null;
            setTraceDetail(nextTraceDetail);

            if (autoRefreshByStatus) {
                setTraceAutoRefresh(!isTraceFinished(nextTraceDetail));
            }
        } catch (error) {
            message.error("加载 Trace 详情失败");
        } finally {
            setTraceLoading(false);
        }
    };

    useEffect(() => {
        if (!traceDrawerOpen || !traceAutoRefresh || !currentTraceId) {
            return undefined;
        }

        const timer = setInterval(() => {
            traceAutoRefreshCountRef.current += 1;

            if (traceAutoRefreshCountRef.current > 20) {
                setTraceAutoRefresh(false);
                message.warning("自动刷新已达到上限");
                return;
            }

            openTraceDetail(currentTraceId, { resetFilter: false });
        }, traceRefreshIntervalMs);

        return () => clearInterval(timer);
    }, [traceDrawerOpen, traceAutoRefresh, currentTraceId, traceRefreshIntervalMs]);

    useEffect(() => {
        if (traceIdFromUrl) {
            const nextFilters = {
                keyword: "",
                model_name: "",
                success: "",
                conversation_id: "",
                trace_id: traceIdFromUrl,
            };

            setFilters(nextFilters);
            fetchLogs(nextFilters, 1, 10);
            openTraceDetail(traceIdFromUrl, {
                resetFilter: true,
                autoRefreshByStatus: true,
            });
            return;
        }

        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [traceIdFromUrl]);

    const resetFilters = () => {
        const emptyFilters = {
            keyword: "",
            model_name: "",
            success: "",
            conversation_id: "",
            trace_id: "",
        };

        setFilters(emptyFilters);
        fetchLogs(emptyFilters, 1, pagination.pageSize);
    };

    const renderStepExtra = (step) => {
        const detail = step.detail || {};

        if (step.step === "task_retry") {
            return (
                <div style={{ color: "#d48806", marginTop: 4 }}>
                    第 {detail.retry_count} 次重试，最多 {detail.max_retries} 次，
                    {detail.countdown ? `等待 ${detail.countdown} 秒后重试` : "准备重试"}
                </div>
            );
        }

        if (step.step === "task_failed") {
            return (
                <div style={{ color: "#cf1322", marginTop: 4 }}>
                    失败原因：{detail.reason === "max_retries_exceeded" ? "超过最大重试次数" : "不可重试错误"}
                </div>
            );
        }

        if (detail.wait) {
            return <div style={{ color: "#d48806", marginTop: 4 }}>限流等待：{Math.ceil(detail.wait)} 秒</div>;
        }

        return null;
    };

    const renderStepDetail = (value) => {
        const detail = value || {};
        const keys = Object.keys(detail);

        if (keys.length === 0) {
            return "-";
        }

        const summaryKeys = [
            "retry_count",
            "max_retries",
            "countdown",
            "wait",
            "hit_count",
            "top_k",
            "model",
            "stream",
            "router_type",
            "selected_agents",
            "enabled_agents",
            "parallel_agents",
            "parallel_agent_count",
            "answer_length",
            "knowledge_hit_count",
            "used_workflow_agent",
        ];
        const nestedSummary = [
            ["usage.total_tokens", detail.usage?.total_tokens],
            ["usage.cost", detail.usage?.cost],
            ["usage_summary.total_tokens", detail.usage_summary?.total_tokens],
            ["usage_summary.total_cost", detail.usage_summary?.total_cost],
            ["timing.parallel_total", detail.timing?.parallel_total],
            ["timing.answer", detail.timing?.answer],
        ];

        const summary = [
            ...summaryKeys
                .filter((key) => detail[key] !== undefined && detail[key] !== null)
                .map((key) => [key, detail[key]]),
            ...nestedSummary.filter(([, nestedValue]) => nestedValue !== undefined && nestedValue !== null),
        ]
            .map(([key, summaryValue]) => `${key}: ${formatDetailValue(summaryValue)}`)
            .join("，");

        return (
            <div>
                {summary && <div style={{ marginBottom: 4 }}>{summary}</div>}
                <Text copyable={{ text: JSON.stringify(detail, null, 2) }} type="secondary" style={{ fontSize: 12 }}>
                    复制完整 detail
                </Text>
            </div>
        );
    };

    const columns = [
        {
            title: "时间",
            dataIndex: "call_time",
            width: 180,
        },
        {
            title: "用户输入",
            dataIndex: "prompt",
            ellipsis: true,
        },
        {
            title: "AI 回复",
            dataIndex: "response",
            ellipsis: true,
        },
        {
            title: "模型",
            dataIndex: "model_name",
            width: 140,
            render: (value) => <Tag color="blue">{value || "-"}</Tag>,
        },
        {
            title: "耗时",
            dataIndex: "duration",
            width: 110,
            render: (val) => `${val || 0}s`,
            sorter: (a, b) => Number(a.duration || 0) - Number(b.duration || 0),
        },
        {
            title: "状态",
            dataIndex: "success",
            width: 100,
            render: (val) => <Tag color={val ? "green" : "red"}>{val ? "成功" : "失败"}</Tag>,
        },
        {
            title: "Trace ID",
            dataIndex: "trace_id",
            width: 190,
            ellipsis: true,
            render: (value) =>
                value ? (
                    <Tooltip title="点击查看链路详情">
                        <Text
                            className="trace-link"
                            data-testid={`trace-link-${value}`}
                            copyable
                            ellipsis
                            onClick={() => openTraceDetail(value)}
                        >
                            {value}
                        </Text>
                    </Tooltip>
                ) : (
                    "-"
                ),
        },
    ];

    const traceSteps = traceDetail?.steps || traceDetail?.rag_steps || [];
    const failedSteps = traceSteps.filter((item) => !item.success);
    const displayedTraceSteps = traceSteps.filter((step) => {
        if (stepFilter === "failed") {
            return !step.success;
        }

        if (stepFilter === "retry") {
            return step.step === "task_retry";
        }

        return true;
    });

    const traceStatus = failedSteps.length > 0 ? "异常" : "正常";

    return (
        <Layout className="saas-shell">
            <AppNavigation navigate={navigate} />
            <Layout className="saas-main">
                <Header className="saas-header">
                    <div className="saas-header-inner" style={{justifyContent:"flex-end"}}>
                        {/* <Space size={12}>
                            <Tag color="green">在线</Tag>
                            <Text type="secondary">生产环境</Text>
                            <Text type="secondary">最近 24 小时</Text>
                        </Space> */}
                        <Space>
                            {/* <Input
                                allowClear
                                placeholder="搜索调用、Trace、模型或用户输入"
                                style={{ width: 320 }}
                                value={filters.keyword}
                                onChange={(event) =>
                                    setFilters((prev) => ({ ...prev, keyword: event.target.value }))
                                }
                                onPressEnter={() => fetchLogs(filters, 1, pagination.pageSize)}
                            /> */}
                            <Button icon={<ReloadOutlined />} onClick={() => fetchLogs()}>
                                刷新
                            </Button>
                            <Button icon={<LogoutOutlined />} danger onClick={handleLogout}>
                                退出登录
                            </Button>
                        </Space>
                    </div>
                </Header>

                <Content className="page-content">
                    {/* <div className="page-heading">
                        <div>
                            <div className="page-kicker">AI OBSERVABILITY</div>
                            <Title className="page-title" level={1}>
                                AI 调用观测
                            </Title>
                            <p className="page-description">
                                实时查看 AI 模型调用、链路追踪、Token 成本与失败步骤，快速定位线上问题。
                            </p>
                        </div>
                        <Space wrap>
                            <Button icon={<RobotOutlined />} onClick={() => navigate("/chat")}>
                                发起对话
                            </Button>
                            <Button icon={<FileTextOutlined />} onClick={() => navigate("/prompt-templates")}>
                                Prompt 模板
                            </Button>
                            <Button type="primary" icon={<DatabaseOutlined />} onClick={() => navigate("/knowledge-documents")}>
                                知识库
                            </Button>
                        </Space>
                    </div> */}

                    <StatsOverview />

                    <Card className="panel-card filter-card" size="small">
                        <Space wrap>
                            <Input
                                allowClear
                                placeholder="关键词"
                                value={filters.keyword}
                                onChange={(event) =>
                                    setFilters((prev) => ({ ...prev, keyword: event.target.value }))
                                }
                                style={{ width: 200 }}
                            />
                            <Input
                                allowClear
                                placeholder="会话 ID"
                                value={filters.conversation_id}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        conversation_id: event.target.value,
                                    }))
                                }
                                style={{ width: 260 }}
                            />
                            <Input
                                allowClear
                                placeholder="Trace ID"
                                value={filters.trace_id}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        trace_id: event.target.value,
                                    }))
                                }
                                style={{ width: 260 }}
                            />
                            <Select
                                allowClear
                                placeholder="模型"
                                value={filters.model_name || undefined}
                                onChange={(value) =>
                                    setFilters((prev) => ({ ...prev, model_name: value || "" }))
                                }
                                style={{ width: 160 }}
                                options={[
                                    { label: "deepseek", value: "deepseek" },
                                    { label: "agnes", value: "agnes" },
                                ]}
                            />
                            <Select
                                allowClear
                                placeholder="状态"
                                value={filters.success || undefined}
                                onChange={(value) =>
                                    setFilters((prev) => ({ ...prev, success: value || "" }))
                                }
                                style={{ width: 140 }}
                                options={[
                                    { label: "成功", value: "true" },
                                    { label: "失败", value: "false" },
                                ]}
                            />
                            <Button
                                type="primary"
                                onClick={() => fetchLogs(filters, 1, pagination.pageSize)}
                            >
                                查询
                            </Button>
                            <Button onClick={resetFilters}>重置</Button>
                        </Space>
                    </Card>

                    <Card className="panel-card log-table-card">
                        <div className="table-toolbar">
                            <div>
                                <div className="table-title">调用日志</div>
                                <div className="table-subtitle">共 {pagination.total} 条，点击 Trace ID 查看完整执行链路</div>
                            </div>
                            <Space>
                                <Tag color="green">成功</Tag>
                                <Tag color="red">失败</Tag>
                            </Space>
                        </div>
                        <Spin spinning={loading}>
                            <Table
                                columns={columns}
                                dataSource={logs}
                                rowKey="id"
                                loading={loading}
                                pagination={{
                                    current: pagination.current,
                                    pageSize: pagination.pageSize,
                                    total: pagination.total,
                                    showSizeChanger: false,
                                    placement: "bottomCenter",
                                    showTotal: (total) => `共 ${total} 条`,
                                }}
                                onChange={(nextPagination) => {
                                    fetchLogs(filters, nextPagination.current, nextPagination.pageSize);
                                }}
                                scroll={{ x: 1120 }}
                            />
                        </Spin>
                    </Card>

                    <Drawer
                        className="trace-drawer"
                        title={
                            <div className="trace-drawer-title">
                                <Space orientation="vertical" size={0}>
                                    <Text strong>Trace 详情</Text>
                                    <Text type="secondary">{currentTraceId || "未选择链路"}</Text>
                                </Space>
                                <Space>
                                    <Button
                                        size="small"
                                        onClick={() =>
                                            openTraceDetail(currentTraceId, {
                                                resetFilter: false,
                                                autoRefreshByStatus: false,
                                            })
                                        }
                                        disabled={!currentTraceId || traceLoading}
                                    >
                                        刷新
                                    </Button>
                                    <Switch
                                        checked={traceAutoRefresh}
                                        onChange={setTraceAutoRefresh}
                                        checkedChildren="自动"
                                        unCheckedChildren="手动"
                                    />
                                </Space>
                            </div>
                        }
                        open={traceDrawerOpen}
                        onClose={() => {
                            setTraceDrawerOpen(false);
                            setTraceAutoRefresh(false);
                        }}
                        size="large"
                    >
                        <Spin spinning={traceLoading}>
                            {traceDetail && (
                                <Space orientation="vertical" style={{ width: "100%" }} size="middle">
                                    <div className="trace-summary">
                                        <div className="trace-summary-item">
                                            <div className="trace-summary-label">链路状态</div>
                                            <div className="trace-summary-value">
                                                <Tag color={failedSteps.length > 0 ? "red" : "green"}>{traceStatus}</Tag>
                                            </div>
                                        </div>
                                        <div className="trace-summary-item">
                                            <div className="trace-summary-label">总耗时</div>
                                            <div className="trace-summary-value">{traceDetail.summary?.total_duration || 0}s</div>
                                        </div>
                                        <div className="trace-summary-item">
                                            <div className="trace-summary-label">日志数量</div>
                                            <div className="trace-summary-value">{traceDetail.summary?.log_count || 0}</div>
                                        </div>
                                        <div className="trace-summary-item">
                                            <div className="trace-summary-label">步骤数量</div>
                                            <div className="trace-summary-value">{traceDetail.summary?.step_count || 0}</div>
                                        </div>
                                    </div>

                                    <Descriptions bordered size="small" column={1}>
                                        <Descriptions.Item label="Trace ID">
                                            <Text copyable>{traceDetail.trace_id}</Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="步骤类型">
                                            <Space wrap>
                                                <Tag color="blue">流式 {traceDetail.summary?.stream_step_count || 0}</Tag>
                                                <Tag color="purple">RAG {traceDetail.summary?.rag_step_count || 0}</Tag>
                                                <Tag color="orange">异步任务 {traceDetail.summary?.task_step_count || 0}</Tag>
                                                <Tag color={failedSteps.length > 0 ? "red" : "green"}>
                                                    失败步骤 {traceDetail.summary?.failed_step_count || 0}
                                                </Tag>
                                            </Space>
                                        </Descriptions.Item>
                                    </Descriptions>

                                    <Card className="panel-card" size="small" title="AI 调用日志">
                                        <Table
                                            size="small"
                                            rowKey="id"
                                            pagination={false}
                                            dataSource={traceDetail.logs || []}
                                            columns={[
                                                { title: "模型", dataIndex: "model_name" },
                                                {
                                                    title: "状态",
                                                    dataIndex: "success",
                                                    render: (val) => (
                                                        <Tag color={val ? "green" : "red"}>{val ? "成功" : "失败"}</Tag>
                                                    ),
                                                },
                                                { title: "耗时", dataIndex: "duration", render: (val) => `${val || 0}s` },
                                                { title: "Token", dataIndex: "total_tokens" },
                                                { title: "费用", dataIndex: "cost" },
                                            ]}
                                        />
                                    </Card>

                                    <Card
                                        className="panel-card"
                                        size="small"
                                        title={
                                            <Space>
                                                <span>执行步骤</span>
                                                <Tag color="blue">{displayedTraceSteps.length} 条</Tag>
                                            </Space>
                                        }
                                        extra={
                                            <Segmented
                                                value={stepFilter}
                                                onChange={setStepFilter}
                                                options={[
                                                    { label: "全部", value: "all" },
                                                    { label: "失败", value: "failed" },
                                                    { label: "重试", value: "retry" },
                                                ]}
                                            />
                                        }
                                    >
                                        <Table
                                            size="small"
                                            rowKey="id"
                                            rowClassName={(record) => (record.success ? "" : "trace-step-failed-row")}
                                            pagination={false}
                                            dataSource={displayedTraceSteps}
                                            locale={{
                                                emptyText:
                                                    stepFilter === "failed"
                                                        ? "当前链路没有失败步骤"
                                                        : stepFilter === "retry"
                                                            ? "当前链路没有重试步骤"
                                                            : "暂无执行步骤",
                                            }}
                                            columns={[
                                                {
                                                    title: "步骤",
                                                    dataIndex: "step",
                                                    width: 170,
                                                    render: (value, record) => (
                                                        <div>
                                                            <div>{stepLabelMap[value] || value}</div>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                {value}
                                                            </Text>
                                                            {renderStepExtra(record)}
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    title: "状态",
                                                    dataIndex: "success",
                                                    width: 90,
                                                    render: (val) => (
                                                        <Tag color={val ? "green" : "red"}>{val ? "成功" : "失败"}</Tag>
                                                    ),
                                                },
                                                {
                                                    title: "耗时",
                                                    dataIndex: "duration",
                                                    width: 90,
                                                    render: (val) => `${val || 0}s`,
                                                },
                                                {
                                                    title: "详情",
                                                    dataIndex: "detail",
                                                    render: renderStepDetail,
                                                },
                                                {
                                                    title: "错误",
                                                    dataIndex: "error_message",
                                                    render: (value) =>
                                                        value ? (
                                                            <Text copyable type="danger">
                                                                {value}
                                                            </Text>
                                                        ) : (
                                                            "-"
                                                        ),
                                                },
                                            ]}
                                            scroll={{ x: 760 }}
                                        />
                                    </Card>
                                </Space>
                            )}
                        </Spin>
                    </Drawer>
                </Content>
            </Layout>
        </Layout>
    );
};

export default LogList;
