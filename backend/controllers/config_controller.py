"""
配置管理控制器
"""

from flask import request, g, jsonify

from config import Config
from qwen_client import QwenVLClient

def get_config():
    """获取配置（管理员功能）"""
    if g.current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    config = Config()
    return jsonify({
        'site': {
            'name': config.get('site.name'),
            'favicon': config.get('site.favicon')
        },
        'storage': {
            'allowed_extensions': config.get('storage.allowed_extensions')
        },
        'qwen': {
            'enabled': config.get('qwen.enabled', False),
            'api_key': '***' if config.get('qwen.api_key') else '',  # 隐藏API Key
            'base_url': config.get('qwen.base_url'),
            'model': config.get('qwen.model'),
            'max_retries': config.get('qwen.max_retries'),
            'timeout': config.get('qwen.timeout'),
            'max_tags': config.get('qwen.max_tags')
        }
    })

def update_config():
    """更新配置（管理员功能）"""
    if g.current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': '配置数据不能为空'}), 400

    config = Config()

    try:
        # 更新站点配置
        if 'site' in data:
            site_config = data['site']
            if 'name' in site_config:
                config.set('site.name', site_config['name'])
            if 'favicon' in site_config:
                config.set('site.favicon', site_config['favicon'])

        # 更新存储配置
        if 'storage' in data:
            storage_config = data['storage']
            if 'allowed_extensions' in storage_config:
                config.set('storage.allowed_extensions', storage_config['allowed_extensions'])

        # 更新Qwen配置
        if 'qwen' in data:
            qwen_config = data['qwen']
            if 'enabled' in qwen_config:
                config.set('qwen.enabled', qwen_config['enabled'])
            if 'api_key' in qwen_config:
                config.set('qwen.api_key', qwen_config['api_key'])
            if 'base_url' in qwen_config:
                config.set('qwen.base_url', qwen_config['base_url'])
            if 'model' in qwen_config:
                config.set('qwen.model', qwen_config['model'])

        # 保存配置
        config.save()

        return jsonify({'message': '配置更新成功'})

    except Exception as e:
        return jsonify({'error': f'更新失败: {str(e)}'}), 500

def test_qwen_connection():
    """测试Qwen API连接（管理员功能）"""
    if g.current_user.role != 'admin':
        return jsonify({'error': '权限不足'}), 403

    try:
        config = Config()
        qwen_client = QwenVLClient(config)

        if not qwen_client.is_enabled():
            return jsonify({
                'success': False,
                'message': 'Qwen功能未启用或API Key未配置'
            })

        # 测试连接
        success = qwen_client.test_connection()

        if success:
            return jsonify({
                'success': True,
                'message': 'Qwen API连接测试成功'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Qwen API连接测试失败，请检查配置'
            })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'连接测试异常: {str(e)}'
        })
