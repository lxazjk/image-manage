# 快速开始指南

## 一键启动

```bash
# 启动所有服务
./start.sh

# 或使用 docker-compose
docker-compose up --build -d
```

## 访问地址

- **前端界面**: http://localhost:3000
- **后端 API**: http://localhost:8080
- **MySQL 数据库**: localhost:3306

## 默认账户

- **管理员**: `admin` / `123456`
- **数据库**: `appuser` / `apppassword`

## 常用命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down
# 或
./stop.sh

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]
```

### 数据库操作

```bash
# 连接数据库
docker-compose exec db mysql -uappuser -papppassword image_manager

# 查看所有用户
docker-compose exec db mysql -uappuser -papppassword image_manager -e "SELECT id, username, email, role FROM users;"

# 重置数据库（删除所有数据）
docker-compose down -v
docker-compose up --build -d
```

### 开发调试

```bash
# 进入后端容器
docker-compose exec backend bash

# 进入前端容器
docker-compose exec frontend sh

# 查看后端日志
docker-compose logs -f backend

# 查看前端日志
docker-compose logs -f frontend
```

## 测试 API

```bash
# 登录测试
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 注册测试
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456"}'
```

## 故障排查

### 端口被占用

修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8081:8080"  # 改为其他端口
```

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs [service_name]

# 重新构建
docker-compose up --build --force-recreate
```

### 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose ps db

# 查看数据库日志
docker-compose logs db

# 重启数据库
docker-compose restart db
```

## 项目文件说明

- `config.yaml` - 应用配置（数据库、存储路径等）
- `docker-compose.yml` - Docker 服务编排
- `requirements.txt` - Python 依赖
- `frontend/package.json` - Node.js 依赖
- `start.sh` - 启动脚本
- `stop.sh` - 停止脚本

