import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FONTS, FONT_CATEGORIES } from '@/lib/fonts';

interface Props {
  value: string;
  onChange: (font: string) => void;
}

export default function FontPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-xs py-1.5 w-full flex items-center justify-between gap-2"
      >
        <span className="truncate" style={{ fontFamily: `'${value}'` }}>{value}</span>
        <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {FONT_CATEGORIES.map((cat) => {
            const fonts = FONTS.filter((f) => f.category === cat);
            if (fonts.length === 0) return null;
            return (
              <div key={cat}>
                <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-wide text-gray-400 font-medium">{cat}</p>
                {fonts.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => { onChange(f.name); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-cream-50 transition-colors ${
                      value === f.name ? 'bg-cream-50' : ''
                    }`}
                  >
                    <span className="text-base leading-tight truncate" style={{ fontFamily: `'${f.name}'` }}>
                      {f.name}
                    </span>
                    {value === f.name && <Check size={13} className="shrink-0 text-gold-600" />}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
