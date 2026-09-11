import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LogList from "./pages/LogList";
import request from "./utils/request";
import { message } from "antd";

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

vi.mock("./utils/request", () => ({
    default: {
        get: vi.fn(),
    },
}));

vi.mock("antd", async () => {
    const antd = await vi.importActual("antd");
    return {
        ...antd,
        message: {
            error: vi.fn(),
            success: vi.fn(),
        },
    };
});

const mockStatsResponse = {
    data: {
        data: {
            total: 1,
            today_total: 1,
            success_rate: "100%",
            avg_duration: 1.2,
            total_tokens: 15,
            today_tokens: 15,
            total_cost: 0.01,
            today_cost: 0.01,
            model_stats: [],
            daily_stats: [],
        },
    },
};

const createLogListResponse = (traceId, overrides = {}) => ({
    data: {
        count: 1,
        results: [
            {
                id: 1,
                prompt: "你好",
                response: "你好呀",
                model_name: "deepseek",
                duration: 1.2,
                success: true,
                trace_id: traceId,
                call_time: "2026-09-06 12:00:00",
                ...overrides,
            },
        ],
    },
});

const createTraceDetailResponse = (traceId, overrides = {}) => ({
    data: {
        data: {
            trace_id: traceId,
            logs: [
                {
                    id: 1,
                    model_name: "deepseek",
                    success: true,
                    duration: 1.2,
                    total_tokens: 15,
                    cost: 0.01,
                },
            ],
            steps: [
                {
                    id: 1,
                    step: "stream_start",
                    success: true,
                    duration: 0,
                    detail: { model: "deepseek" },
                    error_message: "",
                },
                {
                    id: 2,
                    step: "stream_done",
                    success: true,
                    duration: 0,
                    detail: { total_tokens: 15 },
                    error_message: "",
                },
            ],
            rag_steps: [],
            summary: {
                log_count: 1,
                step_count: 2,
                failed_step_count: 0,
                has_failed_step: false,
                total_duration: 1.2,
                stream_step_count: 2,
                rag_step_count: 0,
                task_step_count: 0,
            },
            ...overrides,
        },
    },
});

const mockRequestGet = ({ traceId, logOverrides = {}, traceOverrides = {} }) => {
    request.get.mockImplementation((url) => {
        if (url === "/logs/stats/") {
            return Promise.resolve(mockStatsResponse);
        }

        if (url === "/logs/") {
            return Promise.resolve(createLogListResponse(traceId, logOverrides));
        }

        if (url === `/logs/trace/${traceId}/`) {
            return Promise.resolve(createTraceDetailResponse(traceId, traceOverrides));
        }

        return Promise.reject(new Error(`unexpected url: ${url}`));
    });
};
const originalGetComputedStyle = window.getComputedStyle;

afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
});

