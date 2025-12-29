"""
Qwen3 VL API客户端
用于调用通义千问VL模型进行图片分析和标签生成
"""

import base64
import json
import time
from typing import List, Optional, Dict, Any
import requests
from PIL import Image
import io
import logging

from config import Config

# 配置日志
logger = logging.getLogger(__name__)

class QwenVLClient:
    """Qwen3 VL API客户端"""

    def __init__(self, config: Config):
        """初始化客户端

        Args:
            config: 配置对象
        """
        self.config = config
        self.api_key = config.get('qwen.api_key', '')
        self.base_url = config.get('qwen.base_url', 'https://dashscope.aliyuncs.com/api/v1/').rstrip('/')
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
            标签列表，如果失败返回空列表

        Raises:
            Exception: API调用失败时抛出异常
        """
        if not self.is_enabled():
            logger.info("Qwen功能未启用，跳过图片分析")
            return []

        if not self.api_key:
            logger.warning("Qwen API Key未配置")
            raise ValueError("Qwen API Key未配置，无法进行图片分析")

        try:
            # 将图片转换为base64
            image_base64 = self._image_to_base64(image_path)
            logger.info(f"开始分析图片: {image_path}")

            # 判断是否使用兼容模式（OpenAI兼容格式）
            is_compatible_mode = 'compatible-mode' in self.base_url.lower()
            
            if is_compatible_mode:
                # 兼容模式使用 OpenAI 兼容格式
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
                                "text": "请分析这张图片的内容，用中文描述图片的主要内容，并生成不超过5个相关的标签。标签应该简洁、有意义，用中文逗号分隔。请只返回标签，不要其他内容。例如：风景,自然,山水"
                            }
                        ]
                    }
                ]
                
                data = {
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": 200,
                    "temperature": 0.7
                }
            else:
                # 标准 DashScope API 格式
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {
                                "image": f"data:image/jpeg;base64,{image_base64}"
                            },
                            {
                                "text": "请分析这张图片的内容，用中文描述图片的主要内容，并生成不超过5个相关的标签。标签应该简洁、有意义，用中文逗号分隔。请只返回标签，不要其他内容。例如：风景,自然,山水"
                            }
                        ]
                    }
                ]

                data = {
                    "model": self.model,
                    "input": {
                        "messages": messages
                    },
                    "parameters": {
                        "max_tokens": 200,
                        "temperature": 0.7
                    }
                }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # 兼容模式不需要 X-DashScope-SSE 头
            if not is_compatible_mode:
                headers["X-DashScope-SSE"] = "disable"

            # 构建API URL（使用之前判断的is_compatible_mode）
            logger.info(f"构建URL: is_compatible_mode={is_compatible_mode}, base_url={self.base_url}, model={self.model}")
            if is_compatible_mode:
                # 兼容模式使用 OpenAI 兼容端点
                api_url = f"{self.base_url.rstrip('/')}/chat/completions"
                logger.info(f"使用兼容模式端点: {api_url}")
            elif 'vl' in self.model.lower():
                # 标准模式：视觉语言模型使用 multimodal 端点
                api_url = f"{self.base_url.rstrip('/')}/services/aigc/multimodal/generation/generation"
                logger.info(f"使用标准模式端点: {api_url}")
            else:
                # 标准模式：文本模型使用 text-generation 端点
                api_url = f"{self.base_url.rstrip('/')}/services/aigc/text-generation/generation"
                logger.info(f"使用文本生成端点: {api_url}")

            # 发送请求（带重试）
            last_error = None
            for attempt in range(self.max_retries):
                try:
                    logger.info(f"调用Qwen3 VL API (尝试 {attempt + 1}/{self.max_retries})...")
                    
                    response = requests.post(
                        api_url,
                        json=data,
                        headers=headers,
                        timeout=self.timeout
                    )

                    # 检查响应状态
                    if response.status_code == 200:
                        result = response.json()
                        tags = self._parse_response(result)
                        logger.info(f"成功生成 {len(tags)} 个标签: {tags}")
                        return tags
                    elif response.status_code == 401:
                        error_msg = "API Key无效或已过期"
                        logger.error(f"{error_msg} (HTTP {response.status_code})")
                        raise ValueError(error_msg)
                    elif response.status_code == 400:
                        error_data = response.json() if response.text else {}
                        error_msg = error_data.get('message', f"请求参数错误 (HTTP {response.status_code})")
                        logger.error(f"{error_msg}: {response.text}")
                        raise ValueError(error_msg)
                    elif response.status_code == 429:
                        error_msg = "API调用频率超限，请稍后重试"
                        logger.warning(f"{error_msg} (HTTP {response.status_code})")
                        if attempt == self.max_retries - 1:
                            raise Exception(error_msg)
                        # 等待更长时间后重试
                        time.sleep(2 ** attempt)
                        continue
                    elif response.status_code >= 500:
                        error_msg = f"服务器错误 (HTTP {response.status_code})"
                        logger.error(f"{error_msg}: {response.text}")
                        if attempt == self.max_retries - 1:
                            raise Exception(error_msg)
                        time.sleep(1)
                        continue
                    else:
                        error_msg = f"API调用失败 (HTTP {response.status_code}): {response.text}"
                        logger.error(error_msg)
                        if attempt == self.max_retries - 1:
                            raise Exception(error_msg)

                except requests.exceptions.Timeout as e:
                    last_error = f"请求超时 (尝试 {attempt + 1}/{self.max_retries})"
                    logger.warning(last_error)
                    if attempt == self.max_retries - 1:
                        raise Exception("Qwen API请求超时，请检查网络连接或增加超时时间")

                except requests.exceptions.ConnectionError as e:
                    last_error = f"网络连接错误 (尝试 {attempt + 1}/{self.max_retries}): {e}"
                    logger.error(last_error)
                    if attempt == self.max_retries - 1:
                        raise Exception(f"无法连接到Qwen API服务器: {e}")

                except requests.exceptions.RequestException as e:
                    last_error = f"请求异常 (尝试 {attempt + 1}/{self.max_retries}): {e}"
                    logger.error(last_error)
                    if attempt == self.max_retries - 1:
                        raise Exception(f"Qwen API请求失败: {e}")

                # 等待重试
                if attempt < self.max_retries - 1:
                    wait_time = 1 * (attempt + 1)  # 指数退避
                    logger.info(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)

            # 所有重试都失败
            if last_error:
                raise Exception(f"图片分析失败: {last_error}")
            return []

        except ValueError as e:
            # 配置错误，直接抛出
            logger.error(f"配置错误: {e}")
            raise
        except Exception as e:
            logger.error(f"Qwen API调用异常: {e}", exc_info=True)
            raise Exception(f"图片分析失败: {str(e)}")

    def generate_description(self, image_path: str) -> str:
        """生成图片描述/概述

        Args:
            image_path: 图片文件路径

        Returns:
            图片描述文本，如果失败返回空字符串

        Raises:
            Exception: API调用失败时抛出异常
        """
        if not self.is_enabled():
            logger.info("Qwen功能未启用，跳过图片描述生成")
            return ""

        if not self.api_key:
            logger.warning("Qwen API Key未配置")
            raise ValueError("Qwen API Key未配置，无法生成图片描述")

        try:
            # 将图片转换为base64
            image_base64 = self._image_to_base64(image_path)
            logger.info(f"开始生成图片描述: {image_path}")

            # 判断是否使用兼容模式（OpenAI兼容格式）
            is_compatible_mode = 'compatible-mode' in self.base_url.lower()
            
            if is_compatible_mode:
                # 兼容模式使用 OpenAI 兼容格式
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
                                "text": "请详细描述这张图片的内容，包括主要对象、场景、颜色、氛围等。用中文回答，描述要准确、详细，字数在50-200字之间。"
                            }
                        ]
                    }
                ]
                
                data = {
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": 300,
                    "temperature": 0.7
                }
            else:
                # 标准 DashScope API 格式
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {
                                "image": f"data:image/jpeg;base64,{image_base64}"
                            },
                            {
                                "text": "请详细描述这张图片的内容，包括主要对象、场景、颜色、氛围等。用中文回答，描述要准确、详细，字数在50-200字之间。"
                            }
                        ]
                    }
                ]

                data = {
                    "model": self.model,
                    "input": {
                        "messages": messages
                    },
                    "parameters": {
                        "max_tokens": 300,
                        "temperature": 0.7
                    }
                }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            if not is_compatible_mode:
                headers["X-DashScope-SSE"] = "disable"

            last_error = None
            for attempt in range(self.max_retries):
                try:
                    logger.info(f"调用Qwen API生成描述 (尝试 {attempt + 1}/{self.max_retries})...")
                    
                    if is_compatible_mode:
                        api_url = f"{self.base_url}/chat/completions"
                    elif 'vl' in self.model.lower():
                        api_url = f"{self.base_url}/services/aigc/multimodal/generation/generation"
                    else:
                        api_url = f"{self.base_url}/services/aigc/text-generation/generation"
                    
                    response = requests.post(
                        api_url,
                        json=data,
                        headers=headers,
                        timeout=self.timeout
                    )

                    if response.status_code == 200:
                        result = response.json()
                        description = self._parse_description_response(result)
                        if description:
                            logger.info(f"成功生成图片描述: {description[:50]}...")
                            return description
                    elif response.status_code == 401:
                        error_msg = "API Key无效或已过期"
                        logger.error(f"{error_msg} (HTTP {response.status_code})")
                        raise ValueError(error_msg)
                    elif response.status_code == 400:
                        error_data = response.json() if response.text else {}
                        error_msg = error_data.get('message', f"请求参数错误 (HTTP {response.status_code})")
                        logger.error(f"{error_msg}: {response.text}")
                        raise ValueError(error_msg)
                    elif response.status_code == 429:
                        error_msg = "API调用频率超限，请稍后重试"
                        logger.warning(f"{error_msg} (HTTP {response.status_code})")
                        if attempt == self.max_retries - 1:
                            raise Exception(error_msg)
                        time.sleep(2 ** attempt)
                        continue
                    elif response.status_code >= 500:
                        error_msg = f"服务器错误 (HTTP {response.status_code})"
                        logger.error(f"{error_msg}: {response.text}")
                        if attempt == self.max_retries - 1:
                            raise Exception(error_msg)
                        time.sleep(1)
                        continue
                    else:
                        error_msg = f"Qwen API调用失败 (HTTP {response.status_code}): {response.text}"
                        logger.error(error_msg)
                        if attempt == self.max_retries - 1:
                            raise Exception(error_msg)

                except requests.exceptions.Timeout as e:
                    last_error = f"请求超时 (尝试 {attempt + 1}/{self.max_retries})"
                    logger.warning(last_error)
                    if attempt == self.max_retries - 1:
                        raise Exception(last_error)
                except requests.exceptions.RequestException as e:
                    last_error = f"网络错误 (尝试 {attempt + 1}/{self.max_retries}): {e}"
                    logger.error(last_error)
                    if attempt == self.max_retries - 1:
                        raise Exception(last_error)

                if attempt < self.max_retries - 1:
                    time.sleep(1)

            return ""

        except ValueError as e:
            logger.error(f"配置错误: {e}")
            raise
        except Exception as e:
            logger.error(f"生成图片描述失败: {e}", exc_info=True)
            raise Exception(f"图片描述生成失败: {str(e)}")

    def _parse_description_response(self, response_data: Dict[str, Any]) -> str:
        """解析描述生成API响应

        Args:
            response_data: API响应数据

        Returns:
            描述文本
        """
        try:
            text = None
            
            if 'choices' in response_data and 'output' not in response_data:
                # OpenAI兼容模式
                if len(response_data['choices']) > 0:
                    text = response_data['choices'][0].get('message', {}).get('content', '')
            elif 'output' in response_data:
                # 标准DashScope格式
                output = response_data['output']
                if isinstance(output, dict):
                    if 'text' in output:
                        text = output['text']
                    elif 'choices' in output and len(output['choices']) > 0:
                        text = output['choices'][0].get('message', {}).get('content', '')
                elif isinstance(output, str):
                    text = output

            if text:
                text = text.strip()
                # 清理可能的格式问题
                text = text.replace('\n\n', '\n').replace('\n', ' ')
                return text
            else:
                logger.warning("API返回空描述")
                return ""

        except Exception as e:
            logger.error(f"解析描述响应失败: {e}", exc_info=True)
            return ""

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
            # 处理不同的响应格式
            # 兼容模式返回格式：response_data = {"choices": [{"message": {"content": "..."}}]}
            # 标准模式返回格式：response_data = {"output": {"text": "..."} 或 {"choices": [...]}}
            
            text = None
            
            # 先检查是否是兼容模式的响应格式（choices在顶层，没有output字段）
            if 'choices' in response_data and 'output' not in response_data:
                # 兼容模式：choices 直接在顶层
                if len(response_data['choices']) > 0:
                    text = response_data['choices'][0].get('message', {}).get('content', '')
                    logger.info(f"使用兼容模式响应格式解析")
                else:
                    logger.error(f"兼容模式响应中choices为空")
                    return []
            elif 'output' in response_data:
                # 标准模式：有 output 字段
                output = response_data['output']
                if isinstance(output, dict):
                    # 标准格式：output.text 或 output.choices
                    if 'text' in output:
                        text = output['text']
                    elif 'choices' in output and len(output['choices']) > 0:
                        text = output['choices'][0].get('message', {}).get('content', '')
                    else:
                        logger.error(f"API输出格式错误，无法找到文本内容: {output}")
                        return []
                elif isinstance(output, str):
                    # 直接返回字符串的情况
                    text = output
                else:
                    logger.error(f"API输出格式错误: {output}")
                    return []
            else:
                logger.error(f"API响应格式错误，无法识别: {list(response_data.keys())[:5]}")
                return []

            text = text.strip()
            logger.info(f"Qwen API响应文本: {text}")

            # 检查错误响应
            if not text:
                logger.warning("API返回空内容")
                return []
            
            # 检查是否包含错误信息
            error_keywords = ['抱歉', '无法', '错误', '失败', 'error', 'sorry', 'unable']
            if any(keyword in text.lower() for keyword in error_keywords):
                logger.warning(f"API返回了错误信息: {text}")
                return []

            # 解析标签（支持多种分隔符）
            # 先尝试中文逗号，再尝试英文逗号，最后尝试其他分隔符
            separators = ['，', ',', '、', '；', ';', '\n']
            tags = []
            
            for sep in separators:
                if sep in text:
                    tags = [tag.strip() for tag in text.split(sep) if tag.strip()]
                    break
            
            # 如果没有找到分隔符，尝试按空格分割
            if not tags:
                tags = [tag.strip() for tag in text.split() if tag.strip()]

            # 清理标签（移除标点符号）
            cleaned_tags = []
            for tag in tags:
                # 移除首尾的标点符号
                tag = tag.strip('，。；：,.;:！？!?')
                # 移除多余的空白
                tag = ' '.join(tag.split())
                
                # 验证标签有效性
                if len(tag) >= 2 and len(tag) <= 20 and tag not in cleaned_tags:
                    cleaned_tags.append(tag)

            # 限制标签数量
            cleaned_tags = cleaned_tags[:self.max_tags]

            logger.info(f"成功解析出 {len(cleaned_tags)} 个标签: {cleaned_tags}")
            return cleaned_tags

        except KeyError as e:
            logger.error(f"解析API响应时缺少必要字段: {e}, 响应数据: {response_data}")
            return []
        except Exception as e:
            logger.error(f"解析API响应失败: {e}", exc_info=True)
            return []

    def test_connection(self) -> bool:
        """测试API连接

        Returns:
            是否连接成功
        """
        if not self.is_enabled():
            logger.warning("Qwen功能未启用")
            return False

        if not self.api_key:
            logger.warning("API Key未配置")
            return False

        try:
            # 发送一个简单的文本生成测试请求
            data = {
                "model": self.model.replace('-vl-', '-').replace('-vl', ''),  # 使用文本模型测试
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "text": "你好"
                                }
                            ]
                        }
                    ]
                },
                "parameters": {
                    "max_tokens": 10
                }
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            # 尝试文本生成API端点
            test_url = f"{self.base_url}/services/aigc/text-generation/generation"
            logger.info(f"测试API连接: {test_url}")
            
            response = requests.post(
                test_url,
                json=data,
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                logger.info("API连接测试成功")
                return True
            elif response.status_code == 401:
                logger.error("API Key无效")
                return False
            else:
                logger.warning(f"API连接测试返回状态码: {response.status_code}")
                # 即使不是200，也可能表示API可用（可能是模型名称问题）
                return response.status_code < 500

        except requests.exceptions.Timeout:
            logger.error("API连接测试超时")
            return False
        except requests.exceptions.ConnectionError as e:
            logger.error(f"无法连接到API服务器: {e}")
            return False
        except Exception as e:
            logger.error(f"API连接测试失败: {e}")
            return False



