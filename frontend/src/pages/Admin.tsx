import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material'
import { Person, CheckCircle, Cancel } from '@mui/icons-material'
import { useSnackbar } from 'notistack'

import { userAPI } from '../services/api'

interface User {
  id: number
  username: string
  email: string
  role: 'pending' | 'user' | 'admin'
  created_at: string
  updated_at: string | null
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [roleDialog, setRoleDialog] = useState(false)
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')

  const { enqueueSnackbar } = useSnackbar()

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const response = await userAPI.getUsers()
      setUsers(response.data)
    } catch (err: any) {
      enqueueSnackbar('加载用户列表失败', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // 审批用户
  const handleApproveUser = async (userId: number) => {
    try {
      await userAPI.approveUser(userId)
      enqueueSnackbar('用户审批成功', { variant: 'success' })
      loadUsers() // 重新加载列表
    } catch (err: any) {
      enqueueSnackbar('审批失败', { variant: 'error' })
    }
  }

  // 修改用户角色
  const handleChangeRole = async () => {
    if (!selectedUser) return

    try {
      await userAPI.updateUserRole(selectedUser.id, newRole)
      enqueueSnackbar('角色修改成功', { variant: 'success' })
      setRoleDialog(false)
      setSelectedUser(null)
      loadUsers() // 重新加载列表
    } catch (err: any) {
      enqueueSnackbar('角色修改失败', { variant: 'error' })
    }
  }

  // 打开角色修改对话框
  const openRoleDialog = (user: User) => {
    setSelectedUser(user)
    setNewRole(user.role === 'admin' ? 'user' : 'admin')
    setRoleDialog(true)
  }

  // 获取角色显示文本
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'pending':
        return { text: '待审核', color: 'warning' as const }
      case 'user':
        return { text: '普通用户', color: 'default' as const }
      case 'admin':
        return { text: '管理员', color: 'primary' as const }
      default:
        return { text: role, color: 'default' as const }
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        管理面板
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        作为管理员，您可以审批新用户注册、管理用户角色等
      </Alert>

      {/* 用户管理 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Person sx={{ mr: 1 }} />
          用户管理
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>用户名</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>注册时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const roleInfo = getRoleDisplay(user.role)
                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={roleInfo.text}
                        color={roleInfo.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {user.role === 'pending' && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircle />}
                          onClick={() => handleApproveUser(user.id)}
                          sx={{ mr: 1 }}
                        >
                          审批
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openRoleDialog(user)}
                      >
                        修改角色
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {users.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            暂无用户
          </Typography>
        )}
      </Paper>

      {/* 角色修改对话框 */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)}>
        <DialogTitle>
          修改用户角色
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            将用户 "{selectedUser?.username}" 的角色修改为:
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>新角色</InputLabel>
            <Select
              value={newRole}
              label="新角色"
              onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
            >
              <MenuItem value="user">普通用户</MenuItem>
              <MenuItem value="admin">管理员</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(false)}>取消</Button>
          <Button onClick={handleChangeRole} variant="contained">
            确认修改
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Admin



