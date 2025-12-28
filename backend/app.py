#!/usr/bin/env python3
"""
图片管理系统后端服务
"""

import os
import connexion
from flask import Flask
from flask_cors import CORS

from .database import init_db
from .config import Config
from .auth import init_auth_manager
from .controllers import auth_controller, user_controller, image_controller, tag_controller, config_controller

def create_app(config_file='../config.yaml'):
    """创建Flask应用实例"""

    # 加载配置
    config = Config(config_file)

    # 创建Connexion应用
    connexion_app = connexion.App(__name__, specification_dir='./swagger/')

    # 获取Flask应用实例
    app = connexion_app.app

    # 配置CORS
    CORS(app)

    # 加载配置到Flask应用
    app.config['SECRET_KEY'] = config.get('jwt.secret_key')
    app.config['JWT_SECRET_KEY'] = config.get('jwt.secret_key')

    # 初始化数据库
    init_db(config)

    # 初始化认证管理器
    init_auth_manager(app, config)

    # 临时手动注册路由进行测试
    from .controllers.auth_controller import login, register
    from .controllers.image_controller import upload_images, get_images, get_image_detail, edit_image, delete_image, restore_image
    from .controllers.user_controller import get_users, approve_user, update_user_role
    from .controllers.tag_controller import get_tags, create_tag, add_tags_to_image, remove_tags_from_image
    from .controllers.config_controller import get_config, update_config, test_qwen_connection

    # 认证路由
    app.add_url_rule('/api/v1/auth/login', 'login', login, methods=['POST'])
    app.add_url_rule('/api/v1/auth/register', 'register', register, methods=['POST'])

    # 用户管理路由
    app.add_url_rule('/api/v1/users', 'get_users', get_users, methods=['GET'])
    app.add_url_rule('/api/v1/users/<int:user_id>/approve', 'approve_user', approve_user, methods=['POST'])
    app.add_url_rule('/api/v1/users/<int:user_id>/role', 'update_user_role', update_user_role, methods=['PUT'])

    # 图片路由
    app.add_url_rule('/api/v1/images/upload', 'upload_images', upload_images, methods=['POST'])
    app.add_url_rule('/api/v1/images', 'get_images', get_images, methods=['GET'])
    app.add_url_rule('/api/v1/images/<int:image_id>', 'get_image_detail', get_image_detail, methods=['GET'])
    app.add_url_rule('/api/v1/images/<int:image_id>/edit', 'edit_image', edit_image, methods=['POST'])
    app.add_url_rule('/api/v1/images/<int:image_id>/delete', 'delete_image', delete_image, methods=['POST'])
    app.add_url_rule('/api/v1/images/<int:image_id>/restore', 'restore_image', restore_image, methods=['POST'])

    # 标签路由
    app.add_url_rule('/api/v1/tags', 'get_tags', get_tags, methods=['GET'])
    app.add_url_rule('/api/v1/tags', 'create_tag', create_tag, methods=['POST'])
    app.add_url_rule('/api/v1/images/<int:image_id>/tags', 'add_tags_to_image', add_tags_to_image, methods=['POST'])
    app.add_url_rule('/api/v1/images/<int:image_id>/tags', 'remove_tags_from_image', remove_tags_from_image, methods=['DELETE'])

    # 配置路由
    app.add_url_rule('/api/v1/config', 'get_config', get_config, methods=['GET'])
    app.add_url_rule('/api/v1/config', 'update_config', update_config, methods=['PUT'])
    app.add_url_rule('/api/v1/config/test-qwen', 'test_qwen_connection', test_qwen_connection, methods=['POST'])

    # 注册API路由
    # connexion_app.add_api('api.yaml')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8080, debug=True)
