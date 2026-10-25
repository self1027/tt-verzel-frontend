import { useSession, endSession } from '@/features/auth/session'
import { Link, NavLink, Outlet } from 'react-router'
import { ThemeToggle } from './ThemeToggle'

export function SiteLayout() {
  const session = useSession()
  return (
    <>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Verzel Auction, início">
            <span className="brand-mark" aria-hidden="true">
              V<span>/</span>
            </span>
            <span className="brand-name">
              verzel<span>auction</span>
            </span>
          </Link>
          <nav className="main-nav" aria-label="Navegação principal">
            <NavLink to="/" end>
              Explorar leilões
            </NavLink>
            {session?.user.role === 'BIDDER' ? (
              <>
                <NavLink to="/wallet">Carteira</NavLink>
                <NavLink to="/my-bids">Meus arremates</NavLink>
              </>
            ) : null}
            {session?.user.role === 'AUCTIONEER' ? (
              <NavLink to="/seller">Painel do leiloeiro</NavLink>
            ) : null}
          </nav>
          <div className="session-actions">
            <ThemeToggle />
            {session ? (
              <>
                <span className="session-name">{session.user.displayName}</span>
                <button className="text-button" onClick={endSession}>
                  Sair
                </button>
              </>
            ) : (
              <Link to="/login">Entrar</Link>
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <Link className="footer-brand" to="/">
          Verzel Auction
        </Link>
        <p>Leilões públicos. Valores e prazos informados pela plataforma.</p>
      </footer>
    </>
  )
}
