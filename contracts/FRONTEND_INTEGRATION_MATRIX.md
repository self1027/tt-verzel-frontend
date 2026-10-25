# Frontend Integration Matrix

`READY` = contrato/capacidade suficiente; `PARTIAL` = integração possível com limitação explícita; `BLOCKED` = capacidade indispensável não existe. Evidências REST detalhadas em [API_MAP.md](API_MAP.md), regras em [DOMAIN_MAP.md](DOMAIN_MAP.md), eventos em [REALTIME_MAP.md](REALTIME_MAP.md).

| Funcionalidade | Status | Rotas/eventos reais | Limite relevante |
|---|---|---|---|
| Catálogo público | PARTIAL | `GET /catalog/external`, `/catalog/categories`, `/catalog/external/:id`; `GET /catalog/products` | Rotas todas exigem Bearer; fornecedor externo é dependência upstream. Não é browsing público anônimo. |
| Busca e filtros | READY | `GET /catalog/external/search?q=...`; `GET /auctions` | Busca de leilão e filtros documentados em OpenAPI; catálogo também autenticado. |
| Detalhes do leilão | READY | `GET /auctions/:id`, `GET /auctions/:id/bids` | `asOf` e `endsAt` autoritativos; `currentBidId` sozinho não contém preço. |
| Histórico de lances | READY | `GET /auctions/:auctionId/bids`; autenticado próprio `GET /auctions/bids/mine` | Público usa `bidderRef` pseudônimo; sem dados pessoais. |
| Cadastro e login | PARTIAL | `POST /auth/login`, `GET /auth/me` | Login/sessão implementados; cadastro e refresh token inexistentes. |
| Carteira | READY | `GET /wallet`, `GET /wallet/transactions` | Somente carteira própria; sem transferências/reconciliação pública. |
| Depósito | PARTIAL | `POST /wallet/deposits` | Simulado, sem integração de pagamento real; apenas BIDDER, key de idempotência necessária. |
| Envio de lance | READY | `POST /auctions/:auctionId/bids`; `GET /wallet` para saldo | BIDDER, idempotência, saldo disponível, liderança, valor mínimo e janela LIVE validados server-side. |
| Atualização em tempo real | PARTIAL | Socket `auction:join/leave`; eventos `bid:accepted`, `auction:extended`, `auction:ended`, `auction:settled`, `auction:cancelled`, `auction:integrity-warning` | Best effort sem replay/entrega garantida. Precisa ressincronizar via REST em reconnect. |
| Gestão de leilões pelo leiloeiro | READY | `GET /catalog/external*`, `POST /catalog/import/:id`, `GET /catalog/products`, `GET /auctions/mine`, `POST /auctions`, `PATCH /auctions/:id`, `POST /auctions/:id/cancel` | Proprietário + status/ausência de lances restringem edição/cancelamento. Sem cancelar lote com lances. |
| Auditoria pública | READY | `GET /auctions/:id/audit`, `/audit/events` | 503 representa witness indisponível; página `EVENT_PAGE_ONLY` não prova auditoria integral. |
| Comprovante compartilhável | READY | `GET /auctions/:id/receipt` | Só depois de settlement financeiro válido; sem lances/antes de settlement retorna 404, inconsistência 409. Independente do estado audit. |
| Encerramento e liquidação | PARTIAL | `GET /auctions/:id`, `/bids`, receipt; Socket `auction:ended`, `auction:settled`, `auction:integrity-warning` | Automático por worker; pode ser adiado por ancoragem/auditoria; frontend acompanha e não inicia liquidação. |

Status não substitui autorização de runtime: JWT expirado dá 401 e requer novo login; erro de lance/conflito deve disparar refresh dos snapshots REST.
