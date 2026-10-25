export function RequestState({
  pending,
  error,
  retry,
}: {
  pending: boolean
  error: Error | null
  retry: () => void
}) {
  if (pending)
    return (
      <p role="status" className="inline-status">
        Carregando dados da plataforma...
      </p>
    )
  if (error)
    return (
      <div className="feedback-error" role="alert">
        <p>{error.message || 'Não foi possível carregar os dados.'}</p>
        <button className="text-button" onClick={retry}>
          Tentar novamente
        </button>
      </div>
    )
  return null
}
export function Pagination({
  total,
  limit,
  skip,
  move,
}: {
  total: number
  limit: number
  skip: number
  move: (skip: number) => void
}) {
  if (total <= limit) return null
  return (
    <nav className="pagination" aria-label="Paginação">
      <button
        disabled={skip === 0}
        onClick={() => move(Math.max(0, skip - limit))}
      >
        Anterior
      </button>
      <span>
        Página {Math.floor(skip / limit) + 1} de {Math.ceil(total / limit)}
      </span>
      <button
        disabled={skip + limit >= total || skip + limit > 2147483647}
        onClick={() => move(skip + limit)}
      >
        Próxima
      </button>
    </nav>
  )
}
