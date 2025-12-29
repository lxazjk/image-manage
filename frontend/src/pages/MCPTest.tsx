import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import { Search, Image as ImageIcon, Tag } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { mcpAPI } from '../services/api'

interface Tool {
  name: string
  description: string
  inputSchema: any
}

interface SearchResult {
  images: Array<{
    id: number
    filename: string
    score?: number
    thumbnail: string
    tags: Array<{ id: number; name: string }>
    description?: string
  }>
  total: number
  query: string
}

const MCPTest: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  
  // 图片详情相关状态
  const [imageId, setImageId] = useState('')
  const [imageDetail, setImageDetail] = useState<any>(null)
  
  // 标签相关状态
  const [tags, setTags] = useState<any[]>([])

  // 加载MCP工具列表
  useEffect(() => {
    const loadTools = async () => {
      try {
        const response = await mcpAPI.getTools()
        setTools(response.data.tools || [])
      } catch (error: any) {
        enqueueSnackbar('加载MCP工具失败', { variant: 'error' })
        console.error('加载工具失败:', error)
      }
    }
    loadTools()
  }, [enqueueSnackbar])

  // 搜索图片
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      enqueueSnackbar('请输入搜索关键词', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const response = await mcpAPI.callTool('search_images', {
        query: searchQuery,
        limit: 10
      })
      setSearchResults(response.data.result)
      enqueueSnackbar('搜索成功', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar('搜索失败: ' + (error.response?.data?.error || error.message), { variant: 'error' })
      console.error('搜索失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取图片详情
  const handleGetImageDetail = async () => {
    if (!imageId.trim()) {
      enqueueSnackbar('请输入图片ID', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const response = await mcpAPI.callTool('get_image_details', {
        image_id: parseInt(imageId)
      })
      setImageDetail(response.data.result)
      enqueueSnackbar('获取详情成功', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar('获取详情失败: ' + (error.response?.data?.error || error.message), { variant: 'error' })
      console.error('获取详情失败:', error)
      setImageDetail(null)
    } finally {
      setLoading(false)
    }
  }

  // 获取可用标签
  const handleGetTags = async () => {
    setLoading(true)
    try {
      const response = await mcpAPI.callTool('get_available_tags', {})
      setTags(response.data.result.tags || [])
      enqueueSnackbar('获取标签成功', { variant: 'success' })
    } catch (error: any) {
      enqueueSnackbar('获取标签失败: ' + (error.response?.data?.error || error.message), { variant: 'error' })
      console.error('获取标签失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MCP接口
      </Typography>

      {/* MCP工具列表 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          可用的MCP工具
        </Typography>
        <List>
          {tools.map((tool, index) => (
            <React.Fragment key={tool.name}>
              <ListItem>
                <ListItemText
                  primary={tool.name}
                  secondary={tool.description}
                />
              </ListItem>
              {index < tools.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* 功能标签页 */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="图片搜索" icon={<Search />} iconPosition="start" />
          <Tab label="图片详情" icon={<ImageIcon />} iconPosition="start" />
          <Tab label="可用标签" icon={<Tag />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* 图片搜索标签页 */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                智能图片搜索
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  label="搜索关键词"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="例如：风景照片、人物、最近上传"
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? <CircularProgress size={24} /> : '搜索'}
                </Button>
              </Box>

              {searchResults && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    找到 {searchResults.total} 张图片
                  </Typography>
                  <Grid container spacing={2}>
                    {searchResults.images.map((image) => (
                      <Grid item xs={12} sm={6} md={4} key={image.id}>
                        <Card>
                          <CardMedia
                            component="img"
                            height="200"
                            image={image.thumbnail}
                            alt={image.filename}
                            sx={{ objectFit: 'cover' }}
                          />
                          <CardContent>
                            <Typography variant="subtitle2" noWrap>
                              {image.filename}
                            </Typography>
                            {image.score !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                相关性得分: {image.score.toFixed(2)}
                              </Typography>
                            )}
                            {image.tags.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                {image.tags.slice(0, 3).map((tag) => (
                                  <Chip
                                    key={tag.id}
                                    label={tag.name}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}
                            {image.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {image.description.substring(0, 50)}...
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}

          {/* 图片详情标签页 */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                获取图片详情
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  label="图片ID"
                  type="number"
                  value={imageId}
                  onChange={(e) => setImageId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGetImageDetail()}
                  sx={{ maxWidth: 200 }}
                />
                <Button
                  variant="contained"
                  onClick={handleGetImageDetail}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : '获取详情'}
                </Button>
              </Box>

              {imageDetail && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {imageDetail.filename}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        文件大小: {(imageDetail.file_size / 1024).toFixed(2)} KB
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        尺寸: {imageDetail.width} x {imageDetail.height}
                      </Typography>
                      {imageDetail.taken_at && (
                        <Typography variant="body2" color="text.secondary">
                          拍摄时间: {new Date(imageDetail.taken_at).toLocaleString()}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {imageDetail.tags && imageDetail.tags.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            标签:
                          </Typography>
                          {imageDetail.tags.map((tag: any) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Grid>
                    {imageDetail.description && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          AI描述:
                        </Typography>
                        <Typography variant="body2">
                          {imageDetail.description}
                        </Typography>
                      </Grid>
                    )}
                    {imageDetail.thumbnail && (
                      <Grid item xs={12}>
                        <img
                          src={imageDetail.thumbnail}
                          alt={imageDetail.filename}
                          style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}
            </Box>
          )}

          {/* 可用标签标签页 */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                系统可用标签
              </Typography>
              
              <Button
                variant="contained"
                onClick={handleGetTags}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : '获取标签列表'}
              </Button>

              {tags.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    共 {tags.length} 个标签
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {tags.map((tag) => (
                      <Chip
                        key={tag.id}
                        label={`${tag.name} (${tag.usage_count || 0})`}
                        variant="outlined"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  )
}

export default MCPTest

