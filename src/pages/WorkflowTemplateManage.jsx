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
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
} from "antd";

import request from "../utils/request";

const APPROVER_FIELD_OPTIONS = [
    { label: "一级审批人", value: "current_approver" },
    { label: "二级审批人", value: "second_approver" },
];

export default function WorkflowTemplateManage() {

    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [editingNode, setEditingNode] = useState(null);
    const [templateForm] = Form.useForm();
    const [nodeForm] = Form.useForm();


    const [currentUser, setCurrentUser] = useState(null);
    // setCurrentUser会导致重新渲染
    const isAdmin = currentUser?.is_superuser;

    const fetchCurrentUser = async () => {
        try {
            const response = await request.get("/users/me/");
            setCurrentUser(response.data.data);
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

            if (!selectedTemplate && items.length > 0) {
                setSelectedTemplate(items[0]);
                await fetchNodes(items[0].id);
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
            setNodes(response.data.results || response.data || []);
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

    const selectTemplate = async (record) => {
        setSelectedTemplate(record);
        await fetchNodes(record.id);
    };

    const openCreateNode = () => {
        if (!selectedTemplate) {
            message.warning("请先选择流程模板");
            return;
        }

        setEditingNode(null);
        nodeForm.resetFields();
        nodeForm.setFieldsValue({
            template: selectedTemplate.id,
            is_active: true,
            approver_field: "current_approver",
        });
        setNodeModalOpen(true);
    };

    const openEditNode = (record) => {
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
        try {
            await request.patch(`/workflows/template-nodes/${record.id}/`, {
                is_active: !record.is_active,
            });
            message.success("节点状态已更新");
            await fetchNodes(selectedTemplate.id);
        } catch (error) {
            message.error("更新节点状态失败");
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
            title: "操作",
            render: (_, record) => (
                <Space>
                    <Button type="link" onClick={() => selectTemplate(record)}>
                        选择
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

    const nodeColumns = [
        {
            title: "顺序",
            dataIndex: "node_order",
        },
        {
            title: "节点名称",
            dataIndex: "node_name",
        },
        {
            title: "审批人字段",
            dataIndex: "approver_field",
            render: (value) => {
                const item = APPROVER_FIELD_OPTIONS.find((option) => option.value === value);
                return item?.label || value;
            },
        },
        {
            title: "最低金额",
            dataIndex: "min_amount",
            render: (value) => value || "-",
        },
        {
            title: "状态",
            dataIndex: "is_active",
            render: (value) => value ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>,
        },
        {
            title: "操作",
            render: (_, record) => {
                if (!isAdmin) {
                    return "-";
                }

                return (
                    <Space>
                        <Button type="link" onClick={() => openEditNode(record)}>
                            编辑
                        </Button>
                        <Button type="link" onClick={() => toggleNodeActive(record)}>
                            {record.is_active ? "停用" : "启用"}
                        </Button>
                    </Space>
                );
            },
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <h2>流程模板管理</h2>
                </Col>
                <Col>
                    <Space>
                        <Button onClick={fetchTemplates}>刷新</Button>
                        {isAdmin && (
                            <>
                                <Button type="primary" onClick={openCreateTemplate}>
                                    新建模板
                                </Button>
                                <Button onClick={openCreateNode}>
                                    给当前模板新增节点
                                </Button>
                            </>
                        )}
                    </Space>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={10}>
                    <Card title="流程模板">
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
                </Col>

                <Col span={14}>
                    <Card
                        title={selectedTemplate ? `模板节点：${selectedTemplate.name}` : "模板节点"}
                    >
                        <Table
                            rowKey="id"
                            columns={nodeColumns}
                            dataSource={nodes}
                            pagination={false}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title={editingTemplate ? "编辑模板" : "新建模板"}
                open={templateModalOpen}
                onOk={saveTemplate}
                onCancel={() => setTemplateModalOpen(false)}
                destroyOnClose
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
                title={editingNode ? "编辑节点" : "新建节点"}
                open={nodeModalOpen}
                onOk={saveNode}
                onCancel={() => setNodeModalOpen(false)}
                destroyOnClose
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