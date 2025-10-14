import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const navigate = useNavigate()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/update-password`,
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data?.user && !data.user.confirmed_at) {
      setMessage('Check your email to confirm your account.')
    } else {
      navigate('/home', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center">Create your account</h2>
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
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
            {message && <div className="alert alert-info text-sm"><span>{message}</span></div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="loading loading-spinner" /> : 'Create account'}
            </button>
          </form>
          <div className="flex justify-between text-sm mt-3">
            <span>
              Already have an account? <Link className="link" to="/auth/login">Sign in</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
