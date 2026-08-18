import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'
import {
    Button,
    Descriptions,
    Form,
    Input,
    Layout,
    Modal,
    Popconfirm,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import request from '../utils/request';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

const PromptTemplates = () => {
    const navigate = useNavigate();

    const [templates, setTemplates] = useState([])
    const [keyword, setKeyword] = useState('')
    const [loading, setLoading] = useState(false)

    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

    const parseVariables = (value) => {
        return String(value || '').split(',').map((item) => item.trim()).filter(Boolean) // filter(Boolean)：过滤掉数组中的假值（false、null、undefined、''、0、NaN）
    }

    const openCreate = () => {
        // 清空表单
        setEditing(null);

        form.setFieldValue({
            name: '',
            descriptions: '',
            content: '',
            variablesText: '',
            is_active: true,
        })
        setOpen(true)
    }

    const openEdit = (record) => {
        setEditing(record)
        form.setFieldsValue({
            name: record.name,
            descriptions: record.descriptioncriptions,
            content: record.content,
            variablesText: (record.variables || []).join(','),
            is_active: record.is_active,
        })
        setOpen(true)
    }

    const handleSave = async () => {
        const values = await form.validateFields()

        const payload = {
            name: values.name,
            description: values.description || '',
            content: values.content || '',
            variables: parseVariables(values.variablesText),
            is_active: values.is_active,
        }

        try {
            if (editing) {
                console.log('editing', editing)
                await request.put(`/prompt-templates/${editing.id}/`, payload);
                message.success('模板已更新')
            } else {
                await request.post('/prompt-templates/', payload);
                message.success('模板已创建')
            }
            setOpen(false)
            fetchTemplates()
        } catch (error) {
            message.error('模板保存失败')
        }
    }

    const handleDelte = async (id) => {
        try {
            await request.delete(`/prompt-templates/${id}/`);
            message.success('模板已删除')
            fetchTemplates()
        } catch (error) {
            message.error('模板删除失败')
        }
    }

    const fetchTemplates = async () => {
        try {
            setLoading(true)

            const res = await request.get('/prompt-templates/', {
                params: keyword ? { keyword } : {}
            })
            console.log('fetchTemplates', res.data)
            const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
            setTemplates(list);
            // setTemplates(Array.isArray(res.data) ? res.data : [])

        } catch (error) {
            if (error.response?.state === 401) {
                navigate('/')
                return;
            }
            message.error('Prompt模板加载失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    const columns = [{
        title: '名称',
        dataIndex: 'name',
        width: 160,
    },
    {
        title: '描述',
        dataIndex: 'description',
        ellipsis: true,
    },
    {
        title: '内容',
        dataIndex: 'content',
        ellipsis: true,
    },
    {
        title: '变量',
        dataIndex: 'variables',
        width: 220,
        render: (variables = []) => (
            <Space wrap>
                {variables.map((item) => (
                    <Tag key={item}>{item}</Tag>
                ))}
            </Space>
        )
    },
    {
        title: '状态',
        dataIndex: 'is_active',
        width: 90,
        render: (value) => (
            <Tag color={value ? 'green' : 'default'}>
                {value ? '启用' : '停用'}
            </Tag>
        ),
    },
    {
        title: '更新时间',
        dataIndex: 'updated_at',
        width: 190,
        render: (value) => (value ? new Date(value).toLocaleString() : '-'),

    }, {
        title: '操作',
        width: 160,
        fixed: 'end',
        render: (_, record) => (
            <Space>
                <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
                <Popconfirm title="确认删除这个模板？" onConfirm={() => handleDelte(record.id)}>
                    <Button icon={<DeleteOutlined />} danger>删除</Button>
                </Popconfirm>
            </Space>
        )
    }
    ]

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <Title level={3} style={{ margin: 0 }}>Prompt 模板管理</Title>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/logs')}>返回日志</Button>
                        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">创建模板</Button>
                    </Space>
                </div>
            </Header>
            <Content style={{ padding: 24 }}>
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search allowClear placeholder='搜索模板名称' value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={fetchTemplates} style={{ width: 280 }} />
                    <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>刷新</Button>
                </Space>
                <Table loading={loading} columns={columns} dataSource={templates} rowKey="id" pagination={{
                    pageSize: 10,
                    showTotal: (total) => `共 ${total} 条`
                }}
                    scroll={{ x: 1000 }}
                >

                </Table>
            </Content>
            <Modal title={editing ? '编辑prompt模板' : '创建prompt模板'} open={open} onOk={handleSave} onCancel={() => setOpen(false)} okText="保存" cancelText="取消" width={720}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                        <Input placeholder='例如 resume_polish' />
                    </Form.Item>
                    <Form.Item name="description" label="模板描述">
                        <Input placeholder='这个模板适合什么场景' />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="模板内容"
                        rules={[{ required: true, message: '请输入模板内容' }]}
                    >
                        <TextArea
                            rows={8}
                            placeholder="例如：你是{role}，请根据{user_input}帮我优化表达。"
                        />
                    </Form.Item>
                    <Form.Item name="variablesText" label="变量列表">
                        <Input placeholder="用英文逗号分隔，例如 role, user_input (role和user_input是必填项)" />
                    </Form.Item>
                    <Form.Item name="is_active" label="是否启用" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    )
}

export default PromptTemplates