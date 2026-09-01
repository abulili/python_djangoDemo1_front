import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import KnowledgeDocuments from "./pages/KnowledgeDocuments";
import request from "./utils/request";

// npm test

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
}));

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
            title: "AI日志项目说明",
            content: "stream3 使用 conversation_id 实现上下文会话",
            chunk_count: 2,
            updated_at: "2026-08-31T12:00:00Z",
            chunks: [],
          },
        ],
      },
    });
    render(
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
      </MemoryRouter>,
    );

    // await等页面 useEffect 执行完，确认它真的请求了知识库列表接口
    await waitFor(() => {
      // 直到 request.get 被调用，并且调用参数是 /knowledge-documents/
        // 在测：KnowledgeDocuments 页面加载时，确实请求了知识库列表接口
        //toHaveBeenCalledWith 的意思是：断言某个 mock 函数曾经用指定参数调用过。
      expect(request.get).toHaveBeenCalledWith("/knowledge-documents/");
    });

    // toBeInTheDocument：某个元素确实出现在页面里
    expect(screen.getByText("AI日志项目说明")).toBeInTheDocument();
    expect(
      screen.getByText("stream3 使用 conversation_id 实现上下文会话"),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
