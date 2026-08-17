# Plano de Melhoria da Exportação de Imagens (Kettlebell Fitness & Híbrido)

Implementação de controle total sobre a exportação de treinos em formatos de imagem (PNG, JPG) e PDF, permitindo ajuste manual de posicionamento (drag & drop), tamanho de fonte dinâmico e resolução HD/4K.

## User Review Required

> [!IMPORTANT]
> A exportação em PDF agora será baseada na captura de alta resolução do canvas, garantindo que o posicionamento manual dos blocos seja 100% respeitado no arquivo PDF final.

- **Posicionamento**: O usuário poderá arrastar os blocos no editor. O sistema salvará essas coordenadas por programa.
- **Tamanho da Fonte**: Adição de um controle deslizante (slider) no editor para aumentar ou diminuir o texto globalmente.
- **Formatos**: Suporte nativo a PNG, JPG e PDF (multi-página).
- **Resolução**: Mantida a base de 5760x2160 (Ultrawide HD/4K) com presets para Story e A4.

## Technical Details

### 1. Modelo de Dados e Tipagens
- Atualizar `ImageLayout` em `src/lib/program-image-layout.ts` para incluir `fontSize` (número, default 1.0).
- Garantir que `posicoes` no `localStorage` persista o `fontSize`.

### 2. Motor de Renderização (Canvas)
- Modificar `src/lib/image-export.ts`:
  - A função `desenharColuna` e `renderizarSessaoCanvas` devem respeitar o multiplicador `fontSize`.
  - Implementar o cálculo dinâmico de `tituloSize` e `linhaSize` baseado no novo parâmetro.
  - Refinar a exportação em PDF para usar o canvas renderizado em vez de reconstruir o layout.

### 3. Interface do Editor (UI)
- Atualizar `src/components/program-image/UnifiedCanvasEditor.tsx`:
  - Adicionar suporte visual ao `fontSize` para que o preview coincida com o resultado final.
  - Melhorar o `DraggableBlock` para exibir corretamente o tamanho da fonte em tempo real.
- Atualizar `src/components/program-image/ProgramImageDialog.tsx`:
  - Incluir um `Slider` do Shadcn para controle do tamanho da fonte.
  - Adicionar botões explícitos para JPG, PNG e PDF.

### 4. Integração de Metodologias
- Garantir que os labels "by Coach Montanha" e a metodologia (TH/KF) sejam escalados corretamente no canvas de alta resolução.
