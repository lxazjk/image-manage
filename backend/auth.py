"""
认证和授权模块
"""

import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, g, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from config import Config
from database import get_db, User

class AuthManager:
    """认证管理器"""

    def __init__(self, config: Config):
        self.config = config
        self.secret_key = config.get('jwt.secret_key')
        self.algorithm = config.get('jwt.algorithm', 'HS256')
        self.expiration_hours = config.get('jwt.expiration_hours', 24)

    def hash_password(self, password: str) -> str:
        """哈希密码"""
        return generate_password_hash(password)

    def verify_password(self, password: str, hashed: str) -> bool:
        """验证密码"""
        return check_password_hash(hashed, password)

    def generate_token(self, user_id: int, username: str, role: str) -> str:
        """生成JWT令牌"""
        payload = {
            'user_id': user_id,
            'username': username,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=self.expiration_hours),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str) -> dict:
        """验证JWT令牌"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("令牌已过期")
        except jwt.InvalidTokenError:
            raise ValueError("无效令牌")

    def get_current_user(self) -> User:
        """获取当前用户"""
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        try:
            payload = self.verify_token(token)
            user_id = payload['user_id']

            session = get_db()
            user = session.query(User).get(user_id)
            session.close()

            return user
        except Exception:
            return None

def require_auth(f):
    """需要认证的装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_manager = g.auth_manager
        user = auth_manager.get_current_user()

        if not user:
            return jsonify({'error': '未认证'}), 401

        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def require_role(role: str):
    """需要特定角色的装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_manager = g.auth_manager
            user = auth_manager.get_current_user()

            if not user:
                return jsonify({'error': '未认证'}), 401

            if user.role != role and user.role != 'admin':
                return jsonify({'error': '权限不足'}), 403

            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin(f):
    """需要管理员权限的装饰器"""
    return require_role('admin')(f)

def init_auth_manager(app, config: Config):
    """初始化认证管理器"""
    auth_manager = AuthManager(config)

    @app.before_request
    def setup_auth():
        g.auth_manager = auth_manager

        # 验证token并设置当前用户
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = auth_manager.verify_token(token)
                user_id = payload['user_id']

                session = get_db()
                try:
                    user = session.query(User).get(user_id)
                    g.current_user = user
                finally:
                    session.close()
            except Exception:
                g.current_user = None
        else:
            g.current_user = None

    return auth_manager
