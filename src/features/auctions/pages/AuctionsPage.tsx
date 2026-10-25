import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { AuctionCard } from '../components/AuctionCard'
import { AuctionStatus } from '../components/AuctionStatus'
import { getAuctions } from '../api/auctions'
import { auctionKeys } from '../api/keys'
import {
  centsToBrlInput,
  formatCentsToBrl,
  parseBrlInputToCents,
} from '../utils/money'
import {
  parseAuctionSearch,
  serializeAuctionSearch,
  type AuctionSearch,
  type AuctionSort,
  type LifecycleState,
} from '../utils/search'

const states: { value: LifecycleState; label: string }[] = [
  { value: 'LIVE', label: 'Ao vivo' },
  { value: 'SCHEDULED', label: 'Agendados' },
  { value: 'FINALIZING', label: 'Em encerramento' },
  { value: 'SETTLED', label: 'Finalizados' },
  { value: 'CLOSED_NO_BIDS', label: 'Encerrados sem lances' },
]
const sorts: { value: AuctionSort; label: string }[] = [
  { value: 'endsAt_asc', label: 'Encerramento mais próximo' },
  { value: 'endsAt_desc', label: 'Encerramento mais distante' },
  { value: 'price_asc', label: 'Menor valor do lote' },
  { value: 'price_desc', label: 'Maior valor do lote' },
]

