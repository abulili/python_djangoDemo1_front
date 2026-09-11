import "@testing-library/jest-dom/vitest";

const originalGetComputedStyle = window.getComputedStyle;

window.getComputedStyle = (element) => {
    return originalGetComputedStyle(element);
};

global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};