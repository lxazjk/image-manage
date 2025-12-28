"""
标签管理控制器
"""

from flask import request, g, jsonify
from sqlalchemy.exc import IntegrityError

from database import get_db, Tag, Image

def get_tags():
    """获取所有标签"""
    session = get_db()
    try:
        tags = session.query(Tag).order_by(Tag.name).all()
        tag_list = []

        for tag in tags:
            tag_list.append({
                'id': tag.id,
                'name': tag.name,
                'created_at': tag.created_at.isoformat() if tag.created_at else None
            })

        return jsonify(tag_list)

    finally:
        session.close()

def create_tag():
    """创建标签"""
    data = request.get_json()

    if not data or 'name' not in data:
        return jsonify({'error': '标签名称不能为空'}), 400

    name = data['name'].strip()
    if not name:
        return jsonify({'error': '标签名称不能为空'}), 400

    session = get_db()
    try:
        # 检查标签是否已存在
        existing_tag = session.query(Tag).filter_by(name=name).first()
        if existing_tag:
            return jsonify({
                'id': existing_tag.id,
                'name': existing_tag.name,
                'created_at': existing_tag.created_at.isoformat()
            })

        # 创建新标签
        tag = Tag(name=name)
        session.add(tag)
        session.commit()

        return jsonify({
            'id': tag.id,
            'name': tag.name,
            'created_at': tag.created_at.isoformat()
        }), 201

    except IntegrityError:
        session.rollback()
        return jsonify({'error': '标签已存在'}), 400
    except Exception as e:
        session.rollback()
        return jsonify({'error': f'创建失败: {str(e)}'}), 500
    finally:
        session.close()

def add_tags_to_image(image_id):
    """为图片添加标签"""
    data = request.get_json()

    if not data or 'tag_ids' not in data:
        return jsonify({'error': '标签ID列表不能为空'}), 400

    tag_ids = data['tag_ids']
    if not isinstance(tag_ids, list) or not tag_ids:
        return jsonify({'error': '标签ID必须是非空数组'}), 400

    session = get_db()
    try:
        # 检查图片是否存在
        image = session.query(Image).filter_by(id=image_id, is_deleted=False).first()
        if not image:
            return jsonify({'error': '图片不存在'}), 404

        # 检查权限
        if image.user_id != g.current_user.id and g.current_user.role != 'admin':
            return jsonify({'error': '权限不足'}), 403

        # 获取要添加的标签
        tags = session.query(Tag).filter(Tag.id.in_(tag_ids)).all()
        if len(tags) != len(tag_ids):
            return jsonify({'error': '部分标签不存在'}), 400

        # 添加标签（避免重复）
        for tag in tags:
            if tag not in image.tags:
                image.tags.append(tag)

        session.commit()

        return jsonify({'message': '标签添加成功'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'添加失败: {str(e)}'}), 500
    finally:
        session.close()

def remove_tags_from_image(image_id):
    """从图片移除标签"""
    data = request.get_json()

    if not data or 'tag_ids' not in data:
        return jsonify({'error': '标签ID列表不能为空'}), 400

    tag_ids = data['tag_ids']
    if not isinstance(tag_ids, list) or not tag_ids:
        return jsonify({'error': '标签ID必须是非空数组'}), 400

    session = get_db()
    try:
        # 检查图片是否存在
        image = session.query(Image).filter_by(id=image_id, is_deleted=False).first()
        if not image:
            return jsonify({'error': '图片不存在'}), 404

        # 检查权限
        if image.user_id != g.current_user.id and g.current_user.role != 'admin':
            return jsonify({'error': '权限不足'}), 403

        # 获取要移除的标签
        tags_to_remove = session.query(Tag).filter(Tag.id.in_(tag_ids)).all()

        # 移除标签
        for tag in tags_to_remove:
            if tag in image.tags:
                image.tags.remove(tag)

        session.commit()

        return jsonify({'message': '标签移除成功'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'移除失败: {str(e)}'}), 500
    finally:
        session.close()



