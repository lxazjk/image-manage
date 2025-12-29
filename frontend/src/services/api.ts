import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 调试：记录请求信息
    console.log('=== API Request ===')
    console.log('URL:', config.url)
    console.log('Method:', config.method)
    console.log('Headers:', config.headers)
    if (config.data instanceof FormData) {
      console.log('Data: FormData with', [...config.data.entries()].length, 'entries')
    } else {
      console.log('Data:', config.data)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('=== API Response ===')
    console.log('Status:', response.status)
    console.log('Data:', response.data)
    return response
  },
  (error) => {
    console.log('=== API Error ===')
    console.log('Status:', error.response?.status)
    console.log('Data:', error.response?.data)
    console.log('Error:', error.message)

    if (error.response?.status === 401) {
      // Token 过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
}

export const imageAPI = {
  upload: (formData: FormData) => {
    return api.post('/images/upload', formData)
  },

  getImages: (page: number = 1, tag?: string, search?: string) =>
    api.get('/images', { params: { page, tag, search } }),

  getImageDetail: (id: number) =>
    api.get(`/images/${id}`),

  editImage: (id: number, operation: string, params: any) =>
    api.post(`/images/${id}/edit`, { operation, params }),

  deleteImage: (id: number) =>
    api.post(`/images/${id}/delete`),

  batchDeleteImages: (imageIds: number[]) =>
    api.post('/images/batch-delete', { image_ids: imageIds }),

  restoreImage: (id: number) =>
    api.post(`/images/${id}/restore`),
}

export const tagAPI = {
  getTags: () => api.get('/tags'),

  createTag: (name: string) =>
    api.post('/tags', { name }),

  addTagsToImage: (imageId: number, tagIds: number[]) =>
    api.post(`/images/${imageId}/tags`, { tag_ids: tagIds }),

  removeTagsFromImage: (imageId: number, tagIds: number[]) =>
    api.delete(`/images/${imageId}/tags`, { data: { tag_ids: tagIds } }),
}

export const userAPI = {
  getUsers: () => api.get('/users'),

  approveUser: (userId: number) =>
    api.post(`/users/${userId}/approve`),

  updateUserRole: (userId: number, role: string) =>
    api.put(`/users/${userId}/role`, { role }),
}

export const configAPI = {
  getConfig: () => api.get('/config'),

  updateConfig: (config: any) =>
    api.put('/config', config),
}

export const mcpAPI = {
  // 获取MCP工具列表
  getTools: () => api.get('/mcp/tools'),

  // 调用MCP工具
  callTool: (toolName: string, args: any) =>
    api.post('/mcp/call', {
      name: toolName,
      arguments: args
    }),
}