export function AuctionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const parsedSearch = parseAuctionSearch(searchParams)
  const search = {
    ...parsedSearch,
    lifecycleState: states.some(
      ({ value }) => value === parsedSearch.lifecycleState,
    )
      ? parsedSearch.lifecycleState
      : ('LIVE' as const),
  }
  const query = useQuery({
    queryKey: auctionKeys.list(search),
    queryFn: ({ signal }) => getAuctions(search, signal),
    refetchInterval: 15000,
  })
  const [q, setQ] = useState(search.q)
  const [minPrice, setMinPrice] = useState(
    search.minPriceCents ? centsToBrlInput(search.minPriceCents) : '',
  )
  const [maxPrice, setMaxPrice] = useState(
    search.maxPriceCents ? centsToBrlInput(search.maxPriceCents) : '',
  )
  const [filterError, setFilterError] = useState('')
  const [failedHeroImage, setFailedHeroImage] = useState<string>()

  const [previousSearch, setPreviousSearch] = useState(searchParams.toString())
  if (previousSearch !== searchParams.toString()) {
    setPreviousSearch(searchParams.toString())
    setQ(search.q)
    setMinPrice(
      search.minPriceCents ? centsToBrlInput(search.minPriceCents) : '',
    )
    setMaxPrice(
      search.maxPriceCents ? centsToBrlInput(search.maxPriceCents) : '',
    )
    setFilterError('')
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const minimum = parseBrlInputToCents(minPrice)
    const maximum = parseBrlInputToCents(maxPrice)
    if (
      (minPrice && minimum === undefined) ||
      (maxPrice && maximum === undefined)
    ) {
      setFilterError('Digite valores em reais com até duas casas decimais.')
      return
    }
    if (
      minimum !== undefined &&
      maximum !== undefined &&
      BigInt(minimum) > BigInt(maximum)
    ) {
      setFilterError('O valor mínimo deve ser menor ou igual ao máximo.')
      return
    }
    const next: AuctionSearch = {
      ...search,
      q: q.trim(),
      minPriceCents: minimum,
      maxPriceCents: maximum,
      page: 1,
      skip: 0,
    }
    setSearchParams(serializeAuctionSearch(next))
  }

  function updateFilter(key: 'lifecycleState' | 'sort', value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }

  function movePage(page: number) {
    const params = new URLSearchParams(searchParams)
    if (page <= 1) params.delete('page')
    else params.set('page', String(page))
    setSearchParams(params)
  }

  const auctions = (query.data?.auctions ?? []).filter(
    (auction) => auction.lifecycleState !== 'CANCELLED',
  )
  const featured =
    auctions.find((auction) => auction.lifecycleState === 'LIVE') ??
    auctions.find((auction) => auction.lifecycleState === 'SCHEDULED')
  const visibleAuctions = featured
    ? auctions.filter((auction) => auction.id !== featured.id)
    : auctions
  const currentPage = query.data
    ? Math.floor(query.data.skip / query.data.limit) + 1
    : search.page
  const pageCount = query.data
    ? Math.ceil(query.data.total / query.data.limit)
    : 0
  const featuredImage = featured?.productSnapshot.imageUrl
  const safeFeaturedImage =
    featuredImage && /^https?:\/\//i.test(featuredImage)
      ? featuredImage
      : undefined

  return (
    <main id="main-content" className="market-page" tabIndex={-1}>
      <div className="market-intro">
        <div>
          <p className="eyebrow">Verzel Auction House</p>
          <h1>Seu próximo arremate.</h1>
        </div>
        <p>
          Explore os lotes, acompanhe os prazos
          <br className="desktop-break" /> e encontre o que faz sentido para
          você.
        </p>
      </div>
      {query.isPending ? (
        <section className="hero hero-loading" aria-label="Carregando leilões">
          <div className="hero-skeleton" />
          <p>Buscando os lotes disponíveis...</p>
        </section>
      ) : null}
      {query.isError && !query.data ? (
        <section className="state-panel state-error" role="alert">
          <p className="eyebrow">Não foi possível carregar</p>
          <h2>Os leilões não responderam.</h2>
          <p>Confira sua conexão e tente novamente.</p>
          <button
            className="button button-primary"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </button>
        </section>
      ) : null}

      <section
        className="auction-section"
        id="auctions"
        aria-labelledby="auction-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catálogo público</p>
            <h2 id="auction-heading">
              {query.data?.total === 0
                ? 'O próximo lote ainda não chegou.'
                : 'Explore os leilões'}
            </h2>
          </div>
          {query.data ? (
            <p className="result-count" role="status">
              <strong>{query.data.total}</strong>{' '}
              {query.data.total === 1 ? 'lote encontrado' : 'lotes encontrados'}
            </p>
          ) : null}
        </div>
        <div
          className="lifecycle-filters"
          role="group"
          aria-label="Situação dos leilões"
        >
          {states.map((state) => (
            <button
              key={state.value}
              type="button"
              aria-pressed={search.lifecycleState === state.value}
              onClick={() => updateFilter('lifecycleState', state.value)}
            >
              {state.label}
            </button>
          ))}
        </div>
        <form
          className="filter-bar"
          onSubmit={applySearch}
          aria-label="Filtros de leilões"
        >
          <label className="search-field">
            <span>Buscar por título</span>
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.currentTarget.value)}
              placeholder="O que você procura?"
            />
          </label>
          <label>
            <span>Ordenar por</span>
            <select
              value={search.sort ?? ''}
              onChange={(event) =>
                updateFilter('sort', event.currentTarget.value)
              }
            >
              <option value="">Mais recentes</option>
              {sorts.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Valor do lote a partir de</span>
            <input
              inputMode="decimal"
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'price-filter-error' : undefined}
              value={minPrice}
              onChange={(event) => setMinPrice(event.currentTarget.value)}
              placeholder="R$ 0,00"
            />
          </label>
          <label>
            <span>Até</span>
            <input
              inputMode="decimal"
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'price-filter-error' : undefined}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.currentTarget.value)}
              placeholder="Sem limite"
            />
          </label>
          <button className="button button-filter" type="submit">
            Aplicar
          </button>
          {filterError ? (
            <p id="price-filter-error" className="filter-error" role="alert">
              {filterError}
            </p>
          ) : null}
        </form>

        {query.data && featured ? (
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-photo">
              {safeFeaturedImage && failedHeroImage !== safeFeaturedImage ? (
                <img
                  src={safeFeaturedImage}
                  alt={featured.productSnapshot.title}
                  fetchPriority="high"
                  onError={() => setFailedHeroImage(safeFeaturedImage)}
                />
              ) : (
                <div className="image-unavailable hero-image-unavailable">
                  Imagem do lote indisponível
                </div>
              )}
              <div className="hero-image-caption">
                <AuctionStatus state={featured.lifecycleState} />
                <span>
                  LOTE VERZEL · {featured.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="hero-copy">
              <p className="eyebrow">
                {featured.lifecycleState === 'LIVE'
                  ? 'Uma disputa em andamento'
                  : 'Lote agendado'}
              </p>
              <h2 id="hero-title">{featured.productSnapshot.title}</h2>
              <p className="hero-description">
                {featured.productSnapshot.description ||
                  'Consulte os valores e horários deste lote.'}
              </p>
              <div className="hero-price">
                <span>Lance inicial</span>
                <strong className="money">
                  {formatCentsToBrl(featured.startingBidCents)}
                </strong>
              </div>
              <Link
                className="button button-primary"
                to={`/auctions/${featured.id}`}
              >
                Ver lote <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </section>
        ) : null}
        {query.isFetching && !query.isPending ? (
          <p className="results-feedback" role="status">
            Atualizando os lotes...
          </p>
        ) : null}
        {query.isError && query.data ? (
          <p className="refresh-note" role="alert">
            Não foi possível atualizar. Os lotes exibidos podem ter mudado.{' '}
            <button
              className="text-button"
              onClick={() => void query.refetch()}
            >
              Tentar novamente
            </button>
          </p>
        ) : null}
        {query.data && auctions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-mark" aria-hidden="true">
              V/
            </span>
            <div>
              <p className="eyebrow">Nenhum resultado por aqui</p>
              <h2>Amplie sua busca.</h2>
              <p>
                Altere os filtros para encontrar outros lotes. A lista mostra
                apenas leilões publicados.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setQ('')
                  setMinPrice('')
                  setMaxPrice('')
                  setSearchParams('')
                }}
              >
                Limpar filtros
              </button>
            </div>
          </div>
        ) : null}
        {query.data && query.data.total > 0 ? (
          <div className="auction-grid">
            {visibleAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : null}
        {query.data && pageCount > 1 ? (
          <nav className="pagination" aria-label="Paginação dos leilões">
            <button
              onClick={() => movePage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </button>
            <span>
              Página <strong>{currentPage}</strong> de{' '}
              <strong>{pageCount}</strong>
            </span>
            <button
              onClick={() => movePage(currentPage + 1)}
              disabled={currentPage >= pageCount}
            >
              Próxima
            </button>
          </nav>
        ) : null}
      </section>
    </main>
  )
}
