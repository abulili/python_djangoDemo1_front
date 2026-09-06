import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LogList from "./pages/LogList";
import request from "./utils/request";
import { message } from "antd";

// npx vitest run src/LogList.test.jsx

vi.mock("./utils/request", () => ({
    default: {
        get: vi.fn(),
    }
}))

vi.mock("antd", async () => {
    const antd = await vi.importActual("antd");
    return {
        ...antd,
        message: {
            error: vi.fn(),
            success: vi.fn()
        }
    }
})

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

describe("LogList+Drawer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    })

    it("点击 trace_id 后展示 AI 请求步骤日志", async () => {
        const traceId = "trace-test-001";

        request.get.mockImplementation((url) => {
            if (url === "/logs/stats/") {
                return Promise.resolve({
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
                        }
                    }
                })
            }

            if (url === '/logs/') {
                return Promise.resolve({
                    data: {
                        count: 1,
                        results: [{
                            id: 1,
                            prompt: "你好",
                            response: "你好呀",
                            model_name: "deepseek",
                            duration: 1.2,
                            success: true,
                            trace_id: traceId,
                            call_time: "2026-09-06 12:00:00",
                        }]
                    }
                })
            }

            if (url === `/logs/trace/${traceId}/`) {
                return Promise.resolve({
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
                        },
                    },
                });
            }

            return Promise.reject(new Error(`unexpected url: ${url}`));
        })

        render(
            <MemoryRouter>
                <LogList />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith("/logs/", {
                params: {
                    page: 1
                }
            })
        })

        const traceText = await screen.findByText(traceId);
        await userEvent.click(traceText);
        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith(`/logs/trace/${traceId}/`);
        })

        expect(await screen.findByText("AI 请求步骤日志")).toBeInTheDocument();
        expect(screen.getByText("stream_start")).toBeInTheDocument();
        expect(screen.getByText("stream_done")).toBeInTheDocument();
        expect(screen.getByText("正常")).toBeInTheDocument();
    })


})