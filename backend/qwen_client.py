"""
Qwen VL API客户端
用于调用通义千问VL模型进行图片分析和标签生成
"""

import base64
import json
import time
from typing import List, Optional, Dict, Any
import requests
from PIL import Image
import io

from .config import Config

class QwenVLClient:
    """Qwen VL API客户端"""

    def __init__(self, config: Config):
        """初始化客户端

        Args:
            config: 配置对象
        """
        self.config = config
        self.api_key = config.get('qwen.api_key', '')
        self.base_url = config.get('qwen.base_url', 'https://dashscope.aliyuncs.com/api/v1/')
        self.model = config.get('qwen.model', 'qwen-vl-max')
        self.max_retries = config.get('qwen.max_retries', 3)
        self.timeout = config.get('qwen.timeout', 30)
        self.max_tags = config.get('qwen.max_tags', 5)
        self.enabled = config.get('qwen.enabled', False)

    def is_enabled(self) -> bool:
        """检查是否启用"""
        return self.enabled and bool(self.api_key)

    def analyze_image(self, image_path: str) -> List[str]:
        """分析图片并生成标签

        Args:
            image_path: 图片文件路径

        Returns:
            标签列表

        Raises:
            Exception: API调用失败时抛出异常
        """
        if not self.is_enabled():
            return []

        try:
            # 将图片转换为base64
            image_base64 = self._image_to_base64(image_path)

            # 构建请求数据
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": "请分析这张图片的内容，用中文描述图片的主要内容，并生成不超过5个相关的标签。标签应该简洁、有意义，用逗号分隔。请只返回标签，不要其他内容。"
                        }
                    ]
                }
            ]

            data = {
                "model": self.model,
                "messages": messages,
                "max_tokens": 300
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            # 发送请求（带重试）
            for attempt in range(self.max_retries):
                try:
                    print(f"调用Qwen VL API (尝试 {attempt + 1}/{self.max_retries})...")
                    response = requests.post(
                        f"{self.base_url}services/aigc/multimodal/generation/generation",
                        json=data,
                        headers=headers,
                        timeout=self.timeout
                    )

                    if response.status_code == 200:
                        result = response.json()
                        return self._parse_response(result)
                    else:
                        print(f"API调用失败 (HTTP {response.status_code}): {response.text}")
                        if attempt == self.max_retries - 1:
                            raise Exception(f"Qwen API调用失败: HTTP {response.status_code}")

                except requests.exceptions.Timeout:
                    print(f"请求超时 (尝试 {attempt + 1}/{self.max_retries})")
                    if attempt == self.max_retries - 1:
                        raise Exception("Qwen API请求超时")

                except requests.exceptions.RequestException as e:
                    print(f"网络错误 (尝试 {attempt + 1}/{self.max_retries}): {e}")
                    if attempt == self.max_retries - 1:
                        raise Exception(f"Qwen API网络错误: {e}")

                # 等待重试
                if attempt < self.max_retries - 1:
                    time.sleep(1)

            return []

        except Exception as e:
            print(f"Qwen API调用异常: {e}")
            raise Exception(f"图片分析失败: {e}")

    def _image_to_base64(self, image_path: str) -> str:
        """将图片转换为base64编码

        Args:
            image_path: 图片路径

        Returns:
            base64编码的字符串
        """
        try:
            with Image.open(image_path) as img:
                # 确保图片格式正确
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # 压缩图片大小（如果太大）
                max_size = (1024, 1024)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)

                # 转换为base64
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85)
                buffer.seek(0)

                image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                return image_base64

        except Exception as e:
            raise Exception(f"图片处理失败: {e}")

    def _parse_response(self, response_data: Dict[str, Any]) -> List[str]:
        """解析API响应，提取标签

        Args:
            response_data: API响应数据

        Returns:
            标签列表
        """
        try:
            # 检查响应格式
            if 'output' not in response_data:
                print(f"API响应格式错误: {response_data}")
                return []

            output = response_data['output']
            if not isinstance(output, dict) or 'text' not in output:
                print(f"API输出格式错误: {output}")
                return []

            text = output['text'].strip()
            print(f"Qwen API响应: {text}")

            # 解析标签（假设响应是逗号分隔的标签）
            if not text or text.startswith('抱歉') or text.startswith('无法'):
                print("API返回了无法分析的内容")
                return []

            # 清理和分割标签
            tags = [tag.strip() for tag in text.split('，') if tag.strip()]
            tags = [tag.strip('，。；：') for tag in tags]  # 清理标点符号

            # 限制标签数量
            tags = tags[:self.max_tags]

            # 过滤无效标签
            valid_tags = []
            for tag in tags:
                if len(tag) >= 2 and len(tag) <= 20:  # 标签长度合理
                    valid_tags.append(tag)

            print(f"生成的标签: {valid_tags}")
            return valid_tags

        except Exception as e:
            print(f"解析API响应失败: {e}")
            return []

    def test_connection(self) -> bool:
        """测试API连接

        Returns:
            是否连接成功
        """
        if not self.is_enabled():
            return False

        try:
            # 发送一个简单的测试请求
            data = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "你好"
                            }
                        ]
                    }
                ],
                "max_tokens": 10
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            response = requests.post(
                f"{self.base_url}services/aigc/text-generation/generation",
                json=data,
                headers=headers,
                timeout=10
            )

            return response.status_code == 200

        except Exception as e:
            print(f"API连接测试失败: {e}")
            return False



