import axios from 'axios';
import { setLatestTraceId } from "./trace";

const API_URL = import.meta.env.VITE_API_URL;

// // 创建 axios 实例
const request = axios.create({
    baseURL: API_URL,
    timeout: 60000,
});
let isLoggingOut = false;
let refreshPromise = null;
const isAuthRequest = (url = "") => {
    return (
        url.includes("/token/") ||
        url.includes("/token/refresh/") ||
        url.includes("/users/logout/")
    );
};
export const handleLogout = async ({ callBackend = true } = {}) => {
    if (isLoggingOut) {
        return;
    }

    isLoggingOut = true;

    try {
        const accessToken = localStorage.getItem("access_token");

        if (callBackend && accessToken) {
            await axios.post(
                `${API_URL}/users/logout/`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
        }
    } catch (error) {
        // 后端登出失败也继续清本地 token
    } finally {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/";
    }
};
export const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
        throw new Error('没有 refresh token')
    }

    try {
        const res = await axios.post(`${API_URL}/token/refresh/`,
            {
                refresh: refreshToken
            }
        );
        if (!res.data?.access) {
            throw new Error('没有 refresh token')
        }

        const newAccessToken = res.data.access;

        localStorage.setItem('access_token', newAccessToken);
        return newAccessToken;
    } catch (error) {
        await handleLogout({ callBackend: false });
        return Promise.reject(error);
    }
}

// 请求拦截器：自动带上 token
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器：处理 401 自动刷新
request.interceptors.response.use(
    (response) => {
        const traceId = response.headers?.["x-trace-id"];
        if (traceId) {
            setLatestTraceId(traceId);
        }

        return response;
    }, async (error) => {
        const traceId = error.response?.headers?.["x-trace-id"];
        if (traceId) {
            setLatestTraceId(traceId);
        }

        const originalRequest = error.config;
        const url = originalRequest.url || "";

        // 如果返回 401 且不是刷新 token 的请求本身
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest(url)) {
            // 标记该请求已被重试过，防止401重试时陷入死循环
            // _retry 是自定义标记，用于防止 401 重试时陷入死循环（非 axios 自带属性）
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                await handleLogout({ callBackend: false });
                return Promise.reject(error);
            }

            try {
                // 调用刷新接口
                if (!refreshPromise) {
                    refreshPromise = axios.post(`${API_URL}/token/refresh/`, {
                        refresh: refreshToken,
                    }).finally(() => {
                        refreshPromise = null;
                    });
                }

                const res = await refreshPromise;
                const newAccessToken = res.data.access;

                localStorage.setItem('access_token', newAccessToken);

                // 用token重试原请求
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return request(originalRequest);
            } catch (error) {
                await handleLogout({ callBackend: false });
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

export default request;