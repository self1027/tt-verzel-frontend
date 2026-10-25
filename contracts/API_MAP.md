# API Map — frontend contract

Base local: `http://localhost:3000` (configurable `PORT`). OpenAPI 3.1 em [`../openapi.json`](../openapi.json), também servido em `GET /openapi.json`. Routers montados em [app.ts](../../src/app.ts#L11-L18); módulos em [server.ts](../../src/server.ts#L34-L58). Todas as rotas recebem JSON limitado a 16 KiB quando há body. Erros de validação são `{error:{code,message,details?}}`; `details` contém `{path,code}`. Outros erros omitem `details`. Erros incluem `Cache-Control:no-store`; 401 inclui `WWW-Authenticate: Bearer`. Veja [error-handler.ts](../../src/shared/http/error-handler.ts#L5-L29). `NOT_FOUND` também cobre qualquer rota ausente. Não há health check.

## Convenções e autenticação

- “Bearer” significa `Authorization: Bearer <JWT>`; autorização de papel é uma checagem distinta. Mudanças de leilão também exigem propriedade do lote, status `PUBLISHED`, ausência de qualquer lance e datas elegíveis.
- JWT HS256 com `sub` UUID, `iss=verzel-auction-house`, `aud=verzel-api`, `iat`, `exp`; TTL configurável 1–86400s, padrão 3600. Sem refresh token, registro, logout ou endpoint de administrador. Após expiração/invalidade, API retorna 401; frontend deve autenticar de novo. [jwt-tokens.ts](../../src/modules/auth/infrastructure/jwt-tokens.ts#L8-L35), [config.ts](../../src/shared/config.ts#L25-L33).
- Papéis: `AUCTIONEER`, `BIDDER`; usuário público: `{id,email,displayName,role}`. Login normaliza email trim/lowercase. [authorization.ts](../../src/modules/auth/middleware/authorization.ts#L7-L15), [auth-controller.ts](../../src/modules/auth/controllers/auth-controller.ts#L7-L11).
- CORS aceita origens HTTP(S) exatas configuradas em `CORS_ORIGINS`, sem wildcard; preflight permite `GET,POST,PATCH,OPTIONS` e headers `Content-Type,Authorization,Idempotency-Key`. Credenciais CORS não são habilitadas. [cors.ts](../../src/shared/http/cors.ts#L3-L28).
- Schemas de cents e DTOs nomeados estão em OpenAPI 3.1, `components.schemas`; usar strings decimais canônicas, nunca `number` para dinheiro/sequence. Contratos TypeScript resumidos em [DOMAIN_MAP.md](DOMAIN_MAP.md#catalogo-de-dtos-typescript).

## Inventário de endpoints

Em cada linha: Auth; authorization; entrada; saída/status; erros notáveis. Path UUIDs são UUID; datas `date-time` ISO 8601 com offset na entrada e UTC `toISOString()` na saída. Erros gerais 400/404/409/413/500 usam esquema `Error` do OpenAPI; 401/403 apenas em protegidas. 400 cobre schema inválido, query desconhecida/repetida e JSON inválido; 413 body >16 KiB. Códigos de negócio exatos abaixo quando confirmados no serviço; ver formato no topo. OpenAPI é evidência do shape integral de resposta.

### Auth — 2

| Método e caminho | Auth / autorização | Parâmetros e body | Resposta e comportamento | Evidência |
|---|---|---|---|---|
| POST `/auth/login` | Público | Body obrigatório `LoginInput`: `{email:string(email,max255),password:string(1..1024)}`; strict | 200 `Login` `{accessToken,tokenType:"Bearer",expiresIn:number,user:User}`; 400 inválido, 401 credencial inválida, 404/409/500 comuns | [auth/index.ts](../../src/modules/auth/index.ts#L23-L28), [auth-controller.ts](../../src/modules/auth/controllers/auth-controller.ts#L7-L21), [openapi.json](../openapi.json#L1) |
| GET `/auth/me` | Bearer | Sem parâmetros/body | 200 `{user:User}`; 401 token ausente/inválido/expirado | [auth/index.ts](../../src/modules/auth/index.ts#L23-L28), [authentication.ts](../../src/modules/auth/middleware/authentication.ts#L9-L18) |

Cadastro e recuperação de senha não existem.

### Catálogo — 7

Todas exigem Bearer por router middleware; `POST /catalog/import/:id` adicionalmente exige `AUCTIONEER`. Query pagination: `limit` inteiro 1..100 default 30; `skip` 0..2147483647 default 0. Paginação externa reflete fornecedor DummyJSON. Rotas, schemas e shape exatos em [catalog/index.ts](../../src/modules/catalog/index.ts#L14-L23), [catalog-controller.ts](../../src/modules/catalog/controllers/catalog-controller.ts#L5-L43), OpenAPI schemas `ExternalProduct*`, `Product*`.

| Método e caminho | Entrada | Resposta | Efeitos/erros | Evidência |
|---|---|---|---|---|
| GET `/catalog/external` | `limit,skip`; `category` opcional slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max100 | 200 `ExternalProductPage` | Provider externo; 502/503/504 upstream | [catalog/index.ts](../../src/modules/catalog/index.ts#L16-L23) |
| GET `/catalog/external/search` | `limit,skip`; `q` obrigatório, trim, 1..200 | 200 `ExternalProductPage` | Provider externo; 502/503/504 | [catalog-controller.ts](../../src/modules/catalog/controllers/catalog-controller.ts#L7-L8) |
| GET `/catalog/external/:id` | `id` inteiro positivo | 200 `{product:ExternalProduct}` | Não encontrado 404; erros upstream | [catalog-controller.ts](../../src/modules/catalog/controllers/catalog-controller.ts#L9-L10) |
| GET `/catalog/categories` | Sem params/body | 200 `string[]` | Provider externo; erros upstream | [catalog-controller.ts](../../src/modules/catalog/controllers/catalog-controller.ts#L11-L12) |
| POST `/catalog/import/:id` | AUCTIONEER; id inteiro positivo; body ausente ou `{}` estrito | 201 `{product:ProductSnapshot,created:true}` ou 200 `created:false` | Persiste snapshot somente na primeira importação; produto externo ausente 404 | [catalog-controller.ts](../../src/modules/catalog/controllers/catalog-controller.ts#L14-L19) |
| GET `/catalog/products` | `limit,skip` | 200 `ProductPage` | Snapshots locais | [catalog-controller.ts](../../src/modules/catalog/controllers/catalog-controller.ts#L21-L22) |
| GET `/catalog/products/:id` | `id` UUID | 200 `{product:ProductSnapshot}` | 404 se ausente | [catalog-controller.ts](../../src/modules/catalog/controllers/catalog-controller.ts#L24-L25) |

`ExternalProduct`: `id:number,title:string,description:string|null,imageUrl:string|null,attributes:object`. `ProductSnapshot`: `id UUID,externalId:string,source:string,title:string,description:string|null,imageUrl:string|null,attributes:unknown,capturedAt:date-time`.

### Auctions e lances — 9

Routers/ordem e middleware em [auctions/index.ts](../../src/modules/auctions/index.ts#L15-L24), [bids/index.ts](../../src/modules/bids/index.ts#L15-L20). Detalhe de filtros, lifecycle, efeitos e lances em [DOMAIN_MAP.md](DOMAIN_MAP.md#estados-de-leilao-e-regras-de-ui).

| Método e caminho | Auth / autorização | Parâmetros/body | Response | Regras/erros e evidência |
|---|---|---|---|---|
| GET `/auctions` | Público | Filtros da seção “Busca”; nenhum body | 200 `AuctionPage` `{total,limit,skip,auctions,asOf}` | OpenAPI e schema Zod [auction-controller.ts](../../src/modules/auctions/controllers/auction-controller.ts#L14-L25) |
| POST `/auctions` | Bearer; AUCTIONEER | `CreateAuction` obrigatório: `productSnapshotId:UUID,startingBidCents:PositiveCents,minIncrementCents:PositiveCents,startsAt,endsAt:date-time com offset, até ms` | 201 `{auction:Auction}` | Exige snapshot existente (404 PRODUCT_NOT_FOUND), start futuro/end após start (400 INVALID_AUCTION_DATES) [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L17-L27) |
| GET `/auctions/mine` | Bearer; AUCTIONEER | Mesmos filtros; filtra proprietário | 200 `AuctionPage` | Papel não implica propriedade adicional para listar; [auctions/index.ts](../../src/modules/auctions/index.ts#L19-L21) |
| GET `/auctions/:id` | Público | UUID path | 200 `{auction:Auction}` | 404 AUCTION_NOT_FOUND [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L39-L43) |
| PATCH `/auctions/:id` | Bearer; AUCTIONEER + dono do lote | `EditAuction`, strict, pelo menos um campo: `startingBidCents?,minIncrementCents?,startsAt?,endsAt?`; mêmes formats de criação | 200 `{auction:Auction}` | Só antes de startsAt, status PUBLISHED, sem current ou histórico de lances; 403 FORBIDDEN, 409 AUCTION_ALREADY_STARTED/AUCTION_HAS_BIDS/AUCTION_NOT_PUBLISHED; [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L45-L60) |
| POST `/auctions/:id/cancel` | Bearer; AUCTIONEER + dono | UUID; body ausente ou `{}` strict | 200 `{auction:Auction}` | PUBLISHED, nenhum lance, antes de endsAt; pode cancelar já iniciado sem lances; 409 AUCTION_EXPIRED/…; [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L62-L81) |
| GET `/auctions/:auctionId/bids` | Público | UUID; `limit` default30 1..100, `skip` default0 >=0 | 200 `PublicBidPage` com bids, total, currentBid nullable, endsAt,status,asOf | Histórico mais recente/ordem no schema de consulta; [bids/index.ts](../../src/modules/bids/index.ts#L17-L19) |
| POST `/auctions/:auctionId/bids` | Bearer; BIDDER | Header único `Idempotency-Key` regex `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`; body `{amountCents:PositiveCents}` strict | 201 `{bid:BidReceipt}` inclusive replay | LIVE, não líder atual, acima mínimo, saldo disponível suficiente. Reserva novo valor e libera reserva do líder anterior na mesma transação; key reutilizada com payload diferente 409 IDEMPOTENCY_CONFLICT; [bid-controller.ts](../../src/modules/bids/controllers/bid-controller.ts#L17-L24), [bid-service.ts](../../src/modules/bids/services/bid-service.ts#L12-L53) |
| GET `/auctions/bids/mine` | Bearer; BIDDER | `limit,skip` | 200 `OwnBidPage` | Próprio histórico com `isLeading`; [bids/index.ts](../../src/modules/bids/index.ts#L17-L18) |

Filtros `GET /auctions` e `/mine`: `q` string (vazio permitido); `lifecycleState` enum `SCHEDULED,LIVE,FINALIZING,CANCELLED,SETTLED,CLOSED_NO_BIDS`; `minPriceCents,maxPriceCents` canonical nonnegative cents, inclusivos; `sort` `price_asc|price_desc|endsAt_asc|endsAt_desc`; `page` 1..2147483648; `limit` 1..100 default30; `skip` 0..2147483647 default0. `page` e `skip` incompatíveis; offset <=2147483647; min <= max. Parâmetros repetidos/desconhecidos falham. Filtragem AND; `q` substring literal case-insensitive no título; sem lifecycle inclui terminais; preço é bid atual ou starting bid; desempate id ASC; default createdAt DESC/id ASC. Retorno inclui `asOf` e o `skip` calculado. Evidência integral na descrição OpenAPI `/auctions` e [auction-controller.ts](../../src/modules/auctions/controllers/auction-controller.ts#L14-L29).

### Wallet — 3

| Método e caminho | Auth / autorização | Entrada | Resposta/efeito | Erros/evidência |
|---|---|---|---|---|
| GET `/wallet` | Bearer; própria carteira | — | 200 `{wallet:{balanceCents,reservedCents,availableCents}}` strings cents | Provisão/consulta carteira; invariant violada 409 INVALID_WALLET_BALANCE [wallet-service.ts](../../src/modules/wallets/services/wallet-service.ts#L6-L18) |
| GET `/wallet/transactions` | Bearer; própria carteira | `limit` default30 (1..100), `skip` default0 (0..2147483647) | 200 `WalletHistory` (`total,limit,skip,transactions[]`) | Ledger paginado; [wallet-controller.ts](../../src/modules/wallets/controllers/wallet-controller.ts#L28-L30) |
| POST `/wallet/deposits` | Bearer; BIDDER | Header único `Idempotency-Key`; body `{amountCents:PositiveCents}` | 201 `{deposit:{transactionId,amountCents,createdAt}}`; replay retorna receipt original | Simulado, lança entrada contábil balanceada e credita carteira; 409 IDEMPOTENCY_CONFLICT/BALANCE_LIMIT/estado ledger inconsistente [wallet-service.ts](../../src/modules/wallets/services/wallet-service.ts#L20-L48) |

Reserva, captura e semântica contábil estão em [DOMAIN_MAP.md](DOMAIN_MAP.md#contratos-financeiros).

### Auditoria pública e recibo — 3

| Método e caminho | Auth | Entrada | Resposta/status | Evidência |
|---|---|---|---|---|
| GET `/auctions/:id/audit` | Público | UUID; query estrita vazia | 200 `AuditVerification`; 503 com mesmo DTO e status `VERIFICATION_UNAVAILABLE`; 404 leilão inexistente | [audit-controller.ts](../../src/modules/audit/controllers/audit-controller.ts#L17-L24) |
| GET `/auctions/:id/audit/events` | Público | UUID; `after` canonical nonnegative BIGINT seq default `0`; `limit` 1..100 default30 | 200 `AuditPage` (página `EVENT_PAGE_ONLY`) ou 200 `TAMPERED` com events vazios | Corrupção da página não sobe HTTP status; query desconhecida/repetida 400 [audit-controller.ts](../../src/modules/audit/controllers/audit-controller.ts#L7-L16), [audit-controller.ts](../../src/modules/audit/controllers/audit-controller.ts#L26-L47) |
| GET `/auctions/:id/receipt` | Público | UUID; query estrita vazia | 200 `{receipt:PublicReceipt}` | 404 até settlement financeiro (também sem lances); 409 inconsistência; Cache-Control no-store [receipt-controller.ts](../../src/modules/settlements/controllers/receipt-controller.ts#L7-L16), [receipt-service.ts](../../src/modules/settlements/services/receipt-service.ts#L7-L26) |

### Documentação — 1

| Método/caminho | Auth | Response | Evidência |
|---|---|---|---|
| GET `/openapi.json` | Público | Documento OpenAPI carregado do arquivo versionado | [app.ts](../../src/app.ts#L11-L11), [server.ts](../../src/server.ts#L25-L27) |

## Códigos de negócio relevantes

Bid: `INVALID_AMOUNT`, `INVALID_IDEMPOTENCY_KEY`, `AUCTION_NOT_FOUND`, `BIDDER_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `BID_HISTORY_CORRUPT`, `INVALID_AUCTION_STATE`, `AUCTION_NOT_LIVE`, `ALREADY_LEADING`, `BID_LIMIT`, `BID_TOO_LOW`, `INVALID_WALLET_STATE`, `RESERVATION_CONFLICT`, `INSUFFICIENT_FUNDS`. Auction: `PRODUCT_NOT_FOUND`, `INVALID_AUCTION_AMOUNT`, `INVALID_AUCTION_DATES`, `AUCTION_NOT_FOUND`, `FORBIDDEN`, `AUCTION_ALREADY_STARTED`, `AUCTION_NOT_PUBLISHED`, `AUCTION_HAS_BIDS`, `AUCTION_EXPIRED`. Wallet: `INVALID_AMOUNT`, `INVALID_IDEMPOTENCY_KEY`, `INVALID_WALLET_BALANCE`, `INVALID_DEPOSIT_RECORD`, `IDEMPOTENCY_CONFLICT`, `BALANCE_LIMIT`, `INVALID_CLEARING_ACCOUNT`. Receipt: `RECEIPT_NOT_AVAILABLE`, `RECEIPT_INCONSISTENT`. Erros específicos audit/upstream nos guias OpenAPI e módulos. Erros não documentados individualmente aqui estão `NÃO CONFIRMADO` além do schema geral; não inferir uma lista exaustiva de todos os erros por rota.

## OpenAPI vs implementação

- OpenAPI declara o login 200 e erros compartilhados; implementação retorna 200 padrão e formato do error-handler. Contrato alinhado no essencial.
- Todos os endpoints `/catalog/*` exigem Bearer por `router.use(authenticate)` (inclusive navegação/categorias); deixar explícito no cliente.
- OpenAPI define `after` de auditoria usando `NonnegativeCents`; implementação aceita sequence não negativo até BIGINT max, equivalência prática, mas o nome do schema é inadequado.
- OpenAPI permite `lifecycleState` `FINALIZING`; estado é derivado da hora atual enquanto `status` persistido segue quatro valores.
- Sem rota `/health`, registro de usuário, refresh ou settlement manual. Endpoint `GET /openapi.json` não aparece como path do documento servido (auto referência ausente).
