import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { RequestState } from '@/components/Feedback'
import { formatCentsToBrl } from '@/features/auctions/utils/money'
import { getReceipt } from './api'
export function ReceiptPage() {
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: ['receipt', id],
    queryFn: ({ signal }) => getReceipt(id, signal),
    retry: false,
  })
  const [copy, setCopy] = useState('')
  const receipt = query.data
  const shareUrl = `${window.location.origin}/auctions/${encodeURIComponent(id)}/receipt`
  const error =
    query.error instanceof ApiError
      ? query.error.status === 404
        ? 'O comprovante ainda não está disponível. Ele é emitido após a liquidação de um lote com vencedor. Lotes encerrados sem lances não geram comprovante.'
        : query.error.status === 409
          ? 'A plataforma encontrou uma inconsistência no comprovante. Aguarde a análise antes de utilizá-lo.'
          : null
      : null
  return (
    <main id="main-content" className="account-page receipt-page">
      <Link className="back-link" to={`/auctions/${id}`}>
        Voltar ao lote
      </Link>
      <p className="eyebrow">Registro público da plataforma</p>
      <h1>Comprovante de arremate</h1>
      {error ? (
        <div role="alert" className="feedback-error">
          <p>{error}</p>
          <button className="text-button" onClick={() => void query.refetch()}>
            Consultar novamente
          </button>
        </div>
      ) : (
        <RequestState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
      {receipt ? (
        <>
          <section className="receipt-sheet" aria-label="Dados do arremate">
            <p className="eyebrow">Liquidação confirmada</p>
            <h2>{receipt.productSnapshot.title}</h2>
            <p className="receipt-amount money">
              {formatCentsToBrl(receipt.amountCents)}
            </p>
            <dl className="receipt-data">
              <div>
                <dt>Vencedor</dt>
                <dd>Participante {receipt.winningBid.bidderRef}</dd>
              </div>
              <div>
                <dt>Liquidado em</dt>
                <dd>
                  <time dateTime={receipt.settledAt}>
                    {new Date(receipt.settledAt).toLocaleString('pt-BR')}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Encerramento</dt>
                <dd>{new Date(receipt.endsAt).toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt>Identificador da liquidação</dt>
                <dd>{receipt.settlementId}</dd>
              </div>
              <div>
                <dt>Lote</dt>
                <dd>{receipt.auctionId}</dd>
              </div>
            </dl>
            <p className="muted">
              Este comprovante registra o arremate financeiro. O estado de
              integridade do histórico é consultado separadamente.
            </p>
            <Link className="text-link" to={`/auctions/${id}/audit`}>
              Consultar auditoria do lote
            </Link>
          </section>
          <section className="form-panel share-panel">
            <h2>Compartilhar comprovante</h2>
            <label>
              Link do comprovante
              <input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <button
              className="button button-primary"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(shareUrl)
                  .then(() => setCopy('Link copiado.'))
                  .catch(() =>
                    setCopy('Selecione o link acima e copie manualmente.'),
                  )
                if (!navigator.clipboard)
                  setCopy('Selecione o link acima e copie manualmente.')
              }}
            >
              Copiar link
            </button>
            {copy ? <p role="status">{copy}</p> : null}
          </section>
        </>
      ) : null}
    </main>
  )
}
