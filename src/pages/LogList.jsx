import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    Table,
    Button,
    Space,
    Tag,
    Layout,
    Typography,
    message,
    Spin,
    Card,
    Row,
    Col,
    Statistic,
    Input,
    Select,
    Drawer,
    Descriptions,
    Segmented,
    Switch
} from "antd";
import {
    BookOutlined,
    ReloadOutlined,
    PlusOutlined,
    BarChartOutlined,
    ArrowLeftOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    RobotOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import request from "../utils/request";

const { Header, Content } = Layout;
const { Title } = Typography;

const Stats = () => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem("access_token");

    const [observability, setObservability] = useState(null);

    const fetchObservability = async () => {
        try {
            const res = await request.get("/logs/observability-summary/");
            setObservability(res.data?.data || null);
        } catch (error) {
            console.warn("load observability summary failed", error);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await request.get(`/logs/stats/`);
                setStats(response.data.data);
            } catch (error) {
                console.log('error',error)
                if (error.response?.status === 401) {
                    navigate("/");
                } else message.error("加载统计数据失败");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
        fetchObservability();
    }, [navigate]);

    if (loading) {
        return (
            <Spin description="加载中..." style={{ display: "block", marginTop: 100 }}></Spin>
        );
    }

    return (
        <Layout>
            {/* <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <h2>AI 调用统计</h2>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/logs')}>返回日志列表</Button>
                    <Button icon={<PlusOutlined />} onClick={() => navigate('/chat')}>发起对话</Button>
                </div>
            </Header> */}
            <Content>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="总调用次数"
                                value={stats?.total || 0}
                                prefix={<RobotOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic title="今日调用" value={stats?.today_total || 0} />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="成功率"
                                value={stats?.success_rate || "0%"}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="平均耗时"
                                value={stats?.avg_duration || 0}
                                suffix="s"
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic title="总 Token" value={stats?.total_tokens || 0} />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic title="今日 Token" value={stats?.today_tokens || 0} />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="总费用"
                                value={stats?.total_cost || 0}
                                prefix="￥"
                                precision={2}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic
                                title="今日费用"
                                value={stats?.today_cost || 0}
                                prefix="￥"
                                precision={2}
                            />
                        </Card>
                    </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic title="重试次数" value={observability?.retry_count || 0} />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic title="超时任务" value={observability?.timeout_count || 0} />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic title="恢复查询" value={observability?.recovered_count || 0} />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic title="失败步骤" value={observability?.failed_step_count || 0} />
                        </Card>
                    </Col>
                </Row>
                <Card title="模型调用分布" size="small" style={{ marginTop: 16 }}>
                    <Table
                        size="small"
                        rowKey="model_name"
                        pagination={false}
                        dataSource={stats?.model_stats || []}
                        columns={[
                            { title: "模型", dataIndex: "model_name" },
                            { title: "调用次数", dataIndex: "total" },
                            { title: "成功次数", dataIndex: "success_count" },
                            {
                                title: "平均耗时",
                                dataIndex: "avg_duration",
                                render: (value) => `${value}s`,
                            },
                            { title: "Token", dataIndex: "total_tokens" },
                            {
                                title: "费用",
                                dataIndex: "total_cost",
                                render: (value) => `￥${value}`,
                            },
                        ]}
                    />
                </Card>
                <Card title="近 7 天趋势" size="small" style={{ marginTop: 16 }}>
                    <Table
                        size="small"
                        rowKey="day"
                        pagination={false}
                        dataSource={stats?.daily_stats || []}
                        columns={[
                            { title: "日期", dataIndex: "day" },
                            { title: "调用次数", dataIndex: "total" },
                            { title: "成功次数", dataIndex: "success_count" },
                            { title: "Token", dataIndex: "total_tokens" },
                            {
                                title: "费用",
                                dataIndex: "total_cost",
                                render: (value) => `￥${value}`,
                            },
                        ]}
                    />
                </Card>
            </Content>
        </Layout>
    );
};

const LogList = ({ traceRefreshIntervalMs = 3000 }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        keyword: "",
        model_name: "",
        success: "",
        conversation_id: "",
        trace_id: "",
    });

    const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
    const [traceLoading, setTraceLoading] = useState(false);
    const [traceDetail, setTraceDetail] = useState(null);
    const [currentTraceId, setCurrentTraceId] = useState("");

    const traceAutoRefreshCountRef = useRef(0);

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const getToken = () => localStorage.getItem("access_token");


    const getStepLabel = (step) => {
        const stepMap = {
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
        };

        return stepMap[step] || step;
    };

    const fetchLogs = async (
        nextFilters = filters,
        page = pagination.current,
        pageSize = pagination.pageSize,
    ) => {
        // 没传值默认传filters
        try {
            setLoading(true);
            // Object.entries(filters) -把对象变成数组 过滤空值后再变回对象
            // const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value !== ''));
            const params = Object.fromEntries(
                Object.entries(nextFilters).filter(([, value]) => value !== ""),
            );
            params.page = page;

            const res = await request.get(`/logs/`, { params });

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
            }
        } finally {
            setLoading(false);
        }
    };

    const openTraceDetail = async (traceId, options = {}) => {
        if (!traceId) return;

        const {
            resetFilter = true,
            autoRefreshByStatus = true,
        } = options;

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
            setTraceDetail(res.data?.data || null);

            if (autoRefreshByStatus) {
                setTraceAutoRefresh(!isTraceFinished(nextTraceDetail));
            }
        } catch (error) {
            message.error("加载 trace 详情失败");
        } finally {
            setTraceLoading(false);
        }
    };

    const isTraceFinished = (detail) => {
        const steps = detail?.steps || detail?.rag_steps || [];

        if (steps.some((step) =>
            ["task_done", "task_failed", "stream_done", "task_timeout", "stream_failed"].includes(step.step)
        )) {
            return true;
        }

        return false;
    };

    const [traceAutoRefresh, setTraceAutoRefresh] = useState(false);

    useEffect(() => {
        if (!traceDrawerOpen || !traceAutoRefresh || !currentTraceId) {
            return;
        }

        const timer = setInterval(() => {
            traceAutoRefreshCountRef.current += 1;

            if (traceAutoRefreshCountRef.current > 20) {
                // React 会重新渲染，useEffect 的清理函数会执行 clearInterval(timer)
                setTraceAutoRefresh(false);
                message.warning("自动刷新已达到上限");
                return;
            }

            openTraceDetail(currentTraceId, { resetFilter: false });
        }, traceRefreshIntervalMs);

        return () => clearInterval(timer);
    }, [traceDrawerOpen, traceAutoRefresh, currentTraceId, traceRefreshIntervalMs]);

    useEffect(() => {
        fetchLogs();
    }, [navigate]);

    // 上面的重置只是清空状态，不一定立即刷新，因为 React setState 是异步的。 简单做法：加一个函数。
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
                <div style={{ color: "#fa8c16", marginTop: 4 }}>
                    第 {detail.retry_count} 次重试，最多 {detail.max_retries} 次，
                    {detail.countdown ? `等待 ${detail.countdown} 秒后重试` : "准备重试"}
                </div>
            )
        }

        if (step.step === "task_failed") {
            return (
                <div style={{ color: "#ff4d4f", marginTop: 4 }}>
                    失败原因：{detail.reason === "max_retries_exceeded" ? "超过最大重试次数" : "不可重试错误"}
                </div>
            );
        }

        if (detail.wait) {
            return (
                <div style={{ color: "#fa8c16", marginTop: 4 }}>
                    限流等待：{Math.ceil(detail.wait)} 秒
                </div>
            );
        }

        return null
    }

    const renderStepDetail = (value) => {
        const detail = value || {};
        const keys = Object.keys(detail);

        if (keys.length === 0) {
            return "-";
        }

        const summaryKeys = ["retry_count", "max_retries", "countdown", "wait", "hit_count", "top_k", "model", "stream"];
        const summary = summaryKeys
            .filter((key) => detail[key] !== undefined && detail[key] !== null)
            .map((key) => `${key}: ${detail[key]}`)
            .join("，");

        return (
            <div>
                {summary && (
                    <div style={{ marginBottom: 4 }}>
                        {summary}
                    </div>
                )}
                <Typography.Text
                    copyable={{
                        text: JSON.stringify(detail, null, 2),
                    }}
                    type="secondary"
                    style={{ fontSize: 12 }}
                >
                    复制完整 detail
                </Typography.Text>
            </div>
        );
    };

    const columns = [
        { title: "ID", dataIndex: "id", width: 60 },
        { title: "用户输入", dataIndex: "prompt", ellipsis: true },
        { title: "AI 回复", dataIndex: "response", ellipsis: true },
        { title: "模型", dataIndex: "model_name" },
        {
            title: "耗时",
            dataIndex: "duration",
            render: (val) => `${val}s`,
            sorter: (a, b) => a.duration - b.duration,
        },
        {
            title: "状态",
            dataIndex: "success",
            render: (val) => (
                <Tag color={val ? "green" : "red"}>{val ? "成功" : "失败"}</Tag>
            ),
        },
        {
            title: "trace_id",
            dataIndex: "trace_id",
            width: 180,
            ellipsis: true,
            render: (value) =>
                value ? (
                    <Typography.Text
                        copyable
                        style={{ maxWidth: 160 }}
                        ellipsis
                        onClick={() => openTraceDetail(value)}
                    >
                        {value}
                    </Typography.Text>
                ) : (
                    "-"
                ),
        },
        { title: "时间", dataIndex: "call_time", width: 180 },
    ];

    const traceSteps = traceDetail?.steps || traceDetail?.rag_steps || [];
    const failedSteps = traceSteps.filter((item) => !item.success);

    const [stepFilter, setStepFilter] = useState("all");
    const displayedTraceSteps = traceSteps.filter((step) => {
        if (stepFilter === "failed") {
            return !step.success;
        }

        if (stepFilter === "retry") {
            return step.step === "task_retry";
        }

        return true;
    });



    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header
                style={{
                    background: "#fff",
                    padding: "0 24px",
                    borderBottom: "1px solid #f0f0f0",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "100%",
                    }}
                >
                    <Title level={3} style={{ margin: 0 }}>
                        AI 调用日志{" "}
                    </Title>
                    <Space>
                        {/* <Button icon={<BarChartOutlined />} onClick={() => navigate('/stats')}>统计</Button> */}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate("/chat")}
                        >
                            发起对话
                        </Button>
                        <Button
                            icon={<FileTextOutlined />}
                            onClick={() => navigate("/prompt-templates")}
                        >
                            Prompt 模板
                        </Button>
                        <Button
                            icon={<BookOutlined />}
                            onClick={() => navigate("/knowledge-documents")}
                        >
                            知识库
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
                            刷新
                        </Button>
                    </Space>
                </div>
            </Header>
            <Content style={{ padding: "24px" }}>
                <Stats />
                <Card size="small" style={{ margin: "16px 0" }}>
                    <Space wrap>
                        <Input
                            allowClear
                            placeholder="关键词"
                            value={filters.keyword}
                            onChange={(e) =>
                                setFilters({ ...filters, keyword: e.target.value })
                            }
                            style={{ width: 200 }}
                        ></Input>
                        <Input
                            allowClear
                            placeholder="会话ID"
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
                            placeholder="trace_id"
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
                            fetchLogs(
                                filters,
                                nextPagination.current,
                                nextPagination.pageSize,
                            );
                        }}
                    />
                </Spin>

                <Drawer
                    title={
                        <Space>
                            <span>trace 详情</span>
                            <Button
                                size="small"
                                onClick={() => openTraceDetail(currentTraceId, { resetFilter: false, autoRefreshByStatus: false })}
                                disabled={!currentTraceId || traceLoading}
                            >
                                刷新
                            </Button>
                            <Switch
                                checked={traceAutoRefresh}
                                onChange={setTraceAutoRefresh}
                                checkedChildren="自动刷新"
                                unCheckedChildren="手动刷新"
                            />
                        </Space>
                    }
                    open={traceDrawerOpen}
                    onClose={() => { setTraceDrawerOpen(false); setTraceAutoRefresh(false) }}
                    size="large"
                >
                    <Spin spinning={traceLoading}>
                        {traceDetail && (
                            <Space
                                orientation="vertical"
                                style={{ width: "100%" }}
                                size="middle"
                            >
                                <Descriptions bordered size="small" column={1}>
                                    <Descriptions.Item label="trace_id">
                                        <Space>
                                            <Typography.Text copyable>
                                                {traceDetail.trace_id}
                                            </Typography.Text>
                                        </Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="日志数量">
                                        {traceDetail.summary?.log_count}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="步骤数量">
                                        {traceDetail.summary?.step_count}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="步骤类型">
                                        <Space wrap>
                                            <Tag color="blue">流式 {traceDetail.summary?.stream_step_count || 0}</Tag>
                                            <Tag color="purple">RAG {traceDetail.summary?.rag_step_count || 0}</Tag>
                                            <Tag color="orange">异步任务 {traceDetail.summary?.task_step_count || 0}</Tag>
                                        </Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="失败步骤数">
                                        {traceDetail.summary?.failed_step_count}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="总耗时">
                                        {traceDetail.summary?.total_duration}s
                                    </Descriptions.Item>
                                    <Descriptions.Item label="链路状态">
                                        {failedSteps.length > 0 ? (
                                            <Tag color="red">异常</Tag>
                                        ) : (
                                            <Tag color="green">正常</Tag>
                                        )}
                                    </Descriptions.Item>

                                </Descriptions>

                                <Card size="small" title="AI 调用日志">
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
                                                    <Tag color={val ? "green" : "red"}>
                                                        {val ? "成功" : "失败"}
                                                    </Tag>
                                                ),
                                            },
                                            {
                                                title: "耗时",
                                                dataIndex: "duration",
                                                render: (val) => `${val}s`,
                                            },
                                            { title: "Token", dataIndex: "total_tokens" },
                                            { title: "费用", dataIndex: "cost" },
                                        ]}
                                    />
                                </Card>
                                <Card size="small" title={
                                    <Space>
                                        <span>AI 请求步骤日志</span>
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
                                        rowClassName={(record) =>
                                            record.success ? "" : "trace-step-failed-row"
                                        }
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
                                                width: 150,
                                                render: (value, record) => (
                                                    <div>
                                                        <div>{getStepLabel(value)}</div>
                                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                            {value}
                                                        </Typography.Text>
                                                        {renderStepExtra(record)}
                                                    </div>
                                                ),
                                            },
                                            {
                                                title: "状态",
                                                dataIndex: "success",
                                                width: 90,
                                                render: (val) => (
                                                    <Tag color={val ? "green" : "red"}>
                                                        {val ? "成功" : "失败"}
                                                    </Tag>
                                                ),
                                            },
                                            {
                                                title: "耗时",
                                                dataIndex: "duration",
                                                width: 90,
                                                render: (val) => `${val}s`,
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
                                                        <Typography.Text copyable type="danger">
                                                            {value}
                                                        </Typography.Text>
                                                    ) : (
                                                        "-"
                                                    ),
                                            },
                                        ]}
                                    />
                                </Card>
                            </Space>
                        )}
                    </Spin>
                </Drawer>
            </Content>
        </Layout>
    );
};

export default LogList;
