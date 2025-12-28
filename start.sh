#!/bin/bash

# 图片管理系统启动脚本

echo "=========================================="
echo "  图片管理系统启动脚本"
echo "=========================================="

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 docker-compose 是否可用
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose 未安装"
    exit 1
fi

echo ""
echo "📦 正在构建并启动服务..."
docker-compose up --build -d

echo ""
echo "⏳ 等待服务启动..."
sleep 5

echo ""
echo "📊 服务状态："
docker-compose ps

echo ""
echo "✅ 启动完成！"
echo ""
echo "访问地址："
echo "  - 前端: http://localhost:3000"
echo "  - 后端: http://localhost:8080"
echo "  - MySQL: localhost:3306"
echo ""
echo "默认管理员账户："
echo "  用户名: admin"
echo "  密码: 123456"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"

