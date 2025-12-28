import React from 'react'

interface User {
  id: number
  username: string
  email: string
  role: 'pending' | 'user' | 'admin'
  created_at: string
}

interface AuthContextType {
  user: User | null
  login: (token: string, userData: User) => void
  logout: () => void
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {}
})



