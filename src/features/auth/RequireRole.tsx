import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from './session'
export function RequireRole({ role }: { role: 'BIDDER' | 'AUCTIONEER' }) {
  const session = useSession()
  const location = useLocation()
  if (!session)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  if (session.user.role !== role)
    return (
      <main id="main-content" className="account-page">
        <h1>Acesso restrito</h1>
        <p>
          Esta área está disponível apenas para{' '}
          {role === 'BIDDER' ? 'licitantes' : 'leiloeiros'}.
        </p>
      </main>
    )
  return <Outlet />
}
