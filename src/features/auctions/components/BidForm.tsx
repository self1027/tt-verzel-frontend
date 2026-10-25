import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Auction, PublicBidPage } from '../api/auctions'
import { getPosition, placeBid, positionKey } from '../api/bidding'
import { auctionKeys } from '../api/keys'
import { nextBidCents } from '../utils/bid'
import {
  centsToBrlInput,
  formatCentsToBrl,
  parseBrlInputToCents,
} from '../utils/money'
import { useSession } from '@/features/auth/session'
import { getWallet, walletKey } from '@/features/wallet/api'
import { useMoneyAction } from '@/hooks/useMoneyAction'
import { RequestState } from '@/components/Feedback'

export function BidForm({
  auction,
  snapshot,
  stale,
  blocked = false,
}: {
  auction: Auction
  snapshot: PublicBidPage | undefined
  stale: boolean
  blocked?: boolean
}) {
  const session = useSession()
  if (blocked || auction.recovery)
    return (
      <p className="inline-status">
        Lances bloqueados por adulteração confirmada.
      </p>
    )
  if (auction.status === 'CANCELLED')
    return (
      <p className="inline-status">
        Este lote foi cancelado e não recebe novos lances.
      </p>
    )
  if (!session)
    return (
      <div className="account-panel">
        <p>Entre como licitante para participar desta disputa.</p>
        <Link
          className="button button-primary"
          to={`/login?returnTo=/auctions/${auction.id}`}
        >
          Entrar para dar um lance
        </Link>
      </div>
    )
  if (session.user.role !== 'BIDDER')
    return <p className="inline-status">Leiloeiros não podem dar lances.</p>
  return (
    <BidderForm
      key={session.user.id + auction.id}
      auction={auction}
      snapshot={snapshot}
      stale={stale}
      userId={session.user.id}
    />
  )
}
function BidderForm({
  auction,
  snapshot,
  stale,
  userId,
}: {
  auction: Auction
  snapshot: PublicBidPage | undefined
  stale: boolean
  userId: string
}) {
  const client = useQueryClient()
  const position = useQuery({
    queryKey: positionKey(userId, auction.id),
    queryFn: ({ signal }) => getPosition(auction.id, signal),
    refetchInterval: 10000,
  })
  const wallet = useQuery({
    queryKey: walletKey(userId),
    queryFn: ({ signal }) => getWallet(signal),
    refetchInterval: 10000,
  })
  const minimum = nextBidCents(
    auction.startingBidCents,
    auction.minIncrementCents,
    snapshot?.currentBid?.amountCents ?? null,
  )
  const [amount, setAmount] = useState('')
  const [validation, setValidation] = useState('')
  const resync = () => {
    void client.invalidateQueries({ queryKey: auctionKeys.detail(auction.id) })
    void client.invalidateQueries({ queryKey: auctionKeys.bids(auction.id) })
    void client.invalidateQueries({ queryKey: positionKey(userId, auction.id) })
    void client.invalidateQueries({ queryKey: walletKey(userId) })
  }
  const action = useMoneyAction(
    async (cents, key) => {
      try {
        return await placeBid(auction.id, cents, key)
      } finally {
        resync()
      }
    },
    resync,
    `${userId}:bid:${auction.id}`,
  )
  const leading = Boolean(
    position.data?.isLeading && position.data.id === snapshot?.currentBid?.id,
  )
  const positionConsistent = !position.data?.isLeading || leading
  const live =
    auction.status === 'PUBLISHED' &&
    snapshot?.status === 'PUBLISHED' &&
    Date.parse(snapshot.asOf) >= Date.parse(auction.startsAt) &&
    Date.parse(snapshot.asOf) < Date.parse(snapshot.endsAt)
  const ready = Boolean(
    live &&
    snapshot &&
    !stale &&
    !position.isPending &&
    !position.isError &&
    positionConsistent &&
    wallet.data &&
    !wallet.isError &&
    minimum &&
    !leading,
  )
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cents =
      action.intentCents ??
      parseBrlInputToCents(amount || (minimum ? centsToBrlInput(minimum) : ''))
    if (
      !cents ||
      BigInt(cents) <= 0n ||
      (!action.uncertain && minimum && BigInt(cents) < BigInt(minimum))
    ) {
      setValidation('Informe um lance igual ou superior ao mínimo atualizado.')
      return
    }
    if (!ready && !action.uncertain) return
    setValidation('')
    setAmount(centsToBrlInput(cents))
    void action.submit(cents)
  }
  if (!live && !action.uncertain && !action.success) {
    return (
      <section className="account-panel" aria-label="Sua participação">
        <h2>Sua participação</h2>
        <RequestState
          pending={position.isPending}
          error={position.error}
          retry={() => void position.refetch()}
        />
        {!position.isPending && !position.isError ? (
          <p role="status">
            {snapshot?.status === 'SETTLED'
              ? leading
                ? 'Arrematado por você.'
                : 'Este lote foi encerrado.'
              : 'Este lote não está ao vivo. Aguarde o estado confirmado pela plataforma.'}
          </p>
        ) : null}
      </section>
    )
  }
  return (
    <form className="form-panel" onSubmit={submit} aria-label="Dar um lance">
      <h2>Sua participação</h2>
      <RequestState
        pending={position.isPending || wallet.isPending}
        error={position.error || wallet.error}
        retry={() => {
          void position.refetch()
          void wallet.refetch()
        }}
      />
      {!position.isPending && !position.isError ? (
        <p role="status">
          {!positionConsistent
            ? 'Atualizando sua posição...'
            : leading
              ? 'Você está ganhando.'
              : position.data
                ? 'Você foi superado.'
                : 'Você ainda não deu lances neste lote.'}
        </p>
      ) : null}
      {wallet.data ? (
        <p>
          Disponível:{' '}
          <strong className="money">
            {formatCentsToBrl(wallet.data.availableCents)}
          </strong>{' '}
          · <Link to="/wallet">Adicionar saldo</Link>
        </p>
      ) : null}
      {minimum ? (
        <p>
          Próximo lance mínimo:{' '}
          <strong className="money">{formatCentsToBrl(minimum)}</strong>
        </p>
      ) : (
        <p>O limite de valor deste lote foi atingido.</p>
      )}
      <label>
        Seu lance (R$)
        <input
          inputMode="decimal"
          value={
            action.intentCents ? centsToBrlInput(action.intentCents) : amount
          }
          placeholder={minimum ? centsToBrlInput(minimum) : ''}
          disabled={action.pending || action.uncertain || !ready}
          onChange={(e) => setAmount(e.target.value)}
          aria-describedby="bid-feedback"
          aria-invalid={validation ? true : undefined}
        />
      </label>
      <div id="bid-feedback">
        {validation || action.error ? (
          <p className="feedback-error" role="alert">
            {validation || action.error}
          </p>
        ) : null}
        {action.success ? (
          <p className="feedback-success" role="status">
            Lance confirmado pela plataforma.
          </p>
        ) : null}
      </div>
      <button
        className="button button-primary"
        disabled={action.pending || (!ready && !action.uncertain)}
      >
        {action.pending ? 'Confirmando lance...' : 'Confirmar lance'}
      </button>
      {!live ? (
        <p className="muted">
          Lances são aceitos apenas enquanto o lote está ao vivo.
        </p>
      ) : null}
      <p className="muted">
        Lances aceitos nos últimos 2 minutos acrescentam 2 minutos ao prazo. O
        saldo fica reservado enquanto você lidera.
      </p>
    </form>
  )
}
