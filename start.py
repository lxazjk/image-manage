#!/usr/bin/env python3
"""
图片管理系统启动脚本
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("错误: 需要Python 3.8或更高版本")
        sys.exit(1)

def install_backend_dependencies():
    """安装后端依赖"""
    print("检查后端依赖...")
    try:
        import connexion
        import flask
        import flask_cors
        import sqlalchemy
        import flask_sqlalchemy
        import pymysql
        from PIL import Image
        import yaml
        import bcrypt
        import jwt
        import werkzeug
        import exifread
        import cv2
        import numpy
        print("后端依赖已安装")
        return True
    except ImportError as e:
        print(f"缺少依赖: {e}")
        print("正在安装后端依赖...")
        result = subprocess.run([sys.executable, "-m", "pip", "install",
                               "connexion[swagger-ui]", "flask", "flask-cors", "sqlalchemy",
                               "flask-sqlalchemy", "pymysql", "pillow", "pyyaml", "bcrypt",
                               "pyjwt", "werkzeug", "exifread", "opencv-python", "numpy"],
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("后端依赖安装失败:")
            print(result.stderr)
            sys.exit(1)
        return True

def start_backend():
    """启动后端服务"""
    print("启动后端服务...")
    backend_process = subprocess.Popen([sys.executable, "-m", "backend.app"])
    return backend_process

def start_frontend():
    """启动前端服务"""
    print("启动前端服务...")
    os.chdir("frontend")

    # 检查Node.js是否安装
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("错误: 未找到Node.js，请先安装Node.js")
        print("下载地址: https://nodejs.org/")
        sys.exit(1)

    # 检查前端依赖
    if not os.path.exists("node_modules"):
        print("安装前端依赖...")
        result = subprocess.run(["npm", "install"], capture_output=True, text=True)
        if result.returncode != 0:
            print("前端依赖安装失败:")
            print(result.stderr)
            sys.exit(1)

    # 启动前端开发服务器
    frontend_process = subprocess.Popen(["npm", "run", "dev"])
    os.chdir("..")
    return frontend_process

def main():
    """主函数"""
    print("=== 图片管理系统启动器 ===\n")

    # 检查Python版本
    check_python_version()

    # 检查项目文件
    required_files = [
        "requirements.txt",
        "backend/app.py",
        "frontend/package.json",
        "config.yaml"
    ]

    for file_path in required_files:
        if not Path(file_path).exists():
            print(f"错误: 找不到必需文件 {file_path}")
            sys.exit(1)

    # 安装后端依赖
    install_backend_dependencies()

    # 启动服务
    backend_process = start_backend()
    time.sleep(2)  # 等待后端启动

    frontend_process = start_frontend()
    time.sleep(3)  # 等待前端启动

    print("\n=== 服务启动成功 ===")
    print("后端服务: http://localhost:8080")
    print("前端服务: http://localhost:3000")
    print("API文档: http://localhost:8080/api/v1/ui/")
    print("\n默认管理员账户: admin / 123456")
    print("\n按 Ctrl+C 停止服务")

    # 自动打开浏览器
    try:
        webbrowser.open("http://localhost:3000")
    except:
        pass

    try:
        # 等待用户中断
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n正在停止服务...")

        # 停止进程
        backend_process.terminate()
        frontend_process.terminate()

        backend_process.wait()
        frontend_process.wait()

        print("服务已停止")

if __name__ == "__main__":
    main()
