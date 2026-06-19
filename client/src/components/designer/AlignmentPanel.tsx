import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
} from 'lucide-react';

type AlignMode = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

interface Props {
  count: number;
  onAlign: (mode: AlignMode) => void;
}

const HORIZONTAL = [
  { mode: 'left' as const, icon: AlignStartVertical, label: 'Izquierda' },
  { mode: 'center-h' as const, icon: AlignCenterVertical, label: 'Centrar' },
  { mode: 'right' as const, icon: AlignEndVertical, label: 'Derecha' },
];

const VERTICAL = [
  { mode: 'top' as const, icon: AlignStartHorizontal, label: 'Arriba' },
  { mode: 'center-v' as const, icon: AlignCenterHorizontal, label: 'Centrar' },
  { mode: 'bottom' as const, icon: AlignEndHorizontal, label: 'Abajo' },
];

export default function AlignmentPanel({ count, onAlign }: Props) {
  return (
    <div className="p-3 space-y-4">
      <p className="label text-[10px] uppercase tracking-wide">{count} elementos</p>

      <div>
        <p className="label text-[10px]">Alinear horizontalmente</p>
        <div className="flex gap-1.5">
          {HORIZONTAL.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onAlign(mode)}
              title={label}
              className="flex-1 py-2 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label text-[10px]">Alinear verticalmente</p>
        <div className="flex gap-1.5">
          {VERTICAL.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onAlign(mode)}
              title={label}
              className="flex-1 py-2 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
