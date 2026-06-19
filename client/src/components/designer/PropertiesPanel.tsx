import type { SelectedObjectProps } from './useDesigner';
import TextStyleControls from './TextStyleControls';

interface Props {
  selected: SelectedObjectProps;
  onChange: (props: Partial<SelectedObjectProps>) => void;
  usedColors?: string[];
}

export default function PropertiesPanel({ selected, onChange, usedColors = [] }: Props) {
  const isText = selected.type === 'textbox' || selected.type === 'i-text';

  return (
    <div className="p-3 space-y-4">
      <p className="label text-[10px] uppercase tracking-wide">Propiedades</p>

      {/* Position & size */}
      <div>
        <p className="label text-[10px]">Posición</p>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="label text-[9px]">X</label>
            <input
              type="number"
              className="input text-xs py-1"
              value={selected.left}
              onChange={(e) => onChange({ left: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label text-[9px]">Y</label>
            <input
              type="number"
              className="input text-xs py-1"
              value={selected.top}
              onChange={(e) => onChange({ top: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Angle */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-[10px]">Rotación ({Math.round(selected.angle)}°)</label>
          <button
            onClick={() => onChange({ angle: 0 })}
            className="text-[10px] text-gold-600 hover:text-gold-700 font-medium"
            title="Poner horizontal (0°)"
          >
            Enderezar
          </button>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          value={selected.angle}
          onChange={(e) => onChange({ angle: Number(e.target.value) })}
          className="w-full accent-gold-500"
        />
      </div>

      {/* Opacity */}
      <div>
        <label className="label text-[10px]">Opacidad ({Math.round(selected.opacity * 100)}%)</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={selected.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full accent-gold-500"
        />
      </div>

      {/* Text-specific */}
      {isText && (
        <>
          <div>
            <label className="label text-[10px]">Texto</label>
            <textarea
              className="input text-xs py-1.5 resize-none"
              rows={3}
              value={selected.text ?? ''}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>

          <TextStyleControls values={selected} onChange={onChange} usedColors={usedColors} />
        </>
      )}
    </div>
  );
}
