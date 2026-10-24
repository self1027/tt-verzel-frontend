# Ferramentas ? Fase 0

Instru??es oficiais consultadas antes das instala??es em 24/10/2026.

| Ferramenta               | Instala??o e estado                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Taste Skill              | `.agents/skills/taste-skill`, nome interno `design-taste-frontend`; SKILL.md e recursos presentes                                 |
| UI UX Pro Max            | `.agents/skills/ui-ux-pro-max`; instalador oficial `npx --yes --package ui-ux-pro-max-cli uipro init --ai codex`                  |
| Frontend Design          | `.agents/skills/frontend-design`; SKILL.md oficial e recursos presentes                                                           |
| Design Motion Principles | `.agents/skills/design-motion-principles`; workflows e refer?ncias presentes                                                      |
| Awesome Claude Design    | Biblioteca online referenciada, sem instalar skill ou escolher DESIGN.md                                                          |
| Playwright Test          | Depend?ncia local `@playwright/test`, configura??o e script E2E; sem testes de jornadas                                           |
| Playwright MCP           | Depend?ncia local `@playwright/mcp`; `.codex/config.toml` aponta diretamente ao CLI local, sem instala??o global ou npx duplicado |

Taste, Frontend Design e Motion foram instalados pelo helper Codex `install-skill-from-github.py --repo ... --path ... --dest .agents/skills`, copiando recursos dos caminhos oficiais. UI UX Pro Max tamb?m instalou skills auxiliares `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`. Permanecem inativas: a tentativa de remov?-las foi rejeitada pela pol?tica autom?tica de execu??o. N?o s?o depend?ncias do frontend.

H? vers?es globais de Taste e UI UX Pro Max j? dispon?veis na sess?o; as c?pias locais tornam o projeto transport?vel. Priorizar as locais. N?o foram alteradas as instala??es globais.

## Ativa??o e navegador

Abrir nova sess?o Codex neste projeto para descobrir as skills locais e carregar o MCP. Configura??o local de MCP requer projeto confi?vel, conforme a [documenta??o oficial](https://learn.chatgpt.com/docs/extend/mcp). A sess?o atual n?o recebeu as ferramentas MCP dinamicamente; o servidor foi verificado diretamente por JSON-RPC stdio (initialize, tools/list e navega??o).

O MCP e o runner usam Edge (`msedge`), j? dispon?vel nesta m?quina. N?o foi baixado Chromium adicional. Em outra m?quina, instalar Edge ou ajustar ambos os arquivos para um navegador dispon?vel. `.codex/config.toml` usa caminho absoluto para evitar depender do diret?rio de execu??o do cliente: atualizar esse caminho se mover o projeto.

Node e Python est?o dispon?veis. Scripts e dados das skills foram verificados sem executar gera??o de design. A valida??o visual completa dessas skills pertence ? pr?xima fase.

## Fontes oficiais

- [Taste: instala??o e requisitos](https://github.com/Leonxlnx/taste-skill#install)
- [UI UX Pro Max: instala??o](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill#installation)
- [Frontend Design: skill oficial](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
- [Design Motion Principles: instala??o](https://github.com/kylezantos/design-motion-principles#installation)
- [Awesome Claude Design: refer?ncias](https://github.com/VoltAgent/awesome-claude-design)
- [Playwright MCP: configura??o](https://github.com/microsoft/playwright-mcp)
- [Vite](https://vite.dev/guide/) e [Vitest](https://vitest.dev/guide/)

Vers?es exatas das depend?ncias est?o em `package-lock.json`; reproduzir com `npm ci`. Os pacotes foram obtidos das tags est?veis do npm, sem selecionar vers?es prerelease. O MCP pode usar internamente um runtime Playwright com identifica??o alpha; o runner E2E ? um pacote est?vel independente.

## Verifica??o realizada

- `npm run lint`: passou, sem avisos.
- `npm run typecheck`: passou.
- `npm run test`: 1 arquivo, 1 teste passou.
- `npm run build`: passou e gerou `dist/`.
- `npm run test:e2e`: passou sem casos, conforme escopo; n?o representa cobertura de jornadas.
- Vite 8.3.5 iniciou em 175 ms na porta 5173.
- Edge headless: HTTP 200, t?tulo correto, um `main` montado, corpo vazio, zero erros de console ou runtime.
- MCP stdio: handshake e listagem de 25 ferramentas passaram; `browser_navigate` abriu o Vite. A primeira navega??o registrou favicon ausente; corrigido com favicon vazio, sem identidade visual. A checagem posterior no Edge n?o registrou erros.
- Skills: os quatro SKILL.md e seus recursos foram verificados; configura??o TOML e caminho do CLI MCP v?lidos.
- npm informou zero vulnerabilidades na instala??o.

A primeira sondagem manual do navegador aguardou visibilidade do `main` vazio e expirou; a verifica??o correta aguarda montagem (`attached`), pois esta fase n?o tem conte?do visual. Nenhum teste E2E foi acrescentado.
