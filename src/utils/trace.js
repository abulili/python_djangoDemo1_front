// 前端内存里保存最近一次请求的 trace_id

let latestTraceId = '';

export const setLatestTraceId = (traceId) => {
    latestTraceId = traceId || "";
};

export const getLatestTraceId = () => latestTraceId;
