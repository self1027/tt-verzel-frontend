import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/session'
import {
  formatCentsToBrl,
  parseBrlInputToCents,
} from '@/features/auctions/utils/money'
import { RequestState, Pagination } from '@/components/Feedback'
import { useMoneyAction } from '@/hooks/useMoneyAction'
import { deposit, getTransactions, getWallet, walletKey } from './api'

export function WalletPage() {
  const session = useSession()!
  const client = useQueryClient()
  const [skip, setSkip] = useState(0)
  const [amount, setAmount] = useState('')
  const [validation, setValidation] = useState('')
  const wallet = useQuery({
    queryKey: walletKey(session.user.id),
    queryFn: ({ signal }) => getWallet(signal),
    refetchInterval: 15000,
  })
  const history = useQuery({
    queryKey: ['private', session.user.id, 'transactions', skip],
    queryFn: ({ signal }) => getTransactions(skip, signal),
  })
  const action = useMoneyAction(deposit, () => {
    setAmount('')
    void client.invalidateQueries({ queryKey: walletKey(session.user.id) })
    void client.invalidateQueries({
      queryKey: ['private', session.user.id, 'transactions'],
    })
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cents = parseBrlInputToCents(amount)
    if (!cents || BigInt(cents) <= 0n) {
      setValidation(
        'Informe um valor positivo em reais com até duas casas decimais.',
      )
      return
    }
    setValidation('')
    void action.submit(cents)
  }
  return (
    <main id="main-content" className="account-page">
      <div className="account-heading">
        <div>
          <p className="eyebrow">Sua carteira</p>
          <h1>Saldo para o próximo lance.</h1>
          <p>
            O valor reservado acompanha os lotes em que você está liderando.
          </p>
        </div>
      </div>
      <RequestState
        pending={wallet.isPending}
        error={wallet.error}
        retry={() => void wallet.refetch()}
      />
      {wallet.data ? (
        <dl className="balance-strip">
          <div>
            <dt>Saldo disponível</dt>
            <dd>{formatCentsToBrl(wallet.data.availableCents)}</dd>
          </div>
          <div>
            <dt>Saldo reservado</dt>
            <dd>{formatCentsToBrl(wallet.data.reservedCents)}</dd>
          </div>
          <div>
            <dt>Saldo total</dt>
            <dd>{formatCentsToBrl(wallet.data.balanceCents)}</dd>
          </div>
        </dl>
      ) : null}
      <div className="account-grid">
        <section aria-labelledby="transactions-title">
          <h2 id="transactions-title">Movimentações</h2>
          <RequestState
            pending={history.isPending}
            error={history.error}
            retry={() => void history.refetch()}
          />
          {history.data?.total === 0 ? (
            <p className="muted">Nenhuma movimentação registrada.</p>
          ) : null}
          <ul className="account-list">
            {history.data?.transactions.map((transaction) => (
              <li key={transaction.id}>
                <div>
                  <h3>
                    {transaction.type === 'DEPOSIT'
                      ? 'Depósito simulado'
                      : 'Liquidação de leilão'}
                  </h3>
                  <time dateTime={transaction.createdAt}>
                    {new Date(transaction.createdAt).toLocaleString('pt-BR')}
                  </time>
                </div>
                <strong>
                  {BigInt(transaction.amountCents) < 0n ? '−' : '+'}
                  {formatCentsToBrl(
                    (BigInt(transaction.amountCents) < 0n
                      ? -BigInt(transaction.amountCents)
                      : BigInt(transaction.amountCents)
                    ).toString(),
                  )}
                </strong>
              </li>
            ))}
          </ul>
          {history.data ? (
            <Pagination {...history.data} move={setSkip} />
          ) : null}
        </section>
        <form
          className="form-panel"
          onSubmit={submit}
          aria-label="Depósito simulado"
        >
          <h2>Adicionar saldo</h2>
          <p>
            Este depósito é uma simulação. Nenhuma cobrança ou pagamento real
            será realizado.
          </p>
          <label>
            Valor do depósito (R$)
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={action.pending || action.uncertain}
              aria-describedby="deposit-feedback"
              aria-invalid={validation ? true : undefined}
              required
            />
          </label>
          <div id="deposit-feedback">
            {validation || action.error ? (
              <p className="feedback-error" role="alert">
                {validation || action.error}
              </p>
            ) : null}
            {action.success ? (
              <p role="status" className="feedback-success">
                Depósito confirmado pela plataforma.
              </p>
            ) : null}
          </div>
          <button className="button button-primary" disabled={action.pending}>
            {action.pending ? 'Confirmando...' : 'Depositar saldo simulado'}
          </button>
        </form>
      </div>
    </main>
  )
}
