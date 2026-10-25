# Realtime Map — Socket.IO

## Conexão

Socket.IO é anexado ao mesmo HTTP server/API origin; use `io(API_BASE_URL)` (default path `/socket.io`, namespace `/`). Transporte selecionado pelo Socket.IO client/server padrão (polling e upgrade WebSocket); não há `transports` forçado nem namespace dedicado. Sem autenticação. CORS usa as mesmas origens exatas configuradas para HTTP; requests sem Origin são permitidos. [server.ts](../../src/server.ts#L55-L58), [auction-sockets.ts](../../src/modules/realtime/auction-sockets.ts#L15-L21).

## Eventos client → server

Payload: `{auctionId:string}` onde UUID parseável; normalizado lowercase. Callback opcional recebe ack.

| Evento | Resultado |
|---|---|
| `auction:join` | Entra na sala interna `auction:<uuid>`. Ack `{ok:true}` ou `{ok:false,error:"INVALID_AUCTION"|"ROOM_LIMIT"}`. Máximo 100 salas distintas por conexão. UUID não precisa existir para aderir. |
| `auction:leave` | Sai da sala. Ack `{ok:true}` ou `{ok:false,error:"INVALID_AUCTION"}`. |

Evidência: [auction-sockets.ts](../../src/modules/realtime/auction-sockets.ts#L6-L13), [auction-sockets.ts](../../src/modules/realtime/auction-sockets.ts#L22-L49).

## Eventos server → client

Todos são emitidos para a sala do lote com `auctionId` lowercase anexado ao objeto de dados. Shape abaixo lista exatamente o dado originado no publisher + `auctionId` adicionado em [auction-sockets.ts](../../src/modules/realtime/auction-sockets.ts#L51-L55).

| Evento | Payload recebido | Quando / evidência |
|---|---|---|
| `bid:accepted` | `{id:string,bidderRef:string,amountCents:string,sequence:string,createdAt:string,endsAt:string,auctionId:string}` | Depois do commit de lance; cents e sequência string [drizzle-bid-repository.ts](../../src/modules/bids/repositories/drizzle-bid-repository.ts#L62-L70). |
| `auction:extended` | `{endsAt:string,auctionId:string}` | Depois de bid aceito, apenas se deadline mudou [drizzle-bid-repository.ts](../../src/modules/bids/repositories/drizzle-bid-repository.ts#L67-L70). |
| `auction:ended` | `{status:"SETTLED"|"CLOSED_NO_BIDS",auctionId:string}` | Worker completa settlement/fechamento [settlement-service.ts](../../src/modules/settlements/services/settlement-service.ts#L63-L66). |
| `auction:settled` | `{settlementId:string,receiptUrl:string,auctionId:string}`; receipt URL `/auctions/:id/receipt` | Após liquidação com vencedor [settlement-service.ts](../../src/modules/settlements/services/settlement-service.ts#L65-L66). |
| `auction:cancelled` | `{reason:"SELLER_REQUEST",auctionId:string}` | Após commit de cancelamento [drizzle-auction-repository.ts](../../src/modules/auctions/repositories/drizzle-auction-repository.ts#L111-L111). |
| `auction:integrity-warning` | `{reason:"AUDIT_TAMPERED",auctionId:string}` | Auditoria marcada adulterada no worker [settlement-service.ts](../../src/modules/settlements/services/settlement-service.ts#L15-L18). |

## Garantias e ressincronização

Eventos são best-effort hints publicados depois do commit. Não há garantia de entrega, replay, persistência de notificação, ordenação de ponta a ponta nem adapter distribuído; o código emite eventos in-memory para salas Socket.IO. Não há feed realtime de carteira. [auction-events.ts](../../src/shared/events/auction-events.ts#L3-L7), [server.ts](../../src/server.ts#L36-L58).

Ao conectar/reconectar, reemitir `auction:join` para cada lote visível e, após ack positivo, buscar snapshots autoritativos por `GET /auctions/:id` + `GET /auctions/:id/bids`; se autenticado e a tela exibir saldo, `GET /wallet`. Tratar cada evento apenas como gatilho para atualização. Consulta de lance pública também devolve `endsAt,status,asOf`; `asOf` permite ajustar relógio visual. REST é autoritativo. Para contrato REST completo, veja [API_MAP.md](API_MAP.md); para regras, [DOMAIN_MAP.md](DOMAIN_MAP.md).
