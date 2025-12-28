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
  Alert
} from '@mui/material'
import { Search } from '@mui/icons-material'
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
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
      </Box>

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
              onClick={() => handleImageClick(image.id)}
              sx={{ cursor: 'pointer' }}
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
    </Box>
  )
}

export default Gallery



