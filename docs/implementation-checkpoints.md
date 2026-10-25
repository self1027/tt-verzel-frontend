# Verzel Auction House — checkpoints de implementação

Planejamento concluído antes de alterações na aplicação. Referências: requirements.pdf (sete páginas inspecionadas visualmente), AGENTS.md, DESIGN.md, contracts/{openapi.json,API_MAP,DOMAIN_MAP,REALTIME_MAP,FRONTEND_INTEGRATION_MATRIX,OPEN_QUESTIONS}. Execução sequencial autorizada pelo usuário; sem aprovação entre etapas.

## Diagnóstico e limites

| Requisito                            | Estado inicial                       | Lacuna / checkpoint                                                          |
| ------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| Vitrine por situação, busca e filtro | Implementado com testes              | Preservar; corrigir limites da paginação/valores em C1                       |
| Detalhe, histórico e relógio         | Parcial                              | Hooks inválidos, sem lance/posição/feedback de conexão; C1/C4                |
| Login e papéis                       | Ausente                              | C2; cadastro e refresh não existem no backend                                |
| Carteira e depósito simulado         | Ausente                              | C3; centavos exatos, intenção idempotente e confirmação REST                 |
| Sala de disputa e posição do usuário | Parcial                              | C4; identidade vem de bids/mine, nunca de bidderRef público                  |
| Auditoria pública completa           | Ausente                              | C5; paginação EVENT_PAGE_ONLY não verifica cadeia                            |
| Comprovante e meus arremates         | Ausente                              | C5/C6; receipt só existe após SETTLED válido                                 |
| Gestão do leiloeiro                  | Ausente                              | C7; importar snapshot antes de criar lote; editar/cancelar conforme servidor |
| Documentação e deploy obrigatório    | README desatualizado; deploy ausente | C8/C9                                                                        |

Arquitetura existente: React/Vite/TS strict, React Router, TanStack Query, openapi-fetch com tipos gerados; manter organização por feature. Todas as APIs do catálogo exigem Bearer. Backend é outro repositório, sem URL de produção/CORS/credenciais de seed confirmados. Testes usam respostas controladas conformes ao OpenAPI; isso não prova integração operacional com backend real.

Riscos transversais: cents/sequence BIGINT como strings; 401 encerra sessão sem refresh; saldo reservado não é pagamento; Socket.IO best effort requer ressincronização REST e fallback periódico; settlement automático pode aguardar witness; 503 audit indisponível não é adulteração; erros de domínio são conjunto aberto. Cadastro, cancelamento com lances/estorno, recuperação de senha, pagamentos reais e encerramento manual não serão inventados. Tema claro e Docker Compose são opcionais e não integram este ciclo.

## Design e processo

Aplicar Taste Skill (telas de trabalho com seleções discretas e números alinhados), UI UX Pro Max (formulários rotulados, erros próximos, foco, alvos de 44 px), Frontend Design (composição com tokens e Hind Madurai existentes), Design Motion Principles (Emil/Jakub: sem animar dinheiro, sem pulsos, reduced-motion), Playwright (capturas e navegação em 375/768/1440). Awesome Claude Design é biblioteca já consultada na primeira etapa, não substitui DESIGN.md. Sem novas dependências. Trabalhar neste workspace para preservar arquivos preexistentes ainda não commitados; sem commits automáticos.

Em cada checkpoint: escrever teste relevante, observar falha, implementar, executar teste alvo + typecheck + ESLint/Prettier nos arquivos envolvidos. Build e suíte global uma vez na integração final, salvo falha que justifique repetir. Registrar resultado real abaixo. Somente DONE com todos os aceites satisfeitos; bloqueio externo não impede etapas independentes.

## Checklist e ordem

- [x] C1 — Base confiável e relógio — DONE
- [x] C2 — Sessão, login e navegação por papel — DONE
- [x] C3 — Carteira e depósito — DONE
- [x] C4 — Lance, posição e sincronização — DONE
- [x] C5 — Auditoria e comprovante públicos — DONE
- [x] C6 — Meus lances e arremates — DONE
- [x] C7 — Painel do leiloeiro — DONE
- [x] C8 — Integração visual, regressão e documentação — DONE
- [ ] C9 — Deploy e verificação real — BLOCKED

### C1 — Base confiável e relógio

