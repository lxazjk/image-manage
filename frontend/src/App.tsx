import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Container, AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import { useSnackbar } from 'notistack'

import Login from './pages/Login'
import Register from './pages/Register'
import Gallery from './pages/Gallery'
import Upload from './pages/Upload'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import ImageDetail from './pages/ImageDetail'
import { AuthContext } from './contexts/AuthContext'
import { api } from './services/api'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    // 检查本地存储中的token
    const token = localStorage.getItem('token')
    if (token) {
      // 验证token有效性
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // 这里可以添加token验证逻辑
      // 暂时假设token有效，从本地存储获取用户信息
      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    }
    setLoading(false)
  }, [])

  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
    enqueueSnackbar('登录成功', { variant: 'success' })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    enqueueSnackbar('已退出登录', { variant: 'info' })
  }

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {user && (
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                图片管理系统
              </Typography>
              <Button color="inherit" onClick={() => window.location.href = '/gallery'}>
                相册
              </Button>
              <Button color="inherit" onClick={() => window.location.href = '/upload'}>
                上传
              </Button>
              {user.role === 'admin' && (
                <Button color="inherit" onClick={() => window.location.href = '/admin'}>
                  管理
                </Button>
              )}
              <Button color="inherit" onClick={() => window.location.href = '/settings'}>
                设置
              </Button>
              <Button color="inherit" onClick={logout}>
                退出
              </Button>
            </Toolbar>
          </AppBar>
        )}

        <Container maxWidth="lg" sx={{ mt: user ? 4 : 0, mb: 4 }}>
          <Routes>
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/gallery" replace />}
            />
            <Route
              path="/register"
              element={!user ? <Register /> : <Navigate to="/gallery" replace />}
            />
            <Route
              path="/gallery"
              element={user ? <Gallery /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/upload"
              element={user ? <Upload /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/settings"
              element={user ? <Settings /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin"
              element={user && user.role === 'admin' ? <Admin /> : <Navigate to="/gallery" replace />}
            />
            <Route
              path="/image/:id"
              element={user ? <ImageDetail /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/"
              element={<Navigate to={user ? "/gallery" : "/login"} replace />}
            />
          </Routes>
        </Container>
      </div>
    </AuthContext.Provider>
  )
}

export default App



