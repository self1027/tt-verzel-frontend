import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { api, throwApiError } from '@/api/client'
import { startSession, safeReturnTo, useSession } from './session'

export function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const target = safeReturnTo(params.get('returnTo'))
  if (session)
    return (
      <Navigate
        to={
          target === '/' && session.user.role === 'AUCTIONEER'
            ? '/seller'
            : target
        }
        replace
      />
    )
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const fields = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      const login = await api.POST('/auth/login', {
        body: {
          email: String(fields.get('email')).trim(),
          password: String(fields.get('password')),
        },
      })
      if (!login.data) throwApiError(login.response.status, login.error)
      const me = await api.GET('/auth/me', {
        headers: { Authorization: `Bearer ${login.data.accessToken}` },
      })
      if (!me.data) throwApiError(me.response.status, me.error)
      startSession(login.data.accessToken, me.data.user, login.data.expiresIn)
      navigate(
        target === '/' && me.data.user.role === 'AUCTIONEER'
          ? '/seller'
          : target,
        { replace: true },
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível entrar. Tente novamente.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <main id="main-content" className="account-page login-layout">
      <section className="login-intro">
        <p className="eyebrow">Verzel Auction House</p>
        <h1>Entre na disputa.</h1>
        <p>
          Entre para acompanhar seus lotes, gerenciar sua carteira e participar
          dos leilões.
        </p>
        <p className="muted">
          A vitrine e a auditoria continuam abertas a todos.
        </p>
      </section>
      <form
        className="form-panel"
        onSubmit={submit}
        aria-label="Entrar na conta"
      >
        <h2>Bem-vindo de volta</h2>
        <p>Use a conta fornecida pela plataforma.</p>
        <label>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="username"
            maxLength={255}
            required
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={1024}
            required
          />
        </label>
        {error ? (
          <p role="alert" className="feedback-error">
            {error}
          </p>
        ) : null}
        <button className="button button-primary" disabled={pending}>
          {pending ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="muted">
          A sessão fica apenas neste navegador aberto. Ao recarregar, entre
          novamente.
        </p>
      </form>
    </main>
  )
}
