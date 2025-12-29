#!/usr/bin/env python3
"""
修复缩略图脚本
"""

import sys
import os

# 添加backend目录到Python路径
backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_dir)

from database import init_db, get_db, Image
from utils import generate_thumbnail
from config import Config

def fix_thumbnails():
    """修复缩略图"""
    # 初始化数据库
    config = Config()
    init_db(config)

    session = get_db()
    try:
        images = session.query(Image).filter_by(is_deleted=False).all()
        print(f'Found {len(images)} images to process')

        for image in images:
            if os.path.exists(image.file_path):
                try:
                    print(f'Processing {image.filename}...')
                    thumbnail = generate_thumbnail(image.file_path, 300)
                    if thumbnail:
                        image.thumbnail = thumbnail
                        print(f'✓ Generated thumbnail for {image.filename}')
                    else:
                        print(f'✗ Failed to generate thumbnail for {image.filename}')
                except Exception as e:
                    print(f'✗ Error generating thumbnail for {image.filename}: {e}')
            else:
                print(f'✗ File not found: {image.file_path}')

        session.commit()
        print('Thumbnail regeneration completed')
    except Exception as e:
        print(f'Error: {e}')
        session.rollback()
    finally:
        session.close()

if __name__ == '__main__':
    fix_thumbnails()
