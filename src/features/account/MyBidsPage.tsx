import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { components } from '@/api/generated/schema'
import { useSession } from '@/features/auth/session'
import { getOwnBids } from '@/features/auctions/api/bidding'
import { getAuction } from '@/features/auctions/api/auctions'
import { auctionKeys } from '@/features/auctions/api/keys'
import { formatCentsToBrl } from '@/features/auctions/utils/money'
import { RequestState, Pagination } from '@/components/Feedback'
function BidRecord({ bid }: { bid: components['schemas']['OwnBid'] }) {
  const auction = useQuery({
    queryKey: auctionKeys.detail(bid.auctionId),
    queryFn: ({ signal }) => getAuction(bid.auctionId, signal),
  })
  const won = bid.status === 'SETTLED' && bid.isLeading
  const status = won
    ? 'Arrematado por você'
    : bid.status === 'SETTLED'
      ? 'Encerrado'
      : bid.status === 'CANCELLED'
        ? 'Cancelado'
        : bid.status === 'CLOSED_NO_BIDS'
          ? 'Encerrado sem vencedor'
          : bid.isLeading
            ? 'Você está ganhando'
            : 'Superado'
  return (
    <li>
      <div>
        <p className="eyebrow">Lance #{bid.sequence}</p>
        <h2>
          <Link to={`/auctions/${bid.auctionId}`}>
            {auction.data?.productSnapshot.title ??
              `Lote ${bid.auctionId.slice(0, 8)}`}
          </Link>
        </h2>
        <p>{status}</p>
        <time dateTime={bid.createdAt} className="muted">
          {new Date(bid.createdAt).toLocaleString('pt-BR')}
        </time>
      </div>
      <div>
        <p>
          <strong>{formatCentsToBrl(bid.amountCents)}</strong>
        </p>
        <div className="row-actions">
          <Link className="text-link" to={`/auctions/${bid.auctionId}`}>
            Ver lote
          </Link>
          {won ? (
            <Link
              className="text-link"
              to={`/auctions/${bid.auctionId}/receipt`}
            >
              Ver comprovante
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  )
}
export function MyBidsPage() {
  const session = useSession()!
  const [skip, setSkip] = useState(0)
  const query = useQuery({
    queryKey: ['private', session.user.id, 'own-bids', skip],
    queryFn: ({ signal }) => getOwnBids(skip, signal),
    refetchInterval: 15000,
  })
  return (
    <main id="main-content" className="account-page">
      <div className="account-heading">
        <div>
          <p className="eyebrow">Sua participação</p>
          <h1>Meus lances e arremates</h1>
          <p>
            Acompanhe cada lance, sua posição e os comprovantes dos lotes
            vencidos.
          </p>
        </div>
        {query.data ? (
          <p>
            {query.data.total}{' '}
            {query.data.total === 1 ? 'lance registrado' : 'lances registrados'}
          </p>
        ) : null}
      </div>
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.total === 0 ? (
        <div className="account-panel">
          <h2>Seu primeiro lance ainda está por vir.</h2>
          <p>Explore os lotes ao vivo para começar.</p>
          <Link className="button button-primary" to="/">
            Explorar leilões
          </Link>
        </div>
      ) : null}
      <ul className="account-list">
        {query.data?.bids.map((bid) => (
          <BidRecord key={bid.id} bid={bid} />
        ))}
      </ul>
      {query.data ? <Pagination {...query.data} move={setSkip} /> : null}
    </main>
  )
}
