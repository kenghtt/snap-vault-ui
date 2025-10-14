import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/home'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center">Welcome back</h2>
          <form onSubmit={onSubmit} className="form-control gap-3 mt-2">
            <label className="input input-bordered flex items-center gap-2">
              <span className="min-w-16">Email</span>
              <input
                type="email"
                className="grow"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="input input-bordered flex items-center gap-2">
              <span className="min-w-16">Password</span>
              <input
                type="password"
                className="grow"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="loading loading-spinner" /> : 'Sign in'}
            </button>
          </form>
          <div className="flex justify-between text-sm mt-3">
            <Link className="link" to="/auth/reset">Forgot password?</Link>
            <span>
              New here? <Link className="link" to="/auth/signup">Create account</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
