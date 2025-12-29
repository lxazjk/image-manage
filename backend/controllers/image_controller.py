"""
图片管理控制器
"""

import os
import json
import logging
from flask import request, g, jsonify
from PIL import Image as PILImage
from werkzeug.utils import secure_filename

from database import get_db, Image, Tag, ImageEdit
from utils import (
    generate_random_hash, get_image_info, extract_exif_data,
    generate_thumbnail, save_uploaded_file, get_storage_path,
    get_backup_path, validate_image_file
)
from config import Config
from qwen_client import QwenVLClient

logger = logging.getLogger(__name__)

def upload_images():
    """上传图片"""
    logger.info("[上传] 收到上传请求")
    print("[DEBUG] 收到上传请求")
    
    if 'files' not in request.files:
        logger.warning("[上传] 请求中没有files字段")
        return jsonify({'error': '没有上传文件'}), 400

    files = request.files.getlist('files')
    logger.info(f"[上传] 文件数量: {len(files)}")
    print(f"[DEBUG] 文件数量: {len(files)}")
    
    if not files or files[0].filename == '':
        logger.warning("[上传] 文件列表为空")
        return jsonify({'error': '没有选择文件'}), 400

    # 确保使用正确的配置文件路径
    import os
    config_file = '/app/config.yaml' if os.path.exists('/app/config.yaml') else 'config.yaml'
    config = Config(config_file)
    logger.info(f"[上传] 使用配置文件: {config_file}")
    logger.info(f"[上传] Qwen配置 - enabled: {config.get('qwen.enabled', False)}")
    storage_config = config.get('storage', {})
    base_path = storage_config.get('base_path', './uploads')
    allowed_extensions = storage_config.get('allowed_extensions', 'jpg,png,gif,jpeg')

    session = get_db()
    uploaded = []
    failed = []

    try:
        for file in files:
            if file.filename == '':
                continue

            filename = secure_filename(file.filename)

            # 验证文件类型
            if not validate_image_file(filename, allowed_extensions):
                failed.append({
                    'filename': filename,
                    'error': f'不支持的文件类型。只允许: {allowed_extensions}'
                })
                continue

            try:
                # 生成随机哈希和存储路径
                file_hash = generate_random_hash()
                storage_path = get_storage_path(base_path, filename, file_hash)

                # 保存文件
                save_uploaded_file(file, storage_path)

                # 获取图片信息
                image_info = get_image_info(storage_path)
                exif_data = extract_exif_data(storage_path)

                # 生成缩略图
                thumbnail = generate_thumbnail(storage_path, config.get('storage.thumbnail_size', 300))

                # 创建数据库记录
                image = Image(
                    filename=filename,
                    file_path=storage_path,
                    file_hash=file_hash,
                    file_size=image_info['file_size'],
                    mime_type=f"image/{image_info['format'].lower()}",
                    width=image_info['width'],
                    height=image_info['height'],
                    taken_at=exif_data.get('taken_at'),
                    location_lat=exif_data.get('location_lat'),
                    location_lng=exif_data.get('location_lng'),
                    thumbnail=thumbnail,
                    user_id=g.current_user.id
                )

                session.add(image)
                session.flush()  # 获取ID

                # 尝试生成AI标签和描述
                ai_tags = []
                ai_description = None
                ai_tag_error = None
                ai_description_error = None
                
                try:
                    logger.info(f"[AI分析] 开始处理图片: {filename}")
                    qwen_client = QwenVLClient(config)
                    logger.info(f"[AI分析] Qwen客户端初始化完成, enabled={qwen_client.is_enabled()}")
                    
                    if qwen_client.is_enabled():
                        # 生成AI标签
                        try:
                            logger.info(f"[AI标签] 为图片 {filename} 生成AI标签...")
                            print(f"[DEBUG] 开始调用Qwen API分析图片: {filename}")
                            ai_tags = qwen_client.analyze_image(storage_path)
                            logger.info(f"[AI标签] 成功生成了 {len(ai_tags)} 个AI标签: {ai_tags}")
                            print(f"[DEBUG] AI标签生成成功: {ai_tags}")

                            # 保存AI生成的标签
                            for tag_name in ai_tags:
                                try:
                                    # 检查标签是否已存在
                                    tag = session.query(Tag).filter_by(name=tag_name).first()
                                    if not tag:
                                        tag = Tag(name=tag_name)
                                        session.add(tag)
                                        session.flush()

                                    # 关联标签和图片
                                    if tag not in image.tags:
                                        image.tags.append(tag)
                                        logger.info(f"为图片 {filename} 添加标签: {tag_name}")
                                except Exception as tag_error:
                                    logger.error(f"保存标签 '{tag_name}' 失败: {tag_error}")
                                    # 继续处理其他标签
                        except ValueError as e:
                            ai_tag_error = f"配置错误: {str(e)}"
                            logger.warning(f"AI标签生成配置错误: {e}")
                        except Exception as e:
                            ai_tag_error = f"生成失败: {str(e)}"
                            logger.error(f"AI标签生成失败: {e}", exc_info=True)
                        
                        # 生成AI描述
                        try:
                            logger.info(f"[AI描述] 为图片 {filename} 生成描述...")
                            print(f"[DEBUG] 开始调用Qwen API生成描述: {filename}")
                            ai_description = qwen_client.generate_description(storage_path)
                            if ai_description:
                                image.description = ai_description
                                logger.info(f"[AI描述] 成功生成描述: {ai_description[:50]}...")
                                print(f"[DEBUG] AI描述生成成功: {ai_description[:50]}...")
                            else:
                                logger.warning(f"[AI描述] 未生成描述")
                        except ValueError as e:
                            ai_description_error = f"配置错误: {str(e)}"
                            logger.warning(f"AI描述生成配置错误: {e}")
                        except Exception as e:
                            ai_description_error = f"生成失败: {str(e)}"
                            logger.error(f"AI描述生成失败: {e}", exc_info=True)
                    else:
                        logger.info(f"Qwen功能未启用，跳过图片 {filename} 的AI分析")
                except Exception as e:
                    logger.error(f"AI分析过程异常: {e}", exc_info=True)
                    # 不影响图片上传，只记录警告

                uploaded.append({
                    'id': image.id,
                    'filename': filename,
                    'file_path': storage_path,
                    'file_size': image_info['file_size'],
                    'width': image_info['width'],
                    'height': image_info['height'],
                    'taken_at': image.taken_at.isoformat() if image.taken_at else None,
                    'ai_tags': ai_tags,  # 添加AI生成的标签信息
                    'ai_tag_error': ai_tag_error,  # 添加标签错误信息（如果有）
                    'ai_description': ai_description,  # 添加AI生成的描述
                    'ai_description_error': ai_description_error,  # 添加描述错误信息（如果有）
                    'thumbnail': thumbnail,
                    'created_at': image.created_at.isoformat()
                })

            except Exception as e:
                failed.append({
                    'filename': filename,
                    'error': str(e)
                })

        session.commit()

        return jsonify({
            'uploaded': uploaded,
            'failed': failed
        }), 201

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'上传失败: {str(e)}'}), 500
    finally:
        session.close()

