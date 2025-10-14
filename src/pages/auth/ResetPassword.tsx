import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('If an account exists for that email, a reset link has been sent.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center">Reset your password</h2>
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
            {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
            {message && <div className="alert alert-info text-sm"><span>{message}</span></div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="loading loading-spinner" /> : 'Send reset link'}
            </button>
          </form>
          <div className="flex justify-between text-sm mt-3">
            <Link className="link" to="/auth/login">Back to login</Link>
            <span>
              New here? <Link className="link" to="/auth/signup">Create account</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