beforeEach(() => {
    vi.clearAllMocks();

    window.getComputedStyle = vi.fn((element) => {
        return originalGetComputedStyle(element);
    });
});
describe("LogList trace drawer", () => {

    it("加载日志列表并展示 trace_id", async () => {
        const traceId = "trace-list-001";

        mockRequestGet({ traceId });

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        expect(await screen.findByText(traceId)).toBeInTheDocument();

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith("/logs/", {
                params: {
                    page: 1,
                },
            });
        });
    });

    it("点击 trace_id 后展示 AI 请求步骤日志", async () => {
        const traceId = "trace-test-001";

        mockRequestGet({ traceId });

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        const traceText = await screen.findByText(traceId);
        await userEvent.click(traceText);

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith(`/logs/trace/${traceId}/`);
        });

        expect(await screen.findByText("stream_start")).toBeInTheDocument();
        expect(screen.getByText("stream_done")).toBeInTheDocument();
        expect(screen.getByText("正常")).toBeInTheDocument();

        expect(screen.getByText(/流式\s*2/)).toBeInTheDocument();
        expect(screen.getByText(/RAG\s*0/)).toBeInTheDocument();
        expect(screen.getByText(/异步任务\s*0/)).toBeInTheDocument();
    }, 10000);

    it("trace 详情存在失败步骤时显示异常状态", async () => {
        const traceId = "trace-failed-001";

        mockRequestGet({
            traceId,
            logOverrides: {
                prompt: "测试失败",
                response: "模型调用失败",
                success: false,
            },
            traceOverrides: {
                logs: [
                    {
                        id: 1,
                        model_name: "deepseek",
                        success: false,
                        duration: 1.2,
                        total_tokens: 0,
                        cost: 0,
                    },
                ],
                steps: [
                    {
                        id: 1,
                        step: "stream_start",
                        success: true,
                        duration: 0,
                        detail: { model: "deepseek" },
                        error_message: "",
                    },
                    {
                        id: 2,
                        step: "stream_failed",
                        success: false,
                        duration: 0,
                        detail: { model: "deepseek" },
                        error_message: "模型调用失败",
                    },
                ],
                summary: {
                    log_count: 1,
                    step_count: 2,
                    failed_step_count: 1,
                    has_failed_step: true,
                    total_duration: 1.2,
                    stream_step_count: 2,
                    rag_step_count: 0,
                    task_step_count: 0,
                },
            },
        });

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        const traceText = await screen.findByText(traceId);
        await userEvent.click(traceText);

        expect(await screen.findByText("stream_failed")).toBeInTheDocument();
        expect(screen.getByText("异常")).toBeInTheDocument();
        expect(screen.getAllByText("模型调用失败").length).toBeGreaterThan(0);

        expect(screen.getByText(/流式\s*2/)).toBeInTheDocument();
        expect(screen.getByText(/RAG\s*0/)).toBeInTheDocument();
        expect(screen.getByText(/异步任务\s*0/)).toBeInTheDocument();
    }, 10000);

    it("加载 trace 详情失败时提示错误", async () => {
        const traceId = "trace-error-001";

        request.get.mockImplementation((url) => {
            if (url === "/logs/stats/") {
                return Promise.resolve(mockStatsResponse);
            }

            if (url === "/logs/") {
                return Promise.resolve(createLogListResponse(traceId));
            }

            if (url === `/logs/trace/${traceId}/`) {
                return Promise.reject(new Error("trace detail failed"));
            }

            return Promise.reject(new Error(`unexpected url: ${url}`));
        });

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        );

        const traceText = await screen.findByText(traceId);
        await userEvent.click(traceText);

        await waitFor(() => {
            expect(message.error).toHaveBeenCalledWith("加载 trace 详情失败");
        });
    });

    it("打开已完成trace时不会自动刷新", async () => {
        request.get.mockImplementation((url) => {
            if (String(url).includes("/logs/trace/trace-done-001/")) {
                return Promise.resolve({
                    data: {
                        data: {
                            trace_id: "trace-done-001",
                            logs: [],
                            steps: [
                                {
                                    id: 1,
                                    step: "task_done",
                                    success: true,
                                    duration: 1.2,
                                    detail: {},
                                    error_message: "",
                                },
                            ],
                            summary: {
                                log_count: 0,
                                step_count: 1,
                                failed_step_count: 0,
                                stream_step_count: 0,
                                rag_step_count: 0,
                                task_step_count: 1,
                                total_duration: 1.2,
                            },
                        },
                    },
                });
            }

            return Promise.resolve({
                data: {
                    results: [
                        {
                            id: 1,
                            prompt: "测试问题",
                            response: "测试回答",
                            model_name: "deepseek",
                            success: true,
                            trace_id: "trace-done-001",
                            call_time: "2026-09-10 10:00:00",
                        },
                    ],
                    count: 1,
                },
            });
        });

        render(
            <MemoryRouter>
                <LogList traceRefreshIntervalMs={20} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("trace-done-001")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("trace-done-001"));

        await waitFor(() => {
            expect(screen.getByText("任务完成")).toBeInTheDocument();
        });

        const traceCallsAfterOpen = request.get.mock.calls.filter(([url]) =>
            String(url).includes("/logs/trace/trace-done-001/")
        ).length;

        await new Promise((resolve) => setTimeout(resolve, 80));

        const traceCallsLater = request.get.mock.calls.filter(([url]) =>
            String(url).includes("/logs/trace/trace-done-001/")
        ).length;

        expect(traceCallsLater).toBe(traceCallsAfterOpen);
    }, 8000);

    it("打开未完成trace时会自动刷新", async () => {
        const traceId = "trace-running-001";

        request.get.mockImplementation((url) => {
            if (url === "/logs/stats/") {
                return Promise.resolve(mockStatsResponse);
            }

            if (url === "/logs/") {
                return Promise.resolve(createLogListResponse(traceId));
            }

            if (url === `/logs/trace/${traceId}/`) {
                return Promise.resolve({
                    data: {
                        data: {
                            trace_id: traceId,
                            logs: [],
                            steps: [
                                {
                                    id: 1,
                                    step: "task_start",
                                    success: true,
                                    duration: 0,
                                    detail: {},
                                    error_message: "",
                                },
                                {
                                    id: 2,
                                    step: "call_model_start",
                                    success: true,
                                    duration: 0,
                                    detail: {},
                                    error_message: "",
                                },
                            ],
                            summary: {
                                log_count: 0,
                                step_count: 2,
                                failed_step_count: 0,
                                stream_step_count: 0,
                                rag_step_count: 0,
                                task_step_count: 2,
                                total_duration: 0,
                            },
                        },
                    },
                });
            }

            return Promise.reject(new Error(`unexpected url: ${url}`));
        });

        render(
            <MemoryRouter>
                <LogList traceRefreshIntervalMs={20} />
            </MemoryRouter>
        );

        const traceText = await screen.findByText(traceId);
        fireEvent.click(traceText);

        await waitFor(() => {
            expect(screen.getByText("任务开始")).toBeInTheDocument();
        });

        const traceCallsAfterOpen = request.get.mock.calls.filter(([url]) =>
            String(url).includes(`/logs/trace/${traceId}/`)
        ).length;

        await new Promise((resolve) => setTimeout(resolve, 80));

        const traceCallsLater = request.get.mock.calls.filter(([url]) =>
            String(url).includes(`/logs/trace/${traceId}/`)
        ).length;

        expect(traceCallsLater).toBeGreaterThan(traceCallsAfterOpen);
    }, 8000);

    it("关闭 trace 抽屉后停止自动刷新", async () => {
        const traceId = "trace-close-001";

        request.get.mockImplementation((url) => {
            if (url === "/logs/stats/") {
                return Promise.resolve(mockStatsResponse);
            }

            if (url === "/logs/") {
                return Promise.resolve(createLogListResponse(traceId));
            }

            if (url === `/logs/trace/${traceId}/`) {
                return Promise.resolve({
                    data: {
                        data: {
                            trace_id: traceId,
                            logs: [],
                            steps: [
                                {
                                    id: 1,
                                    step: "task_start",
                                    success: true,
                                    duration: 0,
                                    detail: {},
                                    error_message: "",
                                },
                            ],
                            summary: {
                                log_count: 0,
                                step_count: 1,
                                failed_step_count: 0,
                                stream_step_count: 0,
                                rag_step_count: 0,
                                task_step_count: 1,
                                total_duration: 0,
                            },
                        },
                    },
                });
            }

            return Promise.reject(new Error(`unexpected url: ${url}`));
        });

        render(
            <MemoryRouter>
                <LogList traceRefreshIntervalMs={20} />
            </MemoryRouter>
        );

        fireEvent.click(await screen.findByText(traceId));

        await waitFor(() => {
            expect(screen.getByText("任务开始")).toBeInTheDocument();
        });

        await waitFor(() => {
            const traceCalls = request.get.mock.calls.filter(([url]) =>
                String(url).includes(`/logs/trace/${traceId}/`)
            ).length;

            expect(traceCalls).toBeGreaterThan(1);
        });

        const closeButton = document.querySelector(".ant-drawer-close");
        fireEvent.click(closeButton);

        const traceCallsAfterClose = request.get.mock.calls.filter(([url]) =>
            String(url).includes(`/logs/trace/${traceId}/`)
        ).length;

        await new Promise((resolve) => setTimeout(resolve, 80));

        const traceCallsLater = request.get.mock.calls.filter(([url]) =>
            String(url).includes(`/logs/trace/${traceId}/`)
        ).length;

        expect(traceCallsLater).toBe(traceCallsAfterClose);
    }, 8000);

    it("trace 出现 task_timeout 后停止自动刷新", async () => {
        const traceId = "trace-task-timeout-001";

        mockRequestGet({
            traceId,
            traceOverrides: {
                steps: [
                    {
                        id: 1,
                        trace_id: traceId,
                        step: "task_start",
                        success: true,
                        duration: 0,
                        detail: {},
                        error_message: "",
                    },
                    {
                        id: 2,
                        trace_id: traceId,
                        step: "task_timeout",
                        success: false,
                        duration: 0,
                        detail: {
                            task_id: "timeout-task-id",
                            celery_status: "PENDING",
                            timeout_minutes: 5,
                        },
                        error_message: "任务超过 5 分钟仍未完成",
                    },
                ],
                summary: {
                    log_count: 0,
                    step_count: 2,
                    failed_step_count: 1,
                    stream_step_count: 0,
                    rag_step_count: 0,
                    task_step_count: 2,
                    has_failed_step: true,
                },
            },
        });

        render(
            <MemoryRouter>
                <LogList traceRefreshIntervalMs={20} />
            </MemoryRouter>
        );

        await screen.findByText(traceId);

        const traceLinks = await screen.findAllByText(traceId);
        fireEvent.click(traceLinks[0]);

        expect(await screen.findByText("任务超时")).toBeInTheDocument();
        expect(screen.getByText("异常")).toBeInTheDocument();

        const traceCallsAfterTimeout = request.get.mock.calls.filter(([url]) =>
            String(url).includes(`/logs/trace/${traceId}/`)
        ).length;

        await new Promise((resolve) => setTimeout(resolve, 80));

        const traceCallsLater = request.get.mock.calls.filter(([url]) =>
            String(url).includes(`/logs/trace/${traceId}/`)
        ).length;

        expect(traceCallsLater).toBe(traceCallsAfterTimeout);
    });

    it("trace 展示 task_recovered 为任务恢复", async () => {
        const traceId = "trace-task-recovered-001";

        mockRequestGet({
            traceId,
            traceOverrides: {
                steps: [
                    {
                        id: 1,
                        trace_id: traceId,
                        step: "task_done",
                        success: true,
                        duration: 1.2,
                        detail: {},
                        error_message: "",
                    },
                    {
                        id: 2,
                        trace_id: traceId,
                        step: "task_recovered",
                        success: true,
                        duration: 0,
                        detail: {
                            task_id: "recovered-task-id",
                            source: "AICallLog",
                            restored_owner_cache: true,
                        },
                        error_message: "",
                    },
                ],
                summary: {
                    log_count: 1,
                    step_count: 2,
                    failed_step_count: 0,
                    stream_step_count: 0,
                    rag_step_count: 0,
                    task_step_count: 2,
                    has_failed_step: false,
                },
            },
        });

        render(
            <MemoryRouter>
                <LogList traceRefreshIntervalMs={20} />
            </MemoryRouter>
        );

        const traceLinks = await screen.findAllByText(traceId);
        fireEvent.click(traceLinks[0]);

        expect(await screen.findByText("正常")).toBeInTheDocument();
        expect(await screen.findByText("任务恢复")).toBeInTheDocument();
        expect(await screen.findByText("task_recovered")).toBeInTheDocument();
    });
});