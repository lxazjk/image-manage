"""
MCP (Model Context Protocol) 控制器
提供大模型对话式图片检索功能
"""

import json
import logging
from datetime import datetime
from flask import request, g, jsonify
from sqlalchemy import or_, and_
from sqlalchemy.sql import text

from database import get_db, Image, Tag
from qwen_client import QwenVLClient
from config import Config

logger = logging.getLogger(__name__)

def get_mcp_tools():
    """获取MCP工具列表"""
    tools = [
        {
            "name": "search_images",
            "description": "根据自然语言描述搜索图片，支持多种搜索条件组合",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索查询，支持描述性语言，如'蓝天白云的风景照'、'昨天拍摄的照片'、'室内人像'等"
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "可选的标签过滤器"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回结果数量限制，默认10",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50
                    },
                    "sort_by": {
                        "type": "string",
                        "enum": ["relevance", "date", "size"],
                        "description": "排序方式：relevance(相关性)、date(时间)、size(文件大小)",
                        "default": "relevance"
                    }
                },
                "required": ["query"]
            }
        },
        {
            "name": "get_image_details",
            "description": "获取图片的详细信息，包括EXIF数据、AI描述等",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "image_id": {
                        "type": "integer",
                        "description": "图片ID"
                    }
                },
                "required": ["image_id"]
            }
        },
        {
            "name": "get_available_tags",
            "description": "获取系统中所有可用的标签",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        }
    ]

    return jsonify({
        "tools": tools
    })

def call_mcp_tool():
    """调用MCP工具"""
    data = request.get_json()
    if not data or 'name' not in data or 'arguments' not in data:
        return jsonify({'error': '无效的工具调用请求'}), 400

    tool_name = data['name']
    arguments = data['arguments']

    logger.info(f"MCP工具调用: {tool_name}, 参数: {arguments}")

    try:
        if tool_name == 'search_images':
            return search_images_tool(arguments)
        elif tool_name == 'get_image_details':
            return get_image_details_tool(arguments)
        elif tool_name == 'get_available_tags':
            return get_available_tags_tool(arguments)
        else:
            return jsonify({'error': f'未知工具: {tool_name}'}), 400

    except Exception as e:
        logger.error(f"MCP工具调用失败: {e}", exc_info=True)
        return jsonify({'error': f'工具调用失败: {str(e)}'}), 500

def search_images_tool(arguments):
    """图片搜索工具"""
    query = arguments.get('query', '')
    tags = arguments.get('tags', [])
    limit = min(arguments.get('limit', 10), 50)
    sort_by = arguments.get('sort_by', 'relevance')

    if not query and not tags:
        return jsonify({'error': '请提供搜索查询或标签'}), 400

    session = get_db()
    try:
        # 构建基础查询
        base_query = session.query(Image).filter_by(is_deleted=False)

        # 如果有用户登录，只搜索自己的图片
        if hasattr(g, 'current_user') and g.current_user:
            base_query = base_query.filter_by(user_id=g.current_user.id)

        # 标签筛选
        if tags:
            tag_filters = []
            for tag_name in tags:
                tag_filters.append(Image.tags.any(Tag.name == tag_name))
            base_query = base_query.filter(or_(*tag_filters))

        # 执行基础查询获取候选图片
        candidate_images = base_query.all()

        if not candidate_images:
            return jsonify({
                'result': {
                    'images': [],
                    'total': 0,
                    'query': query,
                    'message': '未找到匹配的图片'
                }
            })

        # 使用AI进行语义搜索
        scored_images = _semantic_search_images(query, candidate_images, limit)

        # 格式化结果
        results = []
        for image, score in scored_images:
            results.append({
                'id': image.id,
                'filename': image.filename,
                'score': score,  # 相关性得分
                'file_size': image.file_size,
                'width': image.width,
                'height': image.height,
                'taken_at': image.taken_at.isoformat() if image.taken_at else None,
                'location_lat': image.location_lat,
                'location_lng': image.location_lng,
                'thumbnail': image.thumbnail,
                'description': image.description,
                'tags': [{'id': tag.id, 'name': tag.name} for tag in image.tags],
                'created_at': image.created_at.isoformat()
            })

        return jsonify({
            'result': {
                'images': results,
                'total': len(results),
                'query': query,
                'tags_used': tags,
                'sort_by': sort_by
            }
        })

    finally:
        session.close()