def get_images():
    """获取图片列表"""
    page = int(request.args.get('page', 1))
    tag_filter = request.args.get('tag')
    search = request.args.get('search')

    config = Config()
    page_size = config.get('pagination.page_size', 20)

    session = get_db()
    try:
        query = session.query(Image).filter_by(is_deleted=False)

        # 按标签筛选
        if tag_filter:
            query = query.join(Image.tags).filter(Tag.name == tag_filter)

        # 搜索功能（可以扩展）
        if search:
            # 这里可以添加更多的搜索逻辑，比如按文件名搜索等
            query = query.filter(Image.filename.contains(search))

        # 按创建时间倒序排列
        query = query.order_by(Image.created_at.desc())

        # 分页
        total = query.count()
        images = query.offset((page - 1) * page_size).limit(page_size).all()

        image_list = []
        for image in images:
            tags = [{'id': tag.id, 'name': tag.name} for tag in image.tags]
            image_list.append({
                'id': image.id,
                'filename': image.filename,
                'file_size': image.file_size,
                'width': image.width,
                'height': image.height,
                'taken_at': image.taken_at.isoformat() if image.taken_at else None,
                'thumbnail': image.thumbnail,
                'description': image.description,  # AI生成的描述
                'tags': tags,
                'created_at': image.created_at.isoformat()
            })

        return jsonify({
            'images': image_list,
            'total': total,
            'page': page,
            'pages': (total + page_size - 1) // page_size
        })

    finally:
        session.close()

def get_image_detail(image_id):
    """获取图片详情"""
    session = get_db()
    try:
        image = session.query(Image).filter_by(id=image_id, is_deleted=False).first()

        if not image:
            return jsonify({'error': '图片不存在'}), 404

        # 检查权限（只能查看自己的图片或管理员查看所有）
        if image.user_id != g.current_user.id and g.current_user.role != 'admin':
            return jsonify({'error': '权限不足'}), 403

        tags = [{'id': tag.id, 'name': tag.name} for tag in image.tags]

        return jsonify({
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
            'description': image.description,  # AI生成的描述
            'tags': tags,
            'created_at': image.created_at.isoformat(),
            'updated_at': image.updated_at.isoformat() if image.updated_at else None
        })

    finally:
        session.close()

