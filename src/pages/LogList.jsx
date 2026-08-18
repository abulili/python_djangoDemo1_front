import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tag, Layout, Typography, message, Spin, Card, Row, Col, Statistic, Input, Select, } from 'antd'
import { ReloadOutlined, PlusOutlined, BarChartOutlined, ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, RobotOutlined, FileTextOutlined } from '@ant-design/icons';
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
                const response = await request.get(`${import.meta.env.VITE_API_URL}/logs/stats/`);
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
                <Row gutter={16}>
                    <Col span={8}>
                        <Card className="stat-card">
                            <Statistic title="总调用次数" value={stats?.total || 0} prefix={<RobotOutlined />} />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card className="stat-card">
                            <Statistic title="成功率" value={stats?.success_rate || '0%'} prefix={<CheckCircleOutlined />} />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card className="stat-card">
                            <Statistic title="平均耗时" value={stats?.avg_duration || 0} suffix="s" prefix={<ClockCircleOutlined />} />
                        </Card>
                    </Col>
                </Row>
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
        conversation_id: ''
    })

    const getToken = () => localStorage.getItem('access_token');

    const fetchLogs = async (nextFilters = filters) => { // 没传值默认传filters
        try {
            setLoading(true);
            // Object.entries(filters) -把对象变成数组 过滤空值后再变回对象
            // const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value !== ''));
            const params = Object.fromEntries(
            Object.entries(nextFilters).filter(([, value]) => value !== '')
            );
            console.log('fetchLogs',params,nextFilters)
            const res = await request.get(`/logs/`, { params });
            console.log('fetchLogs', res)
            setLogs(res.data || []);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/');
            }
        } finally {
            setLoading(false);
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
        };

        setFilters(emptyFilters);
        fetchLogs(emptyFilters);
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
                        <Button icon={<ReloadOutlined />} onClick={fetchLogs}>刷新</Button>
                    </Space>

                </div>

            </Header>
            <Content style={{ padding: '24px' }}>
                <Stats />
                <Card size="small" style={{ margin: '16px 0' }}>
                    <Space warp>
                        <Input allowClear placeholder='关键词' value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} style={{ width: 200 }}></Input>
                        <Input allowClear placeholder='会话ID' value={filters.conversation_id} onChange={(event) =>
                            setFilters((prev) => ({ ...prev, conversation_id: event.target.value }))} style={{ width: 260 }} />
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
                        <Button type="primary" onClick={() => fetchLogs()}>
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
                    <Table columns={columns} dataSource={logs} rowKey="id" pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }} />
                </Spin>
            </Content>
        </Layout>
    )
}

export default LogList;
