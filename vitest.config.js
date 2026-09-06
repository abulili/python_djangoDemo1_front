import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.js',
        server: {
            deps: {
                inline: [
                    "antd",
                    "@ant-design/icons",
                    "@ant-design/colors",
                    "@rc-component/util",
                    "rc-util",
                    "rc-table",
                    "rc-pagination",
                    "rc-picker",
                    "rc-select",
                    "rc-tree",
                    "rc-tooltip",
                    "rc-dialog",
                    "rc-drawer",
                ],
            },
        },
    },
});