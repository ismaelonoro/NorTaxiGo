import { useEffect, useRef, useState } from 'react';
import { QrCode, ImageIcon, List, Scissors } from 'lucide-react';
import type { SelectedObjectProps } from './useDesigner';
import TextStyleControls from './TextStyleControls';
import { fileToDataURL, makeThumbnail, CHECKERBOARD_STYLE } from '@/lib/image';
import { removeImageBackground } from '@/lib/removeBg';
import { createAsset, getAssets, getAsset } from '@/lib/api';
import type { Asset } from '@/types';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

interface Props {
  selected: SelectedObjectProps;
  onChange: (props: Partial<SelectedObjectProps>) => void;
  usedColors?: string[];
  onRegenerateQR?: (url: string) => void;
  onReplaceImage?: (dataURL: string, mode: 'fit' | 'real') => void;
  onSetImageSrc?: (dataURL: string) => void;
  onAssetSaved?: () => void;
}

export default function PropertiesPanel({
  selected, onChange, usedColors = [], onRegenerateQR, onReplaceImage, onSetImageSrc, onAssetSaved,
}: Props) {
  const isText = selected.type === 'textbox' || selected.type === 'i-text';
  const isImage = selected.type === 'image' && !selected.isQR;

  const [qrUrl, setQrUrl] = useState('');
  const [pendingImg, setPendingImg] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [bgOriginal, setBgOriginal] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [bgDevice, setBgDevice] = useState<'gpu' | 'cpu' | null>(null);
  const [savingLib, setSavingLib] = useState(false);
  const [savedLib, setSavedLib] = useState(false);
  // Replace-image picker (gallery + upload)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerAssets, setPickerAssets] = useState<Asset[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [choosingAsset, setChoosingAsset] = useState<string | null>(null);
  const [saveUploadToLib, setSaveUploadToLib] = useState(true);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Load the gallery when the replace picker opens
  useEffect(() => {
    if (!showPicker) return;
    setLoadingPicker(true);
    getAssets()
      .then(setPickerAssets)
      .catch(() => toast.error('No se pudo cargar la galería'))
      .finally(() => setLoadingPicker(false));
  }, [showPicker]);

  const chooseAssetForReplace = async (asset: Asset) => {
    setChoosingAsset(asset.id);
    try {
      const full = await getAsset(asset.id);
      if (full.image) {
        setShowPicker(false);
        setPendingImg(full.image); // open the fit/real modal
      }
    } catch {
      toast.error('No se pudo cargar la imagen');
    } finally {
      setChoosingAsset(null);
    }
  };

  const handleRemoveBg = async () => {
    if (!selected.imageSrc) return;
    setRemovingBg(true);
    try {
      const original = selected.imageSrc;
      const { dataURL, device } = await removeImageBackground(original);
      setBgOriginal(original);
      setBgDevice(device);
      setShowOriginal(false);
      setSavedLib(false);
      setBgPreview(dataURL); // open the preview modal
    } catch {
      toast.error('No se pudo quitar el fondo');
    } finally {
      setRemovingBg(false);
    }
  };

  const handleSaveCutoutToLibrary = async () => {
    if (!bgPreview) return;
    setSavingLib(true);
    try {
      const thumbnail = await makeThumbnail(bgPreview, 320, 'png');
      await createAsset({ name: 'Imagen sin fondo', image: bgPreview, thumbnail });
      setSavedLib(true);
      onAssetSaved?.();
      toast.success('Guardada en la galería de imágenes');
    } catch {
      toast.error('No se pudo guardar en la galería');
    } finally {
      setSavingLib(false);
    }
  };

  // Keep the QR URL field in sync with the selected QR
  useEffect(() => { setQrUrl(selected.qrUrl ?? ''); }, [selected.qrUrl]);

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const dataURL = await fileToDataURL(file);
    setShowPicker(false);
    setPendingImg(dataURL); // open the fit/real modal
    if (saveUploadToLib) {
      try {
        const thumbnail = await makeThumbnail(dataURL, 320, 'png');
        const name = file.name.replace(/\.[^.]+$/, '') || 'Imagen';
        await createAsset({ name, image: dataURL, thumbnail });
        onAssetSaved?.();
        toast.success('Imagen añadida a la galería');
      } catch {
        /* saving to the library is best-effort; the replace still proceeds */
      }
    }
  };

  // Toggle a bullet list on the text's non-empty lines
  const toggleBulletList = () => {
    const lines = (selected.text ?? '').split('\n');
    const nonEmpty = lines.filter((l) => l.trim());
    const allBulleted = nonEmpty.length > 0 && nonEmpty.every((l) => l.trimStart().startsWith('•'));
    const next = lines
      .map((l) => {
        if (!l.trim()) return l;
        if (allBulleted) return l.replace(/^(\s*)•\s?/, '$1');
        return l.trimStart().startsWith('•') ? l : `•  ${l}`;
      })
      .join('\n');
    onChange({ text: next });
  };

  return (
    <div className="p-3 space-y-4">
      <p className="label text-[10px] uppercase tracking-wide">Propiedades</p>

      {/* Position */}
      <div>
        <p className="label text-[10px]">Posición</p>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="label text-[9px]">X</label>
            <input type="number" className="input text-xs py-1" value={selected.left}
              onChange={(e) => onChange({ left: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label text-[9px]">Y</label>
            <input type="number" className="input text-xs py-1" value={selected.top}
              onChange={(e) => onChange({ top: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      {/* Angle */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-[10px]">Rotación ({Math.round(selected.angle)}°)</label>
          <button onClick={() => onChange({ angle: 0 })}
            className="text-[10px] text-gold-600 hover:text-gold-700 font-medium"
            title="Poner horizontal (0°)">Enderezar</button>
        </div>
        <input type="range" min={-180} max={180} value={selected.angle}
          onChange={(e) => onChange({ angle: Number(e.target.value) })}
          className="w-full accent-gold-500" />
      </div>

      {/* Opacity */}
      <div>
        <label className="label text-[10px]">Opacidad ({Math.round(selected.opacity * 100)}%)</label>
        <input type="range" min={0} max={1} step={0.05} value={selected.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full accent-gold-500" />
      </div>

      {/* QR regeneration */}
      {selected.isQR && onRegenerateQR && (
        <div>
          <label className="label text-[10px] flex items-center gap-1"><QrCode size={11} /> Contenido del QR</label>
          <textarea
            className="input text-xs py-1.5 resize-none"
            rows={2}
            placeholder="URL o texto del QR..."
            value={qrUrl}
            onChange={(e) => setQrUrl(e.target.value)}
          />
          <button
            onClick={() => qrUrl.trim() && onRegenerateQR(qrUrl.trim())}
            disabled={!qrUrl.trim() || qrUrl.trim() === (selected.qrUrl ?? '')}
            className="btn-primary w-full justify-center text-xs py-1.5 mt-1.5 disabled:opacity-50"
          >
            Regenerar QR
          </button>
          <p className="text-[10px] text-gray-400 mt-1">Se regenera en el mismo sitio y tamaño.</p>
        </div>
      )}

      {/* Image replacement — holders and any plain image (not QRs) */}
      {(selected.isImageHolder || isImage) && onReplaceImage && (
        <div>
          <label className="label text-[10px] flex items-center gap-1"><ImageIcon size={11} /> Imagen</label>
          <button
            onClick={() => setShowPicker(true)}
            className="btn-secondary w-full justify-center text-xs py-1.5"
          >
            Reemplazar imagen
          </button>
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />

          {isImage && onSetImageSrc && selected.imageSrc && (
            <button
              onClick={handleRemoveBg}
              disabled={removingBg}
              className="btn-ghost w-full justify-center text-xs py-1.5 mt-1.5 disabled:opacity-50"
            >
              {removingBg ? <><Spinner size={12} /> Quitando fondo...</> : <><Scissors size={12} /> Quitar fondo</>}
            </button>
          )}
        </div>
      )}

      {/* Text-specific */}
      {isText && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <label className="label text-[10px]">Texto</label>
              <button
                onClick={toggleBulletList}
                title="Lista con viñetas"
                className="flex items-center gap-1 text-[10px] text-gold-600 hover:text-gold-700 font-medium"
              >
                <List size={12} /> Lista
              </button>
            </div>
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

      {/* Background-removal preview over a checkerboard; apply or cancel */}
      <Modal open={bgPreview !== null} onClose={() => setBgPreview(null)} title="Vista previa sin fondo" size="md">
        <div className="p-5 space-y-3">
          {/* Before / after toggle */}
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg w-max mx-auto">
            <button
              onClick={() => setShowOriginal(true)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${showOriginal ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Antes
            </button>
            <button
              onClick={() => setShowOriginal(false)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${!showOriginal ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Después
            </button>
          </div>

          <div
            className="rounded-lg border border-gray-200 flex items-center justify-center p-3"
            style={{ minHeight: 240, ...CHECKERBOARD_STYLE }}
          >
            <img
              src={(showOriginal ? bgOriginal : bgPreview) ?? ''}
              alt={showOriginal ? 'Original' : 'Sin fondo'}
              className="max-h-72 max-w-full object-contain"
            />
          </div>
          <p className="text-xs text-gray-400 text-center">
            Las zonas a cuadros son transparentes.
            {bgDevice && <> · Procesado en <span className="font-medium">{bgDevice === 'gpu' ? 'GPU' : 'CPU'}</span></>}
          </p>

          <div className="flex gap-2 items-center">
            <button
              onClick={handleSaveCutoutToLibrary}
              disabled={savingLib || savedLib}
              className="btn-secondary text-xs py-2 disabled:opacity-50"
            >
              {savingLib ? <Spinner size={12} /> : <ImageIcon size={12} />}
              {savedLib ? 'Guardada ✓' : 'Guardar en galería'}
            </button>
            <div className="flex-1" />
            <button onClick={() => setBgPreview(null)} className="btn-ghost text-xs py-2">Cancelar</button>
            <button
              onClick={() => { if (bgPreview) onSetImageSrc?.(bgPreview); setBgPreview(null); }}
              className="btn-primary text-xs py-2"
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>

      {/* Replace-image picker: choose from the gallery or upload a new one */}
      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Reemplazar imagen" size="md">
        <div className="p-5 space-y-3">
          <p className="label text-[10px]">Elegir de la galería</p>
          {loadingPicker ? (
            <div className="flex justify-center py-6 text-gray-400"><Spinner /></div>
          ) : pickerAssets.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">Aún no hay imágenes guardadas.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto">
              {pickerAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => chooseAssetForReplace(a)}
                  disabled={choosingAsset !== null}
                  title={a.name}
                  style={CHECKERBOARD_STYLE}
                  className="relative aspect-[3/4] rounded-md overflow-hidden border border-gray-200 hover:border-gold-400 transition-colors disabled:opacity-50"
                >
                  <img src={a.thumbnail} alt={a.name} className="w-full h-full object-contain" />
                  {choosingAsset === a.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Spinner size={12} /></div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="label text-[10px] mb-2">O subir una imagen nueva</p>
            <div className="rounded-lg bg-cream-50 border border-cream-200 p-3 space-y-2.5">
              <button onClick={() => imgInputRef.current?.click()} className="btn-secondary w-full justify-center text-xs py-2">
                <ImageIcon size={12} /> Subir imagen nueva
              </button>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveUploadToLib}
                  onChange={(e) => setSaveUploadToLib(e.target.checked)}
                  className="w-4 h-4 accent-gold-500"
                />
                Guardar también en la galería
              </label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Fit / real-size modal after picking a replacement image */}
      <Modal open={pendingImg !== null} onClose={() => setPendingImg(null)} title="¿Cómo colocar la imagen?" size="sm">
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600">El tamaño de la imagen no coincide con el hueco. ¿Qué prefieres?</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { if (pendingImg) onReplaceImage?.(pendingImg, 'fit'); setPendingImg(null); }}
              className="btn-primary justify-center text-xs py-2"
            >
              Ajustar al hueco
            </button>
            <button
              onClick={() => { if (pendingImg) onReplaceImage?.(pendingImg, 'real'); setPendingImg(null); }}
              className="btn-secondary justify-center text-xs py-2"
            >
              Tamaño real
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
