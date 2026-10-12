import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Row, Space, Typography } from "antd";
import {
  ArrowLeftOutlined,
  DatabaseOutlined,
  FormOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export default function NovelVideoHome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24, background: "#f6f8fb", minHeight: "100vh" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <VideoCameraOutlined style={{ fontSize: 24, color: "#1677ff" }} />
            <div>
              <h2 style={{ margin: 0 }}>小说推文生成</h2>
              <Text type="secondary">素材管理、任务生成、结果查看分开处理</Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/logs")}>
            返回
          </Button>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card
            title="创建任务"
            bordered={false}
            extra={<FormOutlined />}
            actions={[
              <Button type="primary" onClick={() => navigate("/novel-video/create")}>
                新建视频
              </Button>,
            ]}
          >
            <Text type="secondary">
              输入小说正文，选择服务器处理或本地处理，再设置字体、描边、TTS、BGM 和滚动速度。
            </Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title="任务管理"
            bordered={false}
            extra={<VideoCameraOutlined />}
            actions={[
              <Button onClick={() => navigate("/novel-video/jobs")}>
                查看任务
              </Button>,
            ]}
          >
            <Text type="secondary">
              启动生成、刷新状态、编辑任务、删除任务，并打开 final 视频、封面和字幕。
            </Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title="素材管理"
            bordered={false}
            extra={<DatabaseOutlined />}
            actions={[
              <Button onClick={() => navigate("/novel-video/assets")}>
                管理素材
              </Button>,
            ]}
          >
            <Text type="secondary">
              上传线上素材或登记本地素材，维护风格、标签、共享状态和素材类型。
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
