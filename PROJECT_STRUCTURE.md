# 项目结构说明

## 目录结构

```
image-manage/
│
├── backend/                    # 后端服务
│   ├── __init__.py
│   ├── app.py                 # Flask 应用主文件
│   ├── auth.py                # 认证授权模块
│   ├── config.py              # 配置管理
│   ├── database.py            # 数据库模型和连接
│   ├── qwen_client.py         # Qwen VL API 客户端
│   ├── utils.py               # 工具函数
│   │
│   ├── controllers/           # 控制器（路由处理）
│   │   ├── __init__.py
│   │   ├── auth_controller.py      # 认证相关接口
│   │   ├── image_controller.py     # 图片管理接口
│   │   ├── tag_controller.py       # 标签管理接口
│   │   ├── user_controller.py      # 用户管理接口
│   │   └── config_controller.py    # 配置管理接口
│   │
│   └── swagger/               # API 文档
│       └── api.yaml
│
├── frontend/                  # 前端应用
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts        # Vite 配置
│   ├── tsconfig.json
│   │
│   └── src/
│       ├── main.tsx          # 入口文件
│       ├── App.tsx           # 主应用组件
│       ├── index.css
│       │
│       ├── pages/            # 页面组件
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Gallery.tsx
│       │   ├── Upload.tsx
│       │   ├── ImageDetail.tsx
│       │   ├── Admin.tsx
│       │   └── Settings.tsx
│       │
│       ├── services/         # API 服务
│       │   └── api.ts
│       │
│       └── contexts/        # React Context
│           └── AuthContext.tsx
│
├── config.yaml               # 应用配置文件
├── requirements.txt          # Python 依赖
├── docker-compose.yml        # Docker Compose 配置
├── Dockerfile.backend        # 后端 Dockerfile
├── Dockerfile.frontend       # 前端 Dockerfile
├── run_backend.py           # 后端启动脚本
├── start.sh                 # 启动脚本
├── stop.sh                  # 停止脚本
├── README.md                # 项目说明文档
└── .gitignore               # Git 忽略文件

├── data/                    # 数据目录（SQLite 数据库，如果使用）
├── uploads/                 # 上传的图片存储目录
└── backups/                 # 备份目录
```

## 核心文件说明

### 后端文件

- **app.py**: Flask 应用初始化，路由注册，应用配置
- **auth.py**: JWT 认证，密码哈希，权限验证
- **database.py**: SQLAlchemy 模型定义，数据库连接管理
- **config.py**: 配置文件加载和管理
- **controllers/**: 各个业务模块的 API 接口实现

### 前端文件

- **main.tsx**: React 应用入口
- **App.tsx**: 主应用组件，路由配置
- **pages/**: 各个页面组件
- **services/api.ts**: Axios 配置和 API 调用封装
- **contexts/AuthContext.tsx**: 用户认证状态管理

### 配置文件

- **config.yaml**: 应用配置（数据库、存储、JWT 等）
- **docker-compose.yml**: Docker 服务编排配置
- **requirements.txt**: Python 依赖列表
- **package.json**: Node.js 依赖和脚本

## 数据流

```
前端 (React) 
  ↓ HTTP Request
后端 API (Flask)
  ↓ SQLAlchemy ORM
MySQL 数据库
```

## 服务架构

```
┌─────────────┐
│   Frontend  │  :3000 (Vite Dev Server)
│   (React)   │
└──────┬──────┘
       │ HTTP Proxy
       ↓
┌─────────────┐
│   Backend    │  :8080 (Flask)
│   (Python)  │
└──────┬──────┘
       │ SQLAlchemy
       ↓
┌─────────────┐
│    MySQL    │  :3306
│  Database   │
└─────────────┘
```

## 开发工作流

1. **修改后端代码**: 代码在容器中通过 volume 挂载，修改后自动生效（Flask debug 模式）
2. **修改前端代码**: 代码在容器中通过 volume 挂载，Vite 支持热重载
3. **修改配置**: 修改 `config.yaml` 后需要重启后端服务
4. **添加依赖**: 
   - Python: 修改 `requirements.txt` 后重新构建镜像
   - Node.js: 在容器内安装或修改 `package.json` 后重新构建

## 数据库模型

- **users**: 用户表（id, username, email, password_hash, role）
- **images**: 图片表（id, filename, path, user_id, ...）
- **tags**: 标签表（id, name）
- **image_tags**: 图片标签关联表（多对多）

