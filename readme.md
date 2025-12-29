# 图片管理系统

这是一个完整的图片管理系统，支持用户注册登录、图片上传管理、EXIF信息提取、标签管理等功能。

## 功能特性

### 用户系统
- 用户注册和登录
- 权限管理（普通用户、管理员、待审核用户）
- 管理员可以审批用户注册、修改用户角色

### 图片管理
- 支持多种格式图片上传（JPG、PNG、GIF、BMP、WebP）
- 拖拽上传和批量上传
- 自动EXIF信息提取（拍摄时间、地理位置、分辨率等）
- 智能缩略图生成
- 图片编辑功能（裁剪、色彩调整）
- 软删除和恢复功能

### 标签系统
- 自定义图片标签
- 按标签筛选图片
- 标签自动补全

### 响应式设计
- 支持PC和移动端访问
- Material Design设计风格

## 技术栈

### 后端
- Python 3.8+
- Flask + Connexion (REST API)
- SQLAlchemy (ORM)
- SQLite/MySQL (数据库)
- Pillow (图片处理)
- PyJWT (认证)
- bcrypt (密码哈希)

### 前端
- React 18
- TypeScript
- Material-UI (MUI)
- Axios (HTTP客户端)
- React Router (路由)
- React Dropzone (文件上传)

## 安装和运行

### 1. 后端设置

```bash
# 安装Python依赖
pip install -r requirements.txt

# 运行后端服务
python backend/app.py
```

后端将在 `http://localhost:8080` 启动

### 2. 前端设置

```bash
# 安装Node.js依赖
cd frontend
npm install

# 运行前端开发服务器
npm run dev
```

前端将在 `http://localhost:3000` 启动

### 3. 配置文件

项目使用 `config.yaml` 配置文件，支持以下配置：

```yaml
database:
  type: sqlite  # 或 mysql
  sqlite:
    path: ./data/image_manager.db

storage:
  base_path: ./uploads  # 图片存储路径
  backup_path: ./backups  # 备份路径
  allowed_extensions: "jpg,png,gif,jpeg,bmp,webp"  # 允许的文件类型

pagination:
  page_size: 20  # 每页显示图片数量

# Qwen VL API配置（用于AI自动标签生成）
qwen:
  enabled: false  # 是否启用自动标签生成
  api_key: ""  # 通义千问API Key，从https://dashscope.aliyun.com/获取
  base_url: "https://dashscope.aliyuncs.com/api/v1/"  # API基础URL
  model: "qwen-vl-max"  # 模型名称，可选：qwen-vl-max, qwen-vl-plus
  max_retries: 3  # 最大重试次数
  timeout: 30  # 请求超时时间（秒）
  max_tags: 5  # 每个图片最多生成多少个标签
```

## 默认账户

- **管理员账户**: admin / 123456

## API文档

启动后端服务后，可以访问以下地址查看API文档：

- Swagger UI: `http://localhost:8080/api/v1/ui/`

## 项目结构

```
.
├── config.yaml              # 配置文件
├── requirements.txt         # Python依赖
├── backend/                 # 后端代码
│   ├── app.py              # Flask应用入口
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库模型
│   ├── auth.py             # 认证模块
│   ├── utils.py            # 工具函数
│   ├── controllers/        # API控制器
│   └── swagger/            # API规范
├── frontend/                # 前端代码
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   └── contexts/       # React上下文
│   └── package.json
└── README.md
```

## 主要功能演示

### 用户注册和登录
1. 访问应用首页，点击注册创建新账户
2. 使用管理员账户登录审批新用户
3. 新用户登录后即可使用系统

### 图片上传
1. 登录后进入上传页面
2. 拖拽图片文件到上传区域，或点击选择文件
3. 支持批量上传，上传完成后可复制图片链接
4. **AI自动标签生成**：上传图片时会自动调用Qwen VL模型生成相关标签（如风景、人物、动物等）

### 图片浏览
1. 进入相册页面查看所有图片
2. 支持按标签筛选、搜索文件名
3. 使用无限滚动加载更多图片
4. 点击图片查看详情

### 图片编辑
1. 在图片详情页点击"编辑"按钮
2. 选择裁剪或色彩调整操作
3. 调整参数后应用修改

### AI标签功能
1. **自动标签生成**：上传图片时自动调用通义千问Qwen VL模型分析图片内容
2. **配置管理**：管理员可在设置页面配置Qwen API参数
3. **连接测试**：提供API连接测试功能
4. **异常处理**：AI分析失败时不会影响图片上传，只记录警告信息

### 管理功能
1. 管理员登录后可访问管理面板
2. 审批待审核用户
3. 修改用户角色
4. 配置系统设置
5. **AI设置**：配置Qwen VL API参数（API Key、模型名称、基础URL等）

## 注意事项

1. 首次运行会自动创建数据库和默认管理员账户
2. 图片文件存储在本地文件系统，需要确保有足够存储空间
3. 编辑图片时会自动备份原始文件到backup目录
4. 删除的图片在数据库中标记为删除，文件仍保留在磁盘上

## 扩展功能

项目预留了以下扩展接口：
- AI图像分析和自动标签生成
- MCP协议支持
- 更多的图片编辑功能
- 云存储集成

## 许可证

MIT License