import { useEffect, useState } from "react";
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
} from "antd";
import { useNavigate } from 'react-router-dom';
import {ArrowLeftOutlined} from '@ant-design/icons';
import request from "../utils/request";



const APPROVER_FIELD_OPTIONS = [
    { label: "一级审批人", value: "current_approver" },
    { label: "二级审批人", value: "second_approver" },
];

const getApproverLabel = (value) => {
    const item = APPROVER_FIELD_OPTIONS.find((option) => option.value === value);
    return item?.label || value;
};

const sortNodes = (items = []) => [...items].sort((a, b) => Number(a.node_order || 0) - Number(b.node_order || 0));

export default function WorkflowTemplateManage() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [nodeManagerOpen, setNodeManagerOpen] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [editingNode, setEditingNode] = useState(null);
    const [templateForm] = Form.useForm();
    const [nodeForm] = Form.useForm();


    const [currentUser, setCurrentUser] = useState(null);
    // setCurrentUser会导致重新渲染
    const isAdmin = currentUser?.is_superuser || currentUser?.is_staff;

    const fetchCurrentUser = async () => {
        try {
            const response = await request.get("/users/me/");
            setCurrentUser(response.data.data || response.data);
        } catch (error) {
            setCurrentUser(null);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await request.get("/workflows/templates/");
            const items = response.data.results || response.data || [];
            setTemplates(items);

            if (selectedTemplate) {
                const nextSelected = items.find((item) => item.id === selectedTemplate.id);
                if (nextSelected) {
                    setSelectedTemplate(nextSelected);
                }
            } else if (items.length > 0) {
                setSelectedTemplate(items[0]);
            }
        } catch (error) {
            message.error("加载流程模板失败");
        } finally {
            setLoading(false);
        }
    };

    const fetchNodes = async (templateId) => {
        try {
            const response = await request.get(`/workflows/template-nodes/?template=${templateId}`);
            setNodes(sortNodes(response.data.results || response.data || []));
        } catch (error) {
            message.error("加载模板节点失败");
        }
    };

    useEffect(() => {
        fetchCurrentUser();
        fetchTemplates();
    }, []);

    const requireAdmin = () => {
        if (!isAdmin) {
            message.warning("只有管理员可以执行该操作");
            return false;
        }

        return true;
    };

    const openCreateTemplate = () => {
        if (!requireAdmin()) return;

        setEditingTemplate(null);
        templateForm.resetFields();
        templateForm.setFieldsValue({
            is_active: true,
        });
        setTemplateModalOpen(true);
    };

    const openEditTemplate = (record) => {
        if (!requireAdmin()) return;

        setEditingTemplate(record);
        templateForm.setFieldsValue(record);
        setTemplateModalOpen(true);
    };

    const saveTemplate = async () => {
        const values = await templateForm.validateFields();

        try {
            if (editingTemplate) {
                await request.patch(`/workflows/templates/${editingTemplate.id}/`, values);
                message.success("模板已更新");
            } else {
                await request.post("/workflows/templates/", values);
                message.success("模板已创建");
            }

            setTemplateModalOpen(false);
            await fetchTemplates();
        } catch (error) {
            message.error("保存模板失败");
        }
    };

    const openNodeManager = async (record) => {
        setSelectedTemplate(record);
        setNodes(sortNodes(record.nodes || []));
        setNodeManagerOpen(true);
        await fetchNodes(record.id);
    };

    const openCreateNode = () => {
        if (!requireAdmin()) return;

        if (!selectedTemplate) {
            message.warning("请先选择流程模板");
            return;
        }

        const nextOrder = sortNodes(nodes).reduce((max, item) => Math.max(max, Number(item.node_order || 0)), 0) + 1;
        setEditingNode(null);
        nodeForm.resetFields();
        nodeForm.setFieldsValue({
            template: selectedTemplate.id,
            node_order: nextOrder,
            is_active: true,
            approver_field: "current_approver",
        });
        setNodeModalOpen(true);
    };

    const openEditNode = (record) => {
        if (!requireAdmin()) return;

        setEditingNode(record);
        nodeForm.setFieldsValue(record);
        setNodeModalOpen(true);
    };

    const saveNode = async () => {
        const values = await nodeForm.validateFields();

        try {
            if (editingNode) {
                await request.patch(`/workflows/template-nodes/${editingNode.id}/`, values);
                message.success("节点已更新");
            } else {
                await request.post("/workflows/template-nodes/", values);
                message.success("节点已创建");
            }

            setNodeModalOpen(false);
            await fetchNodes(selectedTemplate.id);
            await fetchTemplates();
        } catch (error) {
            message.error("保存节点失败");
        }
    };

    const toggleNodeActive = async (record) => {
        if (!requireAdmin()) return;

        try {
            await request.patch(`/workflows/template-nodes/${record.id}/`, {
                is_active: !record.is_active,
            });
            message.success("节点状态已更新");
            await fetchNodes(selectedTemplate.id);
            await fetchTemplates();
        } catch (error) {
            message.error("更新节点状态失败");
        }
    };

    const moveNode = async (record, direction) => {
        if (!requireAdmin()) return;

        const orderedNodes = sortNodes(nodes);
        const currentIndex = orderedNodes.findIndex((item) => item.id === record.id);
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        const targetNode = orderedNodes[targetIndex];

        if (currentIndex < 0 || !targetNode) return;

        try {
            await Promise.all([
                request.patch(`/workflows/template-nodes/${record.id}/`, {
                    node_order: targetNode.node_order,
                }),
                request.patch(`/workflows/template-nodes/${targetNode.id}/`, {
                    node_order: record.node_order,
                }),
            ]);
            message.success("节点顺序已更新");
            await fetchNodes(selectedTemplate.id);
            await fetchTemplates();
        } catch (error) {
            message.error("更新节点顺序失败");
        }
    };

    const deleteNode = async (record) => {
        if (!requireAdmin()) return;

        try {
            await request.delete(`/workflows/template-nodes/${record.id}/`);
            message.success("节点已删除");
            await fetchNodes(selectedTemplate.id);
            await fetchTemplates();
        } catch (error) {
            message.error("删除节点失败");
        }
    };

    const templateColumns = [
        {
            title: "名称",
            dataIndex: "name",
        },
        {
            title: "编码",
            dataIndex: "code",
        },
        {
            title: "状态",
            dataIndex: "is_active",
            render: (value) => value ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>,
        },
        {
            title: "节点数",
            render: (_, record) => record.nodes?.length || 0,
        },
        {
            title: "节点流程",
            render: (_, record) => {
                const orderedNodes = sortNodes(record.nodes || []);

                if (orderedNodes.length === 0) {
                    return <Typography.Text type="secondary">暂未配置节点</Typography.Text>;
                }

                return (
                    <Space wrap>
                        {orderedNodes.map((node) => (
                            <Tag key={node.id} color={node.is_active ? "blue" : "default"}>
                                <span>{node.node_order}. </span>
                                <span>{node.node_name}</span>
                            </Tag>
                        ))}
                    </Space>
                );
            },
        },
        {
            title: "操作",
            render: (_, record) => (
                <Space>
                    <Button type="link" onClick={() => openNodeManager(record)}>
                        配置节点
                    </Button>
                    {isAdmin && (
                        <Button type="link" onClick={() => openEditTemplate(record)}>
                            编辑
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="workflow-template-page">
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <h2>流程模板管理</h2>
                    <Typography.Text type="secondary">
                        先选择流程模板，再进入弹窗维护节点顺序和审批规则。
                    </Typography.Text>
                </Col>
                <Col>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/logs')}>
                                返回主页
                        </Button>
                        <Button onClick={fetchTemplates}>刷新</Button>
                        {isAdmin && (
                            <Button type="primary" onClick={openCreateTemplate}>
                                新建模板
                            </Button>
                        )}
                    </Space>
                </Col>
            </Row>

            <Card className="panel-card" title="流程模板">
                <Table
                    rowKey="id"
                    loading={loading}
                    columns={templateColumns}
                    dataSource={templates}
                    pagination={false}
                    rowClassName={(record) => (
                        selectedTemplate?.id === record.id ? "selected-row" : ""
                    )}
                />
            </Card>

            <Modal
                title={editingTemplate ? "编辑模板" : "新建模板"}
                open={templateModalOpen}
                onOk={saveTemplate}
                onCancel={() => setTemplateModalOpen(false)}
                destroyOnHidden
            >
                <Form form={templateForm} layout="vertical">
                    <Form.Item
                        label="模板名称"
                        name="name"
                        rules={[{ required: true, message: "请输入模板名称" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="模板编码"
                        name="code"
                        rules={[{ required: true, message: "请输入模板编码" }]}
                    >
                        <Input disabled={!!editingTemplate} />
                    </Form.Item>

                    <Form.Item label="说明" name="description">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item
                        label="是否启用"
                        name="is_active"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={selectedTemplate ? `配置节点：${selectedTemplate.name}` : "配置节点"}
                open={nodeManagerOpen}
                onCancel={() => setNodeManagerOpen(false)}
                footer={null}
                width={860}
                destroyOnHidden
            >
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                    <Card size="small">
                        <Row justify="space-between" align="middle" gutter={16}>
                            <Col>
                                <Space orientation="vertical" size={2}>
                                    <Typography.Text strong>{selectedTemplate?.name}</Typography.Text>
                                    <Typography.Text type="secondary">{selectedTemplate?.description || "暂无说明"}</Typography.Text>
                                </Space>
                            </Col>
                            <Col>
                                {isAdmin && (
                                    <Button type="primary" onClick={openCreateNode}>
                                        新增节点
                                    </Button>
                                )}
                            </Col>
                        </Row>
                    </Card>

                    <div className="workflow-node-flow">
                        {sortNodes(nodes).length === 0 ? (
                            <div className="workflow-node-empty">暂无节点，请先新增审批节点</div>
                        ) : (
                            sortNodes(nodes).map((node, index, orderedItems) => (
                                <div className="workflow-node-step" key={node.id}>
                                    <div className="workflow-node-order">{node.node_order}</div>
                                    <div className="workflow-node-card">
                                        <div className="workflow-node-main">
                                            <Space>
                                                <Typography.Text strong>{node.node_name}</Typography.Text>
                                                <Tag color={node.is_active ? "success" : "default"}>
                                                    {node.is_active ? "启用" : "停用"}
                                                </Tag>
                                            </Space>
                                            <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
                                                <Tag>{getApproverLabel(node.approver_field)}</Tag>
                                                <Tag>最低金额：{node.min_amount || "-"}</Tag>
                                                <Tag>第 {index + 1} 步</Tag>
                                            </Space>
                                        </div>
                                        {isAdmin && (
                                            <Space wrap>
                                                <Button
                                                    size="small"
                                                    onClick={() => moveNode(node, "up")}
                                                    disabled={index === 0}
                                                >
                                                    上移
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => moveNode(node, "down")}
                                                    disabled={index === orderedItems.length - 1}
                                                >
                                                    下移
                                                </Button>
                                                <Button type="link" onClick={() => openEditNode(node)}>
                                                    编辑
                                                </Button>
                                                <Button type="link" onClick={() => toggleNodeActive(node)}>
                                                    {node.is_active ? "停用" : "启用"}
                                                </Button>
                                                <Popconfirm
                                                    title="删除节点"
                                                    description={`确认删除“${node.node_name}”吗？`}
                                                    okText="删除"
                                                    cancelText="取消"
                                                    onConfirm={() => deleteNode(node)}
                                                >
                                                    <Button type="link" danger>
                                                        删除
                                                    </Button>
                                                </Popconfirm>
                                            </Space>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Space>
            </Modal>

            <Modal
                title={editingNode ? "编辑节点" : "新建节点"}
                open={nodeModalOpen}
                onOk={saveNode}
                onCancel={() => setNodeModalOpen(false)}
                destroyOnHidden
            >
                <Form form={nodeForm} layout="vertical">
                    <Form.Item name="template" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="节点名称"
                        name="node_name"
                        rules={[{ required: true, message: "请输入节点名称" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="节点顺序"
                        name="node_order"
                        rules={[{ required: true, message: "请输入节点顺序" }]}
                    >
                        <InputNumber min={1} precision={0} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        label="审批人字段"
                        name="approver_field"
                        rules={[{ required: true, message: "请选择审批人字段" }]}
                    >
                        <Select options={APPROVER_FIELD_OPTIONS} />
                    </Form.Item>

                    <Form.Item label="最低适用金额" name="min_amount">
                        <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        label="是否启用"
                        name="is_active"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
