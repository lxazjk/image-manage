# Qwen3 VL 图片分析功能配置指南

## 功能说明

系统集成了 Qwen3 VL API，可以在上传图片时自动分析图片内容并生成标签（如：风景、人物、动物等）。

## 配置步骤

### 1. 获取 API Key

1. 访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 注册/登录账号
3. 创建 API Key
4. 复制 API Key

### 2. 配置 config.yaml

编辑 `config.yaml` 文件，修改 Qwen 配置：

```yaml
qwen:
  enabled: true  # 启用自动标签生成
  api_key: "your-api-key-here"  # 替换为你的 API Key
  base_url: "https://dashscope.aliyuncs.com/api/v1"  # API基础URL（通常不需要修改）
  model: "qwen-vl-max"  # 模型名称
  max_retries: 3  # 最大重试次数
  timeout: 30  # 请求超时时间（秒）
  max_tags: 5  # 每个图片最多生成多少个标签
```

### 3. 支持的模型

- `qwen-vl-max` - 最强性能（推荐）
- `qwen-vl-plus` - 平衡性能和速度
- `qwen-vl-7b-chat` - 7B模型，速度较快

### 4. 重启服务

配置修改后，需要重启后端服务：

```bash
docker-compose restart backend
```

## 测试功能

### 方法1: 使用测试脚本

```bash
# 测试API连接
docker-compose exec backend python /app/test_qwen.py

# 测试特定图片
docker-compose exec backend python /app/test_qwen.py /app/uploads/path/to/image.jpg
```

### 方法2: 通过API测试

```bash
# 1. 先测试连接（需要管理员权限）
curl -X POST http://localhost:8080/api/v1/config/test-qwen \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'

# 2. 上传图片（会自动生成标签）
curl -X POST http://localhost:8080/api/v1/images/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/image.jpg"
```

### 方法3: 通过前端界面

1. 登录系统
2. 进入"上传"页面
3. 选择图片上传
4. 上传成功后，系统会自动分析图片并生成标签
5. 在图片详情页面可以看到自动生成的标签

## 异常处理

系统已实现完善的异常处理机制：

### 1. 配置错误
- **API Key未配置**: 会返回配置错误，不影响图片上传
- **功能未启用**: 跳过标签生成，正常上传图片

### 2. 网络错误
- **连接超时**: 自动重试（最多3次），使用指数退避策略
- **网络连接失败**: 记录错误日志，不影响图片上传

### 3. API错误
- **401 未授权**: API Key无效或已过期
- **400 请求错误**: 请求参数错误
- **429 频率限制**: 请求过于频繁，等待后重试
- **500+ 服务器错误**: 服务器问题，自动重试

### 4. 响应解析错误
- **格式错误**: 记录警告，返回空标签列表
- **内容无效**: 过滤无效标签，返回有效标签

## 日志查看

查看后端日志以了解标签生成情况：

```bash
# 查看所有日志
docker-compose logs backend

# 实时查看日志
docker-compose logs -f backend

# 只查看Qwen相关日志
docker-compose logs backend | grep -i qwen
```

## 常见问题

### Q1: 标签生成失败，但不影响图片上传？

**A**: 这是正常行为。标签生成失败不会影响图片上传，系统会记录错误信息，你可以在上传响应中看到 `ai_tag_error` 字段。

### Q2: 如何知道标签是否成功生成？

**A**: 
- 上传响应中包含 `ai_tags` 字段（成功生成的标签列表）
- 如果失败，会包含 `ai_tag_error` 字段（错误信息）
- 查看后端日志可以看到详细的处理过程

### Q3: API调用频率限制怎么办？

**A**: 
- 系统会自动重试（最多3次）
- 如果仍然失败，会记录错误但不影响图片上传
- 可以增加 `max_retries` 配置项的值

### Q4: 如何禁用自动标签生成？

**A**: 在 `config.yaml` 中设置 `qwen.enabled: false`

### Q5: 生成的标签不符合预期？

**A**: 
- 可以调整 `max_tags` 配置项控制标签数量
- 标签生成依赖于模型的理解能力，可能不完全准确
- 可以手动添加或修改标签

## 性能优化建议

1. **批量上传**: 系统会为每张图片单独调用API，批量上传时注意API频率限制
2. **图片大小**: 系统会自动压缩大图片，但建议上传前压缩以提高速度
3. **超时设置**: 根据网络情况调整 `timeout` 配置项
4. **重试策略**: 根据需求调整 `max_retries` 配置项

## 费用说明

Qwen3 VL API 按调用次数计费，请参考 [DashScope 定价页面](https://help.aliyun.com/zh/model-studio/product-overview/billing-overview) 了解详细价格。

建议：
- 开发/测试环境：可以设置 `enabled: false` 避免产生费用
- 生产环境：根据实际需求启用，注意控制调用频率


