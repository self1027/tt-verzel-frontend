# Domain Map — contratos e regras de UI

Evidências completas de entrada/saída HTTP: [API_MAP.md](API_MAP.md). Strings de montantes e sequências são especialmente relevantes para TypeScript.

## Estados de leilão

Estado persistido (`Auction.status`): `PUBLISHED | CANCELLED | SETTLED | CLOSED_NO_BIDS`. Campo exposto `lifecycleState` é derivado para status PUBLISHED: `SCHEDULED` se `now < startsAt`; `LIVE` se `startsAt <= now < endsAt`; `FINALIZING` se `now >= endsAt`. Para status terminal, lifecycleState é o próprio status. `now` vem do banco (`asOf` nas listagens e consulta de bids). [auctions/contracts/auctions.ts](../../src/modules/auctions/contracts/auctions.ts#L3-L5), [lifecycle.ts](../../src/modules/auctions/lifecycle.ts#L3-L11), [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L8-L15).

Transições observadas: criação futura → PUBLISHED/SCHEDULED; relógio promove estado calculado para LIVE e depois FINALIZING sem gravar status; cancelamento do proprietário sem lance e antes de `endsAt` → CANCELLED; worker após prazo com prova de auditoria VERIFIED: sem lances → CLOSED_NO_BIDS; com lance → captura/settlement e SETTLED. `TAMPERED` bloqueia processamento e emite aviso; witness pendente/indisponível adia. Não existe endpoint manual de encerrar/liquidar. [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L17-L27), [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L45-L81), [settlement-service.ts](../../src/modules/settlements/services/settlement-service.ts#L9-L69).

Criação exige snapshot local; `startsAt` futuro na hora do banco, `endsAt > startsAt`; valores positivos BIGINT. Datas de entrada devem incluir timezone/offset e suportam no máximo milissegundos. Saídas serializadas ISO UTC. Configure relógios/countdowns usando `asOf` e datas de resposta, não relógio local como autoridade. [auction-controller.ts](../../src/modules/auctions/controllers/auction-controller.ts#L7-L13), [auction-service.ts](../../src/modules/auctions/services/auction-service.ts#L8-L15).

### Lances, liderança e anti-sniping

- Primeiro lance mínimo = `startingBidCents`; próximos = lance líder + `minIncrementCents`. Atual líder não pode lançar de novo. Lance exige status PUBLISHED e instante `startsAt <= DB now < endsAt`, além de saldo disponível. [bid-rules.ts](../../src/modules/bids/domain/bid-rules.ts#L18-L37).
- Se lance aceito nos últimos 120.000 ms (incluindo exatamente 2 minutos antes do encerramento), acrescenta 120.000 ms ao prazo existente. A resposta idempotente preserva `endsAt` daquele lance aceito. [bid-rules.ts](../../src/modules/bids/domain/bid-rules.ts#L5-L5), [bids.ts](../../src/modules/bids/contracts/bids.ts#L17-L19).
- Sob transação: libera reserva do líder anterior, grava lance, reserva o novo total, atualiza líder/prazo e trilha de auditoria. Key de idempotência é por usuário+lote; mesma key mesmo montante retorna o receipt armazenado, montante diferente dá 409. [bid-service.ts](../../src/modules/bids/services/bid-service.ts#L12-L53).
- `currentBidId` da Auction é só ID; buscar `/bids` para valor/leader atual, e não inferir o lance atual a partir de campos inexistentes.

### Busca e paginação de leilões

Veja lista integral dos campos, tipos e validação em [API_MAP.md](API_MAP.md#auctions-e-lances). `q` busca substring literal case-insensitive do título de snapshot; preço é lance atual ou valor inicial; todos filtros combinam AND. `page` one-based é convertido para `skip` e não ecoado; response contém `total,limit,skip,auctions,asOf`. Busca e total compartilham snapshot REPEATABLE READ descrito no OpenAPI. Estado calculado do lifecycle é avaliado usando `asOf` da página.

## Contratos financeiros

Todos cents trafegam como strings decimais canônicas; quantias positivas de input aceitam `1..9223372036854775807`; saldo e filtros não negativos aceitam `0..9223372036854775807`. Transaction amounts/entries permitem decimal negativo (`^-?(0|[1-9][0-9]*)$`). Não converter para IEEE-754 `number`; preservar strings ou usar `BigInt` para aritmética exata. UI converte para unidade monetária apenas para apresentação. Fonte [openapi.json](../openapi.json#L1) schemas `PositiveCents`, `NonnegativeCents`, `WalletTransaction`; validação em [wallet-controller.ts](../../src/modules/wallets/controllers/wallet-controller.ts#L7-L9), [bid-controller.ts](../../src/modules/bids/controllers/bid-controller.ts#L8-L11).

- `balanceCents`: saldo materializado da carteira; `reservedCents`: fundos reservados pela liderança ativa; `availableCents = balanceCents - reservedCents`, calculado pelo backend. O backend também valida `0 <= reserved <= balance`; os três campos são autoritativos de resposta. [wallet-service.ts](../../src/modules/wallets/services/wallet-service.ts#L6-L18).
- Depósito é simulado, apenas BIDDER, positivo e idempotente. Entrada de ledger balanceada credita carteira; key de intenção deve ser mantida nos retries. O frontend não deve tratar como pagamento/cartão real. [wallet-service.ts](../../src/modules/wallets/services/wallet-service.ts#L20-L48).
- Lance reserva fundos do usuário líder; novo líder libera reserva anterior. Ao settlement o worker captura reserva e credita vendedor, cria `AUCTION_SETTLEMENT`, muda status. Tudo ocorre sob transação/locks; sem comando financeiro manual. [bid-service.ts](../../src/modules/bids/services/bid-service.ts#L39-L53), [settlement-service.ts](../../src/modules/settlements/services/settlement-service.ts#L44-L60).
- Histórico contábil expõe `DEPOSIT|AUCTION_SETTLEMENT`, `amountCents` com sinal e `entries` assinadas. É história paginada da carteira autenticada; reconciliação não é endpoint público. [wallets.ts](../../src/modules/wallets/contracts/wallets.ts#L18-L27).
- Dados autoritativos: cents de API, `availableCents`, `currentBid` + status + `endsAt` de REST, status financeiro e audit. Frontend pode derivar strings formatadas, mínimo do lance para exibição e contagem regressiva provisória; revalidar e usar respostas do servidor para decisões.

## Auditoria, integridade e comprovantes

`GET /auctions/:id/audit` retorna `AuditVerification`: `VERIFIED`, `PENDING_ANCHOR`, `TAMPERED`, `VERIFICATION_UNAVAILABLE`; o último vem em HTTP 503. Demais estados HTTP 200. `operationalCoverage`: `CONSISTENT|NOT_RECORDED|DIVERGENT|UNAVAILABLE`. `VERIFIED` requer cadeia local, replay operacional registrado e head independente igual ao head local. `PENDING_ANCHOR` não prova verificação externa. Sem witness configurado/online, status unavailable. [audit-verifier.ts](../../src/modules/audit/services/audit-verifier.ts#L11-L35), [audit-verifier.ts](../../src/modules/audit/services/audit-verifier.ts#L37-L69), [audit-controller.ts](../../src/modules/audit/controllers/audit-controller.ts#L17-L24).

`GET /audit/events` pagina por cursor exclusivo `after`; sucesso contém hashes/events e `proof:"EVENT_PAGE_ONLY"`, que não equivale a verificar cadeia/witness. Corrupção local devolve HTTP 200 `{auctionId,status:"TAMPERED",reason:"INVALID_PUBLIC_EVENT",events:[]}`. [audit-controller.ts](../../src/modules/audit/controllers/audit-controller.ts#L26-L47).

Eventos expostos incluem commitments de lote/lances/liquidação, hash anterior/hash do evento, sequência e timestamps. `bidderRef` é pseudônimo estável por leilão gerado por HMAC; IDs públicos não divulgam email, userId, wallet IDs nem receipt token. Snapshot do produto em receipt omite `source,externalId,attributes`; payload público de auditoria é público e não é identidade autenticada. Isso demonstra integridade dos dados comprometidos e comparação com witness configurado; não prova identidade legal do vendedor/licitante, correção externa do produto nem todo o ledger. [cryptography.ts](../../src/modules/audit/domain/cryptography.ts#L1-L1), [receipt-service.ts](../../src/modules/settlements/services/receipt-service.ts#L8-L26), [receipt.ts](../../src/modules/settlements/contracts/receipt.ts#L8-L19).

Receipt público existe somente depois de `SETTLED` válido; `CLOSED_NO_BIDS` retorna 404. Resposta `receipt`: `auctionId`, snapshot limitado (`id,title,description,imageUrl,capturedAt`), `amountCents`, `endsAt`, `settledAt`, `settlementId`, `winningBid:{id,bidderRef}`, `auditUrl`, `receiptUrl`. `RECEIPT_INCONSISTENT` → HTTP 409; ausência → 404. Presença do recibo é distinta de status de auditoria. [receipt-service.ts](../../src/modules/settlements/services/receipt-service.ts#L7-L26).

## Catálogo de DTOs TypeScript

Fonte recomendada para gerar tipos em outra etapa: OpenAPI 3.1 [`../openapi.json`](../openapi.json). Tipos abaixo refletem DTOs da API, não schemas internos Drizzle. `UUID` = string; `DateTime` = string ISO date-time; `Cents` = string decimal; nullable indicado `| null`; propriedades obrigatórias no schema OpenAPI salvo indicação. [API_MAP.md](API_MAP.md) documenta rotas e errors.

| Nome sugerido | Campos resumidos | Origem |
|---|---|---|
| `UserDto` | `id:UUID,email:string,displayName:string,role:"AUCTIONEER"|"BIDDER"` | OpenAPI `User`, auth contracts |
| `LoginRequest` / `LoginResponse` | `{email,password}` / `{accessToken,tokenType:"Bearer",expiresIn:number,user:UserDto}` | OpenAPI `LoginInput`,`Login` |
| `ExternalProductDto` | `id:number,title:string,description:string|null,imageUrl:string|null,attributes:Record<string,unknown>` | OpenAPI `ExternalProduct` |
| `ProductSnapshotDto` | `id:UUID,externalId:string,source:string,title:string,description:string|null,imageUrl:string|null,attributes:unknown,capturedAt:DateTime` | OpenAPI `ProductSnapshot` |
| `Page<T>` | `total:number,limit:number,skip:number` plus array name por endpoint | OpenAPI `ProductPage`,`ExternalProductPage`,`WalletHistory` |
| `WalletDto` | `balanceCents:Cents,reservedCents:Cents,availableCents:Cents` | OpenAPI `Wallet`; `wallets.ts` |
| `DepositDto` | `transactionId:UUID,amountCents:PositiveCents,createdAt:DateTime` | OpenAPI `Deposit` |
| `WalletTransactionDto` | `id:UUID,type:"DEPOSIT"|"AUCTION_SETTLEMENT",createdAt,amountCents:signed decimal string,entries:{id,amountCents:signed decimal string}[]` | OpenAPI `WalletTransaction` |
| `AuctionDto` | `id,auctioneerId,productSnapshotId:UUID,currentBidId:UUID|null,startingBidCents:Cents,minIncrementCents:Cents,startsAt,endsAt,status:AuctionStatus,createdAt,updatedAt,productSnapshot,lifecycleState:LifecycleState` | OpenAPI `Auction`, auction contracts |
| `AuctionStatus` | `PUBLISHED|CANCELLED|SETTLED|CLOSED_NO_BIDS` | OpenAPI `AuctionStatus` |
| `LifecycleState` | `SCHEDULED|LIVE|FINALIZING|CANCELLED|SETTLED|CLOSED_NO_BIDS` | OpenAPI `LifecycleState` |
| `AuctionPageDto` | `total,limit,skip,auctions:AuctionDto[],asOf:DateTime` | OpenAPI `AuctionPage` |
| `PublicBidDto` | `id,auctionId:UUID,bidderRef:string,amountCents:Cents,sequence:string,createdAt:DateTime` | OpenAPI `PublicBid` |
| `BidReceiptDto` | PublicBid + `endsAt:DateTime` | OpenAPI `BidReceipt` |
| `PublicBidPageDto` | `total,limit,skip,bids,currentBid:PublicBidDto|null,endsAt,status,asOf` | OpenAPI `PublicBidPage` |
| `OwnBidDto` | PublicBid + `endsAt,status,isLeading:boolean` | OpenAPI `OwnBid` |
| `AuditVerificationDto` | `auctionId,status,localSequence,externallyVerifiedSequence,externalHeadSequence:string|null,operationalCoverage,reason:string|null` | OpenAPI `AuditVerification` |
| `AuditEventDto` | `id,auctionId,sequence:string,eventType,payload:Record<string,unknown>,createdAt,previousHash,eventHash,hashVersion:1` | OpenAPI `AuditEvent` |
| `AuditPageDto` | Success `{auctionId,events,nextAfter,limit,proof:"EVENT_PAGE_ONLY"}` or tampered `{auctionId,status:"TAMPERED",reason,events:[]}` | OpenAPI `AuditPage` |
| `PublicReceiptDto` | `auctionId,productSnapshot:{id,title,description,imageUrl,capturedAt},amountCents,endsAt,settledAt,settlementId,winningBid:{id,bidderRef},auditUrl,receiptUrl` | OpenAPI `PublicReceipt`; receipt contracts |
| `ApiErrorDto` | `{error:{code,message,details?:{path,code}[]}}` | OpenAPI `Error`; error-handler |

`attributes`, event `payload` e formatos `unknown` são propositalmente não tipados estruturalmente pelo contrato presente. `DateTime` deve ser mantido como string na borda HTTP.
