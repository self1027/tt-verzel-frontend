import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '@/api/generated/schema'
import { useSession } from '@/features/auth/session'
import { RequestState, Pagination } from '@/components/Feedback'
import { getProducts, searchProducts, importProduct } from './api'
export function ProductPicker({
  select,
}: {
  select: (product: components['schemas']['ProductSnapshot']) => void
}) {
  const session = useSession()!
  const client = useQueryClient()
  const [source, setSource] = useState<'local' | 'external'>('local')
  const [search, setSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const local = useQuery({
    queryKey: ['private', session.user.id, 'products', skip],
    queryFn: ({ signal }) => getProducts(skip, signal),
    enabled: source === 'local',
  })
  const external = useQuery({
    queryKey: ['private', session.user.id, 'external', search, skip],
    queryFn: ({ signal }) => searchProducts(search, skip, signal),
    enabled: source === 'external' && Boolean(search),
    retry: false,
  })
  const active = source === 'local' ? local : external
  const page = active.data
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSkip(0)
    setSearch(String(data.get('search')).trim())
    if (String(data.get('search')).trim() === search) void external.refetch()
  }
  async function importItem(id: number) {
    if (pending) return
    setPending(true)
    setError('')
    try {
      const product = await importProduct(id)
      select(product)
      void client.invalidateQueries({
        queryKey: ['private', session.user.id, 'products'],
      })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível importar o produto.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="account-panel" aria-labelledby="product-picker-title">
      <h2 id="product-picker-title">Escolher produto</h2>
      <p className="muted">
        Use um produto já importado ou busque no catálogo externo.
      </p>
      <div
        className="lifecycle-filters"
        role="group"
        aria-label="Origem dos produtos"
      >
        <button
          aria-pressed={source === 'local'}
          onClick={() => {
            setSource('local')
            setSkip(0)
          }}
        >
          Produtos importados
        </button>
        <button
          aria-pressed={source === 'external'}
          onClick={() => {
            setSource('external')
            setSkip(0)
          }}
        >
          Buscar na API externa
        </button>
      </div>
      {source === 'external' ? (
        <form className="form-panel product-search" onSubmit={submit}>
          <label>
            Buscar produto
            <input name="search" required maxLength={200} />
          </label>
          <button className="button button-filter">Buscar produtos</button>
        </form>
      ) : null}
      <RequestState
        pending={active.isFetching}
        error={active.error}
        retry={() => void active.refetch()}
      />
      {error ? (
        <p className="feedback-error" role="alert">
          {error}
        </p>
      ) : null}
      {page?.total === 0 ? (
        <p className="muted">Nenhum produto encontrado nesta consulta.</p>
      ) : null}
      {source === 'external' && active.error ? (
        <p className="muted">
          O fornecedor externo está indisponível. Você pode continuar com
          produtos já importados.
        </p>
      ) : null}
      <ul className="account-list picker-list">
        {source === 'local'
          ? local.data?.products.map((product) => (
              <li key={product.id}>
                <span>{product.title}</span>
                <button
                  className="button button-filter"
                  onClick={() => select(product)}
                >
                  Selecionar para lote
                </button>
              </li>
            ))
          : external.data?.products.map((product) => (
              <li key={product.id}>
                <span>{product.title}</span>
                <button
                  className="button button-filter"
                  disabled={pending}
                  onClick={() => void importItem(product.id)}
                >
                  {pending ? 'Importando...' : 'Importar e selecionar'}
                </button>
              </li>
            ))}
      </ul>
      {page ? <Pagination {...page} move={setSkip} /> : null}
    </section>
  )
}