def get_image_details_tool(arguments):
    """获取图片详情工具"""
    image_id = arguments.get('image_id')
    if not image_id:
        return jsonify({'error': '请提供图片ID'}), 400

    session = get_db()
    try:
        image = session.query(Image).filter_by(id=image_id, is_deleted=False).first()

        if not image:
            return jsonify({'error': '图片不存在'}), 404

        # 检查权限
        if hasattr(g, 'current_user') and g.current_user and image.user_id != g.current_user.id:
            return jsonify({'error': '权限不足'}), 403

        # 获取图片详情
        details = {
            'id': image.id,
            'filename': image.filename,
            'file_path': image.file_path,
            'file_size': image.file_size,
            'mime_type': image.mime_type,
            'width': image.width,
            'height': image.height,
            'taken_at': image.taken_at.isoformat() if image.taken_at else None,
            'location_lat': image.location_lat,
            'location_lng': image.location_lng,
            'location_name': image.location_name,
            'thumbnail': image.thumbnail,
            'description': image.description,
            'tags': [{'id': tag.id, 'name': tag.name} for tag in image.tags],
            'created_at': image.created_at.isoformat(),
            'updated_at': image.updated_at.isoformat() if image.updated_at else None
        }

        return jsonify({
            'result': details
        })

    finally:
        session.close()

def get_available_tags_tool(arguments):
    """获取可用标签工具"""
    session = get_db()
    try:
        from sqlalchemy import func
        from database import image_tags
        
        # 获取所有标签及其使用次数
        tags_query = session.query(
            Tag.id,
            Tag.name,
            func.count(image_tags.c.image_id).label('usage_count')
        ).outerjoin(
            image_tags, Tag.id == image_tags.c.tag_id
        ).group_by(Tag.id, Tag.name).order_by(func.count(image_tags.c.image_id).desc())

        tags = []
        for tag in tags_query:
            tags.append({
                'id': tag.id,
                'name': tag.name,
                'usage_count': tag.usage_count or 0
            })

        return jsonify({
            'result': {
                'tags': tags,
                'total': len(tags)
            }
        })

    finally:
        session.close()

def _semantic_search_images(query, images, limit):
    """使用AI进行语义搜索"""
    if not query:
        # 如果没有查询，直接返回按时间排序的结果
        return [(img, 1.0) for img in sorted(images, key=lambda x: x.created_at, reverse=True)][:limit]

    try:
        # 初始化AI客户端
        config = Config()
        qwen_client = QwenVLClient(config)

        if not qwen_client.is_enabled():
            # 如果AI不可用，使用简单的文本匹配
            return _simple_text_search(query, images, limit)

        # 为每个图片生成相关性得分
        scored_images = []

        for image in images:
            score = _calculate_image_relevance(query, image, qwen_client)
            scored_images.append((image, score))

        # 按得分排序
        scored_images.sort(key=lambda x: x[1], reverse=True)

        return scored_images[:limit]

    except Exception as e:
        logger.warning(f"AI语义搜索失败，使用简单搜索: {e}")
        return _simple_text_search(query, images, limit)

def _calculate_image_relevance(query, image, qwen_client):
    """计算图片与查询的相关性得分"""
    score = 0.0

    # 1. 标签匹配得分 (最高权重)
    query_lower = query.lower()
    for tag in image.tags:
        if tag.name.lower() in query_lower or query_lower in tag.name.lower():
            score += 3.0

    # 2. 文件名匹配得分
    if query_lower in image.filename.lower():
        score += 2.0

    # 3. AI描述匹配得分
    if image.description and query_lower in image.description.lower():
        score += 2.0

    # 4. 时间相关查询
    time_keywords = ['昨天', '今天', '最近', '最新', '昨天', '上周', '本周', '本月']
    if any(keyword in query for keyword in time_keywords):
        # 最近的图片给予更高得分
        days_diff = (image.created_at - datetime.now()).days
        if abs(days_diff) <= 7:  # 一周内的图片
            score += 1.5
        elif abs(days_diff) <= 30:  # 一个月内的图片
            score += 1.0

    # 5. 位置相关查询
    location_keywords = ['室内', '室外', '家里', '办公室', '公园', '海边', '山上']
    if any(keyword in query for keyword in location_keywords):
        score += 1.0

    # 6. 内容类型查询
    content_keywords = ['人像', '风景', '建筑', '食物', '动物', '车辆']
    if any(keyword in query for keyword in content_keywords):
        score += 1.0

    return score

def _simple_text_search(query, images, limit):
    """简单的文本搜索备用方案"""
    query_lower = query.lower()
    scored_images = []

    for image in images:
        score = 0.0

        # 文件名匹配
        if query_lower in image.filename.lower():
            score += 2.0

        # 标签匹配
        for tag in image.tags:
            if query_lower in tag.name.lower():
                score += 1.5

        # 描述匹配
        if image.description and query_lower in image.description.lower():
            score += 1.0

        scored_images.append((image, score))

    # 按得分排序，如果得分相同则按时间排序
    scored_images.sort(key=lambda x: (x[1], x[0].created_at), reverse=True)

    return scored_images[:limit]
