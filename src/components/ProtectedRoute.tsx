import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type {JSX} from "react";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />
  }

  return children
}
