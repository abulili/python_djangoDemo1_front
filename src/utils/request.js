import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// // 创建 axios 实例
const request = axios.create({
    baseURL: API_URL,
    timeout: 60000,
});

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
        console.log('request', res.data)
        const newAccessToken = res.data.access;
        console.log('newAccessToken', res.data);
        localStorage.setItem('access_token', newAccessToken);
        return newAccessToken;
    } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
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
    (response) => response, async (error) => {
        const originalRequest = error.config;

        // 如果返回 401 且不是刷新 token 的请求本身
        if (error.response?.status === 401 && !originalRequest._retry) {
            // 标记该请求已被重试过，防止401重试时陷入死循环
            // _retry 是自定义标记，用于防止 401 重试时陷入死循环（非 axios 自带属性）
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/';
                return Promise.reject(error);
            }

            try {
                // 调用刷新接口
                const res = await axios.post(`${API_URL}/token/refresh/`,
                    {
                        refresh: refreshToken
                    }
                );
                const newAccessToken = res.data.access;
                console.log('newAccessToken', res.data);
                localStorage.setItem('access_token', newAccessToken);

                // 用token重试原请求
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return request(originalRequest);
            } catch (error) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/';
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

export default request;