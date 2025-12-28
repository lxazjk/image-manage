# 图片管理系统

一个基于 Flask + React + MySQL 的图片管理系统，支持图片上传、管理、标签分类等功能。

## 项目结构

```
image-manage/
├── backend/              # 后端代码
│   ├── app.py           # Flask 应用入口
│   ├── auth.py          # 认证模块
│   ├── config.py        # 配置管理
│   ├── database.py      # 数据库模型
│   ├── controllers/     # 控制器
│   │   ├── auth_controller.py
│   │   ├── image_controller.py
│   │   ├── tag_controller.py
│   │   ├── user_controller.py
│   │   └── config_controller.py
│   └── swagger/         # API 文档
├── frontend/            # 前端代码（React + TypeScript）
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── services/    # API 服务
│   │   └── contexts/    # React Context
│   └── vite.config.ts   # Vite 配置
├── config.yaml          # 配置文件
├── docker-compose.yml   # Docker Compose 配置
├── Dockerfile.backend   # 后端 Dockerfile
├── Dockerfile.frontend  # 前端 Dockerfile
└── requirements.txt    # Python 依赖

```

## 功能特性

- ✅ 用户注册/登录（JWT 认证）
- ✅ 图片上传和管理
- ✅ 图片标签分类
- ✅ 用户权限管理（管理员/普通用户）
- ✅ 图片编辑（旋转、裁剪等）
- ✅ 图片搜索和筛选
- ✅ 自动标签生成（集成 Qwen VL API）

## 技术栈

### 后端
- Python 3.11
- Flask + Connexion
- SQLAlchemy
- MySQL 8.0
- JWT 认证

### 前端
- React 18
- TypeScript
- Vite
- Axios

## 快速开始

### 前置要求

- Docker & Docker Compose
- Git

### 安装和运行

1. **克隆项目**
```bash
git clone <repository-url>
cd image-manage
```

2. **配置环境**

编辑 `config.yaml` 文件，配置数据库和其他设置：

```yaml
database:
  type: mysql
  mysql:
    host: db
    port: 3306
    database: image_manager
    username: appuser
    password: apppassword
```

3. **启动服务**

```bash
# 构建并启动所有服务
docker-compose up --build -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

4. **访问应用**

- 前端：http://localhost:3000
- 后端 API：http://localhost:8080
- MySQL：localhost:3306

### 默认管理员账户

- 用户名：`admin`
- 密码：`123456`

> 首次启动时会自动创建默认管理员账户

## 开发指南

### 后端开发

```bash
# 进入后端容器
docker-compose exec backend bash

# 安装新依赖
pip install <package-name>
# 更新 requirements.txt
pip freeze > requirements.txt
```

### 前端开发

```bash
# 进入前端容器
docker-compose exec frontend sh

# 安装新依赖
npm install <package-name>
```

### 数据库管理

```bash
# 连接 MySQL
docker-compose exec db mysql -uappuser -papppassword image_manager

# 查看表结构
SHOW TABLES;
DESCRIBE users;
```

## API 文档

启动服务后，可以通过以下方式访问 API 文档：

- Swagger UI: http://localhost:8080/ui
- API 基础路径: http://localhost:8080/api/v1

### 主要 API 端点

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/images` - 获取图片列表
- `POST /api/v1/images/upload` - 上传图片
- `GET /api/v1/tags` - 获取标签列表
- `POST /api/v1/tags` - 创建标签

## 配置说明

### config.yaml

主要配置项：

- `database`: 数据库配置（MySQL/SQLite）
- `storage`: 图片存储配置
- `jwt`: JWT 认证配置
- `qwen`: Qwen VL API 配置（可选）

## 常见问题

### 1. 端口冲突

如果端口被占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8080:8080"  # 改为其他端口，如 "8081:8080"
```

### 2. 数据库连接失败

确保 MySQL 服务已启动：

```bash
docker-compose ps db
docker-compose logs db
```

### 3. 前端无法连接后端

检查 `frontend/vite.config.ts` 中的代理配置：

```typescript
proxy: {
  '/api': {
    target: 'http://backend:8080',  // Docker 网络中使用服务名
    changeOrigin: true
  }
}
```

### 4. 重置数据库

```bash
# 停止服务
docker-compose down

# 删除数据卷
docker-compose down -v

# 重新启动
docker-compose up --build -d
```

## 生产部署

生产环境部署建议：

1. 修改默认密码和密钥
2. 使用环境变量管理敏感信息
3. 配置 HTTPS
4. 使用生产级 WSGI 服务器（如 Gunicorn）
5. 配置 Nginx 反向代理
6. 启用数据库备份

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

