import { ApiError } from '@/api/client'
import { useState, type FormEvent } from 'react'
import type { components } from '@/api/generated/schema'
import { centsToBrlInput } from '@/features/auctions/utils/money'
import { saveAuction } from './api'
import { auctionInput, localDateInput } from './form'
import { ProductPreview } from './ProductPreview'
export function AuctionForm({
  product,
  auction,
  saved,
  close,
  refresh,
}: {
  product: components['schemas']['ProductSnapshot']
  auction?: components['schemas']['Auction']
  saved: (editing: boolean) => void
  close: () => void
  refresh: () => void
}) {
  const [starting, setStarting] = useState(
    auction ? centsToBrlInput(auction.startingBidCents) : '',
  )
  const [increment, setIncrement] = useState(
    auction ? centsToBrlInput(auction.minIncrementCents) : '',
  )
  const [starts, setStarts] = useState(
    auction ? localDateInput(auction.startsAt) : '',
  )
  const [ends, setEnds] = useState(
    auction ? localDateInput(auction.endsAt) : '',
  )
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || uncertain) return
    setError('')
    try {
      const body = auctionInput(
        { productSnapshotId: product.id, starting, increment, starts, ends },
        Date.now(),
      )
      setPending(true)
      await saveAuction(body, auction?.id)
      saved(Boolean(auction))
    } catch (cause) {
      const unknown =
        cause instanceof TypeError ||
        (cause instanceof ApiError && cause.status >= 500)
      setUncertain(unknown)
      setError(
        unknown
          ? 'A confirmação não chegou. Consulte seus lotes antes de iniciar outra publicação; esta operação não oferece idempotência.'
          : cause instanceof Error
            ? cause.message
            : 'Não foi possível salvar o lote.',
      )
    } finally {
      setPending(false)
      refresh()
    }
  }
  return (
    <form
      className="form-panel"
      onSubmit={submit}
      aria-label={auction ? 'Editar leilão' : 'Criar leilão'}
    >
      <h2>{auction ? 'Editar lote' : 'Novo lote'}</h2>
      <ProductPreview {...product} />
      <label>
        Lance inicial (R$)
        <input
          inputMode="decimal"
          value={starting}
          onChange={(e) => setStarting(e.target.value)}
          required
          disabled={pending || uncertain}
        />
      </label>
      <label>
        Incremento mínimo (R$)
        <input
          inputMode="decimal"
          value={increment}
          onChange={(e) => setIncrement(e.target.value)}
          required
          disabled={pending || uncertain}
        />
      </label>
      <label>
        Início do lote
        <input
          type="datetime-local"
          step="1"
          value={starts}
          onChange={(e) => setStarts(e.target.value)}
          required
          disabled={pending || uncertain}
        />
      </label>
      <label>
        Fim do lote
        <input
          type="datetime-local"
          step="1"
          value={ends}
          onChange={(e) => setEnds(e.target.value)}
          required
          disabled={pending || uncertain}
        />
      </label>
      <p className="muted">
        Horários no fuso do seu dispositivo. A plataforma confirma os horários e
        a elegibilidade do lote.
      </p>
      {error ? (
        <p className="feedback-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button button-primary" disabled={pending || uncertain}>
        {pending
          ? 'Confirmando...'
          : auction
            ? 'Salvar alterações'
            : 'Publicar lote'}
      </button>
      <button
        type="button"
        className="text-button"
        disabled={pending}
        onClick={close}
      >
        Fechar formulário
      </button>
    </form>
  )
}
