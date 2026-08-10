import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tag, Layout, Typography, message, Spin, Card, Row, Col, Statistic } from 'antd'
import { ReloadOutlined, PlusOutlined, BarChartOutlined, ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, RobotOutlined } from '@ant-design/icons';
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
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <h2>AI 调用统计</h2>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/logs')}>返回日志列表</Button>
                    <Button icon={<PlusOutlined />} onClick={() => navigate('/chat')}>发起对话</Button>
                </div>
            </Header>
            <Content style={{ padding: '24px' }}>
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

    const getToken = () => localStorage.getItem('access_token');

    const fetchLogs = async () => {
        try {
            const res = await request.get(`${import.meta.env.VITE_API_URL}/logs/`);
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
                        <Button icon={<BarChartOutlined />} onClick={() => navigate('/stats')}>统计</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/chat')}>发起对话</Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchLogs}>刷新</Button>
                    </Space>

                </div>

            </Header>
            <Content style={{ padding: '24px' }}>
                {/* <Stats /> */}
                <Spin spinning={loading}>
                    <Table columns={columns} dataSource={logs} rowKey="id" pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }} />
                </Spin>
            </Content>
        </Layout>
    )
}

export default LogList;
