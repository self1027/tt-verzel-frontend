# Open Questions, Divergences and Known Limits

## Divergências documentais / OpenAPI

1. **Lista de rotas de documentação incompleta em OpenAPI:** aplicação serve `GET /openapi.json` ([app.ts](../../src/app.ts#L11-L11)), mas esse path não consta em `docs/openapi.json`. Considerar incluí-lo no próximo ciclo de manutenção documental.
2. **Catálogo chamado público em partes da documentação:** routers registram `router.use(authenticate)` para todas as rotas de catálogo ([catalog/index.ts](../../src/modules/catalog/index.ts#L14-L23)); cliente anônimo recebe 401. `docs/frontend-integration.md` confirma Bearer, mas descrições como “catalog public” seriam incorretas.
3. **Sem health check:** não foi encontrado registro HTTP de `/health`, `/healthz` ou equivalente. Confirmação por `src/app.ts` e módulos registrados.
4. **Schema cursor audit:** OpenAPI referencia `NonnegativeCents` para `after`; controller valida sequência canonical não negativa limitada a BIGINT max. Sem impacto aparente no wire shape, mas nome semântico confunde dinheiro e sequência.
5. **`page` de leilão:** OpenAPI corretamente diz que one-based `page` vira `skip` e não é ecoado; consumidores devem usar `skip` recebido para navegação baseada em offset.
6. **Erros são em parte mais amplos no OpenAPI:** documenta respostas genéricas comuns em todos endpoints, mas códigos de domínio são lançados por services e nem sempre enumerados por operação. Tratar `error.code` como string aberta; lista confirmada em `API_MAP.md` não garante exaustividade.

## Decisões pendentes para o frontend

- Origem real do backend e origins de preview a colocar em `CORS_ORIGINS`; configuração de deployment não está neste repositório. Valor local indicado no README/integration doc.
- Política de UX para catálogo requer autenticação mesmo em browse de produtos, ou produto planeja tornar catálogo público? Backend atual requer login.
- Política de re-login após 401 (token não tem refresh) e armazenamento do access token são decisões de segurança do frontend; contrato fornece `expiresIn` em segundos.
- UX de comprovante para leilão `CLOSED_NO_BIDS`: não haverá receipt financeiro, endpoint retorna 404.
- UX de auditoria indisponível/pendente/adulterada deve distinguir HTTP 503, status `PENDING_ANCHOR`, status `TAMPERED` e resposta 200 `EVENT_PAGE_ONLY`.

## Limitações conhecidas

- Socket.IO é best effort após commit, sem replay, retenção, ordem garantida na reconexão nem fanout multi-instância. Ressincronizar REST após connect/reconnect. [REALTIME_MAP.md](REALTIME_MAP.md).
- Auditoria `VERIFIED` depende de witness independente configurado e valida commitments de histórico operacional; não é uma prova de identidade nem uma prova completa de todo o ledger. Com witness ausente `GET audit` retorna 503/`VERIFICATION_UNAVAILABLE`.
- Settlement é automático e pode atrasar enquanto auditoria está `PENDING_ANCHOR` ou witness unavailable; não há chamada manual nem API de status de worker.
- Cancelamento seller só antes do fim e sem lance; não há papel de admin nem fluxo de reembolso para lote com lances. Não oferecer controle UI correspondente como se existisse.
- Depósitos são simulação contábil, sem pagamento externo.
- `ProductSnapshot.attributes` e `AuditEvent.payload` usam contrato aberto/`unknown`; shape mais específico depende de tipo de evento/fornecedor e não pode ser afirmado genericamente.
- As garantias de ordenação/replay do histórico de lances: endpoint e paginação constam no OpenAPI, mas um contrato estável de ordenação não aparece expresso na rota; usar `sequence` como ordenação exibida e registrar a consulta se isso for requisito.

Nenhuma ambiguidade acima foi resolvida nesta auditoria; não houve mudança em backend, schema, OpenAPI ou README.
