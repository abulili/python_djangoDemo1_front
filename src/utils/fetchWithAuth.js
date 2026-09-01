import { refreshAccessToken } from "./request";

export const fetchWithAuth = async (url, options = {}) => {
    const accessToken = localStorage.getItem("access_token");

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
    });

    if (response.status !== 401) {
        return response;
    }

    const newAccessToken = await refreshAccessToken();

    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
        },
    });
};