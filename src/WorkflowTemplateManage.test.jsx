import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import WorkflowTemplateManage from "./pages/WorkflowTemplateManage";
import request from "./utils/request";

vi.mock("./utils/request", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    },
}));

function mockTemplatePage({ isAdmin = false } = {}) {
    request.get.mockImplementation((url) => {
        if (url === "/users/me/") {
            return Promise.resolve({
                data: {
                    code: 200,
                    message: "ok",
                    data: {
                        id: isAdmin ? 1 : 2,
                        username: isAdmin ? "admin" : "normal",
                        is_staff: isAdmin,
                        is_superuser: isAdmin,
                    },
                },
            });
        }

        if (url === "/workflows/templates/") {
            return Promise.resolve({
                data: {
                    count: 1,
                    next: null,
                    previous: null,
                    results: [
                        {
                            id: 10,
                            name: "付款审批流程",
                            code: "payment_approval",
                            description: "付款审批",
                            is_active: true,
                            nodes: [
                                {
                                    id: 101,
                                    template: 10,
                                    node_name: "一级审批",
                                    node_order: 1,
                                    approver_field: "current_approver",
                                    min_amount: null,
                                    is_active: true,
                                },
                            ],
                        },
                    ],
                },
            });
        }

        if (url === "/workflows/template-nodes/?template=10") {
            return Promise.resolve({
                data: {
                    count: 1,
                    next: null,
                    previous: null,
                    results: [
                        {
                            id: 101,
                            template: 10,
                            node_name: "一级审批",
                            node_order: 1,
                            approver_field: "current_approver",
                            min_amount: null,
                            is_active: true,
                        },
                    ],
                },
            });
        }

        return Promise.reject(new Error(`unexpected url: ${url}`));
    });
}

describe("WorkflowTemplateManage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("普通用户只能查看模板和节点，不能看到管理按钮", async () => {
        mockTemplatePage({ isAdmin: false });

        render(
            <MemoryRouter>
                <WorkflowTemplateManage />
            </MemoryRouter>
        );

        expect(await screen.findByText("付款审批流程")).toBeInTheDocument();
        expect(await screen.findByText("一级审批")).toBeInTheDocument();

        expect(screen.queryByRole("button", { name: "新建模板" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "给当前模板新增节点" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "编辑" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "停用" })).not.toBeInTheDocument();
    });

    it("管理员可以看到模板和节点管理按钮", async () => {
        mockTemplatePage({ isAdmin: true });

        render(
            <MemoryRouter>
                <WorkflowTemplateManage />
            </MemoryRouter>
        );

        expect(await screen.findByText("付款审批流程")).toBeInTheDocument();

        expect(screen.getByRole("button", { name: "新建模板" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "给当前模板新增节点" })).toBeInTheDocument();

        expect(screen.getAllByRole("button", { name: "编辑" }).length).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: "停用" })).toBeInTheDocument();
    });

    it("选择模板时加载对应节点", async () => {
        mockTemplatePage({ isAdmin: true });

        render(
            <MemoryRouter>
                <WorkflowTemplateManage />
            </MemoryRouter>
        );

        expect(await screen.findByText("付款审批流程")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "选择" }));

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith("/workflows/template-nodes/?template=10");
        });
    });

    it("管理员可以创建模板", async () => {
        mockTemplatePage({ isAdmin: true });

        request.post.mockResolvedValue({
            data: {
                id: 20,
                name: "AI 审核流程",
                code: "ai_review",
                is_active: true,
            },
        });

        render(
            <MemoryRouter>
                <WorkflowTemplateManage />
            </MemoryRouter>
        );

        fireEvent.click(await screen.findByRole("button", { name: "新建模板" }));

        fireEvent.change(screen.getByLabelText("模板名称"), {
            target: { value: "AI 审核流程" },
        });

        fireEvent.change(screen.getByLabelText("模板编码"), {
            target: { value: "ai_review" },
        });

        const okButton = document.querySelector(".ant-modal-footer .ant-btn-primary");
        fireEvent.click(okButton);

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith(
                "/workflows/templates/",
                expect.objectContaining({
                    name: "AI 审核流程",
                    code: "ai_review",
                })
            );
        });
    });

    it("管理员可以给当前模板新增节点", async () => {
        mockTemplatePage({ isAdmin: true });

        request.post.mockResolvedValue({
            data: {
                id: 102,
                template: 10,
                node_name: "二级审批",
                node_order: 2,
                approver_field: "second_approver",
                min_amount: "1000.00",
                is_active: true,
            },
        });

        render(
            <MemoryRouter>
                <WorkflowTemplateManage />
            </MemoryRouter>
        );

        expect(await screen.findByText("付款审批流程")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "给当前模板新增节点" }));

        fireEvent.change(screen.getByLabelText("节点名称"), {
            target: { value: "二级审批" },
        });

        fireEvent.change(screen.getByLabelText("节点顺序"), {
            target: { value: 2 },
        });

        fireEvent.mouseDown(screen.getByLabelText("审批人字段"));
        fireEvent.click(await screen.findByText("二级审批人"));

        fireEvent.change(screen.getByLabelText("最低适用金额"), {
            target: { value: 1000 },
        });

        const okButton = document.querySelector(".ant-modal-footer .ant-btn-primary");
        fireEvent.click(okButton);

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith(
                "/workflows/template-nodes/",
                expect.objectContaining({
                    template: 10,
                    node_name: "二级审批",
                    node_order: 2,
                    approver_field: "second_approver",
                    min_amount: 1000,
                })
            );
        });
    });

    it("管理员可以停用节点", async () => {
        mockTemplatePage({ isAdmin: true });

        request.patch.mockResolvedValue({
            data: {
                id: 101,
                is_active: false,
            },
        });

        render(
            <MemoryRouter>
                <WorkflowTemplateManage />
            </MemoryRouter>
        );

        expect(await screen.findByText("一级审批")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "停用" }));

        await waitFor(() => {
            expect(request.patch).toHaveBeenCalledWith(
                "/workflows/template-nodes/101/",
                {
                    is_active: false,
                }
            );
        });
    });

    it("普通用户不能看到新增节点按钮", async () => {
        mockTemplatePage({ isAdmin: false });

        render(
            <MemoryRouter>
                <WorkflowTemplateManage />
            </MemoryRouter>
        );

        expect(await screen.findByText("付款审批流程")).toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: "给当前模板新增节点" })
        ).not.toBeInTheDocument();
    });
});