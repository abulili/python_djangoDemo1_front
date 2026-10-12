import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BookOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PlaySquareOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Space, Typography } from "antd";

import { handleLogout } from "../utils/request";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: "/logs", icon: <DatabaseOutlined />, label: "主页" },
  { key: "/chat", icon: <MessageOutlined />, label: "AI 对话" },
  { key: "/prompt-templates", icon: <FileTextOutlined />, label: "Prompt 模板" },
  { key: "/knowledge-documents", icon: <BookOutlined />, label: "知识库" },
  { key: "/workflows", icon: <ApartmentOutlined />, label: "工作流" },
  { key: "/workflow-templates", icon: <AppstoreOutlined />, label: "模板配置" },
  {
    key: "/novel-video",
    icon: <VideoCameraOutlined />,
    label: "推文生成",
    children: [
      { key: "/novel-video/create", icon: <PlaySquareOutlined />, label: "创建任务" },
      { key: "/novel-video/jobs", icon: <VideoCameraOutlined />, label: "任务管理" },
      { key: "/novel-video/assets", icon: <DatabaseOutlined />, label: "素材管理" },
    ],
  },
];

function findActiveLabel(pathname, items = menuItems) {
  for (const item of items) {
    if (item.key === pathname) return item.label;
    if (item.children) {
      const child = findActiveLabel(pathname, item.children);
      if (child) return child;
    }
  }
  if (pathname.startsWith("/novel-video")) return "推文生成";
  return "观测平台";
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKeys = useMemo(() => {
    if (location.pathname.startsWith("/novel-video/")) return [location.pathname];
    return [location.pathname];
  }, [location.pathname]);

  const openKeys = useMemo(() => {
    if (collapsed) return [];
    if (location.pathname.startsWith("/novel-video")) return ["/novel-video"];
    return [];
  }, [collapsed, location.pathname]);

  return (
    <Layout className="app-shell">
      <Sider
        className="app-sidebar"
        width={260}
        collapsedWidth={76}
        collapsed={collapsed}
        trigger={null}
      >
        <div className={collapsed ? "app-brand collapsed" : "app-brand"}>
          <div className="brand-mark">AI</div>
          {!collapsed && (
            <div>
              <div className="brand-title">观测平台</div>
              <div className="brand-subtitle">AI 调用观测平台</div>
            </div>
          )}
        </div>

        <Menu
          className="app-sidebar-menu"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          inlineCollapsed={collapsed}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout className="app-main">
        <Header className="app-header">
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
            />
            <Text strong>{findActiveLabel(location.pathname)}</Text>
          </Space>
          <Button icon={<LogoutOutlined />} danger onClick={handleLogout}>
            退出登录
          </Button>
        </Header>

        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
