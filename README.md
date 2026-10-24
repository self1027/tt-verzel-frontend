# Verzel Auction House ? Frontend

Fase 0: infraestrutura React/Vite, sem telas de produto. A rota `/` monta um `main` vazio, sem estilos ou identidade visual.

## Iniciar

Requer Node 22.12+ (validado com 22.23.3) e npm. Use uma vers?o LTS compat?vel.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`VITE_API_BASE_URL=http://localhost:3000` ? configura??o p?blica para a pr?xima fase. Nenhuma chamada utiliza essa vari?vel agora. Nunca coloque segredos em vari?veis `VITE_`: elas s?o expostas no navegador.

## Scripts

- `npm run dev`: Vite local.
- `npm run build`: valida tipos e gera `dist/`.
- `npm run preview`: serve o build localmente.
- `npm run lint`: ESLint e confer?ncia Prettier.
- `npm run typecheck`: TypeScript strict.
- `npm run test`: ?nico teste de inicializa??o, Vitest + React Testing Library.
- `npm run test:e2e`: runner Playwright preparado, sem jornadas; aceita aus?ncia de testes nesta fase.
- `npm run format`: aplica Prettier.

## Estrutura

```text
src/
  app/providers/AppProviders.tsx
  app/router/AppRouter.tsx
  features/
  components/ui/
  hooks/
  lib/
  services/
  styles/
  types/vite-env.d.ts
  test/App.test.tsx
  test/setup.ts
  App.tsx
  main.tsx
e2e/
```

Pastas reservadas t?m somente `.gitkeep`. Alias `@/` aponta para `src/` em TypeScript e Vite/Vitest. QueryClient ? criado por montagem do provider. React Router cont?m somente a rota raiz. RHF, Zod, resolvers e Socket.IO Client est?o instalados, sem integra??o ou abstra??es antecipadas.

## Backend

O backend est? em outro reposit?rio e ainda est? em desenvolvimento. Utiliza REST e Socket.IO e possui autentica??o, leil?es, lances, carteiras e auditoria. Ser? a fonte de verdade para regras de neg?cio e valores financeiros. Nenhum contrato de API foi presumido. N?o h? autentica??o, interceptors, HTTP, conex?o Socket.IO ou mocks de neg?cio nesta fase.

## Ferramentas e pr?xima fase

Consulte [design-workflow](docs/design-workflow.md) e [ferramentas](docs/tooling.md). Criar e aprovar `DESIGN.md` espec?fico da Verzel antes das telas; contratos e integra??o dependem de nova solicita??o e do backend.

`requirements.pdf` foi preservado. Este diret?rio n?o tinha Git; nenhum remoto, commit ou publica??o foi criado.
