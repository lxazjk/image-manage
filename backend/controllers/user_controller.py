"""
用户管理控制器
"""

from flask import request, g, jsonify

from ..database import get_db, User

def get_users():
    """获取用户列表（管理员功能）"""
    if g.current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    session = get_db()
    try:
        users = session.query(User).all()
        user_list = []

        for user in users:
            user_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'updated_at': user.updated_at.isoformat() if user.updated_at else None
            })

        return jsonify(user_list)

    finally:
        session.close()

def approve_user(user_id):
    """审批用户注册（管理员功能）"""
    if g.current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    session = get_db()
    try:
        user = session.query(User).get(user_id)

        if not user:
            return jsonify({'error': '用户不存在'}), 404

        if user.role != 'pending':
            return jsonify({'error': '用户状态无需审批'}), 400

        user.role = 'user'
        session.commit()

        return jsonify({'message': '用户审批成功'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'审批失败: {str(e)}'}), 500
    finally:
        session.close()

def update_user_role(user_id):
    """修改用户角色（管理员功能）"""
    if g.current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    data = request.get_json()
    if not data or 'role' not in data:
        return jsonify({'error': '角色不能为空'}), 400

    role = data['role']
    if role not in ['user', 'admin']:
        return jsonify({'error': '无效的角色'}), 400

    session = get_db()
    try:
        user = session.query(User).get(user_id)

        if not user:
            return jsonify({'error': '用户不存在'}), 404

        # 不允许修改自己的角色
        if user.id == g.current_user.id:
            return jsonify({'error': '不能修改自己的角色'}), 400

        user.role = role
        session.commit()

        return jsonify({'message': '角色修改成功'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'修改失败: {str(e)}'}), 500
    finally:
        session.close()



