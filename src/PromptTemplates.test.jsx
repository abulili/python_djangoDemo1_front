import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import PromptTemplates from "./pages/PromptTemplates";
import request from "./utils/request";

vi.mock("./utils/request", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("@ant-design/icons", () => ({
    ArrowLeftOutlined: () => <span />,
    DeleteOutlined: () => <span />,
    EditOutlined: () => <span />,
    PlusOutlined: () => <span />,
    ReloadOutlined: () => <span />,
}));

const templates = [
    {
        id: 1,
        name: "resume_polish",
        description: "简历润色",
        content: "请帮我润色：{user_input}",
        variables: ["user_input"],
        is_active: true,
        updated_at: "2026-01-01T00:00:00Z",
    },
];

describe("PromptTemplates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        request.get.mockResolvedValue({
            data: {
                results: templates,
            },
        });
    });

    it("编辑后再创建模板会清空旧表单数据", async () => {
        render(
            <MemoryRouter>
                <PromptTemplates />
            </MemoryRouter>
        );

        expect(await screen.findByText("resume_polish")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /编辑/ }));
        expect(await screen.findByDisplayValue("resume_polish")).toBeInTheDocument();
        expect(screen.getByDisplayValue("简历润色")).toBeInTheDocument();
        expect(screen.getByDisplayValue("请帮我润色：{user_input}")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /取\s*消/ }));
        fireEvent.click(screen.getByRole("button", { name: /创建模板/ }));

        await waitFor(() => {
            expect(screen.getByLabelText("名称")).toHaveValue("");
        });
        expect(screen.getByLabelText("模板描述")).toHaveValue("");
        expect(screen.getByLabelText("模板内容")).toHaveValue("");
        expect(screen.getByLabelText("变量列表")).toHaveValue("");
    });
});
