import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("LogList trace drawer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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
    });

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
    });

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
});