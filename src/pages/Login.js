import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Form, Input, Button, Card, message, Layout } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import request from '../utils/request';

const { Content } = Layout;
const Login = () => {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate();


    const handleSubmit = async (values) => {
        setLoading(true)
        try {
            // antd Form 的 onFinish 会把表单字段作为对象传入：{ username, password }
            const response = await request.post(`${process.env.REACT_APP_API_URL}/token/`, values);
            console.log('Log handleSubmit', response.data)
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            message.success('登陆成功')
            navigate('/logs');
        } catch (error) {
            // setError('用户名或密码错误');1
            message.error('用户名或密码错误')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Card title="AI 调用日志系统" style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {/* {error && <p style={{ color: 'red' }}>{error}</p>} */}
                    <Form onFinish={handleSubmit} size="large">
                        <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                            <Input prefix={<UserOutlined />} allowClear={true} placeholder="用户名" />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} disabled={loading} block>
                                登录
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </Content>
        </Layout>
    )
}

export default Login;