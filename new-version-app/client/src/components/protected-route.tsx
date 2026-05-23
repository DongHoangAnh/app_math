import { useAuth } from '@/contexts/auth-context'
import { useEffect } from 'react'
import { useLocation } from 'wouter'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [location, navigate] = useLocation()

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(location)}`)
    }
  }, [user, loading, navigate, location])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-blue-900">Đang tải...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
