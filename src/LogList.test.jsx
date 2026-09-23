import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LogList from "./pages/LogList";
import request from "./utils/request";

vi.mock("@ant-design/icons", () => ({
    BookOutlined: () => null,
    ReloadOutlined: () => null,
    PlusOutlined: () => null,
    BarChartOutlined: () => null,
    ArrowLeftOutlined: () => null,
    CheckCircleOutlined: () => null,
    ClockCircleOutlined: () => null,
    RobotOutlined: () => null,
    FileTextOutlined: () => null,
}));

vi.mock("./utils/request", () => {
    const mockRequest = {
        get: vi.fn(),
        post: vi.fn(),
    };

    return {
        default: mockRequest,
        handleLogout: vi.fn(async () => {
            try {
                await mockRequest.post("/users/logout/");
            } catch (error) {
                // 后端登出失败时，前端仍然清理本地 token。
            } finally {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
            }
        }),
    };
});

vi.mock("antd", async () => {
    const antd = await vi.importActual("antd");
    return {
        ...antd,
        message: {
            error: vi.fn(),
            success: vi.fn(),
            warning: vi.fn(),
        },
    };
});

const statsResponse = {
    data: {
        data: {
            total: 1,
            today_total: 1,
            success_rate: "100%",
            avg_duration: 1.2,
            total_tokens: 30,
            today_tokens: 30,
            total_cost: 0.001,
            today_cost: 0.001,
            model_stats: [],
            daily_stats: [],
        },
    },
};

const observabilityResponse = {
    data: {
        data: {
            retry_count: 100,
            timeout_count: 200,
            recovered_count: 300,
            failed_step_count: 400,
        },
    },
};

const logListResponse = (traceId, prompt = "测试 trace") => ({
    data: {
        count: 1,
        results: [
            {
                id: 1,
                prompt,
                response: "AI 回答",
                model_name: "deepseek",
                success: true,
                duration: 1.2,
                total_tokens: 30,
                cost: 0.001,
                trace_id: traceId,
                call_time: "2026-09-23T10:00:00+08:00",
            },
        ],
    },
});

const traceResponse = (traceId, steps, summary = {}) => ({
    data: {
        data: {
            trace_id: traceId,
            logs: [
                {
                    id: 1,
                    model_name: "deepseek",
                    success: true,
                    duration: 1.2,
                    total_tokens: 30,
                    cost: 0.001,
                },
            ],
            steps: steps.map((step, index) => ({
                id: index + 1,
                success: true,
                duration: 0,
                detail: {},
                error_message: "",
                created_at: "2026-09-23T10:00:00+08:00",
                ...step,
            })),
            rag_steps: [],
            summary: {
                log_count: 1,
                step_count: steps.length,
                failed_step_count: 0,
                stream_step_count: 0,
                rag_step_count: 0,
                task_step_count: 0,
                total_duration: 1.2,
                ...summary,
            },
        },
    },
});

const mockLogListApis = ({ traceId, prompt = "测试 trace", steps = [] }) => {
    request.get.mockImplementation((url) => {
        if (url === "/logs/stats/") {
            return Promise.resolve(statsResponse);
        }

        if (url === "/logs/observability-summary/") {
            return Promise.resolve(observabilityResponse);
        }

        if (url === "/logs/") {
            return Promise.resolve(logListResponse(traceId, prompt));
        }

        if (url === `/logs/trace/${traceId}/`) {
            return Promise.resolve(traceResponse(traceId, steps));
        }

        return Promise.reject(new Error(`unexpected url: ${url}`));
    });
};

const originalGetComputedStyle = window.getComputedStyle;

afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
    localStorage.clear();
});

beforeEach(() => {
    vi.clearAllMocks();
    window.getComputedStyle = vi.fn((element) => originalGetComputedStyle(element));
});

