import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { components } from '@/api/generated/schema'
import { useSession } from '@/features/auth/session'
import { getWallet, walletKey } from '@/features/wallet/api'
import { getReceipt } from '@/features/audit/api'
import { AuctionStatus } from '@/features/auctions/components/AuctionStatus'
import { AuctionRecoveryNotice } from '@/features/auctions/components/AuctionRecoveryNotice'
import { DemoScenario } from '@/features/auctions/components/DemoScenario'
import { auctionKeys } from '@/features/auctions/api/keys'
import { formatCentsToBrl } from '@/features/auctions/utils/money'
import { RequestState, Pagination } from '@/components/Feedback'
import { getSellerAuctions, cancelAuction, getReceivedTotal } from './api'
import { ProductPicker } from './ProductPicker'
import { AuctionForm } from './AuctionForm'
type Auction = components['schemas']['Auction']
function SettlementResult({ auction }: { auction: Auction }) {
  const receipt = useQuery({
    queryKey: ['receipt', auction.id],
    queryFn: ({ signal }) => getReceipt(auction.id, signal),
    enabled: auction.lifecycleState === 'SETTLED',
    retry: false,
  })
  if (auction.lifecycleState === 'CLOSED_NO_BIDS')
    return <p>Encerrado sem arremate.</p>
  if (auction.lifecycleState === 'FINALIZING')
    return <p>Encerramento em processamento. A liquidação é automática.</p>
  if (auction.lifecycleState !== 'SETTLED') return null
  return (
    <div>
      {receipt.data ? (
        <p>
          Arrematado por{' '}
          <strong>{formatCentsToBrl(receipt.data.amountCents)}</strong>
        </p>
      ) : (
        <p className="muted">
          {receipt.isError
            ? 'Valor do arremate indisponível. Consulte o comprovante.'
            : 'Consultando valor do arremate...'}
        </p>
      )}
      <Link className="text-link" to={`/auctions/${auction.id}/receipt`}>
        Ver comprovante
      </Link>
    </div>
  )
}
export function SellerPage() {
  const session = useSession()!
  const client = useQueryClient()
  const [skip, setSkip] = useState(0)
  const [product, setProduct] =
    useState<components['schemas']['ProductSnapshot']>()
  const [editing, setEditing] = useState<Auction>()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const listKey = ['private', session.user.id, 'seller-auctions']
  const lots = useQuery({
    queryKey: [...listKey, skip],
    queryFn: ({ signal }) => getSellerAuctions(skip, signal),
    refetchInterval: 15000,
  })
  const wallet = useQuery({
    queryKey: walletKey(session.user.id),
    queryFn: ({ signal }) => getWallet(signal),
    refetchInterval: 15000,
  })
  const received = useQuery({
    queryKey: ['private', session.user.id, 'received'],
    queryFn: ({ signal }) => getReceivedTotal(signal),
    refetchInterval: 30000,
  })
  const refresh = () => {
    void client.invalidateQueries({ queryKey: listKey })
    void client.invalidateQueries({ queryKey: auctionKeys.all })
  }
  async function cancel(auction: Auction) {
    if (
      cancelling ||
      !window.confirm(
        `Cancelar o lote "${auction.productSnapshot.title}"? Esta ação não pode ser desfeita.`,
      )
    )
      return
    setCancelling(true)
    setError('')
    setNotice('')
    try {
      await cancelAuction(auction.id)
      setNotice('Cancelamento confirmado pela plataforma.')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível cancelar o lote.',
      )
    } finally {
      setCancelling(false)
      refresh()
    }
  }
  return (
    <main id="main-content" className="account-page seller-page">
      <div className="account-heading">
        <div>
          <p className="eyebrow">Painel do leiloeiro</p>
          <h1>Seus lotes, em boas mãos.</h1>
          <p>Prepare novas disputas e acompanhe cada arremate.</p>
        </div>
      </div>
      <dl className="balance-strip">
        <div>
          <dt>Total recebido em liquidações</dt>
          <dd>
            {received.data !== undefined
              ? formatCentsToBrl(received.data)
              : received.isError
                ? 'Indisponível'
                : 'Consultando...'}
          </dd>
        </div>
        <div>
          <dt>Saldo da carteira</dt>
          <dd>
            {wallet.data
              ? formatCentsToBrl(wallet.data.balanceCents)
              : wallet.isError
                ? 'Indisponível'
                : 'Consultando...'}
          </dd>
        </div>
      </dl>
      <div className="account-grid seller-grid">
        <section aria-labelledby="seller-lots">
          <h2 id="seller-lots">Meus lotes</h2>
          {notice ? (
            <p className="feedback-success" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="feedback-error" role="alert">
              {error}
            </p>
          ) : null}
          <RequestState
            pending={lots.isPending}
            error={lots.error}
            retry={() => void lots.refetch()}
          />
          {lots.data?.total === 0 ? (
            <p className="muted">
              Nenhum lote publicado. Selecione um produto para começar.
            </p>
          ) : null}
          <ul className="account-list seller-lots">
            {lots.data?.auctions.map((auction) => {
              const noBids = auction.currentBidId === null
              const canCancel =
                !auction.recovery &&
                noBids &&
                (auction.lifecycleState === 'SCHEDULED' ||
                  auction.lifecycleState === 'LIVE')
              return (
                <li key={auction.id}>
                  <div>
                    <AuctionStatus
                      state={auction.lifecycleState}
                      blocked={Boolean(auction.recovery)}
                    />
                    <h3>
                      <Link to={`/auctions/${auction.id}`}>
                        {auction.productSnapshot.title}
                      </Link>
                    </h3>
                    <DemoScenario
                      attributes={auction.productSnapshot.attributes}
                    />
                    <p className="muted">
                      Lance inicial:{' '}
                      {formatCentsToBrl(auction.startingBidCents)}
                    </p>
                    <p className="muted">
                      {new Date(auction.startsAt).toLocaleString('pt-BR')} até{' '}
                      {new Date(auction.endsAt).toLocaleString('pt-BR')}
                    </p>
                    <SettlementResult auction={auction} />
                    <AuctionRecoveryNotice auction={auction} />
                    <div className="row-actions">
                      <Link
                        className="text-link"
                        to={`/auctions/${auction.id}`}
                      >
                        Ver lote
                      </Link>
                      {noBids &&
                      !auction.recovery &&
                      auction.lifecycleState === 'SCHEDULED' ? (
                        <button
                          className="text-button"
                          onClick={() => {
                            setEditing(auction)
                            setProduct(auction.productSnapshot)
                            setNotice('')
                          }}
                        >
                          Editar lote
                        </button>
                      ) : null}
                      {canCancel ? (
                        <button
                          className="text-button"
                          disabled={cancelling}
                          onClick={() => void cancel(auction)}
                        >
                          Cancelar lote
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {lots.data ? <Pagination {...lots.data} move={setSkip} /> : null}
        </section>
        <div className="seller-editor">
          {product ? (
            <AuctionForm
              key={editing?.id ?? product.id}
              product={product}
              auction={editing}
              refresh={refresh}
              close={() => {
                setProduct(undefined)
                setEditing(undefined)
              }}
              saved={(wasEditing) => {
                setProduct(undefined)
                setEditing(undefined)
                setNotice(
                  wasEditing
                    ? 'Alterações confirmadas pela plataforma.'
                    : 'Lote publicado pela plataforma.',
                )
              }}
            />
          ) : (
            <ProductPicker
              select={(item) => {
                setProduct(item)
                setEditing(undefined)
                setNotice('')
              }}
            />
          )}
        </div>
      </div>
    </main>
  )
}
