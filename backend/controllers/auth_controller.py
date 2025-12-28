"""
认证控制器
"""

import re
from flask import request, g, jsonify
from sqlalchemy.exc import IntegrityError

from database import get_db, User
from auth import AuthManager

def login():
    """用户登录"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': '用户名和密码不能为空'}), 400

    username = data['username']
    password = data['password']

    session = get_db()
    try:
        user = session.query(User).filter_by(username=username).first()

        if not user or not g.auth_manager.verify_password(password, user.password_hash):
            return jsonify({'error': '用户名或密码错误'}), 401

        if user.role == 'pending':
            return jsonify({'error': '账号待审核，请联系管理员'}), 403

        # 生成token
        token = g.auth_manager.generate_token(user.id, user.username, user.role)

        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
        })

    finally:
        session.close()

def register():
    """用户注册"""
    data = request.get_json()

    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    # 验证输入
    if not username or not email or not password:
        return jsonify({'error': '用户名、邮箱和密码不能为空'}), 400

    if len(username) < 3:
        return jsonify({'error': '用户名至少需要3个字符'}), 400

    if len(password) < 6:
        return jsonify({'error': '密码至少需要6个字符'}), 400

    # 验证邮箱格式
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({'error': '邮箱格式不正确'}), 400

    session = get_db()
    try:
        # 检查用户名和邮箱是否已存在
        existing_user = session.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            if existing_user.username == username:
                return jsonify({'error': '用户名已存在'}), 400
            else:
                return jsonify({'error': '邮箱已存在'}), 400

        # 创建新用户
        hashed_password = g.auth_manager.hash_password(password)
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_password,
            role='pending'  # 新用户默认为待审核状态
        )

        session.add(new_user)
        session.commit()

        return jsonify({'message': '注册成功，请等待管理员审核'}), 201

    except IntegrityError:
        session.rollback()
        return jsonify({'error': '用户名或邮箱已存在'}), 400
    except Exception as e:
        session.rollback()
        return jsonify({'error': f'注册失败: {str(e)}'}), 500
    finally:
        session.close()



