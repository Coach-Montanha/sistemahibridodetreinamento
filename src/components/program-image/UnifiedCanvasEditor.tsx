import React, { useMemo } from 'react';
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor, KeyboardSensor, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { type BlocoImagem, type LayoutImagem } from '@/lib/image-export';
import { type ImageLayout, type PosicaoBloco } from '@/lib/program-image-layout';
import { cn } from '@/lib/utils';

interface UnifiedCanvasEditorProps {
  layout: ImageLayout;
  onChange: (layout: ImageLayout) => void;
  blocos: BlocoImagem[];
  metodologiaLabel: string;
  coachLabel: string;
}

export function UnifiedCanvasEditor({ 
  layout, 
  onChange, 
  blocos, 
  metodologiaLabel, 
  coachLabel 
}: UnifiedCanvasEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const aspectRatio = layout.largura / layout.altura;
  const fundo = layout.fundo;
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const blockId = active.id as string;
    
    // Calcula nova posição em %
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const currentPos = layout.posicoes[blockId] || { x: 5, y: 15, w: 30 };
    
    const deltaXPercent = (delta.x / rect.width) * 100;
    const deltaYPercent = (delta.y / rect.height) * 100;
    
    const newPos = {
      x: Math.max(0, Math.min(95, currentPos.x + deltaXPercent)),
      y: Math.max(0, Math.min(95, currentPos.y + deltaYPercent)),
      w: currentPos.w
    };

    onChange({
      ...layout,
      posicoes: {
        ...layout.posicoes,
        [blockId]: newPos
      }
    });
  };

  return (
    <div className="space-y-4">
      <div 
        id="canvas-container"
        className={cn(
          "relative w-full overflow-hidden border border-border shadow-inner rounded-lg transition-colors duration-300",
          fundo === 'escuro' ? "bg-[#0F1115] text-[#F5F5F4]" : "bg-white text-[#0F1115]"
        )}
        style={{ aspectRatio }}
      >
        {/* Header Fixo Simulado */}
        <div 
          className="absolute top-[5%] left-[5%] font-black uppercase" 
          style={{ fontSize: `calc(min(40px, 4vw) * ${layout.fontSize || 1})` }}
        >
          {metodologiaLabel}
        </div>
        
        <DndContext 
          sensors={sensors} 
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]}
        >
          {blocos.map((bloco) => {
            const pos = layout.posicoes[bloco.chave!] || { x: 5, y: 15, w: 30 };
            return (
              <DraggableBlock 
                key={bloco.chave} 
                bloco={bloco} 
                pos={pos}
                fundo={fundo}
                fontSize={layout.fontSize}
              />
            );
          })}
        </DndContext>

        {/* Footer Fixo Simulado */}
        <div 
          className={cn(
            "absolute bottom-[5%] left-[5%] font-semibold opacity-60",
          )}
          style={{ fontSize: `calc(min(18px, 1.8vw) * ${layout.fontSize || 1})` }}
        >
          {coachLabel}
        </div>
      </div>
    </div>
  );
}

function DraggableBlock({ bloco, pos, fundo, fontSize = 1.0 }: { bloco: BlocoImagem, pos: PosicaoBloco, fundo: string, fontSize?: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: bloco.chave!,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        position: 'absolute',
      }}
      className={cn(
        "cursor-move p-4 rounded border border-dashed border-transparent hover:border-primary/50 hover:bg-primary/5 transition-colors",
        isDragging && "z-50 ring-2 ring-primary opacity-80"
      )}
      {...listeners}
      {...attributes}
    >
      <div className="font-bold uppercase mb-2" style={{ fontSize: `${1.2 * fontSize}rem` }}>{bloco.titulo}</div>
      {bloco.subtitulo && (
        <div className="opacity-70 mb-2 font-semibold" style={{ fontSize: `${0.9 * fontSize}rem` }}>{bloco.subtitulo}</div>
      )}
      <div className="space-y-1">
        {bloco.linhas.map((l, i) => (
          <div key={i} className="leading-snug" style={{ fontSize: `${0.85 * fontSize}rem` }}>{l.texto}</div>
        ))}
      </div>
    </div>
  );
}