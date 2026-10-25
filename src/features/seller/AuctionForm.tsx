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
        {
          productSnapshotId: product.id,
          starting,
          increment,
          startsDate: starts.slice(0, 10),
          startsTime: starts.slice(11, 16),
          endsDate: ends.slice(0, 10),
          endsTime: ends.slice(11, 16),
        },
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
      <fieldset className="auction-schedule">
        <legend>Início do lote</legend>
        <label>
          Data
          <input
            aria-label="Data de início do lote"
            type="date"
            lang="pt-BR"
            value={starts.slice(0, 10)}
            onChange={(e) =>
              setStarts(`${e.target.value}T${starts.slice(11, 16) || '12:00'}`)
            }
            required
            disabled={pending || uncertain}
          />
        </label>
        <label>
          Hora
          <input
            aria-label="Hora de início do lote"
            type="time"
            lang="pt-BR"
            value={starts.slice(11, 16)}
            onChange={(e) =>
              setStarts(`${starts.slice(0, 10)}T${e.target.value}`)
            }
            required
            disabled={pending || uncertain}
          />
        </label>
      </fieldset>
      <fieldset className="auction-schedule">
        <legend>Fim do lote</legend>
        <label>
          Data
          <input
            aria-label="Data de fim do lote"
            type="date"
            lang="pt-BR"
            min={starts.slice(0, 10) || undefined}
            value={ends.slice(0, 10)}
            onChange={(e) =>
              setEnds(`${e.target.value}T${ends.slice(11, 16) || '12:00'}`)
            }
            required
            disabled={pending || uncertain}
          />
        </label>
        <label>
          Hora
          <input
            aria-label="Hora de fim do lote"
            type="time"
            lang="pt-BR"
            min={
              ends.slice(0, 10) === starts.slice(0, 10)
                ? starts.slice(11, 16)
                : undefined
            }
            value={ends.slice(11, 16)}
            onChange={(e) => setEnds(`${ends.slice(0, 10)}T${e.target.value}`)}
            required
            disabled={pending || uncertain}
          />
        </label>
      </fieldset>
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
