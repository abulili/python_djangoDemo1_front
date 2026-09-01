import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Button,
    Drawer,
    Form,
    Input,
    Layout,
    Modal,
    Popconfirm,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import request from '../utils/request';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const KnowledgeDocuments = () => {
    const navigate = useNavigate();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);

    const [open, setOpen] = useState(false);
    const [form] = Form.useForm(); // Form.useForm()返回的就是一个数组 从数组里取出第一个元素，命名为 form
    /**
     * 等价于
        const formList = Form.useForm();
        const form = formList[0];
     */

    const [chunkDrawerOpen, setChunkDrawerOpen] = useState(false)
    const [currentDocument, setCurrentDocument] = useState(null)

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await request.get('/knowledge-documents/');
            const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setDocuments(list);
        } catch (error) {
            message.error('知识库文档加载失败');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDocuments();
    }, []);

    const openCreate = async () => {
        // form.setFieldsValue({
        //     title: '',
        //     content: '',
        // });
        form.resetFields();
        setOpen(true);
    }

    const handleSave = async () => {
        const values = await form.validateFields();

        try {
            await request.post('/knowledge-documents/', {
                title: values.title,
                content: values.content,
            })
            message.success('文档创建并自动切片')
            setOpen(false);
            fetchDocuments();
        } catch (error) {
            message.error('文档保存失败');  
        } 
    }

    const handleDelte = async (id) => {
        try {
            await request.delete(`/knowledge-documents/${id}/`);
            message.success('文档已删除');
            fetchDocuments();
        } catch (error) {
            message.error('文档删除失败');
        } 
    }

    const openChunks = (record) => {
        setCurrentDocument(record);
        setChunkDrawerOpen(true);
    }

    const columns = [
        {
            title: '标题',
            dataIndex: 'title',
            width: 220,
        },
        {
            title: '内容',
            dataIndex: 'content',
            ellipsis: true,
        },
        {
            title: '切片数',
            dataIndex: 'chunk_count',
            width: 100,
            render: (value) => <Tag color="blue">{value || 0}</Tag>,
        },
        {
            title: '更新时间',
            dataIndex: 'updated_at',
            width: 190,
            render: (value) => (value ? new Date(value).toLocaleString() : '-'),
        },
        {
            title: '操作',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => openChunks(record)}>切片</Button>
                    <Popconfirm title="确认删除这个文档？" onConfirm={() => handleDelte(record.id)}>
                        <Button icon={<DeleteOutlined />} danger>删除</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Layout style={{minHeight: '100vh'}}>
            <Header style={{background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0f'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <Title level={3} style={{ margin: 0 }}>知识库文档</Title>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/logs')}>
                            返回日志
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchDocuments}>
                            刷新
                        </Button>
                        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
                            新增文档
                        </Button>
                    </Space>
                </div>
            </Header>

            <Content style={{padding: 24}}>
                <Table
                    loading={loading}
                    columns={columns}
                    dataSource={documents}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 条`
                    }}
                />
            </Content>

            <Modal
                title="新增知识库文档"
                open={open}
                onOk={handleSave}
                onCancel={() => setOpen(false)}
                okText="保存"
                cancelText="取消"
                width={760}
            >
                <Form form={form} layout='vertical'>
                    <Form.Item
                        name="title"
                        label="文档标题"
                        rules={[{required: true, message: '请输入文档标题'}]}
                    >
                        <Input placeholder='例如：AI日志项目说明' />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="文档内容"
                        rules={[{required: true, message: '请输入文档内容'}]}
                    >
                        <TextArea rows={12} placeholder='粘贴项目说明，接口文档、面试讲法等内容' />
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title={currentDocument?.title || '文档切片'}
                open={chunkDrawerOpen}
                onClose={() => setChunkDrawerOpen(false)}
                width={720}
            >
                {(currentDocument?.chunks || []).map((chunk) => (
                    <div
                        key={chunk.id}
                        style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0'}}
                    >
                        <Tag color="blue">chunk {chunk.chunk_index}</Tag>
                        <Paragraph style={{margin: 8, whiteSpace: 'pre-wrap'}}>{chunk.content}</Paragraph>
                    </div>
                ))}
            </Drawer>
        </Layout>
    )
}

export default KnowledgeDocuments;