**Status:** DONE. **Dependências:** nenhuma. **Objetivo:** corrigir hooks do Countdown; limitar valores e offsets ao contrato; preservar filtros/limit; liberar verificações sem formatar documentos protegidos.
**Arquivos:** src/features/auctions/{components/Countdown,utils/money,utils/search} e testes; .prettierignore.
**Aceite:** relógio deriva de asOf, ressincroniza quando asOf muda e limpa timer; dinheiro acima do BIGINT rejeitado; offset <=2147483647; limit preservado na URL; ESLint do código e lint global sem erro de código. Arquivos DESIGN.md/contracts/AGENTS.md não modificados; exclusões de formatação documentadas.
**Validação:** testes unitários com fake timers e fronteiras; typecheck; lint.

### C2 — Sessão, login e navegação por papel

**Status:** DONE. **Dependências:** C1. **Objetivo:** POST /auth/login, GET /auth/me, Bearer, saída local, expiração/401, rotas por papel. Token apenas em memória; recarregar exige login, sem guardar senha/token no storage.
**Arquivos:** src/features/auth/{session,AuthProvider,LoginPage,RequireRole}; src/api/client.ts; providers, router, SiteLayout; src/styles/account.css.
**Aceite:** login real confirma /me antes de liberar acesso; erros exibidos; returnTo apenas caminho interno seguro; BIDDER/AUCTIONEER têm navegação apropriada; logout/401 limpa cache privado e sessão; rotas públicas continuam anônimas; sem cadastro/refresh inventado.
**Validação:** E2E login inválido/válido, Bearer, acesso negado, 401/logout; unitário de erro/ciclo de sessão; typecheck/lint alvo; captura do login.

### C3 — Carteira e depósito

**Status:** DONE. **Dependências:** C2. **Objetivo:** GET /wallet, /wallet/transactions e POST /wallet/deposits.
**Arquivos:** src/features/wallet/{api,WalletPage}, src/components/{Feedback,Pagination}, utilitário de intenção financeira.
**Aceite:** saldo total/reservado/disponível rotulados e autoritativos; ledger com sinal e paginação; depósito positivo dentro de BIGINT; mesma Idempotency-Key em retry incerto, nova intenção após sucesso; sem envio duplo; só BIDDER; saldo só muda após resposta e refresh; erro não apaga valor.
**Validação:** E2E depósito (incluindo falha de rede/retry com mesma chave), resposta de saldo e ledger; typecheck/lint alvo; revisão visual mobile.

### C4 — Lance, posição e sincronização

**Status:** DONE. **Dependências:** C2/C3. **Objetivo:** POST /auctions/:id/bids + GET /auctions/bids/mine e wallet; completar a sala existente.
**Arquivos:** src/features/auctions/{components/BidForm,AuctionRealtime,pages/AuctionDetailPage}; APIs de conta.
**Aceite:** mínimo exato inicial ou atual+incremento; BIDDER em LIVE com snapshot válido pode lançar; feedback por códigos (saldo, mínimo, líder, janela, conflito); mesma chave em retry incerto; sem sucesso otimista; posição baseada em own bids/isLeading; mudança de líder, extensão e reconnect invalidam REST e saldo; conexão/fallback visível, polling para perda de eventos; anti-sniping explicado; sem prometer liquidação no prazo zero.
**Validação:** E2E lance aceito/recusado, liderança, intervalo de refresh; teste de cálculo financeiro; typecheck/lint; captura da sala e teste de realtime com socket simulado quando aplicável.

### C5 — Auditoria e comprovante públicos

**Status:** DONE. **Dependências:** C1 (executado após C4 por ordem, sem depender de login). **Objetivo:** GET /auctions/:id/audit, /audit/events e /receipt; rotas /auctions/:id/audit e /receipt.
**Arquivos:** src/features/audit/{api,AuditPage,ReceiptPage}, router, detalhe.
**Aceite:** quatro estados audit distintos inclusive 503 estruturado; cursor after até fim do histórico com aviso EVENT_PAGE_ONLY; TAMPERED da página tratado; nenhuma verificação criptográfica inventada; recibo público com valor/data/vencedor pseudônimo; 404/409 explicados; link compartilhável aponta à tela frontend; cópia com fallback visível; link para auditoria.
**Validação:** E2E VERIFIED/PENDING_ANCHOR/TAMPERED/503, próxima página, receipt válido/404/409; typecheck/lint; capturas públicas.

