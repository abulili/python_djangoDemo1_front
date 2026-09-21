import { useEffect, useState } from "react";
import {
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
} from "antd";

import request from "../utils/request";

const STATUS_MAP = {
    draft: { text: "草稿", color: "default" },
    pending: { text: "待审批", color: "processing" },
    approved: { text: "已通过", color: "success" },
    rejected: { text: "已驳回", color: "error" },
    cancelled: { text: "已取消", color: "warning" },
};

const PAYMENT_STATUS_MAP = {
    pending: { text: "待支付", color: "default" },
    user_paid: { text: "用户已支付", color: "processing" },
    confirmed: { text: "已确认到账", color: "success" },
    cancelled: { text: "已取消", color: "warning" },
};

const ACTION_MAP = {
    create: "创建申请",
    submit: "提交审批",
    approve: "审批通过",
    reject: "审批驳回",
    cancel: "取消申请",
    create_payment: "创建支付订单",
    mark_paid: "标记已支付",
    confirm_payment: "确认到账",
};

function getStatusTag(status) {
    const item = STATUS_MAP[status] || { text: status, color: "default" };
    return <Tag color={item.color}>{item.text}</Tag>;
}

function getPaymentStatusTag(status) {
    const item = PAYMENT_STATUS_MAP[status] || { text: status, color: "default" };
    return <Tag color={item.color}>{item.text}</Tag>;
}
const TASK_STATUS_MAP = {
    pending: { text: "待处理", color: "processing" },
    approved: { text: "已通过", color: "success" },
    rejected: { text: "已驳回", color: "error" },
    cancelled: { text: "已取消", color: "warning" },
};

