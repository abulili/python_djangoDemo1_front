import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Button, Layout, Spin, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, RobotOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import './Stats.css';
import request from '../utils/request';

const { Header, Content } = Layout
const Stats = () => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem('access_token');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await request.get(`${process.env.REACT_APP_API_URL}/logs/stats/`);
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

export default Stats;