describe("LogList trace drawer", () => {
    it("展示可观测性摘要", async () => {
        mockLogListApis({ traceId: "trace-observability", steps: [] });

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        expect(await screen.findByText("重试次数")).toBeInTheDocument();
        expect(screen.getByText("超时任务")).toBeInTheDocument();
        expect(screen.getByText("恢复查询")).toBeInTheDocument();
        expect(screen.getByText("失败步骤")).toBeInTheDocument();

        expect(screen.getByText("100")).toBeInTheDocument();
        expect(screen.getByText("200")).toBeInTheDocument();
        expect(screen.getByText("300")).toBeInTheDocument();
        expect(screen.getByText("400")).toBeInTheDocument();
    });

    it("trace 展示 notify_feishu 为飞书通知", async () => {
        const traceId = "trace-feishu-notify";
        mockLogListApis({
            traceId,
            prompt: "测试飞书通知 trace",
            steps: [
                { step: "task_start" },
                { step: "call_model_start" },
                {
                    step: "notify_feishu",
                    detail: { sent: true, response: { code: 0, msg: "success" } },
                },
                { step: "task_done", duration: 1.2 },
            ],
        });

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        expect(await screen.findByText("测试飞书通知 trace")).toBeInTheDocument();
        fireEvent.click(await screen.findByTestId(`trace-link-${traceId}`));

        expect(await screen.findByText("飞书通知")).toBeInTheDocument();
        expect(await screen.findByText("notify_feishu")).toBeInTheDocument();
    });

    it("退出登录时调用后端登出接口并清理 token", async () => {
        request.get.mockResolvedValue({ data: { count: 0, results: [] } });
        request.post.mockResolvedValue({ data: { code: 200, message: "退出登录成功", data: null } });

        localStorage.setItem("access_token", "test-access");
        localStorage.setItem("refresh_token", "test-refresh");

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        fireEvent.click(await screen.findByText("退出登录"));

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith("/users/logout/");
        });
        expect(localStorage.getItem("access_token")).toBeNull();
        expect(localStorage.getItem("refresh_token")).toBeNull();
    });

    it("后端登出失败时仍然清理本地 token", async () => {
        request.get.mockResolvedValue({ data: { count: 0, results: [] } });
        request.post.mockRejectedValue(new Error("logout failed"));

        localStorage.setItem("access_token", "test-access");
        localStorage.setItem("refresh_token", "test-refresh");

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        fireEvent.click(await screen.findByText("退出登录"));

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith("/users/logout/");
        });
        expect(localStorage.getItem("access_token")).toBeNull();
        expect(localStorage.getItem("refresh_token")).toBeNull();
    });

    it("trace 展示 agent 工具编排步骤", async () => {
        const traceId = "trace-agent-tools";
        mockLogListApis({
            traceId,
            prompt: "Agent 工具编排测试",
            steps: [
                { step: "agent_start", detail: { top_k: 3, search_type: "hybrid" } },
                { step: "agent_memory_tool", detail: { message_count: 0, returned_count: 0 } },
                { step: "agent_knowledge_tool", detail: { search_type: "hybrid", hit_count: 1 } },
                { step: "agent_workflow_tool", detail: { my_request_count: 1 } },
                { step: "agent_tools", detail: { tool_names: ["conversation_memory", "retrieve_knowledge", "workflow_summary"] } },
                { step: "agent_build_prompt", detail: { prompt_length: 500 } },
                { step: "agent_done", detail: { answer_length: 30 } },
            ],
        });

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        expect(await screen.findByText("Agent 工具编排测试")).toBeInTheDocument();
        fireEvent.click(await screen.findByTestId(`trace-link-${traceId}`));

        await waitFor(() => {
            expect(screen.getByText("agent_knowledge_tool")).toBeInTheDocument();
        });

        expect(screen.getByText("Agent开始")).toBeInTheDocument();
        expect(screen.getByText("会话记忆")).toBeInTheDocument();
        expect(screen.getByText("知识检索")).toBeInTheDocument();
        expect(screen.getByText("工作流查询")).toBeInTheDocument();
        expect(screen.getByText("工具汇总")).toBeInTheDocument();
        expect(screen.getByText("构建提示词")).toBeInTheDocument();
        expect(screen.getByText("Agent完成")).toBeInTheDocument();
    });

    it("根据 URL trace_id 自动打开 trace 抽屉", async () => {
        const traceId = "trace-agent-001";

        request.get.mockImplementation((url, config = {}) => {
            if (url === "/logs/stats/") {
                return Promise.resolve(statsResponse);
            }

            if (url === "/logs/observability-summary/") {
                return Promise.resolve(observabilityResponse);
            }

            if (url === "/logs/") {
                expect(config.params.trace_id).toBe(traceId);
                return Promise.resolve(logListResponse(traceId, "Agent 工具编排测试"));
            }

            if (url === `/logs/trace/${traceId}/`) {
                return Promise.resolve(traceResponse(traceId, [
                    { step: "agent_start", detail: { search_type: "hybrid" } },
                    { step: "agent_done", duration: 1.2, detail: { answer_length: 20 } },
                ]));
            }

            return Promise.reject(new Error(`unexpected url: ${url}`));
        });

        render(
            <MemoryRouter initialEntries={[`/logs?trace_id=${traceId}`]}>
                <Routes>
                    <Route path="/logs" element={<LogList />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText("Agent 工具编排测试")).toBeInTheDocument();
        expect(await screen.findByTestId(`trace-link-${traceId}`)).toBeInTheDocument();
        expect(await screen.findByText("Agent开始")).toBeInTheDocument();
        expect(await screen.findByText("Agent完成")).toBeInTheDocument();

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith(`/logs/trace/${traceId}/`);
        });
    });
});



