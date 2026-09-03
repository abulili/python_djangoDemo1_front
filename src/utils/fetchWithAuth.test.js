import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithAuth } from "./fetchWithAuth";
import { refreshAccessToken } from "./request";
import { getLatestTraceId } from "./trace";

// npm test -- src/utils/fetchWithAuth.test.js --run
vi.mock("./request", () => ({
    refreshAccessToken: vi.fn(),
}));

describe("fetchWithAuth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn(); // 把浏览器的fetch换成假的
    });

    it("正常请求时携带access_token", async () => {
        localStorage.setItem("access_token", "old-token");

        const mockResponse = {
            status: 200,
            headers: {
                get: vi.fn((name) => {
                    if (name === 'X-Trace-Id') {
                        return 'trace-001';
                    }
                })
            },
            json: vi.fn()
        };

        // mockResolvedValue： 一个假的异步函数返回一个成功的Promise
        /** 等价于
        global.fetch.mockImplementation(() => {
            return Promise.resolve(mockResponse);
        });
         */
        // 以后谁调用fetch就返回mockResponse
        global.fetch.mockResolvedValue(mockResponse);

        // 在之前写了global的fetch都改成加函数了，所以这个也是假函数
        const response = await fetchWithAuth("/api/stream3", {
            method: "POST"
        })

        // 判断两个东西是不是同一个对象  期望 fetchWithAuth 最后返回的 response，就是 mockResponse 这个对象本身
        expect(response).toBe(mockResponse);

        expect(global.fetch).toHaveBeenCalledWith("/api/stream3", {
            method: "POST",
            headers: {
                "Authorization": "Bearer old-token"
            }
        })

        /**
         第一次 fetch 返回 200
        -> 不进入 401 分支
        -> 不调用 refreshAccessToken
         */
        expect(refreshAccessToken).not.toBeCalled();
        expect(getLatestTraceId()).toBe("trace-001");

    })

    it("401时刷新token并重试请求", async () => {
        localStorage.setItem("access_token", "old-token");

        const firstResponse = {
            status: 401,
            headers: {
                get: vi.fn((name) => {
                    if (name === "X-Trace-Id") return "trace-old";
                    return null;
                }),
            },
        };

        const secondResponse = {
            status: 200,
            headers: {
                get: vi.fn((name) => {
                    if (name === "X-Trace-Id") return "trace-new";
                    return null;
                }),
            },
        };

        // 第一次调用返回firstR，第二次调用返回secondR
        // 模拟：第一次请求 -> 401 -- 刷新 token -- 第二次请求 -> 200
        // mockResolvedValueOnce：只对下一次调用生效
        global.fetch.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

        refreshAccessToken.mockResolvedValue("new-token");

        const response = await fetchWithAuth("/api/stream3/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        })


        expect(response).toBe(secondResponse);
        expect(getLatestTraceId()).toBe("trace-new");
        expect(refreshAccessToken).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledTimes(2);

        // 检查第一次调用参数
        expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/stream3/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer old-token",
            }
        })

        expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/stream3/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer new-token",
            }
        })

    })
})