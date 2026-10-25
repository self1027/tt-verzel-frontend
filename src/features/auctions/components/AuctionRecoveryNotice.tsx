import type { Auction } from '../api/auctions'
import { formatCentsToBrl } from '../utils/money'
import './AuctionRecoveryNotice.css'

export function AuctionRecoveryNotice({
  auction,
  confirmedTampering = false,
}: {
  auction: Pick<Auction, 'recovery' | 'cancellationReason'>
  confirmedTampering?: boolean
}) {
  const recovery = auction.recovery
  if (!recovery && !confirmedTampering) {
    return auction.cancellationReason === 'SELLER_REQUEST' ? (
      <p className="account-panel" role="status">
        Cancelado pelo leiloeiro.
      </p>
    ) : null
  }
  return (
    <section className="account-panel recovery-notice" role="alert">
      <h2>Adulteração confirmada</h2>
      <p>
        Novos lances e novas liquidações estão bloqueados. O histórico e as
        evidências foram preservados.
      </p>
      {!recovery ? (
        <p>
          Aguardando o estado da recuperação no servidor. A liberação de saldo
          ainda não foi confirmada.
        </p>
      ) : (
        <>
          <p>
            Motivo:{' '}
            <strong>
              {recovery.reason === 'EXTERNAL_ANCHOR_MISMATCH'
                ? 'O histórico diverge da referência criptográfica independente.'
                : 'A verificação criptográfica encontrou divergências no histórico ou nos dados deste lote.'}
            </strong>
          </p>
          <details>
            <summary>Referência do motivo na auditoria</summary>
            <code>{recovery.reason}</code>
          </details>
          <p>
            <strong>
              {recovery.state === 'PENDING'
                ? 'Recuperação financeira pendente'
                : recovery.state === 'RELEASED'
                  ? 'Reservas liberadas; cancelamento registrado.'
                  : 'Compensação específica necessária'}
            </strong>
          </p>
          <p>
            Prazo-alvo de três minutos:{' '}
            <time dateTime={recovery.targetAt}>
              {new Date(recovery.targetAt).toLocaleString('pt-BR')}
            </time>
            .
          </p>
          {recovery.state === 'PENDING' ? (
            <p>
              O prazo-alvo não garante liberação. As tentativas continuam no
              servidor, mesmo com esta página fechada. O saldo só é liberado
              após confirmação transacional.
            </p>
          ) : null}
          <dl className="recovery-values">
            <div>
              <dt>Ainda reservado neste lote</dt>
              <dd>{formatCentsToBrl(recovery.remainingReservedCents)}</dd>
            </div>
            <div>
              <dt>Liberação confirmada</dt>
              <dd>{formatCentsToBrl(recovery.releasedCents)}</dd>
            </div>
            <div>
              <dt>Valores capturados</dt>
              <dd>{formatCentsToBrl(recovery.capturedCents)}</dd>
            </div>
          </dl>
          <p className="muted">
            Valores agregados deste lote. Consulte sua carteira para verificar
            seu saldo disponível.
          </p>
          {recovery.state === 'COMPENSATION_REQUIRED' ? (
            <p>
              Há uma liquidação ou captura registrada. Nenhum estorno foi
              realizado. Os registros financeiros foram preservados para
              compensação específica.
            </p>
          ) : null}
          {recovery.lastError ? (
            <p>
              Última tentativa sem conclusão: {recovery.lastError}. Novas
              tentativas serão feitas pelo servidor.
            </p>
          ) : null}
          {recovery.completedAt ? (
            <p>
              Resultado confirmado em{' '}
              <time dateTime={recovery.completedAt}>
                {new Date(recovery.completedAt).toLocaleString('pt-BR')}
              </time>
              .
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
