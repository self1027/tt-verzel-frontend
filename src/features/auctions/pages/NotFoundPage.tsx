import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main id="main-content" className="message-page">
      <p className="eyebrow">Página não encontrada</p>
      <h1>Esse endereço não está disponível.</h1>
      <Link className="text-link" to="/">
        Voltar aos leilões
      </Link>
    </main>
  )
}
