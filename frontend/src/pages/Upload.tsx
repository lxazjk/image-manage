import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Paper,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material'
import { CloudUpload, Delete, Link } from '@mui/icons-material'
import { useSnackbar } from 'notistack'

import { imageAPI } from '../services/api'

interface UploadResult {
  id: number
  filename: string
  file_size: number
  thumbnail: string
  created_at: string
}

interface UploadError {
  filename: string
  error: string
}

const Upload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{
    uploaded: UploadResult[]
    failed: UploadError[]
  }>({ uploaded: [], failed: [] })

  const { enqueueSnackbar } = useSnackbar()

  // 调试：监控files状态变化
  React.useEffect(() => {
    console.log('Files状态更新:', files.length, '个文件')
    console.log('文件列表:', files.map(f => ({ name: f.name, size: f.size })))
  }, [files])

  // 检查认证状态
  React.useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    console.log('认证状态检查:')
    console.log('- Token:', token ? '存在' : '不存在')
    console.log('- User:', user ? '存在' : '不存在')

    if (user) {
      try {
        const userData = JSON.parse(user)
        console.log('- 用户名:', userData.username)
        console.log('- 角色:', userData.role)
      } catch (e) {
        console.log('- 用户数据解析失败')
      }
    } else {
      console.log('⚠️  用户未登录，可能无法上传文件')
    }
  }, [])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    console.log('=== 文件拖拽/选择事件 ===')
    console.log('接受的文件数量:', acceptedFiles.length)
    console.log('接受的文件详情:', acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })))
    console.log('拒绝的文件数量:', rejectedFiles.length)
    console.log('拒绝的文件详情:', rejectedFiles.map(f => ({ name: f.file?.name, errors: f.errors })))

    setFiles(prev => {
      const newFiles = [...prev, ...acceptedFiles]
      console.log('更新后的文件列表:', newFiles.map(f => f.name))
      return newFiles
    })

    if (acceptedFiles.length > 0) {
      enqueueSnackbar(`已选择 ${acceptedFiles.length} 个文件`, { variant: 'success' })
    }

    if (rejectedFiles.length > 0) {
      enqueueSnackbar(`${rejectedFiles.length} 个文件被拒绝，请检查文件格式`, { variant: 'warning' })
    }
  }, [enqueueSnackbar])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/webp': ['.webp']
    },
    multiple: true
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    console.log('=== 开始上传流程 ===')
    console.log('当前文件数量:', files.length)
    console.log('认证token:', localStorage.getItem('token') ? '存在' : '不存在')

    if (files.length === 0) {
      console.log('没有文件，退出上传')
      enqueueSnackbar('请先选择文件', { variant: 'warning' })
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      console.log('创建FormData...')
      // 创建FormData
      const formData = new FormData()
      files.forEach((file, index) => {
        console.log(`添加文件 ${index + 1}:`, file.name, file.size, 'bytes', file.type)
        formData.append('files', file)
      })

      // 检查FormData内容
      console.log('FormData entries:')
      let fileCount = 0
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          fileCount++
          console.log(`  ${key}[${fileCount}]: File(${value.name}, ${value.size} bytes, ${value.type})`)
          console.log(`    Last modified: ${value.lastModified}`)
          console.log(`    WebkitRelativePath: ${value.webkitRelativePath}`)
        } else {
          console.log(`  ${key}: ${value}`)
        }
      }
      console.log(`Total files in FormData: ${fileCount}`)

      console.log('FormData创建完成，准备发送请求...')
      setProgress(30)

      // 上传文件
      console.log('调用imageAPI.upload...')
      const response = await imageAPI.upload(formData)
      console.log('收到响应:', response.status, response.data)

      setProgress(80)
      setResults(response.data)
      setFiles([])

      setProgress(100)

      if (response.data.uploaded && response.data.uploaded.length > 0) {
        console.log(`成功上传 ${response.data.uploaded.length} 个文件`)
        enqueueSnackbar(`成功上传 ${response.data.uploaded.length} 个文件`, { variant: 'success' })
      }

      if (response.data.failed && response.data.failed.length > 0) {
        console.log(`失败 ${response.data.failed.length} 个文件`)
        enqueueSnackbar(`失败 ${response.data.failed.length} 个文件`, { variant: 'warning' })
      }

    } catch (err: any) {
      console.error('=== 上传出现错误 ===')
      console.error('错误详情:', err)
      console.error('错误响应:', err.response)
      console.error('错误消息:', err.message)

      setProgress(0)

      let errorMessage = '上传失败'
      if (err.response?.status === 401) {
        errorMessage = '请先登录'
      } else if (err.response?.status === 413) {
        errorMessage = '文件过大'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = `网络错误: ${err.message}`
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
    } finally {
      console.log('=== 上传流程结束 ===')
      setUploading(false)
    }
  }

  const copyImageLink = (image: UploadResult) => {
    // 这里可以根据后端API调整链接格式
    const link = `${window.location.origin}/api/v1/images/${image.id}`
    navigator.clipboard.writeText(link)
    enqueueSnackbar('链接已复制到剪贴板', { variant: 'success' })
  }

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
        上传图片
      </Typography>

      {files.length > 0 && (
        <Typography variant="h6" color="primary" gutterBottom>
          已选择 {files.length} 个文件
        </Typography>
      )}

      {/* 上传区域 */}
      <Paper
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'active' : ''}`}
        sx={{
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer'
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? '释放文件以上传' : '拖拽文件到此处，或点击选择文件'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          支持 JPG, PNG, GIF, BMP, WebP 格式
        </Typography>
        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
          当前已选择: {files.length} 个文件
        </Typography>
      </Paper>

      {/* 文件列表 */}
      {files.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            待上传文件 ({files.length})
          </Typography>
          <List>
            {files.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFile(index)}>
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* 上传按钮 */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => {
            console.log('=== 点击上传按钮 ===')
            console.log('文件数量:', files.length)
            console.log('上传状态:', uploading ? '进行中' : '未开始')

            const token = localStorage.getItem('token')
            if (!token) {
              console.log('❌ 未登录，无法上传')
              enqueueSnackbar('请先登录', { variant: 'error' })
              return
            }

            uploadFiles()
          }}
          disabled={files.length === 0 || uploading}
          fullWidth
        >
          {uploading ? '上传中...' : `上传 ${files.length} 个文件`}
        </Button>
      </Box>

      {/* 上传进度 */}
      {uploading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            上传进度: {progress}%
          </Typography>
        </Box>
      )}

      {/* 上传结果 */}
      {results.uploaded.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom color="success.main">
            上传成功 ({results.uploaded.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {results.uploaded.map((result) => (
              <Chip
                key={result.id}
                label={result.filename}
                onClick={() => copyImageLink(result)}
                icon={<Link />}
                variant="outlined"
                color="success"
              />
            ))}
          </Box>
        </Paper>
      )}

      {results.failed.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            上传失败 ({results.failed.length})
          </Typography>
          {results.failed.map((error, index) => (
            <Typography key={index} variant="body2">
              {error.filename}: {error.error}
            </Typography>
          ))}
        </Alert>
      )}
    </Box>
  )
}

export default Upload