### C6 — Meus lances e arremates

**Status:** DONE. **Dependências:** C2/C4/C5. **Objetivo:** paginação GET /auctions/bids/mine e acesso aos lotes/recibos.
**Arquivos:** src/features/account/MyBidsPage, router, navegação.
**Aceite:** próprios lances com montante/sequence/status/isLeading; não inferir vencedor por bidderRef; indicação de arremate apenas SETTLED+isLeading; link público de recibo; resultados parciais não apresentados como total agregado de ganhos; vazio/erro/paginação.
**Validação:** E2E own bids vencedor/superado, recibo e acesso por papel; typecheck/lint.

### C7 — Painel do leiloeiro

**Status:** DONE. **Dependências:** C2/C5. **Objetivo:** GET /catalog/external/search?q, POST /catalog/import/:id, GET /catalog/products, GET /auctions/mine, POST /auctions, PATCH /auctions/:id, POST /auctions/:id/cancel; resumo financeiro GET /wallet.
**Arquivos:** src/features/seller/{api,SellerPage,AuctionForm}, router, navegação.
**Aceite:** buscar itens reais e importar snapshot selecionado; consultar snapshots locais mesmo quando fornecedor falha; criar com produto importado, datas com timezone, início futuro/fim posterior, valores positivos; mostrar imagem/descrição/atributos sem assumir shape; listar próprios lotes paginados; edição/cancelamento só controles elegíveis e validação definitiva servidor; confirmar cancelamento; erros 409 preservam formulário e atualizam lista; resultado de SETTLED pelo recibo real; saldo creditado rotulado como carteira do leiloeiro, sem somar valores iniciais como receita.
**Validação:** E2E buscar/importar/criar/editar/cancelar, falha upstream, bloqueio com lances e papel; testes de formulário/data; typecheck/lint; capturas painel/formulário mobile e desktop.

### C8 — Integração, visual e documentação

**Status:** DONE. **Dependências:** C1–C7. **Objetivo:** integrar navegação, feedback, documentação de execução/contratos/limites, inspeção visual e regressão final.
**Arquivos:** README.md, e2e/, src/styles/, docs/implementation-checkpoints.md.
**Aceite:** rotas públicas/protegidas navegáveis; sem overflow em 375/768/1440; foco/labels/erros e reduced-motion revisados; nenhum segredo ou dado pessoal de exemplo em produção; README com setup/API/CORS/credenciais fornecidas pelo backend/limitações e deploy SPA; todos comandos aplicáveis registrados; nenhuma alteração em DESIGN.md/contracts.
**Validação:** npm run lint, typecheck, test, build, test:e2e; Taste inspector e capturas Playwright inspecionadas; revisão final dos arquivos modificados.

### C9 — Deploy e verificação real

**Status:** BLOCKED. **Dependências:** C8 e infraestrutura externa. **Objetivo:** satisfazer deploy obrigatório do desafio e testar percurso com backend real/seeds.
**Arquivos:** configuração do provedor quando identificado; README.
**Aceite:** URL pública funcional com fallback SPA, API HTTPS, CORS configurado, login de dois papéis, depósito/lance/settlement/audit/receipt reais verificados.
**Validação:** smoke real. **Condição de bloqueio:** ausência de provedor/destino, URL backend, CORS e seeds/credenciais impede publicar e comprovar o fluxo real. Preparar build/instruções; não declarar DONE nem inventar ambiente.

## Registro de execução

Planejamento: comparadas funcionalidades atuais e contratos. Nenhuma alteração de aplicação executada antes deste registro.

- C1 DONE: Nove testes alvo passaram; typecheck passou. Testes de limite falharam antes da correção; relógio verificado com fake timers. Sem erro de ESLint; formatado plano anterior, referências protegidas excluídas do formatter.

- C2 IN_PROGRESS: C1 validado: lint global, typecheck e nove testes alvo passaram. Iniciando sessão em memória e rotas por papel.

- C2 DONE: Dois E2E login/logout/erro, três testes sessão/401/papel, typecheck e ESLint alvo passaram. Capturas login 375/768/1440 sem overflow revisadas. Sessão somente em memória; RequireRole testado isoladamente antes de ligar rotas nos checkpoints seguintes.

- C3 IN_PROGRESS: Implementando carteira com depósito simulado e idempotência por intenção.

