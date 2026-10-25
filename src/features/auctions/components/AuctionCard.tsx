import { useState } from 'react'
import { Link } from 'react-router'
import type { Auction } from '../api/auctions'
import { formatCentsToBrl } from '../utils/money'
import { AuctionStatus } from './AuctionStatus'

function safeImageUrl(value: string | null): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

export function AuctionCard({ auction }: { auction: Auction }) {
  const [failedImage, setFailedImage] = useState<string>()
  const image = safeImageUrl(auction.productSnapshot.imageUrl)
  const start = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(auction.startsAt))
  return (
    <article className="auction-card">
      <Link
        to={`/auctions/${auction.id}`}
        className="auction-card-link"
        aria-label={`${auction.productSnapshot.title}, lance inicial ${formatCentsToBrl(auction.startingBidCents)}`}
      >
        <div className="card-image-wrap">
          {image && failedImage !== image ? (
            <img
              className="card-image"
              src={image}
              alt={auction.productSnapshot.title}
              loading="lazy"
              onError={() => setFailedImage(image)}
            />
          ) : (
            <div className="image-unavailable" aria-label="Imagem indisponível">
              <span aria-hidden="true">V/</span>
            </div>
          )}
          <AuctionStatus state={auction.lifecycleState} />
        </div>
        <div className="card-copy">
          <p className="card-kicker">
            {auction.lifecycleState === 'LIVE'
              ? 'Disputa aberta'
              : 'Lote de leilão'}
          </p>
          <h3>{auction.productSnapshot.title}</h3>
          <div className="card-meta">
            <span>
              <span className="meta-label">Lance inicial</span>
              <strong className="money">
                {formatCentsToBrl(auction.startingBidCents)}
              </strong>
            </span>
            <span className="card-date">
              <span className="meta-label">
                {auction.lifecycleState === 'SCHEDULED'
                  ? 'Começa'
                  : auction.lifecycleState === 'LIVE'
                    ? 'Encerra'
                    : 'Encerrado em'}
              </span>
              <strong>
                {auction.lifecycleState === 'SCHEDULED'
                  ? start
                  : new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(auction.endsAt))}
              </strong>
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
