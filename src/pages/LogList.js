import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LogList = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem('access_token');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/logs/`,
                    {
                        headers: {
                            'Authorization': `Bearer ${getToken()}`
                        }
                    }
                );
                console.log('fetchLogs', res)
                setLogs(res.data);
            } catch (error) {
                if (error.response?.status === 401) {
                    navigate('/');
                }
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
    }, [navigate]);

    if (loading) {
        return <div>加载中...</div>;
    }

    return (
        <div>
            <h2>日志列表</h2>
            <button onClick={() => navigate('/chat')}>发起对话</button>
            <button onClick={() => navigate('/stats')}>查看统计</button>

            <table border={1}>
                <thead>
                    <tr>
                        <th>日志ID</th>
                        <th>用户输入</th>
                        <th>AI回复</th>
                        <th>耗时</th>
                        <th>成功</th>
                        <th>时间</th>
                    </tr>
                </thead>
                <tbody>
                    {logs?.map(log => (
                        <tr key={log.id}>
                            <td>{log.id}</td>
                            <td>{log.prompt?.slice(0, 30)}...</td>
                            <td>{log.response?.slice(0, 30)}...</td>
                            <td>{log.duration}s</td>
                            <td>{log.success ? '✔' : '✘'}</td>
                            <td>{log.call_time}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default LogList;