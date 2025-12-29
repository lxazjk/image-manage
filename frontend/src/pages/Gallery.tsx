import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import InfiniteScroll from 'react-infinite-scroll-component'
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Toolbar,
  AppBar
} from '@mui/material'
import { Search, Delete } from '@mui/icons-material'
import { useSnackbar } from 'notistack'

import { imageAPI, tagAPI } from '../services/api'

interface Image {
  id: number
  filename: string
  file_size: number
  width: number | null
  height: number | null
  taken_at: string | null
  thumbnail: string
  description: string | null  // AI生成的描述
  tags: Array<{ id: number; name: string }>
  created_at: string
}

interface Tag {
  id: number
  name: string
}

const Gallery: React.FC = () => {
  const [images, setImages] = useState<Image[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedTag, setSelectedTag] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // 加载标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await tagAPI.getTags()
        setTags(response.data)
      } catch (err: any) {
        enqueueSnackbar('加载标签失败', { variant: 'error' })
      }
    }
    loadTags()
  }, [enqueueSnackbar])

  // 加载图片
  const loadImages = async (pageNum: number = 1, reset: boolean = false) => {
    if (loading) return

    setLoading(true)
    try {
      const response = await imageAPI.getImages(pageNum, selectedTag || undefined, searchQuery || undefined)
      const newImages = response.data.images

      if (reset) {
        setImages(newImages)
      } else {
        setImages(prev => [...prev, ...newImages])
      }

      setHasMore(newImages.length > 0 && pageNum < response.data.pages)
      setPage(pageNum)

    } catch (err: any) {
      enqueueSnackbar('加载图片失败', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadImages(1, true)
  }, [selectedTag, searchQuery])

  // 处理标签筛选
  const handleTagChange = (tagName: string) => {
    setSelectedTag(tagName)
    setPage(1)
  }

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  // 加载更多
  const loadMore = () => {
    if (!loading && hasMore) {
      loadImages(page + 1)
    }
  }

  // 图片点击
  const handleImageClick = (imageId: number) => {
    navigate(`/image/${imageId}`)
  }

  // 处理单个图片选择
  const handleImageSelect = (imageId: number, checked: boolean) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(imageId)
      } else {
        newSet.delete(imageId)
      }
      return newSet
    })
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedImages(new Set(images.map(img => img.id)))
    } else {
      setSelectedImages(new Set())
    }
  }

  // 批量删除 - 打开确认对话框
  const handleBatchDelete = () => {
    if (selectedImages.size === 0) {
      enqueueSnackbar('请先选择要删除的图片', { variant: 'warning' })
      return
    }

    // 只有在点击批量删除按钮时才打开对话框
    setDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBatchDelete = async () => {
    if (selectedImages.size === 0) return

    setDeleting(true)
    try {
      const imageIds = Array.from(selectedImages)
      const response = await imageAPI.batchDeleteImages(imageIds)
      
      enqueueSnackbar(
        response.data.deleted_count > 0 
          ? `成功删除 ${response.data.deleted_count} 张图片`
          : '删除失败',
        { variant: response.data.deleted_count > 0 ? 'success' : 'error' }
      )

      // 清除选中状态
      setSelectedImages(new Set())
      setDeleteDialogOpen(false)

      // 重新加载图片列表
      loadImages(1, true)
    } catch (err: any) {
      enqueueSnackbar(
        err.response?.data?.error || '批量删除失败',
        { variant: 'error' }
      )
    } finally {
      setDeleting(false)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        我的相册
      </Typography>

      {/* 搜索和筛选 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="搜索图片..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>标签筛选</InputLabel>
          <Select
            value={selectedTag}
            label="标签筛选"
            onChange={(e) => handleTagChange(e.target.value)}
          >
            <MenuItem value="">全部</MenuItem>
            {tags.map((tag) => (
              <MenuItem key={tag.id} value={tag.name}>
                {tag.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 批量操作工具栏 */}
        {selectedImages.size > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              已选择 {selectedImages.size} 张图片
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={handleBatchDelete}
              size="small"
            >
              批量删除
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedImages(new Set())}
              size="small"
            >
              取消选择
            </Button>
          </Box>
        )}
      </Box>

      {/* 全选复选框 */}
      {images.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox
            checked={images.length > 0 && selectedImages.size === images.length}
            indeterminate={selectedImages.size > 0 && selectedImages.size < images.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
          <Typography variant="body2" color="text.secondary">
            全选
          </Typography>
        </Box>
      )}

      {/* 图片网格 */}
      <InfiniteScroll
        dataLength={images.length}
        next={loadMore}
        hasMore={hasMore}
        loader={
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        }
        endMessage={
          images.length > 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                没有更多图片了
              </Typography>
            </Box>
          )
        }
      >
        <Box className="image-grid">
          {images.map((image) => (
            <Card
              key={image.id}
              className="image-card"
              sx={{ 
                cursor: 'pointer',
                position: 'relative',
                border: selectedImages.has(image.id) ? '2px solid' : 'none',
                borderColor: 'primary.main'
              }}
            >
              {/* 选择复选框 */}
              <Checkbox
                checked={selectedImages.has(image.id)}
                onChange={(e) => {
                  e.stopPropagation()
                  handleImageSelect(image.id, e.target.checked)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  // 复选框点击只用于选择，不触发其他操作
                }}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  zIndex: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)'
                  }
                }}
              />
              
              <Box 
                onClick={(e) => {
                  // 如果点击的是复选框区域，不触发图片查看
                  if ((e.target as HTMLElement).closest('.MuiCheckbox-root')) {
                    return
                  }
                  handleImageClick(image.id)
                }}
              >
                <CardMedia
                  component="img"
                  className="image-thumbnail"
                  image={image.thumbnail}
                  alt={image.filename}
                  loading="lazy"
                />
                <CardContent sx={{ p: 1 }}>
                  <Typography variant="body2" noWrap title={image.filename}>
                    {image.filename}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(image.file_size)}
                  </Typography>
                  {image.tags.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      {image.tags.slice(0, 2).map((tag) => (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                      {image.tags.length > 2 && (
                        <Chip
                          label={`+${image.tags.length - 2}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>
                  )}
                </CardContent>
              </Box>
            </Card>
          ))}
        </Box>
      </InfiniteScroll>

      {/* 无图片提示 */}
      {!loading && images.length === 0 && (
        <Alert severity="info" sx={{ mt: 4 }}>
          暂无图片，点击上方"上传"按钮添加图片
        </Alert>
      )}

      {/* 批量删除确认对话框 - 只有在点击批量删除按钮时才显示 */}
      {deleteDialogOpen && (
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            if (!deleting) {
              setDeleteDialogOpen(false)
            }
          }}
          disableEscapeKeyDown={deleting}
        >
          <DialogTitle>确认批量删除</DialogTitle>
          <DialogContent>
            <DialogContentText>
              确定要删除选中的 <strong>{selectedImages.size}</strong> 张图片吗？
              <br />
              <Typography variant="caption" color="error" component="span">
                此操作不可恢复，图片将被移至回收站。
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)} 
              disabled={deleting}
              variant="outlined"
            >
              取消
            </Button>
            <Button 
              onClick={confirmBatchDelete} 
              color="error" 
              variant="contained"
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={20} /> : <Delete />}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}

export default Gallery