def edit_image(image_id):
    """编辑图片"""
    data = request.get_json()
    if not data or 'operation' not in data:
        return jsonify({'error': '操作类型不能为空'}), 400

    operation = data['operation']
    params = data.get('params', {})

    session = get_db()
    try:
        image = session.query(Image).filter_by(id=image_id, is_deleted=False).first()

        if not image:
            return jsonify({'error': '图片不存在'}), 404

        # 检查权限
        if image.user_id != g.current_user.id and g.current_user.role != 'admin':
            return jsonify({'error': '权限不足'}), 403

        config = Config()
        backup_base_path = config.get('storage.backup_path', './backups')

        # 备份原始文件
        backup_path = get_backup_path(backup_base_path, image.file_path)
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)

        # 复制文件到备份位置
        with open(image.file_path, 'rb') as src, open(backup_path, 'wb') as dst:
            dst.write(src.read())

        # 执行编辑操作
        if operation == 'crop':
            success = _crop_image(image.file_path, params)
        elif operation == 'adjust_color':
            success = _adjust_color(image.file_path, params)
        else:
            return jsonify({'error': '不支持的操作类型'}), 400

        if not success:
            return jsonify({'error': '编辑失败'}), 500

        # 重新生成缩略图
        thumbnail = generate_thumbnail(image.file_path, config.get('storage.thumbnail_size', 300))
        image.thumbnail = thumbnail

        # 记录编辑历史
        edit_record = ImageEdit(
            image_id=image.id,
            operation=operation,
            backup_path=backup_path,
            edit_params=json.dumps(params)
        )
        session.add(edit_record)

        session.commit()

        return jsonify({'message': '编辑成功'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'编辑失败: {str(e)}'}), 500
    finally:
        session.close()

def _crop_image(file_path, params):
    """裁剪图片"""
    try:
        crop_top = params.get('crop_top', 0) / 100.0
        crop_bottom = params.get('crop_bottom', 0) / 100.0
        crop_left = params.get('crop_left', 0) / 100.0
        crop_right = params.get('crop_right', 0) / 100.0

        with PILImage.open(file_path) as img:
            width, height = img.size

            left = int(width * crop_left)
            top = int(height * crop_top)
            right = int(width * (1 - crop_right))
            bottom = int(height * (1 - crop_bottom))

            cropped_img = img.crop((left, top, right, bottom))
            cropped_img.save(file_path)

        return True
    except Exception as e:
        print(f"裁剪失败: {e}")
        return False

def _adjust_color(file_path, params):
    """调整图片色彩"""
    try:
        brightness = params.get('brightness', 0)
        contrast = params.get('contrast', 0)

        with PILImage.open(file_path) as img:
            # 应用亮度和对比度调整
            if brightness != 0 or contrast != 0:
                # 转换为RGB模式
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # 这里可以实现更复杂的色彩调整
                # 简化版本：只调整亮度
                enhancer = PILImage.ImageEnhance.Brightness(img)
                img = enhancer.enhance(1 + brightness / 100.0)

                enhancer = PILImage.ImageEnhance.Contrast(img)
                img = enhancer.enhance(1 + contrast / 100.0)

                img.save(file_path)

        return True
    except Exception as e:
        print(f"色彩调整失败: {e}")
        return False

def delete_image(image_id):
    """删除图片（软删除）"""
    session = get_db()
    try:
        image = session.query(Image).filter_by(id=image_id, is_deleted=False).first()

        if not image:
            return jsonify({'error': '图片不存在'}), 404

        # 检查权限
        if image.user_id != g.current_user.id and g.current_user.role != 'admin':
            return jsonify({'error': '权限不足'}), 403

        image.is_deleted = True

        # 记录删除操作
        edit_record = ImageEdit(
            image_id=image.id,
            operation='delete',
            backup_path=None,
            edit_params=json.dumps({'deleted': True})
        )
        session.add(edit_record)

        session.commit()

        return jsonify({'message': '删除成功'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'删除失败: {str(e)}'}), 500
    finally:
        session.close()

def restore_image(image_id):
    """恢复图片"""
    session = get_db()
    try:
        image = session.query(Image).filter_by(id=image_id, is_deleted=True).first()

        if not image:
            return jsonify({'error': '图片不存在或未被删除'}), 404

        # 检查权限
        if image.user_id != g.current_user.id and g.current_user.role != 'admin':
            return jsonify({'error': '权限不足'}), 403

        image.is_deleted = False

        # 记录恢复操作
        edit_record = ImageEdit(
            image_id=image.id,
            operation='restore',
            backup_path=None,
            edit_params=json.dumps({'restored': True})
        )
        session.add(edit_record)

        session.commit()

        return jsonify({'message': '恢复成功'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'恢复失败: {str(e)}'}), 500
    finally:
        session.close()
