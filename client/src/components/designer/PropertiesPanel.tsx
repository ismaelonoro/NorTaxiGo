import type { SelectedObjectProps } from './useDesigner';
import FontPicker from './FontPicker';

interface Props {
  selected: SelectedObjectProps;
  onChange: (props: Partial<SelectedObjectProps>) => void;
}

export default function PropertiesPanel({ selected, onChange }: Props) {
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

          <div>
            <label className="label text-[10px]">Fuente</label>
            <FontPicker
              value={selected.fontFamily ?? 'Georgia'}
              onChange={(font) => onChange({ fontFamily: font })}
            />
          </div>

          <div>
            <label className="label text-[10px]">Tamaño ({selected.fontSize}px)</label>
            <input
              type="range"
              min={8}
              max={120}
              value={selected.fontSize ?? 32}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="w-full accent-gold-500"
            />
          </div>

          <div>
            <label className="label text-[10px]">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selected.fill ?? '#000000'}
                onChange={(e) => onChange({ fill: e.target.value })}
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                className="input text-xs py-1 flex-1"
                value={selected.fill ?? '#000000'}
                onChange={(e) => onChange({ fill: e.target.value })}
                maxLength={9}
              />
            </div>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => onChange({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                selected.fontWeight === 'bold'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              N
            </button>
            <button
              onClick={() => onChange({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`flex-1 py-1.5 text-xs italic rounded-lg border transition-colors ${
                selected.fontStyle === 'italic'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <em>I</em>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
