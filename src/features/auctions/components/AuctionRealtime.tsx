import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { apiBaseUrl } from '@/api/client'
import { useSession } from '@/features/auth/session'
import { auctionKeys } from '../api/keys'
type JoinAck = { ok: true } | { ok: false; error: string }
const events = [
  'bid:accepted',
  'auction:extended',
  'auction:ended',
  'auction:settled',
  'auction:cancelled',
  'auction:integrity-warning',
]
export function AuctionRealtime({ auctionId }: { auctionId: string }) {
  const client = useQueryClient()
  const userId = useSession()?.user.id
  const [connection, setConnection] = useState(
    'Conectando ao leilão... A atualização periódica permanece ativa.',
  )
  useEffect(() => {
    const socket = io(apiBaseUrl, { autoConnect: false })
    const resync = () => {
      void client.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) })
      void client.invalidateQueries({ queryKey: auctionKeys.bids(auctionId) })
      if (userId)
        void client.invalidateQueries({ queryKey: ['private', userId] })
    }
    const offline = () =>
      setConnection(
        'Conexão ao vivo interrompida; atualização periódica a cada 10 segundos.',
      )
    socket.on('connect', () =>
      socket
        .timeout(5000)
        .emit(
          'auction:join',
          { auctionId },
          (error: Error | null, ack: JoinAck | undefined) => {
            if (!error && ack?.ok) {
              setConnection('Atualização ao vivo conectada.')
              resync()
            } else offline()
          },
        ),
    )
    socket.on('disconnect', offline)
    socket.on('connect_error', offline)
    socket.onAny((event: string, payload: unknown) => {
      if (
        events.includes(event) &&
        typeof payload === 'object' &&
        payload !== null &&
        'auctionId' in payload &&
        payload.auctionId === auctionId
      ) {
        if (event === 'auction:integrity-warning')
          setConnection(
            'Aviso de integridade recebido. Consulte a auditoria do lote.',
          )
        resync()
      }
    })
    socket.connect()
    return () => {
      if (socket.connected) socket.emit('auction:leave', { auctionId })
      socket.disconnect()
    }
  }, [auctionId, client, userId])
  return (
    <p className="realtime-status" role="status">
      {connection}
    </p>
  )
}
