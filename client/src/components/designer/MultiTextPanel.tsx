import type { SelectedObjectProps } from './useDesigner';
import TextStyleControls from './TextStyleControls';

interface Props {
  count: number;
  values: SelectedObjectProps; // taken from the first selected text (reference)
  onChange: (props: Partial<SelectedObjectProps>) => void;
  usedColors?: string[];
}

/** Shown when several text elements are selected: applies font, size, color,
 *  style and alignment to ALL of them at once. */
export default function MultiTextPanel({ count, values, onChange, usedColors }: Props) {
  return (
    <div className="p-3 space-y-4">
      <p className="label text-[10px] uppercase tracking-wide">{count} textos</p>
      <p className="text-[10px] text-gray-400">Los cambios se aplican a todos los textos seleccionados.</p>
      <TextStyleControls values={values} onChange={onChange} usedColors={usedColors} />
    </div>
  );
}
