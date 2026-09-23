import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import userEvent from "@testing-library/user-event";



// npm test -- --run

vi.mock("antd", async () => {
    const actual = await vi.importActual("antd");

    return {
        ...actual,
        Popconfirm: ({ children, onConfirm }) => (
            <span onClick={onConfirm}>{children}</span>
        ),
        message: {
            success: vi.fn(),
            error: vi.fn(),
        },
    };
});

import { message } from "antd";
import KnowledgeDocuments from "./pages/KnowledgeDocuments";
import request from "./utils/request";

// 不是真的请求后端，只是mock
// Vitest 提供的测试工具对象 也是替换模块成假的
vi.mock("./utils/request", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

// 暂时不验证icons
vi.mock("@ant-design/icons", () => ({
    ArrowLeftOutlined: () => null,
    DeleteOutlined: () => null,
    EyeOutlined: () => null,
    PlusOutlined: () => null,
    ReloadOutlined: () => null,
    RobotOutlined: () => null,
    SearchOutlined: () => null,
}));

const renderPage = () => render(
    // 因为用了useNavigate，useNavigate必须在Router环境才能使用费
    // 测试里不用真实浏览器地址栏，内存里模拟的路由环境
    // 测组件本身：MemoryRouter
    // 测路由跳转：MemoryRouter + Routes + Route
    /***
         如果要访问 /knowledge-documents 时渲染这个页面 + 点击返回后跳到 /logs
         <MemoryRouter initialEntries={['/knowledge-documents']}>
              <Routes>
                  <Route path="/knowledge-documents" element={<KnowledgeDocuments />} />
                  <Route path="/logs" element={<div>日志页面</div>} />
              </Routes>
          </MemoryRouter>
         */
    <MemoryRouter>
        <KnowledgeDocuments />
    </MemoryRouter>
);
const renderPageWithRoutes = () => render(
    <MemoryRouter initialEntries={["/knowledge-documents"]}>
        <Routes>
            <Route path="/knowledge-documents" element={<KnowledgeDocuments />} />
            <Route path="/logs" element={<div>日志页面</div>} />
        </Routes>
    </MemoryRouter>
);
const newDocumentButtonName = /新增文档|新增文件|鏂板鏂囨。/;
const saveButtonName = /保存|淇濆瓨/;
const deleteButtonName = /删除|鍒犻櫎|鍒.*闄/;
const questionLabel = /问题|闂/;
const startAskButtonName = /开始问答|寮€濮嬮棶绛/;

describe("knowledgeDocuments", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // 定义一个测试用例
    it("加载并展示知识库文档", async () => {
        request.get.mockResolvedValue({
            data: {
                results: [
                    {
                        id: 1,
                        title: "AI Log Project",
                        content: "stream3 uses conversation_id for context",
                        chunk_count: 2,
                        updated_at: "2026-08-31T12:00:00Z",
                        chunks: [],
                    },
                ],
            },
        });

        renderPage();

        await waitFor(() => {
            // 直到 request.get 被调用，并且调用参数是 /knowledge-documents/
            // 在测：KnowledgeDocuments 页面加载时，确实请求了知识库列表接口
            //toHaveBeenCalledWith 的意思是：断言某个 mock 函数曾经用指定参数调用过。
            expect(request.get).toHaveBeenCalledWith("/knowledge-documents/");
        });

        // toBeInTheDocument：某个元素确实出现在页面里
        expect(screen.getByText("AI Log Project")).toBeInTheDocument();
        expect(screen.getByText("stream3 uses conversation_id for context")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("新增知识库文档", async () => {
        // const user = userEvent.setup();

        // 假装列表一开始是空的
        request.get.mockResolvedValue({
            data: {
                results: [],
            },
        });

        request.post.mockResolvedValue({
            data: {
                code: 200,
                message: "success",
            },
        });

        renderPage();

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith("/knowledge-documents/");
        });

        fireEvent.click(screen.getByRole("button", { name: newDocumentButtonName }));

        const titleInput = await screen.findByLabelText(/文档标题/);
        const contentInput = await screen.findByLabelText(/文档内容/);

        fireEvent.change(titleInput, { target: { value: "AI Log Project" } });
        fireEvent.change(contentInput, {
            target: { value: "stream3 uses conversation_id for context" },
        });

        const saveButton = document.querySelector(".ant-modal-footer .ant-btn-primary");
        expect(saveButton).toBeTruthy();
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith("/knowledge-documents/", {
                title: "AI Log Project",
                content: "stream3 uses conversation_id for context",
            });
        });

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledTimes(2);
        });
    });

    it("删除知识库文档", async () => {
        request.get.mockResolvedValue({
            data: {
                results: [
                    {
                        id: 1,
                        title: "AI Log Project",
                        content: "stream3 uses conversation_id for context",
                        chunk_count: 2,
                        updated_at: "2026-08-31T12:00:00Z",
                        chunks: [],
                    },
                ],
            },
        });

        request.delete.mockResolvedValue({
            data: {
                code: 200,
                message: "success",
            },
        });

        renderPage();

        expect(await screen.findByText("AI Log Project")).toBeInTheDocument();

        const deleteButton = await screen.findByRole("button", { name: deleteButtonName });
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(request.delete).toHaveBeenCalledWith("/knowledge-documents/1/");
        });

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledTimes(2);
        });
    });

    it("知识库文档加载失败时提示错误", async () => {
        request.get.mockRejectedValue(new Error("network error"));

        renderPage();

        await waitFor(() => {
            expect(message.error).toHaveBeenCalled();
        });
    });

    it("Agent 问答支持混合检索并展示工具和引用", async () => {
        request.get.mockResolvedValue({
            data: {
                results: [],
            },
        });

        request.post.mockResolvedValue({
            headers: {
                "x-trace-id": "trace-agent-001",
            },
            data: {
                data: {
                    query: "payment approval needed?",
                    answer: "Payment request requires approval workflow.",
                    conversation_id: "agent-conversation-001",
                    search_type: "hybrid",
                    idempotent: false,
                    tools: [
                        {
                            tool: "conversation_memory",
                            description: "conversation memory tool",
                            message_count: 0,
                            messages: [],
                        },
                        {
                            tool: "retrieve_knowledge",
                            description: "knowledge retrieval tool",
                            results: [],
                        },
                        {
                            tool: "workflow_summary",
                            description: "workflow summary tool",
                            my_request_count: 1,
                            pending_approval_count: 1,
                        },
                    ],
                    references: [
                        {
                            id: 1,
                            document_id: 1,
                            document_title: "Payment Approval Rule",
                            chunk_index: 0,
                            content: "Payment requests over 5000 require approval workflow.",
                            score: 3.8,
                            keyword_score: 1,
                            vector_score: 0.93,
                            has_embedding: true,
                        },
                    ],
                },
            },
        });

        renderPageWithRoutes();

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith("/knowledge-documents/");
        });

        fireEvent.change(screen.getByLabelText(questionLabel), {
            target: { value: "payment approval needed?" },
        });

        fireEvent.click(screen.getByRole("button", { name: startAskButtonName }));

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith(
                "/knowledge-documents/agent-ask/",
                expect.objectContaining({
                    query: "payment approval needed?",
                    top_k: 3,
                    search_type: "hybrid",
                })
            );
        });

        expect(await screen.findByText("Payment request requires approval workflow.")).toBeInTheDocument();
        expect(screen.getByText(/会话记忆/)).toBeInTheDocument();
        expect(screen.getByText(/知识检索/)).toBeInTheDocument();
        expect(screen.getByText(/工作流摘要/)).toBeInTheDocument();
        expect(screen.getByText("Payment Approval Rule")).toBeInTheDocument();
        expect(screen.getByText("Payment requests over 5000 require approval workflow.")).toBeInTheDocument();
        expect(screen.getByText(/已向量化/)).toBeInTheDocument();
        expect(await screen.findByText("trace-agent-001")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /查看链路|鏌ョ湅閾捐矾/ })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /查看链路|鏌ョ湅閾捐矾/ }));

        expect(await screen.findByText("日志页面")).toBeInTheDocument();
    }, 15000);
    it("Agent 问答完成后可以点击 trace_id 跳转日志页", async () => {
        request.get.mockResolvedValue({
            data: {
                results: [],
            },
        });

        request.post.mockResolvedValue({
            headers: {
                "x-trace-id": "trace-agent-jump-001",
            },
            data: {
                data: {
                    query: "这笔付款申请要不要审批？",
                    answer: "这笔付款申请需要审批。",
                    conversation_id: "agent-jump-conversation",
                    search_type: "hybrid",
                    idempotent: false,
                    tools: [
                        {
                            tool: "conversation_memory",
                            description: "conversation memory tool",
                            message_count: 0,
                            messages: [],
                        },
                        {
                            tool: "retrieve_knowledge",
                            description: "knowledge retrieval tool",
                            results: [],
                        },
                    ],
                    references: [
                        {
                            id: 1,
                            document_id: 1,
                            document_title: "付款审批规则",
                            chunk_index: 0,
                            content: "付款申请超过 5000 元需要走审批流程。",
                            score: 1,
                            keyword_score: 1,
                            vector_score: 0,
                            has_embedding: true,
                        },
                    ],
                },
            },
        });

        render(
            <MemoryRouter initialEntries={["/knowledge-documents"]}>
                <Routes>
                    <Route path="/knowledge-documents" element={<KnowledgeDocuments />} />
                    <Route path="/logs" element={<div>日志页面</div>} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith("/knowledge-documents/");
        });

        const questionInput = await screen.findByLabelText(questionLabel);
        fireEvent.change(questionInput, {
            target: {
                value: "这笔付款申请要不要审批？",
            },
        });

        fireEvent.click(screen.getByRole("button", { name: startAskButtonName }));

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith("/knowledge-documents/agent-ask/", {
                query: "这笔付款申请要不要审批？",
                top_k: 3,
                search_type: "hybrid",
                conversation_id: undefined,
                request_id: expect.any(String),
            });
        });

        expect(await screen.findByText("这笔付款申请需要审批。")).toBeInTheDocument();
        expect(await screen.findByText("trace-agent-jump-001")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /查看链路|鏌ョ湅閾捐矾/ }));

        expect(await screen.findByText("日志页面")).toBeInTheDocument();
    }, 15000);
    it("选择 LangChain Agent 后调用 langchain-agent-ask 并展示编排框架", async () => {
        request.get.mockResolvedValue({
            data: {
                results: [],
            },
        });

        request.post.mockResolvedValue({
            headers: {
                "x-trace-id": "trace-langchain-agent-001",
            },
            data: {
                data: {
                    query: "payment approval needed?",
                    answer: "LangChain-style Agent says approval is required.",
                    conversation_id: "langchain-agent-conversation-001",
                    search_type: "hybrid",
                    framework: "langchain-style",
                    idempotent: false,
                    tools: [
                        {
                            tool: "conversation_memory",
                            description: "读取当前 conversation_id 下的最近会话记忆",
                            output: {
                                message_count: 0,
                                messages: [],
                            },
                        },
                        {
                            tool: "knowledge_retriever",
                            description: "从知识库中按 keyword/vector/hybrid 检索相关片段",
                            output: {
                                results: [],
                            },
                        },
                        {
                            tool: "workflow_summary",
                            description: "读取当前用户的工作流申请、待审批和最近申请摘要",
                            output: {
                                my_request_count: 1,
                                pending_approval_count: 1,
                            },
                        },
                    ],
                    references: [
                        {
                            id: 1,
                            document_id: 1,
                            document_title: "Payment Approval Rule",
                            chunk_index: 0,
                            content: "Payment requests over 5000 require approval workflow.",
                            score: 3.8,
                            keyword_score: 1,
                            vector_score: 0.93,
                            has_embedding: true,
                        },
                    ],
                },
            },
        });

        renderPageWithRoutes();

        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith("/knowledge-documents/");
        });

        fireEvent.mouseDown(screen.getByLabelText("Agent 模式"));
        fireEvent.click(await screen.findByText("LangChain Agent"));

        fireEvent.change(screen.getByLabelText(questionLabel), {
            target: { value: "payment approval needed?" },
        });

        fireEvent.click(screen.getByRole("button", { name: startAskButtonName }));

        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith(
                "/knowledge-documents/langchain-agent-ask/",
                expect.objectContaining({
                    query: "payment approval needed?",
                    top_k: 3,
                    search_type: "hybrid",
                    conversation_id: undefined,
                    request_id: expect.any(String),
                })
            );
        });

        expect(await screen.findByText("LangChain-style Agent says approval is required.")).toBeInTheDocument();
        expect(screen.getByText("langchain-style")).toBeInTheDocument();
        expect(screen.getByText("trace-langchain-agent-001")).toBeInTheDocument();

        expect(screen.getAllByText("conversation_memory")[0]).toBeInTheDocument();
        expect(screen.getAllByText("knowledge_retriever")[0]).toBeInTheDocument();
        expect(screen.getAllByText("workflow_summary")[0]).toBeInTheDocument();

        expect(screen.getByText("Payment Approval Rule")).toBeInTheDocument();
        expect(screen.getByText("Payment requests over 5000 require approval workflow.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /查看链路|鏌ョ湅閾捐矾/ }));
        expect(await screen.findByText("日志页面")).toBeInTheDocument();
    }, 15000);
});




