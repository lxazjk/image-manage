"""
配置管理模块
"""

import yaml
import os
from typing import Any, Dict

class Config:
    """配置管理类"""

    def __init__(self, config_file: str = '../config.yaml'):
        """初始化配置

        Args:
            config_file: 配置文件路径
        """
        self.config_file = config_file
        self._config = {}
        self.load_config()

    def load_config(self):
        """加载配置文件"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self._config = yaml.safe_load(f) or {}
        except FileNotFoundError:
            print(f"配置文件 {self.config_file} 不存在，使用默认配置")
            self._config = self.get_default_config()
        except Exception as e:
            print(f"加载配置文件失败: {e}")
            self._config = self.get_default_config()

    def get_default_config(self) -> Dict[str, Any]:
        """获取默认配置"""
        return {
            'database': {
                'type': 'sqlite',
                'sqlite': {'path': './data/image_manager.db'},
                'mysql': {
                    'host': 'localhost',
                    'port': 3306,
                    'database': 'image_manager',
                    'username': 'root',
                    'password': ''
                }
            },
            'storage': {
                'base_path': './uploads',
                'backup_path': './backups',
                'allowed_extensions': 'jpg,png,gif,jpeg',
                'thumbnail_size': 300
            },
            'pagination': {
                'page_size': 20
            },
            'site': {
                'name': '图片管理系统',
                'favicon': '/favicon.ico'
            },
            'jwt': {
                'secret_key': 'default-secret-key-change-in-production',
                'algorithm': 'HS256',
                'expiration_hours': 24
            }
        }

    def get(self, key: str, default: Any = None) -> Any:
        """获取配置值

        Args:
            key: 配置键，支持点号分隔的嵌套键，如 'database.type'
            default: 默认值

        Returns:
            配置值
        """
        keys = key.split('.')
        value = self._config

        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default

    def set(self, key: str, value: Any):
        """设置配置值

        Args:
            key: 配置键
            value: 配置值
        """
        keys = key.split('.')
        config = self._config

        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]

        config[keys[-1]] = value

    def save(self):
        """保存配置到文件"""
        try:
            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
            with open(self.config_file, 'w', encoding='utf-8') as f:
                yaml.dump(self._config, f, default_flow_style=False, allow_unicode=True)
        except Exception as e:
            print(f"保存配置文件失败: {e}")

    def __getitem__(self, key: str) -> Any:
        """通过[]访问配置"""
        return self.get(key)

    def __setitem__(self, key: str, value: Any):
        """通过[]设置配置"""
        self.set(key, value)



