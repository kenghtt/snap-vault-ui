import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Attempt to exchange code for a session if we're on a recovery URL
    const url = new URL(window.location.href)
    const type = url.searchParams.get('type') || url.hash.match(/type=([^&]+)/)?.[1]
    if (type === 'recovery') {
      // Best-effort exchange; Supabase may already set the session via detectSessionInUrl
      supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {})
      setMessage('Please set your new password below.')
    }
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('Password updated successfully. Redirecting...')
    setTimeout(() => navigate('/home', { replace: true }), 1200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center">Set a new password</h2>
          {!session && (
            <div className="alert alert-warning text-sm">
              <span>
                If you came from a password recovery email, this page will let you set a new password.
                If nothing happens, click the link in your email again.
              </span>
            </div>
          )}
          <form onSubmit={onSubmit} className="form-control gap-3 mt-2">
            <label className="input input-bordered flex items-center gap-2">
              <span className="min-w-16">Password</span>
              <input
                type="password"
                className="grow"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
            {message && <div className="alert alert-info text-sm"><span>{message}</span></div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="loading loading-spinner" /> : 'Update password'}
            </button>
          </form>
          <div className="flex justify-between text-sm mt-3">
            <Link className="link" to="/auth/login">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
