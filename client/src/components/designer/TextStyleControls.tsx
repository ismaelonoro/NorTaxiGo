import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import type { SelectedObjectProps } from './useDesigner';
import FontPicker from './FontPicker';

const ALIGNMENTS = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
  { value: 'justify', icon: AlignJustify },
] as const;

interface Props {
  values: Pick<SelectedObjectProps, 'fontFamily' | 'fontSize' | 'fill' | 'fontWeight' | 'fontStyle' | 'textAlign'>;
  onChange: (props: Partial<SelectedObjectProps>) => void;
  usedColors?: string[];
}

/** Font, size, color, bold/italic and alignment controls shared by the single
 *  text properties panel and the multi-text panel. */
export default function TextStyleControls({ values, onChange, usedColors = [] }: Props) {
  return (
    <>
      <div>
        <label className="label text-[10px]">Fuente</label>
        <FontPicker
          value={values.fontFamily ?? 'Georgia'}
          onChange={(font) => onChange({ fontFamily: font })}
        />
      </div>

      <div>
        <label className="label text-[10px]">Tamaño ({values.fontSize ?? 32}px)</label>
        <input
          type="range"
          min={8}
          max={120}
          value={values.fontSize ?? 32}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="w-full accent-gold-500"
        />
      </div>

      <div>
        <label className="label text-[10px]">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={values.fill ?? '#000000'}
            onChange={(e) => onChange({ fill: e.target.value })}
            className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
          />
          <input
            className="input text-xs py-1 flex-1"
            value={values.fill ?? '#000000'}
            onChange={(e) => onChange({ fill: e.target.value })}
            maxLength={9}
          />
        </div>
        {usedColors.length > 0 && (
          <div className="mt-2">
            <p className="label text-[9px]">Colores usados</p>
            <div className="flex flex-wrap gap-1">
              {usedColors.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ fill: c })}
                  title={c}
                  className={`w-5 h-5 rounded border transition-transform hover:scale-110 ${
                    values.fill === c ? 'border-gold-500 ring-1 ring-gold-400' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => onChange({ fontWeight: values.fontWeight === 'bold' ? 'normal' : 'bold' })}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
            values.fontWeight === 'bold'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          N
        </button>
        <button
          onClick={() => onChange({ fontStyle: values.fontStyle === 'italic' ? 'normal' : 'italic' })}
          className={`flex-1 py-1.5 text-xs italic rounded-lg border transition-colors ${
            values.fontStyle === 'italic'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <em>I</em>
        </button>
      </div>

      <div>
        <label className="label text-[10px]">Alineación</label>
        <div className="flex gap-1.5">
          {ALIGNMENTS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onChange({ textAlign: value })}
              className={`flex-1 py-1.5 flex items-center justify-center rounded-lg border transition-colors ${
                (values.textAlign ?? 'left') === value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
