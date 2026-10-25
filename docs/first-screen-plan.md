# Primeira tela: vitrine de lotes

## Decisão e escopo

O requirements.pdf (página 3) define a vitrine de lotes como entrada: ao vivo, agendados e encerrados; cancelados não aparecem. A integração pública usa GET /auctions, não o catálogo externo autenticado. Preservar trabalho preexistente e não ampliar detalhe, autenticação, carteira ou lances.

## Direção visual

Aplicar DESIGN.md: grafite #15191E, superfície #1D2229, profundidade #100C26, texto branco/secundário #B9C0CB e ação #CBFA05. Hind Madurai local, números tabulares. Taste Skill: data-terminal com seleção por linha, adaptado à fotografia editorial exigida pelo projeto. A fotografia do lote é o foco; nenhum dado ou imagem de produção inventado. Awesome Claude Design consultado como referência de organização, sem substituir os tokens aceitos.

Pergunta principal: quais lotes posso explorar agora? Entrada em Ao vivo; controles nativos para busca/ordenação/valores e botões de situação com aria-pressed. A hero destaca um lote da resposta; os restantes formam a grade. Erro/vazio/carregamento preservam a identidade e indicam a próxima ação.

## Plano de implementação

- [x] Adicionar teste de navegação por situação, exclusão de cancelados, validação e recuperação de erro; verificar falha antes da implementação.
- [x] Ajustar AuctionsPage e CSS sem alterar DESIGN.md, contracts ou funcionalidades de outras telas.
- [x] Validar com Playwright em 375, 768 e 1440 px, imagens com falha, teclado e movimento reduzido; inspecionar capturas.
- [x] Executar lint, typecheck, test, build e E2E; registrar limitações.

## Interações e qualidade

Motion: Jakub para acabamento, Emil para controles frequentes. Sem entradas ou pulsos automáticos; hover/pressionamento discretos, sem movimento no teclado e com reduced-motion. UX Pro Max aplicado: controles nomeados, estado selecionado anunciado, foco visível, alvos de 44 px e reflow. Contraste de controles deve atingir 3:1; texto normal 4,5:1.

## Resultado da valida??o

Playwright: sete cen?rios passaram, incluindo filtro por situa??o, erro e recupera??o, valor m?nimo/m?ximo, imagens quebradas, teclado/skip link e reduced-motion. Capturas inspecionadas em 375, 768 e 1440 px (tamb?m com foto controlada apenas na revis?o local). Sem overflow. Hind Madurai carregada localmente. Inspector Taste: zero FAIL; avisos sobre t?tulo grande e espa?o de carregamento. O t?tulo editorial segue DESIGN.md; o carregamento foi compactado ap?s inspe??o.

Contraste calculado nos pares usados: texto secund?rio sobre superf?cie elevada e texto escuro sobre lime acima de 4,5:1; borda de controle #788391 acima de 3:1 sobre canvas. N?o constitui certifica??o WCAG integral.

Limita??es: integra??o funcional validada com respostas controladas baseadas no contrato, sem backend ativo confirmado. O lint global encontra dois erros preexistentes de hooks em Countdown.tsx; Prettier global aponta AGENTS.md, DESIGN.md, contratos e o plano anterior. Esses arquivos foram preservados. Sala do lote preexistente n?o ampliada. A revis?o externa consultou https://github.com/VoltAgent/awesome-claude-design apenas como biblioteca de refer?ncias, conforme docs/design-workflow.md.
