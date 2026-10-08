import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Layout, Input, Button, Card, Space, message, Spin, Typography, Select, List, Switch, Tag } from 'antd';
import {
    ArrowLeftOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    DeepSeekFilled,
    FileTextOutlined,
    HistoryOutlined,
    MessageOutlined,
    PlusOutlined,
    ReloadOutlined,
    SendOutlined,
    StopOutlined,
    SwapOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import request from '../utils/request';
import useChatStore from '../store/useChatStore';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getLatestTraceId } from "../utils/trace";

const { Header, Content, Sider } = Layout;
const { TextArea } = Input;

const MarkdownAnswer = ({ content }) => (
    <div className="markdown-body">
        <ReactMarkdown
            components={{
                a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer" />
                ),
                pre: ({ node, ...props }) => (
                    <pre className="chat-markdown-code" {...props} />
                ),
                code: ({ node, className, ...props }) => (
                    <code className={className ? `${className} chat-markdown-code-text` : "chat-markdown-inline-code"} {...props} />
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

export const MAX_TASK_POLL_COUNT = 60;
const Chat = ({ maxTaskPollCount = MAX_TASK_POLL_COUNT, taskPollIntervalMs = 2000, }) => {
    const [prompt, setPrompt] = useState('');
    // const [conversationId, setConversationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    // const [model, setModel] = useState('deepseek');

    const [ragEnabled, setRagEnabled] = useState(false); // 是否开启知识库问答
    const [references, setReferences] = useState([]); // RAG 返回的引用片段

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
    const pendingTextRef = React.useRef(''); // 还没显示出来的文字队列
    const typingTimerRef = React.useRef(null); // 打字机定时器 用ref的原因:只是保存过程状态，不需要每次变动都触发页面重新渲染。
    const currentAssistantMessageIdRef = React.useRef(null);
    const initialConversationIdRef = React.useRef(conversationId);

    const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const appendChatMessage = (role, content, extra = {}) => {
        const id = createMessageId();
        setChatMessages(prev => [...prev, { id, role, content, ...extra }]);
        return id;
    };

    const updateChatMessage = (id, patch) => {
        if (!id) return;
        setChatMessages(prev => prev.map(item => (
            item.id === id ? { ...item, ...patch } : item
        )));
    };

    // 
    const ragChat = async () => {
        try {
            if (!pendingRequestIdRef.current) {
                pendingRequestIdRef.current = createRequestId();
            }
            const requestId = pendingRequestIdRef.current;
            const res = await request.post('/knowledge-documents/ask/', {
                query: prompt,
                top_k: 3,
                model,
                conversation_id: conversationId,
                request_id: requestId,
            })
            const data = res.data?.data || {};
            setResponse(data?.answer || '');
            setReferences(data.references || [])
            setPrompt('');

            if (data?.conversation_id) {
                setConversationId(data.conversation_id);
            }
            fetchConversations();
        } catch (error) {
            const traceId = getLatestTraceId();
            message.error(traceId ? `知识库问答失败，trace_id：${traceId}` : "知识库问答失败");
            setResponse(traceId ? `知识库问答失败\ntrace_id：${traceId}` : "知识库问答失败");
        } finally {
            setLoading(false)
            pendingRequestIdRef.current = null;
        }
    }



    // 打字机效果
    const startTyping = () => {
        if (typingTimerRef.current) return;

        typingTimerRef.current = setInterval(() => {
            if (!pendingTextRef.current) {
                clearInterval(typingTimerRef.current);
                typingTimerRef.current = null;
                return;
            }
            const nextChar = pendingTextRef.current[0];
            pendingTextRef.current = pendingTextRef.current.slice(1);

            setResponse(prev => prev + nextChar);
        }, 30);
    }

    const appendTypingText = (text) => {
        pendingTextRef.current += text;
        startTyping();
    }

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

            pendingTextRef.current = '';
            if (typingTimerRef.current) {
                clearInterval(typingTimerRef.current);
                typingTimerRef.current = null;
            }
            currentAssistantMessageIdRef.current = null;
        };
    }, []);

    // ====== 会话历史
    const fetchConversations = async () => {
        try {
            setConversationLoading(true);

            const res = await request.get('/logs/conversations');
            setConversations(res.data?.data || []);
        } catch (error) {
            if (error.response?.status === 401) {
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

    const openConversation = async (id, options = {}) => {
        try {
            setLoading(true);
            setResponse('');
            setConversationId(id);
            setReferences([]);
            currentAssistantMessageIdRef.current = null;

            const res = await request.get(`/logs/conversation/${id}/`);
            const history = res.data?.data?.history || [];
            setChatMessages(history.map((item) => ({
                id: item.id || createMessageId(),
                role: item.role === 'user' ? 'user' : 'assistant',
                content: item.content || '',
            })));
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
            if (options.clearOnFailure) {
                resetConversation();
                setChatMessages([]);
                setResponse('');
            }
            message.error('加载会话历史失败');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const initialConversationId = initialConversationIdRef.current;

        if (initialConversationId) {
            openConversation(initialConversationId, { clearOnFailure: true });
        }
    }, [])

    const createNewConversation = () => {
        // setConversationId('');
        resetConversation();
        setResponse('');
        setPrompt('');
        setReferences([]);
        setChatMessages([]);
        currentAssistantMessageIdRef.current = null;
    }

    // ====== 模板
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await request.get('/prompt-templates/', {
                    params: { is_active: true }
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

        // sse重复请求不太适合直接复用旧响应
        // if (!pendingRequestIdRef.current) {
        //         pendingRequestIdRef.current = createRequestId();
        //     }
        // const requestId = pendingRequestIdRef.current;

        const controller = new AbortController();
        streamControllerRef.current = controller;

        const url = `${import.meta.env.VITE_API_URL}/logs/stream3/`;
        fetchWithAuth(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                prompt, model, conversation_id: conversationId,
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
                        setPrompt('');
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
                                        // setResponse(prev => prev + data.content);
                                        appendTypingText(data.content);
                                    }
                                    if (data.done) {
                                        setLoading(false);
                                        streamControllerRef.current = null;
                                        setPrompt('');
                                        fetchConversations();//刷新会话列表
                                    }
                                    if (data.error) {
                                        if (data.error) {
                                            const traceId = getLatestTraceId();
                                            setResponse(traceId ? `错误: ${data.error}\ntrace_id：${traceId}` : `错误: ${data.error}`);
                                            setLoading(false);
                                        }
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

    const taskPollCountRef = React.useRef(0);
    const getTaskId = async (taskId) => {
        try {
            taskPollCountRef.current += 1;

            if (taskPollCountRef.current > maxTaskPollCount) {
                clearInterval(getTaskTimerRef.current);
                getTaskTimerRef.current = null;
                setLoading(false);
                setResponse('任务处理时间较长，请稍后到日志列表查看结果');
                message.warning('任务处理时间较长，已停止自动查询');
                return;
            }

            const res = await request.get(`${import.meta.env.VITE_API_URL}/logs/task/${taskId}/`);
            
            if (res.data.data?.status === 'success') {
                setResponse(res.data.data.result?.response || res.data.data.message?.response || '');
                clearInterval(getTaskTimerRef.current);
                getTaskTimerRef.current = null;
                taskPollCountRef.current = 0;
                setPrompt('');
                setLoading(false);
                fetchConversations();
            }
            else if (res.data.data?.status === 'processing' || res.data.data?.status === 'pending');
            else {
                setResponse('请求失败: ' + (res.data.data?.error || res.data.data?.message || '未知错误'));
                clearInterval(getTaskTimerRef.current);
                getTaskTimerRef.current = null;
                taskPollCountRef.current = 0;
                setPrompt('');
                setLoading(false)
            }

            const nextConversationId = res.data.data.result?.conversation_id || res.data.data.conversation_id;
            if (nextConversationId) {
                setConversationId(nextConversationId);
            }


        } catch (error) {
            const status = error.response?.status;

            if ([403, 404, 429].includes(status)) {
                if (getTaskTimerRef.current) {
                    clearInterval(getTaskTimerRef.current);
                    getTaskTimerRef.current = null;
                    taskPollCountRef.current = 0;
                }

                setLoading(false);

                if (status === 404) {
                    setResponse("任务不存在、已过期，或当前账号无权限查看");
                    message.error("任务不存在或已过期");
                } else if (status === 403) {
                    setResponse("当前账号无权限查看该任务结果");
                    message.error("无权限查看任务结果");
                } else if (status === 429) {
                    const wait = error.response?.data?.data?.wait;
                    const text = wait
                        ? `任务查询太频繁，请 ${Math.ceil(wait)} 秒后再试`
                        : "任务查询太频繁，请稍后再试";
                    setResponse(text);
                    message.warning(text);
                }

                return;
            }
        }
    }
    // 手动停止流式输出
    const stopStream = () => {
        if (streamControllerRef.current) {
            streamControllerRef.current.abort()
            streamControllerRef.current = null
        }

        pendingTextRef.current = '';

        if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
        }

        setLoading(false)
    }

    const createRequestId = () => {
        if (crypto?.randomUUID) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    };
    const pendingRequestIdRef = useRef(null);


    const singleChat = async () => {
        try {

            if (!pendingRequestIdRef.current) {
                pendingRequestIdRef.current = createRequestId();
            }
            const requestId = pendingRequestIdRef.current;

            const payload = {
                prompt, conversation_id: conversationId, model, request_id: requestId,
            }
            if (selectedTemplate) {
                payload.template_name = selectedTemplate.name;
                payload.template_vars = {
                    ...templetVars,
                    user_input: prompt
                };
            }
            setLoading(true);
            const res = await request.post(`/logs/call_company_ai4/`, payload);
            
            if (res.data?.data?.task_id) {
                taskPollCountRef.current = 0;
                if (getTaskTimerRef.current === null) {
                    getTaskTimerRef.current = setInterval(() => getTaskId(res.data?.data?.task_id), taskPollIntervalMs);
                }
                else
                    setResponse('请求失败: ' + res.data.message);
            }

            if (res.data?.data?.conversation_id) {
                setConversationId(res.data?.data?.conversation_id);
                fetchConversations()
            }
            pendingRequestIdRef.current = null;
        } catch (error) {
            const traceId = getLatestTraceId();
            setResponse(
                traceId
                    ? `请求失败\ntrace_id：${traceId}`
                    : '请求失败'
            );
            message.error(traceId ? `请求失败，trace_id：${traceId}` : '请求失败');
            setLoading(false);
            pendingRequestIdRef.current = null;
        }
    }



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        if (loading) return;

        const userMessage = prompt.trim();
        setLoading(true);
        setResponse('');
        setReferences([]);
        appendChatMessage('user', userMessage);
        currentAssistantMessageIdRef.current = appendChatMessage('assistant', '', { pending: true });

        pendingTextRef.current = '';

        setReferences([]);

        if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
        }

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
        if (ragEnabled) {
            ragChat();
        }
        else if (streamStream)
            sseStream();
        else singleChat();
    }

    useEffect(() => {
        if (!currentAssistantMessageIdRef.current) return;

        updateChatMessage(currentAssistantMessageIdRef.current, {
            content: response,
            pending: loading && !response,
        });
    }, [response, loading]);

    const activeModeLabel = ragEnabled ? '知识库问答' : streamStream ? '流式对话' : '任务轮询';
    const activeModelLabel = model || 'deepseek';
    const selectedConversation = conversations.find((item) => item.conversation_id === conversationId);
    const conversationTitle = selectedConversation?.title || (conversationId ? `会话 ${conversationId.slice(0, 8)}` : '新会话');
    const visibleChatMessages = chatMessages.slice(-80);
    const getMessageMeta = (role) => role === 'user'
        ? { name: '我', avatar: '我' }
        : { name: activeModelLabel, avatar: 'AI' };

    return (
        <Layout className="saas-shell chat-shell">
            <Sider width={280} className="chat-sider">
                <div className="brand-lockup chat-brand">
                    <div className="brand-mark">AI</div>
                    <div>
                        <div className="brand-title">AI 对话</div>
                        <div className="brand-subtitle">调试、知识库与模板测试</div>
                    </div>
                </div>

                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    <Button type="primary" block icon={<PlusOutlined />} onClick={createNewConversation}>
                        新建会话
                    </Button>
                    <Button block icon={<ReloadOutlined />} onClick={fetchConversations} loading={conversationLoading}>
                        刷新会话
                    </Button>
                </Space>

                <div className="chat-side-section">
                    <div className="chat-section-title">
                        <HistoryOutlined />
                        <span>会话历史</span>
                    </div>
                    <List
                        className="chat-history-list"
                        size="small"
                        loading={conversationLoading}
                        dataSource={conversations}
                        locale={{ emptyText: '暂无会话记录' }}
                        renderItem={(item) => (
                            <List.Item
                                key={item.conversation_id}
                                className={item.conversation_id === conversationId ? 'chat-history-item active' : 'chat-history-item'}
                                onClick={() => openConversation(item.conversation_id)}
                            >
                                <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                                    <Typography.Text ellipsis strong>
                                        {item.title || item.conversation_id}
                                    </Typography.Text>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        {item.conversation_id}
                                    </Typography.Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                </div>
            </Sider>

            <Layout className="saas-main">
                <Header className="saas-header">
                    <div className="saas-header-inner">
                        <Space size={12}>
                            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/logs')}>
                                返回主页
                            </Button>
                        </Space>
                        <Space>
                            {!ragEnabled && (
                                <Button icon={<ThunderboltOutlined />} onClick={toggleStreamStream}>
                                    {streamStream ? '流式已开启' : '任务轮询'}
                                </Button>
                            )}
                            <Space size={8}>
                                <Typography.Text type="secondary">知识库问答</Typography.Text>
                                <Switch checked={ragEnabled} onChange={setRagEnabled} />
                            </Space>
                            <Button icon={model === 'deepseek' ? <DeepSeekFilled /> : <SwapOutlined />} onClick={toggleModel}>
                                切换模型：{model}
                            </Button>
                        </Space>
                    </div>
                </Header>

                <Content className="chat-content">
                    <div className="chat-workbench">
                        <div className="chat-main-panel">
                            {/* <div className="chat-conversation-header">
                                <div>
                                    <Typography.Title className="chat-conversation-title" level={2}>
                                        {conversationTitle}
                                    </Typography.Title>
                                    <Typography.Text type="secondary">
                                        {conversationId ? `会话 ID：${conversationId}` : '当前是新会话'}
                                    </Typography.Text>
                                </div>
                                <Space wrap>
                                    <Tag color="blue">{activeModeLabel}</Tag>
                                    <Tag color="green">{activeModelLabel}</Tag>
                                    {selectedTemplate && <Tag color="purple">{selectedTemplate.name}</Tag>}
                                </Space>
                            </div> */}

                            <div className="chat-meta-strip">
                                <div className="chat-meta-item">
                                    <span>当前模型</span>
                                    <strong>{activeModelLabel}</strong>
                                </div>
                                <div className="chat-meta-item">
                                    <span>执行模式</span>
                                    <strong>{activeModeLabel}</strong>
                                </div>
                                <div className="chat-meta-item">
                                    <span>会话 ID</span>
                                    <strong>{conversationId || '新会话'}</strong>
                                </div>
                            </div>

                            {!streamStream && !ragEnabled && (
                                <Card className="panel-card chat-template-card" size="small" title="Prompt 模板">
                                    <Select
                                        allowClear
                                        placeholder="Prompt 模板"
                                        style={{ width: '100%' }}
                                        value={selectedTemplate?.id}
                                        onChange={handleTemplateChange}
                                        options={templates.map(template => ({
                                            label: template.name,
                                            value: template.id
                                        }))}
                                    />
                                    {selectedTemplate?.variables?.map(name => (
                                        <Space.Compact key={name} style={{ width: '100%', marginTop: 8 }}>
                                            <Space.Addon>{name}</Space.Addon>
                                            <Input
                                                value={name === 'user_input' ? prompt : (templetVars[name] ?? '')}
                                                onChange={(e) => handleTemplateVarChange(name, e.target.value)}
                                                disabled={name === 'user_input'}
                                            />
                                        </Space.Compact>
                                    ))}
                                </Card>
                            )}

                            <Card className="panel-card chat-card">
                                <Spin spinning={loading} description="AI 正在思考...">
                                    <div className="chat-messages virtual-message-list" style={{ overflowY: 'auto' }}>
                                        {visibleChatMessages.length > 0 ? (
                                            visibleChatMessages.map((item) => {
                                                const meta = getMessageMeta(item.role);

                                                return (
                                                    <div key={item.id} className={`chat-message-row ${item.role}`}>
                                                        <div className={`chat-avatar ${item.role}`}>{meta.avatar}</div>
                                                        <div className="chat-message-body">
                                                            <div className="chat-message-name">{meta.name}</div>
                                                            <div className={`chat-bubble ${item.role}`}>
                                                                {item.content ? (
                                                                    item.role === 'assistant'
                                                                        ? <MarkdownAnswer content={item.content} />
                                                                        : item.content
                                                                ) : (
                                                                    <Typography.Text type="secondary">
                                                                        {item.pending ? 'AI 正在思考...' : ''}
                                                                    </Typography.Text>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="chat-empty">
                                                <MessageOutlined />
                                                <Typography.Text strong>AI 的回复将显示在这里...</Typography.Text>
                                                <Typography.Text type="secondary">
                                                    输入消息后，回复、任务状态和引用片段会显示在这里。
                                                </Typography.Text>
                                            </div>
                                        )}
                                    </div>
                                </Spin>
                            </Card>

                            {references.length > 0 && (
                                <Card className="panel-card chat-reference-card" size="small" title="引用片段">
                                    <Space orientation="vertical" style={{ width: '100%' }}>
                                        {references.map((item) => (
                                            <Card key={item.id} size="small" className="reference-item">
                                                <Space style={{ marginBottom: 8 }} wrap>
                                                    <Tag color="blue">{item.document_title}</Tag>
                                                    <Tag>chunk {item.chunk_index}</Tag>
                                                    <Tag color="green">score {item.score}</Tag>
                                                </Space>
                                                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                                                    {item.content}
                                                </Typography.Paragraph>
                                            </Card>
                                        ))}
                                    </Space>
                                </Card>
                            )}

                            <form className="chat-composer" onSubmit={handleSubmit}>
                                <TextArea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="请输入消息..."
                                    rows={4}
                                    disabled={loading}
                                />
                                <div className="composer-actions">
                                    <Space>
                                        {streamStream && loading && (
                                            <Button danger icon={<StopOutlined />} onClick={stopStream}>
                                                停止生成
                                            </Button>
                                        )}
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={loading}
                                            icon={<SendOutlined />}
                                            disabled={loading}
                                        >
                                            {loading ? '正在思考...' : '发送'}
                                        </Button>
                                    </Space>
                                </div>
                            </form>
                        </div>
                    </div>
                </Content>
            </Layout>
        </Layout>
    )
}
export default Chat;
