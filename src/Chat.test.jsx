import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Chat, { MAX_TASK_POLL_COUNT } from "./pages/Chat";
import request from "./utils/request";
import useChatStore from "./store/useChatStore";

// npm test -- Chat.test.jsx

vi.mock("./utils/request", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock("./utils/fetchWithAuth", () => ({
    fetchWithAuth: vi.fn(),
}));

vi.mock("./utils/trace", () => ({
    getLatestTraceId: vi.fn(() => "test-trace-id"),
}));

// Ant Design 图标在测试里没必要真的渲染，而且有时候会引起 ESM/CJS 报错。所以让它们都变成普通 <span />。
vi.mock("@ant-design/icons", () => ({
    ArrowLeftOutlined: () => <span />,
    SendOutlined: () => <span />,
    BarChartOutlined: () => <span />,
    DeepSeekFilled: () => <span />,
    SwapOutlined: () => <span />,
}));

useChatStore.setState({
    conversationId: "",
    model: "deepseek",
    streamStream: false,
});

describe("Chat轮询", () => {
    // 准备环境
    beforeEach(() => {
        // 清空上一个测试留下的mock调用记录
        vi.clearAllMocks();

        useChatStore.setState({
            conversationId: "",
            model: "deepseek",
            streamStream: false,
        });

        localStorage.setItem("access_token", "test-access-token");

        // 根据不同url返回不同的假数据
        request.get.mockImplementation((url) => {
            if (url === "/prompt-templates/") {
                return Promise.resolve({ data: { results: [] } });
            }

            if (url === "/logs/conversations") {
                return Promise.resolve({ data: { data: [] } });
            }

            // 模拟“任务一直处理中”。
            if (String(url).includes("/logs/task/")) {
                return Promise.resolve({
                    data: {
                        data: {
                            status: "processing",
                            result: null,
                            error: "",
                        },
                    },
                });
            }

            return Promise.resolve({ data: { data: [] } });
        });
    });

    // 每个测试结束后恢复环境。
    afterEach(() => {
        vi.clearAllTimers();
        // 恢复真实时间
        vi.useRealTimers();
        localStorage.clear();
    });

    it("满足最大值后停止轮询", async () => {
        // 模拟后端返回
        request.post.mockResolvedValue({
            data: {
                data: {
                    task_id: "test-task-id",
                    status: "processing",
                },
            },
        });

        render(
            <MemoryRouter>
                <Chat maxTaskPollCount={2} taskPollIntervalMs={10} />
            </MemoryRouter>
        );

        const textarea = screen.getByPlaceholderText(/请输入消息.../);
        const promptText = "测试非流式任务";
        fireEvent.change(textarea, {
            target: { value: promptText },
        });

        const sendButton = screen.getByRole("button", { name: /发送/ });
        fireEvent.click(sendButton);

        // 等前端发起非流式请求

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith(
                "/logs/call_company_ai4/",
                expect.objectContaining({
                    prompt: promptText,
                    request_id: expect.any(String), // 任意字符串
                })
            );
        });

        // 快进定时器，模拟61*2s = 122s
        await waitFor(() => {
            expect(screen.getByText(/任务处理时间较长/)).toBeInTheDocument();
        }, { timeout: 3000 });

        await waitFor(() => {
            expect(screen.getByText(/任务处理时间较长/)).toBeInTheDocument();
        });

        const taskCalls = request.get.mock.calls.filter(([url]) =>
            String(url).includes("/logs/task/test-task-id/")
        );

        expect(taskCalls.length).toBeLessThanOrEqual(2);
    }, 15000);

    it("成功后停止轮询", async () => {
        request.post.mockResolvedValue({
            data: {
                data: {
                    task_id: "success-task-id",
                    status: "processing",
                },
            },
        });

        request.get.mockImplementation((url) => {
            if (url === "/prompt-templates/") {
                return Promise.resolve({ data: { results: [] } });
            }

            if (url === "/logs/conversations") {
                return Promise.resolve({ data: { data: [] } });
            }

            if (String(url).includes("/logs/task/success-task-id/")) {
                return Promise.resolve({
                    data: {
                        data: {
                            status: "success",
                            result: {
                                response: "任务成功返回的回答",
                                conversation_id: "conversation-success-001",
                            },
                            error: "",
                        },
                    },
                });
            }

            return Promise.resolve({ data: { data: [] } });
        });

        render(
            <MemoryRouter>
                <Chat maxTaskPollCount={2} taskPollIntervalMs={10} />
            </MemoryRouter>
        );

        const textarea = screen.getByPlaceholderText(/请输入消息.../);
        fireEvent.change(textarea, {
            target: { value: "测试成功停止轮询" },
        });

        const sendButton = screen.getByRole("button", { name: /发送/ });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(request.post).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText("任务成功返回的回答")).toBeInTheDocument();
        }, { timeout: 3000 });


        const callsAfterSuccess = request.get.mock.calls.length;
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(request.get.mock.calls.length).toBe(callsAfterSuccess);
    }, 15000);

    it("失败后停止轮询并显示错误", async () => {
        request.post.mockResolvedValue({
            data: {
                data: {
                    task_id: "failed-task-id",
                    status: "processing",
                },
            },
        });

        request.get.mockImplementation((url) => {
            if (url === "/prompt-templates/") {
                return Promise.resolve({ data: { results: [] } });
            }

            if (url === "/logs/conversations") {
                return Promise.resolve({ data: { data: [] } });
            }

            if (String(url).includes("/logs/task/failed-task-id/")) {
                return Promise.resolve({
                    data: {
                        data: {
                            status: "failed",
                            result: null,
                            error: "AI调用失败",
                        },
                    },
                });
            }

            return Promise.resolve({ data: { data: [] } });
        });

        render(
            <MemoryRouter>
                <Chat maxTaskPollCount={2} taskPollIntervalMs={10} />
            </MemoryRouter>
        );

        const textarea = screen.getByPlaceholderText(/请输入消息/);
        fireEvent.change(textarea, {
            target: { value: "测试失败停止轮询" },
        });

        const sendButton = screen.getByRole("button", { name: /发送/ });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(request.post).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText(/请求失败: AI调用失败/)).toBeInTheDocument();
        }, { timeout: 3000 });

        const callsAfterFailed = request.get.mock.calls.length;

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(request.get.mock.calls.length).toBe(callsAfterFailed);
    }, 15000);

    it("未知状态后停止轮询并显示错误", async () => {
        request.post.mockResolvedValue({
            data: {
                data: {
                    task_id: "unknown-task-id",
                    status: "processing",
                },
            },
        });

        request.get.mockImplementation((url) => {
            if (url === "/prompt-templates/") {
                return Promise.resolve({ data: { results: [] } });
            }

            if (url === "/logs/conversations") {
                return Promise.resolve({ data: { data: [] } });
            }

            if (String(url).includes("/logs/task/unknown-task-id/")) {
                return Promise.resolve({
                    data: {
                        data: {
                            status: "unknown",
                            result: null,
                            error: "未知状态",
                        },
                    },
                });
            }

            return Promise.resolve({ data: { data: [] } });
        });

        render(
            <MemoryRouter>
                <Chat maxTaskPollCount={2} taskPollIntervalMs={10} />
            </MemoryRouter>
        );

        const textarea = screen.getByPlaceholderText(/请输入消息/);
        fireEvent.change(textarea, {
            target: { value: "测试未知状态停止轮询" },
        });

        const sendButton = screen.getByRole("button", { name: /发送/ });
        fireEvent.click(sendButton);

        await waitFor(() => {
            // request.post：有没有提交任务
            // request.get： 有没有继续轮询任务状态
            // 因为request是邓庄的axios而且现在还被mock了，request.post("/logs/call_company_ai4/", payload)
            expect(request.post).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText(/请求失败: 未知状态/)).toBeInTheDocument();
        }, { timeout: 3000 });

        // 未知状态后没有继续轮询  调用了多少次
        const callsAfterUnknown = request.get.mock.calls.length;
        // 真实等50ms 因为设置taskPollIntervalMs={10}，50ms内起码又可以多请求很多次
        // 因为要验证的失败后轮询有没有真的停止
        await new Promise((resolve) => setTimeout(resolve, 50));

        // 看数目有没有变化
        expect(request.get.mock.calls.length).toBe(callsAfterUnknown);
    }, 15000);

    it("任务查询返回404后停止轮询", async () => {
        request.post.mockResolvedValue({
            data: {
                data: {
                    task_id: "task-not-found",
                    status: "processing",
                },
            },
        });

        request.get.mockRejectedValue({
            response: {
                status: 404,
                data: {
                    message: "任务不存在或已过期",
                },
            },
        });

        render(
            <MemoryRouter>
                <Chat maxTaskPollCount={5} taskPollIntervalMs={10} />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByRole("textbox"), {
            target: { value: "测试任务404" },
        });

        fireEvent.click(screen.getByRole("button", { name: /发送/ }));
        await waitFor(() => {
            expect(request.post).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith(
                expect.stringContaining("/logs/task/task-not-found/")
            );
        });

        await waitFor(() => {
  expect(screen.getByText("任务不存在、已过期，或当前账号无权限查看")).toBeInTheDocument();
});

const taskCallsAfter404 = request.get.mock.calls.filter(([url]) =>
  String(url).includes("/logs/task/task-not-found/")
).length;

await new Promise((resolve) => setTimeout(resolve, 50));

const taskCallsLater = request.get.mock.calls.filter(([url]) =>
  String(url).includes("/logs/task/task-not-found/")
).length;

expect(taskCallsLater).toBe(taskCallsAfter404);
    });

})