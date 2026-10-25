import { useState } from 'react'
import { BidForm } from '../components/BidForm'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { getAuction, getPublicBids } from '../api/auctions'
import { auctionKeys } from '../api/keys'
import { formatCentsToBrl } from '../utils/money'
import { AuctionStatus } from '../components/AuctionStatus'
import { AuctionRealtime } from '../components/AuctionRealtime'
import { Countdown } from '../components/Countdown'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AuctionDetailPage() {
  const { id = '' } = useParams()
  const [failedImage, setFailedImage] = useState<string>()
  const auctionQuery = useQuery({
    queryKey: auctionKeys.detail(id),
    queryFn: ({ signal }) => getAuction(id, signal),
    enabled: Boolean(id),
    refetchInterval: 10000,
  })
  const bidsQuery = useInfiniteQuery({
    queryKey: auctionKeys.bids(id),
    queryFn: ({ signal, pageParam }) => getPublicBids(id, signal, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.skip + lastPage.bids.length < lastPage.total
        ? lastPage.skip + lastPage.limit
        : undefined,
    enabled: Boolean(id),
    refetchInterval: 10000,
  })
  const imageUrl = auctionQuery.data?.productSnapshot.imageUrl
  const image =
    imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined

  if (auctionQuery.isPending)
    return (
      <main id="main-content" className="detail-page">
        <div className="detail-loading" role="status">
          Carregando os dados do leilão...
        </div>
      </main>
    )
  if (auctionQuery.isError) {
    const notFound =
      auctionQuery.error instanceof ApiError &&
      auctionQuery.error.status === 404
    return (
      <main id="main-content" className="message-page">
        <p className="eyebrow">
          {notFound ? 'Lote indisponível' : 'Falha de conexão'}
        </p>
        <h1>
          {notFound
            ? 'Este leilão não foi encontrado.'
            : 'Não foi possível carregar este leilão.'}
        </h1>
        <p>
          {notFound
            ? 'O endereço pode estar incorreto ou o lote não est? mais disponível.'
            : 'Tente novamente para consultar os dados atualizados.'}
        </p>
        {notFound ? (
          <Link className="button button-primary" to="/">
            Explorar leilões
          </Link>
        ) : (
          <button
            className="button button-primary"
            onClick={() => {
              void auctionQuery.refetch()
              void bidsQuery.refetch()
            }}
          >
            Tentar novamente
          </button>
        )}
      </main>
    )
  }
  const auction = auctionQuery.data
  if (!auction) return null
  const bidPages = bidsQuery.data?.pages ?? []
  const bidPage = bidPages.at(-1)
  const currentBid = bidPage?.currentBid
  const serverTime = bidPages.at(-1)?.asOf
  const ending = bidPage?.endsAt ?? auction.endsAt
  const publicBids = Array.from(
    new Map(
      bidPages.flatMap((page) => page.bids).map((bid) => [bid.id, bid]),
    ).values(),
  ).sort((a, b) =>
    BigInt(a.sequence) < BigInt(b.sequence)
      ? -1
      : BigInt(a.sequence) > BigInt(b.sequence)
        ? 1
        : 0,
  )

  return (
    <main id="main-content" className="detail-page">
      <AuctionRealtime auctionId={auction.id} />
      <Link className="back-link" to="/">
        ← <span>Todos os leilões</span>
      </Link>
      <div className="detail-grid">
        <section className="detail-main">
          <div className="detail-image-wrap">
            {image && failedImage !== image ? (
              <img
                className="detail-image"
                src={image}
                alt={auction.productSnapshot.title}
                fetchPriority="high"
                onError={() => setFailedImage(image)}
              />
            ) : (
              <div className="image-unavailable detail-image-unavailable">
                Imagem do lote indisponível
              </div>
            )}
          </div>
          <div className="detail-title-row">
            <div>
              <p className="eyebrow">
                Lote · {auction.id.slice(0, 8).toUpperCase()}
              </p>
              <h1>{auction.productSnapshot.title}</h1>
            </div>
            <AuctionStatus state={auction.lifecycleState} />
          </div>
        </section>
        <aside className="detail-aside" aria-label="Valores e prazo do leilão">
          <div className="price-panel">
            <p className="eyebrow">
              {currentBid ? 'Lance atual' : 'Lance inicial'}
            </p>
            <p className="detail-price money">
              {formatCentsToBrl(
                currentBid?.amountCents ?? auction.startingBidCents,
              )}
            </p>
            {currentBid ? (
              <div className="current-bid">
                <span>Lance inicial</span>
                <strong className="money">
                  {formatCentsToBrl(auction.startingBidCents)}
                </strong>
              </div>
            ) : null}
            <p className="increment-copy">
              Incremento mínimo{' '}
              <strong className="money">
                {formatCentsToBrl(auction.minIncrementCents)}
              </strong>
            </p>
            <div className="panel-rule" />
            <p className="eyebrow">Tempo até o encerramento</p>
            {serverTime ? (
              <Countdown
                endsAt={ending}
                asOf={serverTime}
                state={auction.lifecycleState}
              />
            ) : (
              <span
                className="inline-status countdown-unavailable"
                role="status"
              >
                {bidsQuery.isError
                  ? 'Horário indisponível'
                  : 'Sincronizando horário...'}
              </span>
            )}
            <p className="finalizing-note">
              O prazo é indicativo. O estado do leilão é confirmado pelo
              servidor.
            </p>
          </div>
          <div className="account-panel row-actions">
            <Link className="text-link" to={`/auctions/${id}/audit`}>
              Auditoria pública
            </Link>
            {auction.lifecycleState === 'SETTLED' ? (
              <Link className="text-link" to={`/auctions/${id}/receipt`}>
                Ver comprovante
              </Link>
            ) : null}
          </div>
          <BidForm
            auction={auction}
            snapshot={bidPage}
            stale={bidsQuery.isError || auctionQuery.isError}
          />
          <div className="schedule-panel">
            <p className="eyebrow">Calendário do lote</p>
            <dl>
              <div>
                <dt>Início</dt>
                <dd>{formatDate(auction.startsAt)}</dd>
              </div>
              <div>
                <dt>Encerramento previsto</dt>
                <dd>{formatDate(ending)}</dd>
              </div>
            </dl>
          </div>
          {bidsQuery.isError ? (
            <p className="refresh-note">
              Os valores e o relógio podem estar desatualizados enquanto o
              histórico não carrega.
            </p>
          ) : null}
        </aside>
        <div className="detail-history">
          <section
            className="description-block"
            aria-labelledby="description-heading"
          >
            <h2 id="description-heading">Sobre este lote</h2>
            <p>
              {auction.productSnapshot.description ||
                'A descrição deste lote não foi informada.'}
            </p>
          </section>
          <section className="bid-history" aria-labelledby="bids-heading">
            <div className="subsection-heading">
              <div>
                <p className="eyebrow">Transparência pública</p>
                <h2 id="bids-heading">Histórico de lances</h2>
              </div>
              {bidPage ? (
                <span>
                  {bidPage.total} {bidPage.total === 1 ? 'lance' : 'lances'}
                </span>
              ) : null}
            </div>
            {bidsQuery.isPending ? (
              <p className="inline-status" role="status">
                Carregando o histórico?
              </p>
            ) : null}
            {bidsQuery.isError ? (
              <div className="inline-error" role="alert">
                <span>O histórico não pôde ser atualizado.</span>
                <button
                  className="text-button"
                  onClick={() => void bidsQuery.refetch()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}
            {bidPage && bidPage.total === 0 ? (
              <p className="inline-status">
                Este lote ainda não recebeu lances.
              </p>
            ) : null}
            {bidPage && publicBids.length > 0 ? (
              <>
                <ol className="bid-list">
                  {publicBids.map((bid) => (
                    <li key={bid.id}>
                      <span className="bid-sequence">#{bid.sequence}</span>
                      <span className="bidder-ref">
                        Participante {bid.bidderRef}
                      </span>
                      <time dateTime={bid.createdAt}>
                        {formatDate(bid.createdAt)}
                      </time>
                      <strong className="money">
                        {formatCentsToBrl(bid.amountCents)}
                      </strong>
                    </li>
                  ))}
                </ol>
                {bidsQuery.hasNextPage ? (
                  <button
                    className="button button-filter load-more"
                    onClick={() => void bidsQuery.fetchNextPage()}
                    disabled={bidsQuery.isFetchingNextPage}
                  >
                    {bidsQuery.isFetchingNextPage
                      ? 'Carregando...'
                      : 'Carregar mais lances'}
                  </button>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  )
}
