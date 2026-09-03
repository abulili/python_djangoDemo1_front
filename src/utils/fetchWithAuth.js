import { refreshAccessToken } from "./request";
import { setLatestTraceId } from "./trace";

export const fetchWithAuth = async (url, options = {}) => {
    const accessToken = localStorage.getItem("access_token");

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
    });

    const traceId = response.headers?.get("X-Trace-Id");
    if (traceId) {
        setLatestTraceId(traceId);
    }

    if (response.status !== 401) {
        return response;
    }

    const newAccessToken = await refreshAccessToken();

    /**
    axios 取响应头：response.headers?.["x-trace-id"]
    fetch 取响应头：response.headers?.get("X-Trace-Id")
        因为 fetch 的 headers 是 Headers 对象，不是普通对象。
     */
    const retryResponse = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
        },
    });

    const retryTraceId = retryResponse.headers?.get("X-Trace-Id");
    if (retryTraceId) {
        setLatestTraceId(retryTraceId);
    }

    return retryResponse;
};