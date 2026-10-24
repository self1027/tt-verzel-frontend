# Plano de bootstrap ? Fase 0

Objetivo: executar o escopo de infraestrutura solicitado, sem produto ou design.

1. Configurar depend?ncias est?veis, TypeScript strict, alias @/, Vite, ESLint/Prettier e runners.
2. Criar um ?nico teste de inicializa??o; implementar somente montagem, providers e rota raiz vazia.
3. Preparar skills locais e MCP sem executar workflows de design; registrar fontes e ativa??o.
4. Documentar estrutura, ambiente, limites do backend e design futuro.
5. Verificar lint, tipos, teste, build, Vite e infraestrutura Playwright.

Pastas sem uso recebem somente .gitkeep. Nenhum contrato, segredo, mock, cliente HTTP ou conex?o Socket.IO ser? criado.
