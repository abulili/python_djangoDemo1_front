import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Table, Button, Space, Tag, Layout, Typography, message, Spin, Card, Row, Col, Statistic, Input, Select, Drawer,
    Descriptions
} from 'antd'
import { BookOutlined, ReloadOutlined, PlusOutlined, BarChartOutlined, ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, RobotOutlined, FileTextOutlined } from '@ant-design/icons';
import request from '../utils/request';

const { Header, Content } = Layout;
const { Title } = Typography;

const Stats = () => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem('access_token');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await request.get(`/logs/stats/`);
                setStats(response.data.data);
            } catch (error) {
                if (error.response.status === 401) {
                    navigate('/');
                } else
                    message.error('加载统计数据失败');
            } finally {
                setLoading(false);
            }

        }
        fetchStats();
    }, [navigate]);

    if (loading) {
        return <Spin tip="加载中..." style={{ display: 'block', marginTop: 100 }}></Spin>;
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
                            <Statistic title="总调用次数" value={stats?.total || 0} prefix={<RobotOutlined />} />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic title="今日调用" value={stats?.today_total || 0} />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic title="成功率" value={stats?.success_rate || '0%'} prefix={<CheckCircleOutlined />} />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic title="平均耗时" value={stats?.avg_duration || 0} suffix="s" prefix={<ClockCircleOutlined />} />
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
                            <Statistic title="总费用" value={stats?.total_cost || 0} prefix="￥" precision={2} />
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                        <Card className="stat-card">
                            <Statistic title="今日费用" value={stats?.today_cost || 0} prefix="￥" precision={2} />
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
                            { title: '模型', dataIndex: 'model_name' },
                            { title: '调用次数', dataIndex: 'total' },
                            { title: '成功次数', dataIndex: 'success_count' },
                            { title: '平均耗时', dataIndex: 'avg_duration', render: (value) => `${value}s` },
                            { title: 'Token', dataIndex: 'total_tokens' },
                            { title: '费用', dataIndex: 'total_cost', render: (value) => `￥${value}` },
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
                            { title: '日期', dataIndex: 'day' },
                            { title: '调用次数', dataIndex: 'total' },
                            { title: '成功次数', dataIndex: 'success_count' },
                            { title: 'Token', dataIndex: 'total_tokens' },
                            { title: '费用', dataIndex: 'total_cost', render: (value) => `￥${value}` },
                        ]}
                    />
                </Card>
            </Content>
        </Layout>
    );
}

