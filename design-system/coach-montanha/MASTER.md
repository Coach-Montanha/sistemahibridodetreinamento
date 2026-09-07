# MASTER DESIGN SYSTEM: Coach Montanha (Sistema Híbrido de Treinamento)

> **Fonte da Verdade Global (Source of Truth)** para decisões visuais, arquitetura de componentes, tokens de cor, tipografia e diretrizes de UX para o Sistema Híbrido de Treinamento.
> Baseado no motor de inteligência e regras de raciocínio de **UI/UX Pro Max v2.0** (Regra #63: Fitness/Gym Apps).

---

## 1. Identidade & Filosofia de Design (System Character)

- **Propósito**: Plataforma de alta performance para prescrição de treinos, periodização híbrida (kettlebell, força, endurance) e acompanhamento de alunos.
- **Vibe / Personalidade**: **Atlético, Preciso, Enérgico e Focado**. O app transmite autoridade técnica e motivação sem distrações visuais ou elementos infantis.
- **Filosofia Anti-Slop**:
  - Zero gradientes aleatórios roxos/rosas de IA (*AI purple/pink slop*).
  - Sem emojis como substitutos de ícones; utilizar estritamente a biblioteca **Lucide Icons** com traço unificado (stroke-width: 1.75px ou 2px).
  - Cada elemento na tela deve ter função clara: dados, ação ou status.

---

## 2. Layout & Padrões Estruturais (Pattern: Bento Grid + Data-Rich)

- **Estrutura Base**: Grid modular responsivo (**Bento Grid**) para organizar sessões, métricas e blocos de treino.
- **Hierarquia Visual**:
  1. **Nível 1 (Hero/Destaque)**: Bloco ativo (próximo treino, sessão em andamento, atalho para gerador IA).
  2. **Nível 2 (Métricas & KPIs)**: Cards de indicadores com números proeminentes, ícones de apoio e variação percentual/status.
  3. **Nível 3 (Ações Rápidas)**: Cards navegáveis com transição suave no hover e bordas com destaque sutil de iluminação.
- **Responsividade Obrigatória**:
  - 375px (Mobile Small): Coluna única, navegação acessível por toque com polegar, drawer/sheets inferiores.
  - 768px (Tablet): Grid de 2 colunas, filtros colapsáveis.
  - 1024px+ (Desktop): Bento grid completo de 3 a 4 colunas, painéis laterais de contexto.

---

## 3. Tokens de Cor (Color System)

O sistema utiliza variáveis semânticas CSS em HSL mapeadas para Tailwind CSS, suportando múltiplos temas (Light, Dark OLED, Midnight Fintech Glow):

### 3.1. Superfícies & Fundo
- **Background Principal**:
  - *Dark OLED*: #09090B / hsl(240, 10%, 3.9%) (preto profundo para economia de bateria e contraste extremo em academias).
  - *Midnight*: #030712 / hsl(222, 47%, 4%) (azul noturno profundo com brilho sutil).
- **Cards & Superfícies**:
  - *Dark Card*: #18181B / hsl(240, 5.9%, 10%) com borda sutil order-border/60.
  - *Card Hover*: Transição para order-primary/40 e elevação de sombra leve (shadow-lg shadow-primary/5).

### 3.2. Cores Funcionais & Atléticas
| Função | Token Tailwind | Hex Base | Uso no App |
| :--- | :--- | :--- | :--- |
| **Primária (Ação)** | primary | #FF6B35 / #2563EB | Botões de CTA principal, badges ativas, links de foco |
| **Secundária** | secondary | #27272A | Botões secundários, filtros inativos, fundos neutros |
| **Sucesso (Concluído)** | emerald-500 / green-500 | #16A34A | Séries concluídas, PR batido, treino finalizado |
| **Atenção (Descanso)** | mber-500 | #F59E0B | Timers de descanso, alertas de volume alto |
| **Destrutivo / Alerta** | destructive | #EF4444 | Exclusão de blocos, falha de validação |
| **Texto Principal** | oreground | #F8FAFC | Títulos, valores de carga, repetições |
| **Texto Secundário** | muted-foreground | #A1A1AA | Descrições, rótulos de métricas, notas de exercício |

---

## 4. Tipografia (Typography Pairing)

- **Headings & Métricas de Carga**:
  - Família de Alto Impacto: Sans-serif atlética condensada / ont-bold tracking-tight.
  - Escala: 	ext-3xl font-bold (Títulos de página), 	ext-2xl font-semibold (Cabeçalhos de bloco), 	ext-xl (Nomes de exercício).
- **Corpo & Instruções Técnicas**:
  - Família de Leitura: Sans-serif neutra (Inter, system-ui).
  - Escala: 	ext-sm leading-relaxed para prescrições e cadências; 	ext-xs font-medium para badges e tags de intensidade.
- **Métricas Numéricas**:
  - Números com largura tabular (ont-mono ou 	abular-nums) para evitar trepidação em contadores de timer e cargas.

---

## 5. Componentes & Primitivas de UI

### 5.1. Botões & Ações Clicáveis
- **Tamanho Mínimo de Toque**: Todo elemento clicável deve ter **pelo menos 44x44px** de área de toque no mobile (min-h-[44px]).
- **Cursor Pointer**: Mandatório em todos os botões, abas, links e cards clicáveis (cursor-pointer).
- **Estados Assíncronos**: Botões de ação (Salvar, Gerar IA, Concluir) **devem exibir Loader2 giratório** e estado desabilitado (disabled) durante a requisição para evitar submissões duplicadas.

### 5.2. Badges & Chips (Resilientes a Quebra)
- Tags musculares, formatos de bloco e equipamentos devem usar flex-wrap com espaçamento consistente (lex flex-wrap gap-1.5).
- Em cartões compactos, limitar a exibição a 3 badges e utilizar indicador de excesso acessível (+2 outros).

### 5.3. Cards com Feedback Visual
- Cartões interativos devem incluir:
  - 	ransition-all duration-200 ease-out
  - hover:border-primary/40 hover:-translate-y-0.5
  - ctive:scale-[0.99] (micro-feedback tátil).

---

## 6. Movimento & Micro-Interações (Motion System)

- **Duração**: Entre 150ms e 250ms para micro-interações (hover, clique, troca de aba).
- **Timers e Status Ativos**: Efeito pulsante sutil (nimate-pulse ou glow suave) apenas em elementos que exigem atenção ativa imediata (timer de descanso rodando).
- **Acessibilidade**: Respeitar rigorosamente prefers-reduced-motion: reduce.

---

## 7. Checklist Pré-Entrega (Garantia de Qualidade de UI/UX)

Antes de considerar qualquer tela ou componente concluído:
- [ ] Nenhum emoji utilizado como ícone; uso exclusivo de **Lucide React**.
- [ ] Classe cursor-pointer presente em todos os elementos interativos.
- [ ] Alvo de toque mínimo de 44x44px em botões e controles para dispositivos móveis.
- [ ] Contraste mínimo de texto de 4.5:1 (WCAG AA).
- [ ] Foco visível (ocus-visible:ring-2 focus-visible:ring-primary) para navegabilidade por teclado.
- [ ] Textos e rótulos não sofrem corte brusco sem tooltip ou expansão.
- [ ] Responsividade testada em 375px, 768px e telas desktop.
