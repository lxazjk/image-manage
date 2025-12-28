#!/usr/bin/env python3
"""
后端启动脚本
"""

import sys
import os

# 添加backend目录到Python路径
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# 导入并运行应用
from backend.app import create_app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8080, debug=True)