const LogList = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        keyword: '',
        model_name: '',
        success: '',
        conversation_id: '',
        trace_id: '',
    })

    const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
    const [traceLoading, setTraceLoading] = useState(false);
    const [traceDetail, setTraceDetail] = useState(null);

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const getToken = () => localStorage.getItem('access_token');

    const fetchLogs = async (nextFilters = filters,
        page = pagination.current,
        pageSize = pagination.pageSize) => { // 没传值默认传filters
        try {
            setLoading(true);
            // Object.entries(filters) -把对象变成数组 过滤空值后再变回对象
            // const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value !== ''));
            const params = Object.fromEntries(
                Object.entries(nextFilters).filter(([, value]) => value !== '')
            );
            params.page = page;
            console.log('fetchLogs', params, nextFilters)
            const res = await request.get(`/logs/`, { params });
            console.log('fetchLogs', res)
            setLogs(res.data?.results || []);
            setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize,
                total: res.data?.count || 0,
            }));
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    }

    const openTraceDetail = async (traceId) => {
        if (!traceId) return;

        try {
            setTraceLoading(true);
            setTraceDrawerOpen(true);

            const res = await request.get(`/logs/trace/${traceId}/`);
            setTraceDetail(res.data?.data || null);
        } catch (error) {
            message.error('加载 trace 详情失败');
        } finally {
            setTraceLoading(false);
        }
    }

    useEffect(() => {
        fetchLogs();
    }, [navigate]);

    // 上面的重置只是清空状态，不一定立即刷新，因为 React setState 是异步的。 简单做法：加一个函数。
    const resetFilters = () => {
        const emptyFilters = {
            keyword: '',
            model_name: '',
            success: '',
            conversation_id: '',
            trace_id: '',
        };

        setFilters(emptyFilters);
        fetchLogs(emptyFilters, 1, pagination.pageSize);
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '用户输入', dataIndex: 'prompt', ellipsis: true },
        { title: 'AI 回复', dataIndex: 'response', ellipsis: true },
        { title: '模型', dataIndex: 'model_name' },
        { title: '耗时', dataIndex: 'duration', render: (val) => `${val}s`, sorter: (a, b) => a.duration - b.duration },
        {
            title: '状态',
            dataIndex: 'success',
            render: (val) => <Tag color={val ? 'green' : 'red'}>{val ? '成功' : '失败'}</Tag>,
        },
        {
            title: 'trace_id',
            dataIndex: 'trace_id',
            width: 180,
            ellipsis: true,
            render: (value) => value ? (
                <Typography.Text copyable style={{ maxWidth: 160 }} ellipsis onClick={() => openTraceDetail(value)}>
                    {value}
                </Typography.Text>
            ) : '-'
        },
        { title: '时间', dataIndex: 'call_time', width: 180 },
    ]

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <Title level={3} style={{ margin: 0 }}>AI 调用日志 </Title>
                    <Space>
                        {/* <Button icon={<BarChartOutlined />} onClick={() => navigate('/stats')}>统计</Button> */}
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/chat')}>发起对话</Button>
                        <Button
                            icon={<FileTextOutlined />}
                            onClick={() => navigate('/prompt-templates')}
                        >
                            Prompt 模板
                        </Button>
                        <Button
                            icon={<BookOutlined />}
                            onClick={() => navigate('/knowledge-documents')}
                        >
                            知识库
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchLogs}>刷新</Button>
                    </Space>

                </div>

            </Header>
            <Content style={{ padding: '24px' }}>
                <Stats />
                <Card size="small" style={{ margin: '16px 0' }}>
                    <Space wrap>
                        <Input allowClear placeholder='关键词' value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} style={{ width: 200 }}></Input>
                        <Input allowClear placeholder='会话ID' value={filters.conversation_id} onChange={(event) =>
                            setFilters((prev) => ({ ...prev, conversation_id: event.target.value }))} style={{ width: 260 }} />
                        <Input
                            allowClear
                            placeholder="trace_id"
                            value={filters.trace_id}
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, trace_id: event.target.value }))
                            }
                            style={{ width: 260 }}
                        />
                        <Select
                            allowClear
                            placeholder="模型"
                            value={filters.model_name || undefined}
                            onChange={(value) =>
                                setFilters((prev) => ({ ...prev, model_name: value || '' }))
                            }
                            style={{ width: 160 }}
                            options={[
                                { label: 'deepseek', value: 'deepseek' },
                                { label: 'agnes', value: 'agnes' },
                            ]}
                        />
                        <Select
                            allowClear
                            placeholder="状态"
                            value={filters.success || undefined}
                            onChange={(value) =>
                                setFilters((prev) => ({ ...prev, success: value || '' }))
                            }
                            style={{ width: 140 }}
                            options={[
                                { label: '成功', value: 'true' },
                                { label: '失败', value: 'false' },
                            ]}
                        />
                        <Button type="primary" onClick={() => fetchLogs(filters, 1, pagination.pageSize)}>
                            查询
                        </Button>

                        <Button
                            onClick={resetFilters}
                        >
                            重置
                        </Button>
                    </Space>
                </Card>
                <Spin spinning={loading}>
                    <Table columns={columns} dataSource={logs} rowKey="id" loading={loading} pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: false,
                        position: ['bottomCenter'],
                        showTotal: (total) => `共 ${total} 条`,
                    }}
                        onChange={(nextPagination) => {
                            fetchLogs(filters, nextPagination.current, nextPagination.pageSize);
                        }} />
                </Spin>

                <Drawer title="trace 详情" open={traceDrawerOpen} onClose={() => setTraceDrawerOpen(false)} width={820}>
                    <Spin spinning={traceLoading}>
                        {traceDetail && (
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Descriptions bordered size="small" column={1}>
                                    <Descriptions.Item label="trace_id">
                                        {traceDetail.trace_id}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="日志数量">
                                        {traceDetail.summary?.log_count}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="步骤数量">
                                        {traceDetail.summary?.step_count}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="失败步骤数">
                                        {traceDetail.summary?.failed_step_count}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="总耗时">
                                        {traceDetail.summary?.total_duration}s
                                    </Descriptions.Item>
                                </Descriptions>

                                <Card size="small" title="AI 调用日志">
                                    <Table
                                        size="small"
                                        rowKey="id"
                                        pagination={false}
                                        dataSource={traceDetail.logs || []}
                                        columns={[
                                            { title: '模型', dataIndex: 'model_name' },
                                            { title: '状态', dataIndex: 'success', render: (val) => <Tag color={val ? 'green' : 'red'}>{val ? '成功' : '失败'}</Tag> },
                                            { title: '耗时', dataIndex: 'duration', render: (val) => `${val}s` },
                                            { title: 'Token', dataIndex: 'total_tokens' },
                                            { title: '费用', dataIndex: 'cost' },
                                        ]}
                                    />
                                </Card>
                                <Card size="small" title="AI 请求步骤日志">
                                    <Table
                                        size="small"
                                        rowKey="id"
                                        pagination={false}
                                        dataSource={traceDetail.steps || traceDetail.rag_steps || []}
                                        columns={[
                                            { title: '步骤', dataIndex: 'step', width: 150 },
                                            { title: '状态', dataIndex: 'success', width: 90, render: (val) => <Tag color={val ? 'green' : 'red'}>{val ? '成功' : '失败'}</Tag> },
                                            { title: '耗时', dataIndex: 'duration', width: 90, render: (val) => `${val}s` },
                                            {
                                                title: '详情',
                                                dataIndex: 'detail',
                                                render: (value) => (
                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                                        {JSON.stringify(value || {}, null, 2)}
                                                    </pre>
                                                )
                                            },
                                            { title: '错误', dataIndex: 'error_message' },
                                        ]}
                                    />
                                </Card>
                            </Space>
                        )}
                    </Spin>
                </Drawer>

            </Content>
        </Layout>
    )
}

export default LogList;