- C3 DONE: E2E depósito com falha de rede e retry confirmou a mesma chave e atualização autoritativa do saldo; typecheck e ESLint alvo passaram. Captura mobile da carteira revisada sem overflow. Hook financeiro bloqueia alteração da intenção enquanto resultado é incerto.

- C4 IN_PROGRESS: Completando sala com formulário, posição privada, polling e feedback da conexão.

- C4 DONE: Teste E2E lance recusado/aceito/liderança passou; mínimo BIGINT validado unitariamente; teste de socket confirma join, reconnect, extensão e descarte de outro lote. Typecheck/ESLint alvo passaram; captura da sala revisada. Fallback REST público e privado a cada 10s.

- C5 IN_PROGRESS: Criando auditoria e comprovante públicos sobre os contratos existentes.

- C5 DONE: Oito E2E passaram: quatro estados audit inclusive HTTP503, cursor/evento adulterado, recibo válido e erros404/409. Typecheck e ESLint alvo passaram. Capturas audit desktop/receipt mobile revisadas; link frontend compartilhável e fallback textual de cópia disponíveis.

- C6 IN_PROGRESS: Implementando histórico privado paginado e ligação ao comprovante.

- C6 DONE: E2E diferencia registro vencedor de lance superado e confere link de recibo; typecheck/ESLint alvo passaram. Histórico paginado preserva lances individuais e não usa o pseudônimo público para inferir identidade.

- C7 IN_PROGRESS: Implementando catálogo autenticado, importação, formulário e gestão dos próprios lotes.

- C7 DONE: Dois E2E importação/criação/edição/cancelamento e fallback upstream/409 passaram; testes de datas e valores passaram. Typecheck/ESLint alvo passaram após revisão. Capturas painel mobile/formulário desktop revisadas. Encontrada e corrigida navegação concorrente do login do leiloeiro; quatro E2E conta+seller confirmaram correção. Falhas5xx de criação bloqueiam retry automático por ausência de idempotência neste endpoint.

- C8 IN_PROGRESS: Integração final: regressão, matriz visual, revisão financeira e documentação.

- C8 DONE: Lint global, typecheck incluindo e2e, 16 testes unitários e build passaram. Suíte completa E2E passou28/28; após proteção de quebra de valores extremos, regressão alvo vitrine+matriz passou12/12, incluindo máximo BIGINT. Matriz de sete telas em375/768/1440 sem overflow; capturas inspecionadas. Taste inspector login0FAIL/1WARN (título editorial segue DESIGN.md), título abreviado após primeiro achado. Corrigidas ordem mobile, estado terminal, placeholder do retry financeiro e fallback de foto. README atualizado; fontes/contratos preservados.

- C9 IN_PROGRESS: Verificando prontidão do destino e conexão real após concluir integração local.

- C9 BLOCKED: Existe somente .env.example com API local; nenhum destino/projeto de hospedagem configurado. Smoke GET localhost3000/openapi.json sem conexão. Faltam origemHTTPS backend, CORS público, provedor/projeto e contas seed. Build dist e instruções SPA prontos; publicação e jornada real não executadas e não declaradas concluídas.

## Encerramento deste ciclo

C1–C8 concluídos com evidências acima. C9 bloqueado por infraestrutura externa. Nenhum endpoint novo foi inventado; DESIGN.md e contracts/ não foram alterados. Nenhum commit ou publicação foi realizado.

Validação final: `npm run lint`, `npm run typecheck`, `npm run test` (16/16), `npm run build` e `npm run test:e2e` (28/28) passaram. Após ajuste adicional de reflow para montantes máximos, rodados somente `public-auctions.spec.ts` + `visual.spec.ts` (12/12, incluindo um cenário novo), conforme política de evitar repetição desnecessária de suítes completas. As capturas de QA ficam em `.playwright-mcp/final-*.png`; o relatório Taste em `.taste-skill/checkpoints/report.json`.

Limitações remanescentes: sem smoke real ou deploy; sessão/intenção de retry apenas em memória (não navegar/recarregar enquanto incerta); histórico privado sem filtro por lote implica percorrer páginas; ledger paginado não tem snapshot global e créditos concorrentes podem aparecer na próxima atualização; nenhuma certificação WCAG integral ou execução em Safari/Firefox foi alegada. O Edge foi usado para as validações. Tema claro e Docker Compose permanecem opcionais fora deste ciclo.
