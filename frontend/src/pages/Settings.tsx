import React, { useState, useContext } from 'react'
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Divider
} from '@mui/material'
import { useSnackbar } from 'notistack'

import { AuthContext } from '../contexts/AuthContext'
import { configAPI } from '../services/api'

const Settings: React.FC = () => {
  const { user } = useContext(AuthContext)
  const { enqueueSnackbar } = useSnackbar()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // 系统配置（仅管理员可见）
  const [siteName, setSiteName] = useState('')
  const [siteFavicon, setSiteFavicon] = useState('')
  const [allowedExtensions, setAllowedExtensions] = useState('')
  const [qwenEnabled, setQwenEnabled] = useState(false)
  const [qwenApiKey, setQwenApiKey] = useState('')
  const [qwenBaseUrl, setQwenBaseUrl] = useState('')
  const [qwenModel, setQwenModel] = useState('')
  const [configLoading, setConfigLoading] = useState(false)
  const [testingQwen, setTestingQwen] = useState(false)

  // 加载配置
  React.useEffect(() => {
    if (user?.role === 'admin') {
      const loadConfig = async () => {
        try {
          const response = await configAPI.getConfig()
          const config = response.data
          setSiteName(config.site?.name || '')
          setSiteFavicon(config.site?.favicon || '')
          setAllowedExtensions(config.storage?.allowed_extensions || '')
          setQwenEnabled(config.qwen?.enabled || false)
          setQwenApiKey(config.qwen?.api_key || '')
          setQwenBaseUrl(config.qwen?.base_url || '')
          setQwenModel(config.qwen?.model || '')
        } catch (err: any) {
          enqueueSnackbar('加载配置失败', { variant: 'error' })
        }
      }
      loadConfig()
    }
  }, [user, enqueueSnackbar])

  // 修改密码
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      enqueueSnackbar('请填写所有字段', { variant: 'warning' })
      return
    }

    if (newPassword !== confirmPassword) {
      enqueueSnackbar('新密码和确认密码不一致', { variant: 'warning' })
      return
    }

    if (newPassword.length < 6) {
      enqueueSnackbar('新密码至少需要6个字符', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      // 这里需要后端实现修改密码的API
      // await userAPI.changePassword(currentPassword, newPassword)
      enqueueSnackbar('密码修改功能暂未实现', { variant: 'info' })

      // 清空表单
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || '密码修改失败', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 保存系统配置
  const handleSaveConfig = async () => {
    if (user?.role !== 'admin') {
      enqueueSnackbar('权限不足', { variant: 'error' })
      return
    }

    setConfigLoading(true)
    try {
      await configAPI.updateConfig({
        site: {
          name: siteName,
          favicon: siteFavicon
        },
        storage: {
          allowed_extensions: allowedExtensions
        },
        qwen: {
          enabled: qwenEnabled,
          api_key: qwenApiKey,
          base_url: qwenBaseUrl,
          model: qwenModel
        }
      })

      enqueueSnackbar('配置保存成功', { variant: 'success' })
    } catch (err: any) {
      enqueueSnackbar('配置保存失败', { variant: 'error' })
    } finally {
      setConfigLoading(false)
    }
  }

  // 测试Qwen连接
  const handleTestQwen = async () => {
    if (user?.role !== 'admin') {
      enqueueSnackbar('权限不足', { variant: 'error' })
      return
    }

    setTestingQwen(true)
    try {
      const response = await fetch('/api/v1/config/test-qwen', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        enqueueSnackbar('Qwen连接测试成功', { variant: 'success' })
      } else {
        enqueueSnackbar(result.message, { variant: 'error' })
      }
    } catch (err: any) {
      enqueueSnackbar('测试失败: ' + err.message, { variant: 'error' })
    } finally {
      setTestingQwen(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        设置
      </Typography>

      {/* 用户设置 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          用户设置
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            当前用户: {user?.username} ({user?.role})
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" gutterBottom>
          修改密码
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
          <TextField
            label="当前密码"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
          />

          <TextField
            label="新密码"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            helperText="至少6个字符"
          />

          <TextField
            label="确认新密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={loading}
            sx={{ alignSelf: 'flex-start' }}
          >
            {loading ? '修改中...' : '修改密码'}
          </Button>
        </Box>
      </Paper>

      {/* 系统设置（仅管理员） */}
      {user?.role === 'admin' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            系统设置
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            这些设置将影响整个系统的行为
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
            <TextField
              label="站点名称"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              fullWidth
            />

            <TextField
              label="站点图标URL"
              value={siteFavicon}
              onChange={(e) => setSiteFavicon(e.target.value)}
              fullWidth
              helperText="favicon图标的URL地址"
            />

            <TextField
              label="允许的文件扩展名"
              value={allowedExtensions}
              onChange={(e) => setAllowedExtensions(e.target.value)}
              fullWidth
              helperText="用逗号分隔，如: jpg,png,gif,jpeg"
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              AI标签生成设置
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <input
                type="checkbox"
                checked={qwenEnabled}
                onChange={(e) => setQwenEnabled(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              <Typography>启用AI自动标签生成</Typography>
            </Box>

            {qwenEnabled && (
              <>
                <TextField
                  label="API Key"
                  type="password"
                  value={qwenApiKey}
                  onChange={(e) => setQwenApiKey(e.target.value)}
                  fullWidth
                  helperText="通义千问API Key"
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="API基础URL"
                  value={qwenBaseUrl}
                  onChange={(e) => setQwenBaseUrl(e.target.value)}
                  fullWidth
                  helperText="默认: https://dashscope.aliyuncs.com/api/v1/"
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="模型名称"
                  value={qwenModel}
                  onChange={(e) => setQwenModel(e.target.value)}
                  fullWidth
                  helperText="默认: qwen-vl-max"
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <Button
              variant="contained"
              onClick={handleSaveConfig}
              disabled={configLoading}
              sx={{ alignSelf: 'flex-start', mr: 2 }}
            >
              {configLoading ? '保存中...' : '保存配置'}
            </Button>

            {qwenEnabled && (
              <Button
                variant="outlined"
                onClick={handleTestQwen}
                disabled={configLoading || testingQwen}
                sx={{ alignSelf: 'flex-start' }}
              >
                {testingQwen ? '测试中...' : '测试Qwen连接'}
              </Button>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  )
}

export default Settings
