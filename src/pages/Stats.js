import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Stats = () => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem('access_token');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/logs/stats/`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                });
                setStats(response.data.data);
            } catch (error) {
                if (error.response.status === 401) {
                    navigate('/');
                }
            } finally {
                setLoading(false);
            }

        }
        fetchStats();
    }, [navigate]);

    if (loading) {
        return <div>加载中...</div>;
    }
    if (!stats) {
        return <div>暂无统计数据</div>;
    }

    return (
        <div>
            <h2>AI 调用统计</h2>
            <button onClick={() => navigate('/logs')}>返回日志列表</button>
            <button onClick={() => navigate('/chat')}>发起对话</button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
                <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px' }}>
                    <h3>总调用</h3>
                    <p style={{ fontSize: '24px' }}>{stats.total}</p>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px' }}>
                    <h3>成功率</h3>
                    <p style={{ fontSize: '24px', color: stats.success_rate > 80 ? 'green' : 'orange' }}>
                        {stats.success_rate}
                    </p>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px' }}>
                    <h3>平均耗时</h3>
                    <p style={{ fontSize: '24px' }}>{stats.avg_duration}s</p>
                </div>


            </div>
        </div>
    );
}

export default Stats;