function getTaskStatusTag(status) {
    const item = TASK_STATUS_MAP[status] || { text: status, color: "default" };
    return <Tag color={item.color}>{item.text}</Tag>;
}
export default function WorkflowList() {
    const [loading, setLoading] = useState(false);
    const [mine, setMine] = useState([]);
    const [pending, setPending] = useState([]);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [templates, setTemplates] = useState([]);

    const [filters, setFilters] = useState({
    status: "",
    request_type: "",
    template: "",
    });
    
    const buildQuery = () => {
        // mine/?status=pending
    const params = new URLSearchParams();

    if (filters.status) {
        params.append("status", filters.status);
    }

    if (filters.request_type) {
        params.append("request_type", filters.request_type);
    }

    if (filters.template) {
        params.append("template", filters.template);
    }

    const query = params.toString();
    return query ? `?${query}` : "";
};

    const fetchData = async () => {
        setLoading(true);
        try {
            const query = buildQuery();
            // 两个接口同时请求，并行请求  allSettled出来的结果多一个value，成功失败都不影响其它的接口
            const [mineResponse, pendingResponse, templateResponse] = await Promise.allSettled([
                request.get(`/workflows/requests/mine/${query}`),
                request.get(`/workflows/requests/pending/${query}`),
                request.get(`/workflows/templates/`),
            
            ]);

            if (mineResponse.status === "fulfilled") {
                setMine(mineResponse.value.data.data || []);
            } else {
                message.error("加载我的申请失败");
            }

            if (pendingResponse.status === "fulfilled") {
                setPending(pendingResponse.value.data.data || []);
            } else {
                message.error("加载待我审批失败");
            }

            if (templateResponse.status === "fulfilled") {
                setTemplates(templateResponse.value.data.results || []);
            } else {
                message.error("加载流程模板失败");
            }
        } catch (error) {
            // message.error("加载工作流数据失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openDetail = (record) => {
        setSelected(record);
        setDrawerOpen(true);
    };

    const refreshSelected = async (id) => {
        const response = await request.get(`/workflows/requests/${id}/`);
        setSelected(response.data);
        await fetchData();
    };

    const handleCreate = async () => {
        const values = await form.validateFields();

        try {
            await request.post("/workflows/requests/", {
                request_type: "payment",
                title: values.title,
                description: values.description || "",
                amount: values.amount,
                current_approver: values.current_approver,
                second_approver: values.second_approver,
                template: values.template,
            });

            message.success("创建成功");
            setCreateModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error("创建失败");
        }
    };

    const runWorkflowAction = async (record, action, successMessage) => {
        try {
            await request.post(`/workflows/requests/${record.id}/${action}/`, {
                comment: "",
            });
            message.success(successMessage);
            await refreshSelected(record.id);
        } catch (error) {
            message.error(successMessage + "失败");
        }
    };

    const createPayment = async (record) => {
        try {
            await request.post(`/workflows/requests/${record.id}/create-payment/`, {
                amount: record.amount,
                pay_method: "alipay",
            });
            message.success("支付订单创建成功");
            await refreshSelected(record.id);
        } catch (error) {
            message.error("支付订单创建失败");
        }
    };
    const markPaid = async (paymentOrder) => {
        try {
            await request.post(`/workflows/payments/${paymentOrder.id}/mark-paid/`, {
                comment: "用户标记已支付",
            });
            message.success("已标记为已支付");
            await refreshSelected(selected.id);
        } catch (error) {
            message.error("标记失败");
        }
    };

    const confirmPayment = async (paymentOrder) => {
        try {
            await request.post(`/workflows/payments/${paymentOrder.id}/confirm/`, {
                comment: "确认到账",
            });
            message.success("确认到账成功");
            await refreshSelected(selected.id);
        } catch (error) {
            message.error("确认到账失败");
        }
    };

    const columns = [
        {
            title: "标题",
            dataIndex: "title",
        },
        {
            title: "类型",
            dataIndex: "request_type",
            render: (value) => value === "payment" ? "付款申请" : value,
        },
        {
            title: "金额",
            dataIndex: "amount",
            render: (value) => value || "-",
        },
        {
            title: "状态",
            dataIndex: "status",
            render: getStatusTag,
        },
        {
            title: "当前节点",
            render: (_, record) => {
                const currentTask = (record.tasks || []).find((task) => task.status === "pending");

                if (!currentTask) {
                    return "-";
                }

                return (
                    <Space direction="vertical" size={0}>
                        <span>{currentTask.node_name}</span>
                        <span style={{ color: "#999", fontSize: 12 }}>
                            {currentTask.approver_username || "-"}
                        </span>
                    </Space>
                );
            },
        },
        {
            title: "申请人",
            dataIndex: "applicant_username",
        },
        {
            title: "审批人",
            dataIndex: "current_approver_username",
            render: (value) => value || "-",
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
        },
        {
            title: "模板",
            dataIndex: "template_name",
            render: (value) => value || "-",
        },
        {
            title: "操作",
            render: (_, record) => (
                <Button type="link" onClick={() => openDetail(record)}>
                    查看
                </Button>
            ),
        },
    ];

    const renderActions = (record) => {
        const paymentOrder = record.payment_order;

        return (
            <Space wrap>
                {record.status === "draft" && (
                    <Button onClick={() => runWorkflowAction(record, "submit", "提交成功")}>
                        提交审批
                    </Button>
                )}

                {record.status === "pending" && (
                    <>
                        <Button type="primary" onClick={() => runWorkflowAction(record, "approve", "审批通过")}>
                            通过
                        </Button>
                        <Button danger onClick={() => runWorkflowAction(record, "reject", "审批驳回")}>
                            驳回
                        </Button>
                    </>
                )}

                {["draft", "pending"].includes(record.status) && (
                    <Button onClick={() => runWorkflowAction(record, "cancel", "取消成功")}>
                        取消
                    </Button>
                )}

                {record.request_type === "payment" && !paymentOrder && (
                    <Button onClick={() => createPayment(record)}>
                        创建支付订单
                    </Button>
                )}

                {paymentOrder?.status === "pending" && (
                    <Button onClick={() => markPaid(paymentOrder)}>
                        标记已支付
                    </Button>
                )}

                {paymentOrder?.status === "user_paid" && (
                    <Button type="primary" onClick={() => confirmPayment(paymentOrder)}>
                        确认到账
                    </Button>
                )}
            </Space>
        );
    };
    const renderDetail = () => {
        if (!selected) return null;

        const paymentOrder = selected.payment_order;

        return (
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Card title="申请信息">
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="标题">{selected.title}</Descriptions.Item>
                        <Descriptions.Item label="说明">{selected.description || "-"}</Descriptions.Item>
                        <Descriptions.Item label="金额">{selected.amount || "-"}</Descriptions.Item>
                        <Descriptions.Item label="状态">{getStatusTag(selected.status)}</Descriptions.Item>
                        <Descriptions.Item label="申请人">{selected.applicant_username}</Descriptions.Item>
                        <Descriptions.Item label="审批人">{selected.current_approver_username || "-"}</Descriptions.Item>
                        <Descriptions.Item label="流程模板">
                            {selected.template_name || "-"}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card title="操作">
                    {renderActions(selected)}
                </Card>

                {paymentOrder && (
                    <Card title="支付订单">
                        <Descriptions bordered column={1}>
                            <Descriptions.Item label="订单号">{paymentOrder.order_no}</Descriptions.Item>
                            <Descriptions.Item label="金额">{paymentOrder.amount}</Descriptions.Item>
                            <Descriptions.Item label="支付方式">{paymentOrder.pay_method === "alipay" ? "支付宝" : "微信"}</Descriptions.Item>
                            <Descriptions.Item label="支付状态">{getPaymentStatusTag(paymentOrder.status)}</Descriptions.Item>
                            <Descriptions.Item label="支付时间">{paymentOrder.paid_at || "-"}</Descriptions.Item>
                            <Descriptions.Item label="确认时间">{paymentOrder.confirmed_at || "-"}</Descriptions.Item>
                            <Descriptions.Item label="流程模板">
                                {selected.template_name || "-"}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                )}
                <Card title="审批任务">
                    <Table
                        rowKey="id"
                        pagination={false}
                        dataSource={selected.tasks || []}
                        columns={[
                            {
                                title: "节点",
                                dataIndex: "node_name",
                            },
                            {
                                title: "顺序",
                                dataIndex: "node_order",
                            },
                            {
                                title: "审批人",
                                dataIndex: "approver_username",
                                render: (value) => value || "-",
                            },
                            {
                                title: "状态",
                                dataIndex: "status",
                                render: getTaskStatusTag,
                            },
                            {
                                title: "意见",
                                dataIndex: "comment",
                                render: (value) => value || "-",
                            },
                            {
                                title: "处理时间",
                                dataIndex: "handled_at",
                                render: (value) => value || "-",
                            },
                        ]}
                    />
                </Card>
                <Card title="操作日志">
                    <Table
                        rowKey="id"
                        pagination={false}
                        dataSource={selected.operation_logs || []}
                        columns={[
                            {
                                title: "动作",
                                dataIndex: "action",
                                render: (value) => ACTION_MAP[value] || value,
                            },
                            {
                                title: "操作人",
                                dataIndex: "operator_username",
                            },
                            {
                                title: "原状态",
                                dataIndex: "from_status",
                                render: (value) => value || "-",
                            },
                            {
                                title: "新状态",
                                dataIndex: "to_status",
                                render: (value) => value || "-",
                            },
                            {
                                title: "备注",
                                dataIndex: "comment",
                                render: (value) => value || "-",
                            },
                            {
                                title: "时间",
                                dataIndex: "created_at",
                            },
                        ]}
                    />
                </Card>
            </Space>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <h2>工作流审批</h2>
                </Col>
                <Col>
                    <Space>
                        <Button onClick={fetchData}>刷新</Button>
                        <Button type="primary" onClick={() => setCreateModalOpen(true)}>
                            新建付款申请
                        </Button>
                    </Space>
                </Col>
            </Row>
            <Card style={{ marginBottom: 16 }}>
    <Space wrap>
        <Select
            allowClear
            placeholder="状态"
            style={{ width: 160 }}
            value={filters.status || undefined}
            options={[
                { label: "草稿", value: "draft" },
                { label: "待审批", value: "pending" },
                { label: "已通过", value: "approved" },
                { label: "已驳回", value: "rejected" },
                { label: "已取消", value: "cancelled" },
            ]}
            onChange={(value) => setFilters((prev) => ({
                ...prev,
                status: value || "",
            }))}
        />

        <Select
            allowClear
            placeholder="申请类型"
            style={{ width: 160 }}
            value={filters.request_type || undefined}
            options={[
                { label: "付款申请", value: "payment" },
                { label: "通用申请", value: "general" },
                { label: "AI 人工审核", value: "ai_review" },
            ]}
            onChange={(value) => setFilters((prev) => ({
                ...prev,
                request_type: value || "",
            }))}
        />

        <Select
            allowClear
            placeholder="流程模板"
            style={{ width: 200 }}
            value={filters.template || undefined}
            options={templates.map((item) => ({
                label: item.name,
                value: String(item.id),
            }))}
            onChange={(value) => setFilters((prev) => ({
                ...prev,
                template: value || "",
            }))}
        />

        <Button type="primary" onClick={fetchData}>
            查询
        </Button>

        <Button
            onClick={() => {
                setFilters({
                    status: "",
                    request_type: "",
                    template: "",
                });
            }}
        >
            重置
        </Button>
    </Space>
</Card>
            <Tabs
                items={[
                    {
                        key: "mine",
                        label: "我的申请",
                        children: (
                            <Table
                                rowKey="id"
                                loading={loading}
                                columns={columns}
                                dataSource={mine}
                            />
                        ),
                    },
                    {
                        key: "pending",
                        label: "待我审批",
                        children: (
                            <Table
                                rowKey="id"
                                loading={loading}
                                columns={columns}
                                dataSource={pending}
                            />
                        ),
                    },
                ]}
            />

            <Drawer
                title="工作流详情"
                open={drawerOpen}
                width={720}
                onClose={() => setDrawerOpen(false)}
            >
                {renderDetail()}
            </Drawer>

            <Modal
                title="新建付款申请"
                open={createModalOpen}
                onOk={handleCreate}
                onCancel={() => setCreateModalOpen(false)}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="标题"
                        name="title"
                        rules={[{ required: true, message: "请输入标题" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item label="说明" name="description">
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <Form.Item
                        label="金额"
                        name="amount"
                        rules={[{ required: true, message: "请输入金额" }]}
                    >
                        <InputNumber min={0.01} precision={2} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        label="流程模板"
                        name="template"
                        rules={[{ required: true, message: "请选择流程模板" }]}
                    >
                        <Select
                            options={templates.map((item) => ({
                                label: item.name,
                                value: item.id,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        label="一级审批人 ID"
                        name="current_approver"
                        rules={[{ required: true, message: "请输入一级审批人 ID" }]}
                    >
                        <InputNumber min={1} precision={0} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        label="二级审批人 ID"
                        name="second_approver"
                    >
                        <InputNumber min={1} precision={0} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item label="支付方式">
                        <Select
                            disabled
                            value="alipay"
                            options={[
                                { label: "支付宝", value: "alipay" },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}