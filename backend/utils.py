"""
工具模块
包含文件处理、EXIF提取、缩略图生成等功能
"""

import os
import hashlib
import string
import random
import base64
from datetime import datetime
from PIL import Image as PILImage, ExifTags
from io import BytesIO
import exifread
from typing import Optional, Dict, Tuple

def generate_random_hash(length: int = 8) -> str:
    """生成随机哈希字符串

    Args:
        length: 哈希长度

    Returns:
        随机哈希字符串
    """
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def get_file_hash(file_path: str) -> str:
    """计算文件哈希值

    Args:
        file_path: 文件路径

    Returns:
        文件的MD5哈希值
    """
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def get_image_info(file_path: str) -> Dict:
    """获取图片基本信息

    Args:
        file_path: 图片文件路径

    Returns:
        图片信息字典
    """
    try:
        with PILImage.open(file_path) as img:
            width, height = img.size
            format_name = img.format or 'UNKNOWN'

        file_size = os.path.getsize(file_path)
        file_hash = get_file_hash(file_path)

        return {
            'width': width,
            'height': height,
            'format': format_name,
            'file_size': file_size,
            'file_hash': file_hash
        }
    except Exception as e:
        raise ValueError(f"无法读取图片信息: {e}")

def extract_exif_data(file_path: str) -> Dict:
    """提取EXIF信息

    Args:
        file_path: 图片文件路径

    Returns:
        EXIF信息字典
    """
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)

        exif_data = {}

        # 提取拍摄时间
        if 'EXIF DateTimeOriginal' in tags:
            date_str = str(tags['EXIF DateTimeOriginal'])
            try:
                # EXIF时间格式: 2023:12:25 12:30:45
                exif_data['taken_at'] = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
            except ValueError:
                pass

        # 提取GPS信息
        if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
            try:
                lat = tags['GPS GPSLatitude']
                lng = tags['GPS GPSLongitude']

                # 转换GPS坐标格式
                def convert_to_degrees(value):
                    d, m, s = value.values
                    return float(d) + float(m)/60 + float(s)/3600

                lat_deg = convert_to_degrees(lat)
                lng_deg = convert_to_degrees(lng)

                # 南纬和西经为负数
                if str(tags.get('GPS GPSLatitudeRef', '')) == 'S':
                    lat_deg = -lat_deg
                if str(tags.get('GPS GPSLongitudeRef', '')) == 'W':
                    lng_deg = -lng_deg

                exif_data['location_lat'] = lat_deg
                exif_data['location_lng'] = lng_deg
            except (AttributeError, ValueError, TypeError):
                pass

        return exif_data
    except Exception as e:
        print(f"提取EXIF信息失败: {e}")
        return {}

def generate_thumbnail(file_path: str, max_size: int = 300) -> str:
    """生成缩略图并返回base64编码

    Args:
        file_path: 原始图片路径
        max_size: 缩略图最大尺寸

    Returns:
        base64编码的缩略图
    """
    try:
        with PILImage.open(file_path) as img:
            # 保持宽高比
            img.thumbnail((max_size, max_size), PILImage.LANCZOS)

            # 转换为RGB模式（去除alpha通道）
            if img.mode in ('RGBA', 'LA', 'P'):
                background = PILImage.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # 保存为JPEG格式到内存
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            buffer.seek(0)

            # 编码为base64
            thumbnail_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/jpeg;base64,{thumbnail_data}"

    except Exception as e:
        raise ValueError(f"生成缩略图失败: {e}")

def save_uploaded_file(upload_file, save_path: str) -> str:
    """保存上传的文件

    Args:
        upload_file: 上传的文件对象
        save_path: 保存路径

    Returns:
        保存的文件路径
    """
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        # 保存文件
        with open(save_path, 'wb') as f:
            content = upload_file.read()
            f.write(content)

        return save_path
    except Exception as e:
        raise ValueError(f"保存文件失败: {e}")

def get_storage_path(base_path: str, filename: str, file_hash: str) -> str:
    """生成文件存储路径

    Args:
        base_path: 基础路径
        filename: 原始文件名
        file_hash: 文件哈希

    Returns:
        存储路径
    """
    now = datetime.now()
    year = now.strftime('%Y')
    month = now.strftime('%m')
    day = now.strftime('%d')

    # 获取文件扩展名
    _, ext = os.path.splitext(filename)
    ext = ext.lower()

    # 构建路径
    relative_path = f"{year}/{month}/{day}/{file_hash}{ext}"
    full_path = os.path.join(base_path, relative_path)

    return full_path

def get_backup_path(base_path: str, original_path: str) -> str:
    """生成备份文件路径

    Args:
        base_path: 备份基础路径
        original_path: 原始文件路径

    Returns:
        备份文件路径
    """
    now = datetime.now()
    timestamp = now.strftime('%Y%m%d_%H%M%S')

    # 解析原始路径
    filename = os.path.basename(original_path)
    name, ext = os.path.splitext(filename)

    # 构建备份路径
    year = now.strftime('%Y')
    month = now.strftime('%m')
    day = now.strftime('%d')

    relative_path = f"{year}/{month}/{day}/{name}_{timestamp}{ext}"
    full_path = os.path.join(base_path, relative_path)

    return full_path

def validate_image_file(filename: str, allowed_extensions: str) -> bool:
    """验证图片文件扩展名

    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名，用逗号分隔

    Returns:
        是否允许
    """
    if not allowed_extensions:
        return False

    # 获取文件扩展名
    _, ext = os.path.splitext(filename)
    ext = ext.lower().lstrip('.')

    # 检查是否在允许的扩展名列表中
    allowed = [e.strip().lower() for e in allowed_extensions.split(',')]
    return ext in allowed



