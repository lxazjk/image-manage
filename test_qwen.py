#!/usr/bin/env python3
"""
测试 Qwen3 VL API 功能
"""
import sys
import os

# 添加backend目录到Python路径
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

from backend.config import Config
from backend.qwen_client import QwenVLClient

def test_qwen_api():
    """测试Qwen API"""
    print("=" * 50)
    print("Qwen3 VL API 测试")
    print("=" * 50)
    
    # 加载配置
    config = Config('/app/config.yaml' if os.path.exists('/app/config.yaml') else 'config.yaml')
    
    # 创建客户端
    qwen_client = QwenVLClient(config)
    
    # 检查是否启用
    if not qwen_client.is_enabled():
        print("\n❌ Qwen功能未启用")
        print("请在 config.yaml 中设置:")
        print("  qwen:")
        print("    enabled: true")
        print("    api_key: 'your-api-key'")
        return False
    
    print(f"\n✅ Qwen功能已启用")
    print(f"  模型: {qwen_client.model}")
    print(f"  API URL: {qwen_client.base_url}")
    print(f"  最大标签数: {qwen_client.max_tags}")
    
    # 测试连接
    print("\n测试API连接...")
    if qwen_client.test_connection():
        print("✅ API连接测试成功")
    else:
        print("⚠️  API连接测试失败（可能是模型名称问题，不影响图片分析功能）")
    
    # 如果有测试图片，可以测试图片分析
    test_image = None
    if len(sys.argv) > 1:
        test_image = sys.argv[1]
    else:
        # 查找uploads目录中的第一张图片
        uploads_dir = 'uploads'
        if os.path.exists(uploads_dir):
            for root, dirs, files in os.walk(uploads_dir):
                for file in files:
                    if file.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                        test_image = os.path.join(root, file)
                        break
                if test_image:
                    break
    
    if test_image and os.path.exists(test_image):
        print(f"\n测试图片分析: {test_image}")
        try:
            tags = qwen_client.analyze_image(test_image)
            if tags:
                print(f"✅ 成功生成 {len(tags)} 个标签:")
                for i, tag in enumerate(tags, 1):
                    print(f"   {i}. {tag}")
            else:
                print("⚠️  未生成标签")
        except Exception as e:
            print(f"❌ 图片分析失败: {e}")
            return False
    else:
        print("\n⚠️  未找到测试图片")
        print("使用方法: python test_qwen.py <图片路径>")
    
    print("\n" + "=" * 50)
    return True

if __name__ == '__main__':
    success = test_qwen_api()
    sys.exit(0 if success else 1)


