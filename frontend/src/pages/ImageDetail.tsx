import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  TextField,
  Autocomplete,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material'
import { Edit, Delete, Restore, Close } from '@mui/icons-material'
import { useSnackbar } from 'notistack'

import { imageAPI, tagAPI } from '../services/api'

interface ImageDetail {
  id: number
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  width: number | null
  height: number | null
  taken_at: string | null
  location_lat: number | null
  location_lng: number | null
  location_name: string | null
  thumbnail: string
  description: string | null  // AI生成的描述
  tags: Array<{ id: number; name: string }>
  created_at: string
  updated_at: string | null
}

interface Tag {
  id: number
  name: string
}

const ImageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // 检查认证状态
  React.useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    console.log('ImageDetail认证状态检查:')
    console.log('- Token:', token ? '存在' : '不存在')
    console.log('- User:', user ? '存在' : '不存在')

    if (!token || !user) {
      console.log('⚠️ 警告: 用户未登录')
    }
  }, [])

  const [image, setImage] = useState<ImageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialog, setEditDialog] = useState(false)
  const [editType, setEditType] = useState<'crop' | 'adjust_color'>('crop')
  const [cropParams, setCropParams] = useState({
    crop_top: 0,
    crop_bottom: 0,
    crop_left: 0,
    crop_right: 0
  })
  const [colorParams, setColorParams] = useState({
    brightness: 0,
    contrast: 0
  })
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])

  // 加载图片详情
  useEffect(() => {
    const loadImage = async () => {
      if (!id) return

      try {
        const response = await imageAPI.getImageDetail(parseInt(id))
        setImage(response.data)
        setSelectedTags(response.data.tags)
      } catch (err: any) {
        enqueueSnackbar('加载图片失败', { variant: 'error' })
        navigate('/gallery')
      } finally {
        setLoading(false)
      }
    }

    loadImage()
  }, [id, navigate, enqueueSnackbar])

  // 加载可用标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await tagAPI.getTags()
        setAvailableTags(response.data)
      } catch (err) {
        console.error('加载标签失败:', err)
      }
    }

    loadTags()
  }, [])

  // 执行编辑
  const handleEdit = async () => {
    if (!image) return

    try {
      const params = editType === 'crop' ? cropParams : colorParams
      await imageAPI.editImage(image.id, editType, params)
      enqueueSnackbar('编辑成功', { variant: 'success' })

      // 重新加载图片
      const response = await imageAPI.getImageDetail(image.id)
      setImage(response.data)

      setEditDialog(false)
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || '编辑失败', { variant: 'error' })
    }
  }

  // 删除图片
  const handleDelete = async () => {
    if (!image) return

    if (!window.confirm('确定要删除这张图片吗？')) return

    try {
      await imageAPI.deleteImage(image.id)
      enqueueSnackbar('图片已删除', { variant: 'success' })
      navigate('/gallery')
    } catch (err: any) {
      enqueueSnackbar('删除失败', { variant: 'error' })
    }
  }

  // 恢复图片
  const handleRestore = async () => {
    if (!image) return

    try {
      await imageAPI.restoreImage(image.id)
      enqueueSnackbar('图片已恢复', { variant: 'success' })

      // 重新加载图片
      const response = await imageAPI.getImageDetail(image.id)
      setImage(response.data)
    } catch (err: any) {
      enqueueSnackbar('恢复失败', { variant: 'error' })
    }
  }

  // 更新标签
  const handleTagsUpdate = async (newTags: Tag[]) => {
    if (!image) return

    console.log('=== 开始标签更新 ===')
    console.log('图片ID:', image.id)
    console.log('当前标签:', selectedTags.map(t => t.name))
    console.log('新标签:', newTags.map(t => t.name))

    try {
      const currentTagIds = selectedTags.map(t => t.id)
      const newTagIds = newTags.map(t => t.id)

      const toAdd = newTagIds.filter(id => !currentTagIds.includes(id))
      const toRemove = currentTagIds.filter(id => !newTagIds.includes(id))

      console.log('需要添加的标签ID:', toAdd)
      console.log('需要移除的标签ID:', toRemove)

      if (toAdd.length > 0) {
        console.log('调用添加标签API...')
        const addResponse = await tagAPI.addTagsToImage(image.id, toAdd)
        console.log('添加标签API响应:', addResponse)
      }

      if (toRemove.length > 0) {
        console.log('调用移除标签API...')
        const removeResponse = await tagAPI.removeTagsFromImage(image.id, toRemove)
        console.log('移除标签API响应:', removeResponse)
      }

      setSelectedTags(newTags)

      // 重新加载图片
      console.log('重新加载图片详情...')
      const response = await imageAPI.getImageDetail(image.id)
      console.log('图片详情响应:', response.data)
      setImage(response.data)

      enqueueSnackbar('标签更新成功', { variant: 'success' })
      console.log('=== 标签更新完成 ===')
    } catch (err: any) {
      console.error('=== 标签更新失败 ===')
      console.error('错误详情:', err)
      console.error('错误响应:', err.response)
      enqueueSnackbar(`标签更新失败: ${err.response?.data?.error || err.message}`, { variant: 'error' })
    }
  }

  // 创建新标签
  const handleCreateTag = async (tagName: string) => {
    try {
      const response = await tagAPI.createTag(tagName)
      const newTag = response.data
      setAvailableTags(prev => [...prev, newTag])
      return newTag
    } catch (err: any) {
      enqueueSnackbar('创建标签失败', { variant: 'error' })
      return null
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!image) {
    return (
      <Alert severity="error">
        图片不存在
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => navigate('/gallery')}>
          返回相册
        </Button>
        <Typography variant="h5" component="h1">
          {image.filename}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* 图片显示区域 */}
        <Box sx={{ flex: '1 1 500px' }}>
          <Paper sx={{ p: 2 }}>
            <img
              src={image.thumbnail.replace('data:image/jpeg;base64,', 'data:image/jpeg;base64,')}
              alt={image.filename}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '600px',
                objectFit: 'contain'
              }}
            />
          </Paper>

          {/* 操作按钮 */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditDialog(true)}
            >
              编辑
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
            >
              删除
            </Button>
            <Button
              variant="outlined"
              startIcon={<Restore />}
              onClick={handleRestore}
            >
              恢复
            </Button>
          </Box>
        </Box>

        {/* 图片信息 */}
        <Box sx={{ flex: '1 1 300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              图片信息
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">文件名</Typography>
              <Typography>{image.filename}</Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">文件大小</Typography>
              <Typography>{(image.file_size / 1024).toFixed(2)} KB</Typography>
            </Box>

            {image.width && image.height && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">分辨率</Typography>
                <Typography>{image.width} × {image.height}</Typography>
              </Box>
            )}

            {image.taken_at && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">拍摄时间</Typography>
                <Typography>{new Date(image.taken_at).toLocaleString()}</Typography>
              </Box>
            )}

            {image.location_lat && image.location_lng && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">位置</Typography>
                <Typography>
                  {image.location_lat.toFixed(6)}, {image.location_lng.toFixed(6)}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">上传时间</Typography>
              <Typography>{new Date(image.created_at).toLocaleString()}</Typography>
            </Box>

            {/* AI生成的描述 */}
            {image.description && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  AI描述
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {image.description}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* 标签管理 */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                标签
              </Typography>
              <Autocomplete
                multiple
                options={availableTags}
                value={selectedTags}
                onChange={(_, newValue) => handleTagsUpdate(newValue)}
                getOptionLabel={(option) => option.name}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="添加标签..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        if (input.value.trim()) {
                          handleCreateTag(input.value.trim())
                          input.value = ''
                        }
                      }
                    }}
                  />
                )}
                freeSolo
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* 编辑对话框 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          编辑图片
          <IconButton
            onClick={() => setEditDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Button
              variant={editType === 'crop' ? 'contained' : 'outlined'}
              onClick={() => setEditType('crop')}
              sx={{ mr: 1 }}
            >
              裁剪
            </Button>
            <Button
              variant={editType === 'adjust_color' ? 'contained' : 'outlined'}
              onClick={() => setEditType('adjust_color')}
            >
              调整色彩
            </Button>
          </Box>

          {editType === 'crop' && (
            <Box>
              <Typography gutterBottom>裁剪参数 (%)</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography>上边距: {cropParams.crop_top}%</Typography>
                <Slider
                  value={cropParams.crop_top}
                  onChange={(_, value) => setCropParams(prev => ({ ...prev, crop_top: value as number }))}
                  min={0}
                  max={50}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography>下边距: {cropParams.crop_bottom}%</Typography>
                <Slider
                  value={cropParams.crop_bottom}
                  onChange={(_, value) => setCropParams(prev => ({ ...prev, crop_bottom: value as number }))}
                  min={0}
                  max={50}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography>左边距: {cropParams.crop_left}%</Typography>
                <Slider
                  value={cropParams.crop_left}
                  onChange={(_, value) => setCropParams(prev => ({ ...prev, crop_left: value as number }))}
                  min={0}
                  max={50}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography>右边距: {cropParams.crop_right}%</Typography>
                <Slider
                  value={cropParams.crop_right}
                  onChange={(_, value) => setCropParams(prev => ({ ...prev, crop_right: value as number }))}
                  min={0}
                  max={50}
                />
              </Box>
            </Box>
          )}

          {editType === 'adjust_color' && (
            <Box>
              <Typography gutterBottom>色彩调整</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography>亮度: {colorParams.brightness}</Typography>
                <Slider
                  value={colorParams.brightness}
                  onChange={(_, value) => setColorParams(prev => ({ ...prev, brightness: value as number }))}
                  min={-100}
                  max={100}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography>对比度: {colorParams.contrast}</Typography>
                <Slider
                  value={colorParams.contrast}
                  onChange={(_, value) => setColorParams(prev => ({ ...prev, contrast: value as number }))}
                  min={-100}
                  max={100}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>取消</Button>
          <Button onClick={handleEdit} variant="contained">应用</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ImageDetail
