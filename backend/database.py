"""
数据库模型和连接管理
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, scoped_session
from sqlalchemy.pool import StaticPool
from typing import Optional, List

from config import Config

Base = declarative_base()

# 用户和图片的多对多关系表（用于自定义标签）
image_tags = Table(
    'image_tags',
    Base.metadata,
    Column('image_id', Integer, ForeignKey('images.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

class User(Base):
    """用户模型"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default='pending', nullable=False)  # pending, user, admin
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联的图片
    images = relationship('Image', back_populates='user')

class Tag(Base):
    """标签模型"""
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关联的图片
    images = relationship('Image', secondary=image_tags, back_populates='tags')

class Image(Base):
    """图片模型"""
    __tablename__ = 'images'

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)  # 原始文件名
    file_path = Column(String(500), nullable=False)  # 文件存储路径
    file_hash = Column(String(8), nullable=False)  # 8位随机哈希
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）
    mime_type = Column(String(50), nullable=False)  # MIME类型

    # EXIF信息
    width = Column(Integer)
    height = Column(Integer)
    taken_at = Column(DateTime)  # 拍摄时间
    location_lat = Column(Float)
    location_lng = Column(Float)
    location_name = Column(String(255))

    # 缩略图（base64编码）
    thumbnail = Column(Text)

    # AI生成的描述
    description = Column(Text)  # AI生成的图像描述/概述

    # 状态
    is_deleted = Column(Boolean, default=False)

    # 关联
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    user = relationship('User', back_populates='images')

    # 自定义标签
    tags = relationship('Tag', secondary=image_tags, back_populates='images')

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ImageEdit(Base):
    """图片编辑历史模型"""
    __tablename__ = 'image_edits'

    id = Column(Integer, primary_key=True)
    image_id = Column(Integer, ForeignKey('images.id'), nullable=False)
    operation = Column(String(50), nullable=False)  # edit, delete
    backup_path = Column(String(500))  # 备份文件路径
    edit_params = Column(Text)  # 编辑参数（JSON格式）
    created_at = Column(DateTime, default=datetime.utcnow)

# 全局变量
_engine = None
_session_factory = None

def init_db(config: Config):
    """初始化数据库连接"""
    global _engine, _session_factory

    db_config = config.get('database', {})

    if db_config.get('type') == 'mysql':
        # MySQL连接
        mysql_config = db_config.get('mysql', {})
        database_url = f"mysql+pymysql://{mysql_config['username']}:{mysql_config['password']}@{mysql_config['host']}:{mysql_config['port']}/{mysql_config['database']}"
    else:
        # SQLite连接
        sqlite_config = db_config.get('sqlite', {})
        db_path = sqlite_config.get('path', './data/image_manager.db')
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        database_url = f"sqlite:///{db_path}"

    # 创建引擎
    if db_config.get('type') == 'sqlite':
        _engine = create_engine(
            database_url,
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
            echo=False
        )
    else:
        _engine = create_engine(database_url, echo=False)

    # 创建会话工厂
    _session_factory = sessionmaker(bind=_engine)

    # 创建所有表
    Base.metadata.create_all(_engine)

    # 创建默认管理员账户
    create_default_admin()

def get_db():
    """获取数据库会话"""
    global _session_factory
    if _session_factory is None:
        raise RuntimeError("数据库未初始化，请先调用 init_db()")
    return scoped_session(_session_factory)

def create_default_admin():
    """创建默认管理员账户"""
    session = get_db()
    try:
        # 检查是否已存在管理员
        admin = session.query(User).filter_by(username='admin').first()
        if admin is None:
            from werkzeug.security import generate_password_hash
            admin = User(
                username='admin',
                email='admin@example.com',
                password_hash=generate_password_hash('123456'),
                role='admin'
            )
            session.add(admin)
            session.commit()
    except Exception as e:
        session.rollback()
        print(f"创建默认管理员失败: {e}")
    finally:
        session.close()



