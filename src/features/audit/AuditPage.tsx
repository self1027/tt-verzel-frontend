import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { RequestState } from '@/components/Feedback'
import { useSyncExternalStore } from 'react'
import { getAudit, getAuditEvents } from './api'
function subscribeConnectivity(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}
const messages = {
  VERIFIED: {
    title: 'Histórico verificado',
    description:
      'A cadeia local e os registros operacionais foram comparados com a referência independente configurada. Esta verificação não comprova a identidade legal dos participantes ou a autenticidade do produto.',
  },
  PENDING_ANCHOR: {
    title: 'Aguardando ancoragem',
    description:
      'Os registros ainda aguardam confirmação na referência independente. O estado pendente não é evidência de adulteração.',
  },
  TAMPERED: {
    title: 'Adulteração detectada',
    description:
      'A plataforma encontrou divergências na verificação do histórico. Consulte os registros e aguarde a análise antes de confiar neste lote.',
  },
  VERIFICATION_UNAVAILABLE: {
    title: 'Verificação indisponível',
    description:
      'A referência de verificação não pôde ser consultada. Isso não significa que o histórico foi adulterado. Tente novamente mais tarde.',
  },
}
export function AuditPage() {
  const { id = '' } = useParams()
  const online = useSyncExternalStore(
    subscribeConnectivity,
    () => navigator.onLine,
  )
  const verification = useQuery({
    queryKey: ['audit', id],
    queryFn: ({ signal }) => getAudit(id, signal),
    retry: false,
    refetchInterval: 15000,
  })
  const history = useInfiniteQuery({
    queryKey: ['audit-events', id],
    queryFn: ({ signal, pageParam }) => getAuditEvents(id, pageParam, signal),
    initialPageParam: '0',
    getNextPageParam: (last, _pages, cursor) =>
      'proof' in last && last.events.length > 0 && last.nextAfter !== cursor
        ? last.nextAfter
        : undefined,
    retry: false,
  })
  const tampered = history.data?.pages.some(
    (page) => 'status' in page && page.status === 'TAMPERED',
  )
  const unavailable = !online || verification.isError || verification.isPaused
  const state = tampered
    ? 'TAMPERED'
    : unavailable
      ? 'VERIFICATION_UNAVAILABLE'
      : verification.isFetching
        ? undefined
        : verification.data?.status
  const message = state ? messages[state] : undefined
  const events = tampered
    ? []
    : (history.data?.pages.flatMap((page) =>
        'proof' in page ? page.events : [],
      ) ?? [])
  return (
    <main id="main-content" className="account-page">
      <Link className="back-link" to={`/auctions/${id}`}>
        Voltar ao lote
      </Link>
      <div className="account-heading">
        <div>
          <p className="eyebrow">Auditoria pública</p>
          <h1>Verificação do histórico</h1>
          <p>
            Consulte a integridade e os eventos deste lote sem precisar entrar.
          </p>
        </div>
        <button
          className="button button-filter"
          onClick={() => {
            void verification.refetch()
            void history.refetch()
          }}
          disabled={verification.isFetching || history.isFetching}
        >
          Atualizar verificação
        </button>
      </div>
      <RequestState
        pending={verification.isPending}
        error={verification.error}
        retry={() => void verification.refetch()}
      />
      {message ? (
        <section
          className={`verification-panel verification-${state}`}
          aria-labelledby="verification-title"
        >
          <span className="verification-mark" aria-hidden="true">
            {state === 'VERIFIED' ? '✓' : state === 'TAMPERED' ? '!' : '…'}
          </span>
          <div>
            <h2 id="verification-title">{message.title}</h2>
            <p>{message.description}</p>
            {unavailable && verification.dataUpdatedAt > 0 ? (
              <p role="note">
                Última resposta armazenada em{' '}
                {new Date(verification.dataUpdatedAt).toLocaleString('pt-BR')}.
                Ela não confirma a integridade atual do lote.
              </p>
            ) : null}
            {verification.data?.integrityCoverage === 'SELLER_PRODUCT_V2' ? (
              <p>
                Prova v2: inclui o vínculo do vendedor e o conteúdo do produto.
              </p>
            ) : verification.data?.integrityCoverage === 'LEGACY_V1' ? (
              <p role="note">
                Prova legada v1: não verifica o vendedor original nem o conteúdo
                do produto. A verificação acima cobre somente o histórico
                legado.
              </p>
            ) : verification.data ? (
              <p role="note">
                A cobertura criptográfica do vendedor e do produto está
                indisponível nesta verificação.
              </p>
            ) : null}
            {verification.data ? (
              <p className="muted">
                Sequência local: {verification.data.localSequence} · Confirmada
                externamente: {verification.data.externallyVerifiedSequence}
              </p>
            ) : null}
            {verification.data?.reason ? (
              <p>Motivo informado: {verification.data.reason}</p>
            ) : null}
          </div>
        </section>
      ) : null}
      {tampered ? (
        <p className="feedback-error" role="alert">
          A página de eventos também indica adulteração. Os eventos não serão
          apresentados como íntegros.
        </p>
      ) : null}
      <section aria-labelledby="audit-events-title">
        <h2 id="audit-events-title">Eventos do lote</h2>
        <p className="muted">
          Cada página de eventos contém apenas registros para inspeção
          (EVENT_PAGE_ONLY). Ela não substitui a verificação integral acima.
        </p>
        <RequestState
          pending={history.isPending}
          error={history.error}
          retry={() => void history.refetch()}
        />
        <ol className="audit-events">
          {events.map((event) => (
            <li key={event.id}>
              <div className="event-header">
                <strong>
                  #{event.sequence} · {event.eventType}
                </strong>
                <time dateTime={event.createdAt}>
                  {new Date(event.createdAt).toLocaleString('pt-BR')}
                </time>
              </div>
              <details>
                <summary>Inspecionar registro e hashes</summary>
                <dl>
                  <dt>Hash anterior</dt>
                  <dd>{event.previousHash}</dd>
                  <dt>Hash do evento</dt>
                  <dd>{event.eventHash}</dd>
                </dl>
                <pre>{JSON.stringify(event.payload, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ol>
        {history.hasNextPage ? (
          <button
            className="button button-filter"
            onClick={() => void history.fetchNextPage()}
            disabled={history.isFetchingNextPage}
          >
            Carregar mais eventos
          </button>
        ) : history.data && !tampered ? (
          <p role="status" className="muted">
            Todos os eventos disponíveis foram carregados ({events.length}).
          </p>
        ) : null}
      </section>
    </main>
  )
}
