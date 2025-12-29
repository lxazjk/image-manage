import React, { useState, useEffect } from 'react'

// 添加CSS动画样式
const styles = `
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.image-card.playing {
  animation: pulse 2s infinite;
  box-shadow: 0 0 30px rgba(25, 118, 210, 0.8) !important;
  border: 4px solid #1976d2 !important;
  transform: scale(1.05) !important;
}
`

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}
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
  AppBar,
  LinearProgress,
  IconButton,
  Fade,
  Backdrop
} from '@mui/material'
import { Search, Delete, PlayArrow, Pause, Stop, SkipNext, SkipPrevious, Fullscreen, FullscreenExit, Close } from '@mui/icons-material'
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

  // 播放相关状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playbackInterval, setPlaybackInterval] = useState<NodeJS.Timeout | null>(null)
  const [fullscreenMode, setFullscreenMode] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(3000) // 播放间隔时间（毫秒）
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)

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

  // 播放控制逻辑
  useEffect(() => {
    if (isPlaying && images.length > 0 && fullscreenMode) {
      // 开始播放，设置定时器自动切换图片
      const interval = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % images.length
          return nextIndex
        })
      }, playbackSpeed)

      setPlaybackInterval(interval)

      return () => {
        clearInterval(interval)
        setPlaybackInterval(null)
      }
    } else {
      // 停止播放
      if (playbackInterval) {
        clearInterval(playbackInterval)
        setPlaybackInterval(null)
      }
    }
  }, [isPlaying, images.length, fullscreenMode, playbackSpeed])

  // 当图片列表发生变化时，重置播放索引
  useEffect(() => {
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [images])

  // 键盘事件监听器
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!fullscreenMode) return

      switch (event.key) {
        case ' ': // 空格键播放/暂停
          event.preventDefault()
          setIsPlaying(!isPlaying)
          break
        case 'ArrowLeft': // 左箭头上一张
          event.preventDefault()
          setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
          break
        case 'ArrowRight': // 右箭头下一张
          event.preventDefault()
          setCurrentIndex(prev => (prev + 1) % images.length)
          break
        case 'Escape': // ESC键退出全屏
          event.preventDefault()
          setFullscreenMode(false)
          setIsPlaying(false)
          setCurrentIndex(0)
          break
      }
    }

    if (fullscreenMode) {
      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [fullscreenMode, isPlaying, images.length])

  // 播放时自动滚动到当前图片
  useEffect(() => {
    if (isPlaying && images.length > 0) {
      const currentImageElement = document.querySelector(`[data-image-index="${currentIndex}"]`)
      if (currentImageElement) {
        currentImageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })
      }
    }
  }, [currentIndex, isPlaying, images.length])

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

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return

    const distance = touchStartX - touchEndX
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      // 左滑：下一张
      setCurrentIndex(prev => (prev + 1) % images.length)
    } else if (isRightSwipe) {
      // 右滑：上一张
      setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
    }

    setTouchStartX(null)
    setTouchEndX(null)
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

        {/* 播放控制按钮 */}
        {images.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant={isPlaying ? "outlined" : "contained"}
              color="primary"
              startIcon={isPlaying ? <Pause /> : <PlayArrow />}
              onClick={() => {
                setIsPlaying(!isPlaying)
                if (!isPlaying) {
                  setFullscreenMode(true) // 开始播放时进入全屏模式
                }
              }}
              size="small"
            >
              {isPlaying ? '暂停' : '循环播放'}
            </Button>
            {isPlaying && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Stop />}
                onClick={() => {
                  setIsPlaying(false)
                  setCurrentIndex(0)
                  setFullscreenMode(false)
                }}
                size="small"
              >
                停止
              </Button>
            )}
            {!isPlaying && (
              <Button
                variant="outlined"
                startIcon={<Fullscreen />}
                onClick={() => setFullscreenMode(true)}
                size="small"
              >
                全屏浏览
              </Button>
            )}
            {isPlaying && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                播放中: {currentIndex + 1} / {images.length}
              </Typography>
            )}
          </Box>
        )}

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
          {images.map((image, index) => (
            <Card
              key={image.id}
              className={`image-card ${isPlaying && index === currentIndex ? 'playing' : ''}`}
              data-image-index={index}
              sx={{
                cursor: 'pointer',
                position: 'relative',
                border: selectedImages.has(image.id) ? '2px solid' : (isPlaying && index === currentIndex ? '4px solid' : 'none'),
                borderColor: selectedImages.has(image.id) ? 'primary.main' : (isPlaying && index === currentIndex ? '#1976d2' : 'primary.main'),
                boxShadow: isPlaying && index === currentIndex ? '0 0 30px rgba(25, 118, 210, 0.8)' : 'none',
                transform: isPlaying && index === currentIndex ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease',
                zIndex: isPlaying && index === currentIndex ? 10 : 1
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

      {/* 全屏播放模式 */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'rgba(0, 0, 0, 0.95)'
        }}
        open={fullscreenMode}
        onClick={(e) => {
          // 点击背景区域时，如果不在控制面板上，则退出全屏
          if (!(e.target as HTMLElement).closest('.playback-controls')) {
            setFullscreenMode(false)
            setIsPlaying(false)
            setCurrentIndex(0)
          }
        }}
      >
        <Fade in={fullscreenMode} timeout={500}>
          <Box sx={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            // 移动设备优化
            '@media (max-width: 768px)': {
              paddingTop: '60px', // 为顶部关闭按钮留空间
              paddingBottom: '120px' // 为底部控制面板留更多空间
            }
          }}>
            {/* 关闭按钮 */}
            <IconButton
              onClick={() => {
                setFullscreenMode(false)
                setIsPlaying(false)
                setCurrentIndex(0)
              }}
              sx={{
                position: 'absolute',
                top: { xs: 16, sm: 20 },
                right: { xs: 16, sm: 20 },
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)'
                },
                // 移动设备优化
                width: { xs: 48, sm: 40 },
                height: { xs: 48, sm: 40 },
                fontSize: { xs: '1.5rem', sm: '1rem' }
              }}
            >
              <Close />
            </IconButton>

            {/* 当前播放的大图 */}
            {images.length > 0 && images[currentIndex] && (
              <Box
                sx={{
                  maxWidth: { xs: '95%', sm: '80%' },
                  maxHeight: { xs: '50vh', sm: '70%' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: { xs: 2, sm: 4 },
                  position: 'relative'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                    animation: isPlaying ? 'slideIn 0.5s ease-out' : 'none',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                      animation: isPlaying ? 'shine 3s infinite' : 'none'
                    }
                  }}
                >
                  <img
                    src={images[currentIndex].thumbnail}
                    alt={images[currentIndex].filename}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      transition: 'all 0.5s ease'
                    }}
                  />
                </Box>

                {/* 播放指示器 */}
                {isPlaying && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: { xs: 16, sm: 20 },
                      left: { xs: 16, sm: 20 },
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      px: { xs: 1.5, sm: 2 },
                      py: { xs: 0.5, sm: 1 },
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: { xs: '0.8rem', sm: '0.9rem' },
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <PlayArrow sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />
                    播放中
                  </Box>
                )}
              </Box>
            )}

            {/* 标签显示 */}
            {images.length > 0 && images[currentIndex] && images[currentIndex].tags.length > 0 && (
              <Box sx={{
                position: 'absolute',
                top: { xs: 80, sm: 100 },
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                color: 'white',
                maxWidth: { xs: '90%', sm: '80%' },
                animation: 'slideIn 0.5s ease-out',
                px: 2
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  flexWrap: 'wrap',
                  maxHeight: { xs: '60px', sm: 'auto' },
                  overflowY: { xs: 'auto', sm: 'visible' }
                }}>
                  {images[currentIndex].tags.slice(0, { xs: 3, sm: 5 }).map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        fontSize: { xs: '0.8rem', sm: '0.9rem' },
                        py: { xs: 0.5, sm: 1 },
                        height: { xs: '28px', sm: '32px' }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* 播放控制面板 */}
            <Box
              className="playback-controls"
              sx={{
                position: 'absolute',
                bottom: { xs: 20, sm: 40 },
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: { xs: '30px', sm: '50px' },
                px: { xs: 2, sm: 4 },
                py: { xs: 1.5, sm: 2 },
                minWidth: { xs: '90%', sm: '500px' },
                maxWidth: { xs: '95%', sm: '600px' },
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 上一张按钮 */}
              <IconButton
                onClick={() => {
                  setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
                }}
                sx={{
                  color: 'white',
                  width: { xs: 44, sm: 40 },
                  height: { xs: 44, sm: 40 }
                }}
              >
                <SkipPrevious sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
              </IconButton>

              {/* 播放/暂停按钮 */}
              <IconButton
                onClick={() => setIsPlaying(!isPlaying)}
                sx={{
                  color: 'white',
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: { xs: 60, sm: 56 },
                  height: { xs: 60, sm: 56 }
                }}
              >
                {isPlaying ? <Pause sx={{ fontSize: { xs: '1.75rem', sm: '1.5rem' } }} /> : <PlayArrow sx={{ fontSize: { xs: '1.75rem', sm: '1.5rem' } }} />}
              </IconButton>

              {/* 下一张按钮 */}
              <IconButton
                onClick={() => {
                  setCurrentIndex(prev => (prev + 1) % images.length)
                }}
                sx={{
                  color: 'white',
                  width: { xs: 44, sm: 40 },
                  height: { xs: 44, sm: 40 }
                }}
              >
                <SkipNext sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
              </IconButton>

              {/* 播放信息 */}
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  ml: { xs: 1, sm: 2 },
                  minWidth: { xs: '80px', sm: '100px' },
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
              >
                {currentIndex + 1} / {images.length}
              </Typography>
            </Box>

            {/* 播放进度条 */}
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: { xs: '3px', sm: '4px' }
            }}>
              <LinearProgress
                variant="determinate"
                value={(currentIndex + 1) / images.length * 100}
                sx={{
                  height: { xs: '3px', sm: '4px' },
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'primary.main',
                    transition: 'transform 0.3s ease'
                  }
                }}
              />
            </Box>
          </Box>
        </Fade>
      </Backdrop>
    </Box>
  )
}

export default Gallery



