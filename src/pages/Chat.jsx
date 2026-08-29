import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout, Input, Button, Card, Space, message, Spin, Typography,Select } from 'antd';
import { ArrowLeftOutlined, SendOutlined, BarChartOutlined, DeepSeekFilled, SwapOutlined   } from '@ant-design/icons';
import request from '../utils/request';
import useChatStore from '../store/useChatStore';

const { Header, Content } = Layout;
const { TextArea } = Input;

const Chat = () => {
    const [prompt, setPrompt] = useState('');
    // const [conversationId, setConversationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState('');
    // const [model, setModel] = useState('deepseek');
    const {
        conversationId,
        model,
        streamStream,
        setConversationId,
        toggleModel,
        toggleStreamStream,
        resetConversation,
    } = useChatStore();

    // const [streamStream, setStreamStream] = useState(true);
    // 模板
    const [templates, setTemplates] = useState([])
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [templetVars, setTemplatesVars] = useState({})
    // 会话历史
    const [conversations, setConversations] = useState([])
    const [conversationLoading, setConversationLoading] = useState(false)


    const navigate = useNavigate();
    const getToken = () => localStorage.getItem('access_token');


    const getTaskTimerRef = React.useRef(null);
    const streamControllerRef = React.useRef(null);
    useEffect(() => {
        return () => {
            if (getTaskTimerRef.current) {
                clearInterval(getTaskTimerRef.current);
                getTaskTimerRef.current = null;
            }

            if (streamControllerRef.current) { // 停止请求
                streamControllerRef.current.abort();
                streamControllerRef.current = null;
            }
        };
    }, []);

    // ====== 会话历史
    const fetchConversations = async () => {
        try {
            setConversationLoading(true);

            const res = await request.get('/logs/conversations');
            setConversations(res.data?.data || []);
        } catch (error) {
            if(error.response?.status === 401) {
                navigate('/');
                return;
            }
            message.error('加载会话列表失败');
        } finally {
            setConversationLoading(false);
        }
    }

    useEffect(() => {
        fetchConversations()
    }, [])

    const openConversation = async (id) => {
        try {
            setLoading(true);
            setResponse('');
            setConversationId(id);

            const res = await request.get(`/logs/conversation/${id}/`);
            const history = res.data?.data?.history || [];
            const text = history.map((item) => {
                const roleName = item.role === 'user' ? '我' : 'AI';
                return `${roleName}：${item.content || ''}`
            }).join('\n\n');

            setResponse(text || '这个会话暂无历史记录')
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/');
                return;
            }
            message.error('加载会话历史失败');
        } finally {
            setLoading(false);
        }
    }

    const createNewConversation = () => {
        // setConversationId('');
        resetConversation();
        setResponse('');
        setPrompt('');
    }

    // ====== 模板
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await request.get('/prompt-templates/', {
                    params: {is_active: true}
                })
                const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
                setTemplates(list);
            } catch (error) {
                console.warn('load prompt templates failed', error);
            }
        }
        fetchTemplates()
    }, [])

    const handleTemplateChange = (templateId) => {
        const template = templates.find((item) => item.id === templateId) || null
        setSelectedTemplate(template);
        const nextVars = {};
        (template?.variables || []).forEach((name) => {
            nextVars[name] = name === 'user_input' ? prompt : ''
        })
        setTemplatesVars(nextVars)
    }

    const handleTemplateVarChange = (name, value) => {
        setTemplatesVars((prev) => ({
            ...prev,
           [name]: value // [name] 是动态 key
        }))
    }

    const sseStream = () => {
        if (streamControllerRef.current) {
            streamControllerRef.current.abort()
        }

        const controller = new AbortController();
        streamControllerRef.current = controller;

        const url = `${import.meta.env.VITE_API_URL}/logs/stream3/`;
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                prompt, model, conversation_id: conversationId
            }),
            signal: controller.signal,
        }).then(response => {

            // console.log('sseStream', response)
            // if (response.data?.data?.task_id) {
            //     getTaskId(response.data.data.task_id);
            //     setPrompt('');
            // } else {
            //     setResponse(response.data?.data?.message || '');
            // }
            const reader = response.body.getReader();
            // 创建TextDecoder实例，用于将服务器流式响应返回的二进制字节数据解码为可读的文本字符串
            const decoder = new TextDecoder();
            let buffer = '';

            function readStream() {
                // 从可读流中读取下一段数据（返回一个Promise）
                reader.read().then(({ done, value }) => {
                    // done为true表示流已经读取完毕，没有更多数据了
                    if (done) {
                        setLoading(false); // 停止加载状态
                        streamControllerRef.current = null;
                        return; // 结束当前读取
                    }
                    // 将二进制字节数据解码为字符串文本
                    const chunk = decoder.decode(value);
                    // 将新收到的文本块追加到缓冲区中
                    buffer += chunk;
                    // 按换行符分割缓冲区内容，将每行作为一个单独的元素
                    const lines = buffer.split('\n');
                    // 取出最后一行（可能是不完整的），保留在缓冲区中等待后续数据拼接
                    buffer = lines.pop() || '';
                    // ... 处理完整的行数据。
                    // 后端 stream2 会把多条 SSE 事件合并到同一个 chunk 里，甚至事件之间
                    // 既没有空格也没有换行（形如 {"content":"xx"}data:{"content":"yy"}...）。
                    // 所以不能靠"空白+data:"正则切，要直接按字面量 "data:" 切 + 括号计数取 JSON。

                    // 从字符串里提取第一个"括号平衡"的 JSON 对象（处理嵌套），
                    // 返回 {json, rest} —— 失败时返回 null。
                    function extractFirstJson(s) {
                        const start = s.indexOf('{');
                        if (start < 0) return null;
                        let depth = 0, inStr = false, esc = false;
                        for (let i = start; i < s.length; i++) {
                            const ch = s[i];
                            if (inStr) {
                                if (esc) esc = false;
                                else if (ch === '\\') esc = true;
                                else if (ch === '"') inStr = false;
                                continue;
                            }
                            if (ch === '"') inStr = true;
                            else if (ch === '{') depth++;
                            else if (ch === '}') {
                                depth--;
                                if (depth === 0) {
                                    return { json: s.slice(start, i + 1), rest: s.slice(i + 1) };
                                }
                            }
                        }
                        return null;
                    }

                    lines.forEach(rawLine => {
                        const line = rawLine.replace(/\r/g, '').trim();
                        if (!line) return;

                        // 直接用 "data:" 字面量切割（不要求前后空白）
                        // 例："{\"a\":1}data:{\"b\":2}" -> ["{\"a\":1}","{\"b\":2}"]
                        const parts = line.split(/data:/i);
                        parts.forEach((part, idx) => {
                            let seg = part.trim();
                            if (!seg) return;

                            // split 后第一个片段如果 line 不是以 data: 开头，
                            // 可能是上一个 JSON 的尾巴 + data: 之间的残留（比如 "}data:"），
                            // 或者根本就是纯 data: 开头的正常片段，统一 extractFirstJson 处理。

                            // SSE 哨兵：[DONE]（某些兼容后端会发 data: [DONE]）
                            if (seg === '[DONE]') {
                                setLoading(false);
                                return;
                            }

                            // 连续取：一个 seg 里可能还塞了多个 JSON（极端情况）
                            let cur = seg;
                            while (cur) {
                                const extracted = extractFirstJson(cur);
                                if (!extracted) {
                                    // 剩下的取不到 JSON：要么是 [DONE]/纯文本注释，要么是不完整 chunk
                                    // 不完整 chunk（只有半个对象）会留在 buffer 下次拼，不用报错
                                    if (cur.indexOf('{') >= 0 && idx === parts.length - 1) {
                                        // 最后一个片段里有 { 但没匹配到 }：不完整，记日志让上层 buffer 再拼
                                        console.debug('SSE 片段不完整（会留到下个 chunk 拼接），前80字:',
                                            JSON.stringify(cur.slice(0, 80)));
                                    }
                                    break;
                                }
                                const { json, rest } = extracted;
                                try {
                                    
                                    const data = JSON.parse(json);

                                    if (data.conversation_id) {
                                        setConversationId(data.conversation_id)
                                    }

                                    if (data.content) {
                                        setResponse(prev => prev + data.content);
                                    }
                                    if (data.done) {
                                        setLoading(false);
                                        streamControllerRef.current = null;
                                        fetchConversations();//刷新会话列表
                                    }
                                    if (data.error) {
                                        setResponse('错误: ' + data.error);
                                        setLoading(false);
                                    }
                                } catch (error) {
                                    console.error('解析数据失败. 原始 JSON 片段:',
                                        JSON.stringify(json.slice(0, 200)),
                                        '错误:', error);
                                }
                                cur = rest;
                            }
                        });
                    });
                    readStream()
                }).catch(err => {
                    if (err.name === 'AbortError') {
                        console.log('SSE请求已取消')
                        return;
                    }
                    console.error('读取流失败:', err);
                    setResponse('请求失败: ' + err.message);
                    setLoading(false);
                    streamControllerRef.current = null;
                });
            }
            readStream()


        })
    }
    const getTaskId = async (taskId) => {
        try {
            const res = await request.get(`${import.meta.env.VITE_API_URL}/logs/task/${taskId}/`);
            console.log('getTaskId', res)
            if (res.data.data?.status === 'success') {
                setResponse(res.data.data.message?.response || '');
                clearInterval(getTaskTimerRef.current);
                getTaskTimerRef.current = null;
                setPrompt('');
                setLoading(false);
                fetchConversations();
            }
            else if (res.data.data?.status === 'processing' || res.data.data?.status === 'pending');
            else {
                setResponse('请求失败: ' + res.data.data.message);
                clearInterval(getTaskTimerRef.current);
                getTaskTimerRef.current = null;
                setPrompt('');
                setLoading(false)
            }


        } catch (error) {
            setResponse('请求失败: ' + error.message);
        }
    }
    // 手动停止流式输出
    const stopStream = () => {
        if (streamControllerRef.current) {
            streamControllerRef.current.abort()
            streamControllerRef.current = null
        }
        setLoading(false)
    }

    const singleChat = async () => {
        try {
            const payload = {
                 prompt, conversation_id: conversationId, model
            }
            if (selectedTemplate) {
                payload.template_name = selectedTemplate.name;
                payload.template_vars = {
                    ...templetVars,
                    user_input: prompt
                };
            }
            const res = await request.post(`/logs/call_company_ai4/`, payload);
            console.log('singleChat', res)
            if (res.data?.data?.task_id) {
                if (getTaskTimerRef.current === null) {
                    getTaskTimerRef.current = setInterval(() => getTaskId(res.data?.data?.task_id), 1000);
                }
                else
                    setResponse('请求失败: ' + res.data.message);
            }
                
            if (res.data?.data?.conversation_id) {
                setConversationId(res.data?.data?.conversation_id);
                fetchConversations()
            }
        } catch (error) {
        }
    }



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setResponse('');

        // try {
        //     const res = await request.post(`${import.meta.env.VITE_API_URL}/logs/`, {
        //         prompt, conversation_id: conversationId
        //     });
        //     console.log('handleSubmit', res)
        //     const newConvId = res.data.data?.conversation_id;
        //     if (newConvId) {
        //         setConversationId(newConvId);
        //     }
        // } catch (error) {
        //     if (error.response.status === 401) {
        //         navigate('/');
        //     }
        // }
        if (streamStream)
            sseStream();
        else singleChat();
    }


    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <h2>AI 对话</h2>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/logs')}>返回</Button>
                        {/* <Button icon={<BarChartOutlined />} onClick={() => navigate('/stats')}>统计</Button> */}
                        <Button icon={<SwapOutlined />} onClick={toggleStreamStream}>当前流式，{streamStream ? '已开启' : '已关闭'}</Button>
                        <Button icon={model === 'deepseek' ? <DeepSeekFilled /> : <SwapOutlined />} onClick={toggleModel}>切换模型，当前：{model}</Button>
                    </Space>
                </div>
            </Header>
            <Content style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {conversationId && <Typography.Text type="secondary">会话ID: {conversationId}</Typography.Text>}

                <Card size='small' title='会话历史'>
                    <Space direction='vertical' style={{ width: '100%' }}>
                        <Space>
                            <Button onClick={fetchConversations} loading={conversationLoading}>刷新会话</Button>
                            <Button onClick={createNewConversation} type='primary'>新建会话</Button>
                        </Space>
                    </Space>

                    <Space wrap>
                        {conversations.map((item) => (
                        <Button key={item.conversationId} type={item.conversationId === conversationId ? 'primary' : 'default'} onClick={() => openConversation(item.conversation_id)}> 
                                {item.conversation_id.slice(0, 8)}（{ item.total}）
                        </Button>
                    ))}
                    </Space>
                </Card>

                {!streamStream && (
                    <Card direction="vertical" style={{width: '100%'}}>
                        <Select allowClear placeholder="Prompt 模板" style={{ width: '100%' }}
                            value={selectedTemplate?.id}
                            onChange={handleTemplateChange}
                            options={templates.map(template => ({
                                label: template.name,
                                value: template.id
                            }))}
                        ></Select>
                        {selectedTemplate?.variables?.map(name => (
                            <Space.Compact key={name} style={{width: '100%', margin: '4px 0'}}>
                                <Space.Addon>{name}</Space.Addon>
                                <Input key={name}
                                value={name === 'user_input' ? prompt : (templetVars[name] ?? '')}
                                    onChange={(e) => handleTemplateVarChange(name, e.target.value)}
                                disabled={name === 'user_input'}
                                />
                            </Space.Compact>
                            
                        ))}
                    </Card>
                )}
                <Card style={{ flex: 1, minHeight: 200, background: '#f5f5f5' }}>
                    <Spin spinning={loading} description="AI 正在思考...">
                        <div style={{ whiteSpace: 'pre-wrap', minHeight: 100 }}>
                            {response || <Typography.Text type="secondary">AI 的回复将显示在这里...</Typography.Text>}
                        </div>
                    </Spin>
                </Card>
                <form onSubmit={handleSubmit}>
                    <Space.Compact style={{ width: '100%' }}>
                        <TextArea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="请输入消息..." rows={3} disabled={loading} style={{ flex: '1' }}></TextArea>
                        <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />} disabled={loading} style={{ height: 'auto' }}>
                            {loading ? '正在思考...' : '发送'}
                        </Button>
                        {streamStream && loading && <Button danger onClick={stopStream}>停止生成</Button>}
                    </Space.Compact>
                </form>
            </Content>
        </Layout>
    )
}
export default Chat;