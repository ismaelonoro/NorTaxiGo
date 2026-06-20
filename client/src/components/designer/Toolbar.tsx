import { useState, useRef, useEffect } from 'react';
import {
  Type, QrCode, ImageIcon, Palette, Wand2, Trash2, Frame,
  ArrowUp, ArrowDown, ZoomIn, ZoomOut, Save, Download, ChevronDown,
  Undo2, Redo2, Images,
} from 'lucide-react';
import type { useDesigner } from './useDesigner';
import {
  generateBackground, getBackgrounds, getBackground, createBackground,
  getAssets, getAsset, createAsset,
} from '@/lib/api';
import { makeThumbnail, fileToDataURL, CHECKERBOARD_STYLE } from '@/lib/image';
import type { Background, Asset } from '@/types';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

type Designer = ReturnType<typeof useDesigner>;

interface Props {
  designer: Designer;
  onSave: () => Promise<void>;
  onExport?: () => void;
  saving: boolean;
  assetsVersion?: number; // bump to refresh the image gallery
}


const ZOOM_LEVELS = [0.4, 0.5, 0.65, 0.75, 0.9, 1];

export default function Toolbar({ designer, onSave, onExport, saving, assetsVersion = 0 }: Props) {
  const [qrUrl, setQrUrl] = useState('');
  const [showQrInput, setShowQrInput] = useState(false);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgOpacity, setBgOpacity] = useState(1);
  const [gallery, setGallery] = useState<Background[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [applyingBg, setApplyingBg] = useState<string | null>(null);
  const [saveToGallery, setSaveToGallery] = useState(true);
  // Image library
  const [showImgPanel, setShowImgPanel] = useState(false);
  const [imgGallery, setImgGallery] = useState<Asset[]>([]);
  const [loadingImgGallery, setLoadingImgGallery] = useState(false);
  const [insertingAsset, setInsertingAsset] = useState<string | null>(null);
  const [saveImgToGallery, setSaveImgToGallery] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load the gallery + sync the opacity slider when the panel opens
  useEffect(() => {
    if (!showBgPanel) return;
    setBgOpacity(designer.getBackgroundOpacity());
    if (gallery.length === 0) {
      setLoadingGallery(true);
      getBackgrounds()
        .then(setGallery)
        .catch(() => toast.error('No se pudo cargar la galería'))
        .finally(() => setLoadingGallery(false));
    }
  }, [showBgPanel]);

  const applyGalleryBackground = async (bg: Background) => {
    setApplyingBg(bg.id);
    try {
      const full = await getBackground(bg.id);
      if (full.image) designer.setBackground(full.image);
      setShowBgPanel(false);
    } catch {
      toast.error('No se pudo aplicar el fondo');
    } finally {
      setApplyingBg(null);
    }
  };

  const handleAddQR = async () => {
    if (!qrUrl.trim()) return;
    await designer.addQR(qrUrl);
    setShowQrInput(false);
    setQrUrl('');
    toast.success('QR añadido');
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAI(true);
    try {
      const imageDataURL = await generateBackground(aiPrompt);
      designer.setBackground(imageDataURL);
      setShowBgPanel(false);
      toast.success('Fondo generado');
    } catch {
      toast.error('Error al generar fondo con IA');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file later
    try {
      const dataURL = await fileToDataURL(file);
      designer.setBackground(dataURL);
      setShowBgPanel(false);

      if (saveToGallery) {
        const thumbnail = await makeThumbnail(dataURL);
        const name = file.name.replace(/\.[^.]+$/, '') || 'Fondo';
        const created = await createBackground({ name, image: dataURL, thumbnail });
        setGallery((prev) => [created, ...prev]);
        toast.success('Fondo añadido a la galería');
      }
    } catch {
      toast.error('Error al subir el fondo');
    }
  };

  // Load/refresh the image library when the panel opens or an asset is added
  useEffect(() => {
    if (!showImgPanel) return;
    setLoadingImgGallery(true);
    getAssets()
      .then(setImgGallery)
      .catch(() => toast.error('No se pudo cargar la galería de imágenes'))
      .finally(() => setLoadingImgGallery(false));
  }, [showImgPanel, assetsVersion]);

  const insertAssetImage = async (asset: Asset) => {
    setInsertingAsset(asset.id);
    try {
      const full = await getAsset(asset.id);
      if (full.image) designer.addImageFromURL(full.image, { left: 240, top: 300 });
    } catch {
      toast.error('No se pudo insertar la imagen');
    } finally {
      setInsertingAsset(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const dataURL = await fileToDataURL(file);
      designer.addImageFromURL(dataURL, { left: 240, top: 300 });
      if (saveImgToGallery) {
        const thumbnail = await makeThumbnail(dataURL, 320, 'png');
        const name = file.name.replace(/\.[^.]+$/, '') || 'Imagen';
        const created = await createAsset({ name, image: dataURL, thumbnail });
        setImgGallery((prev) => [created, ...prev]);
        toast.success('Imagen añadida a la galería');
      }
    } catch {
      toast.error('Error al subir la imagen');
    }
  };

  const zoomIdx = ZOOM_LEVELS.indexOf(designer.zoom);

  return (
    <div className="flex flex-col gap-1 h-full">
      {/* Top actions */}
      <div className="p-3 border-b border-gray-100 space-y-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-primary w-full justify-center text-xs py-2"
        >
          {saving ? <Spinner size={13} /> : <Save size={13} />}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {onExport && (
          <button onClick={onExport} className="btn-secondary w-full justify-center text-xs py-2">
            <Download size={13} /> Descargar PDF
          </button>
        )}
        {/* Undo / Redo */}
        <div className="flex gap-1">
          <button
            onClick={designer.undo}
            disabled={!designer.canUndo}
            title="Deshacer (Ctrl+Z)"
            className="btn-ghost flex-1 justify-center text-xs py-1.5 disabled:opacity-30"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={designer.redo}
            disabled={!designer.canRedo}
            title="Rehacer (Ctrl+Shift+Z)"
            className="btn-ghost flex-1 justify-center text-xs py-1.5 disabled:opacity-30"
          >
            <Redo2 size={13} />
          </button>
        </div>
      </div>

      {/* Zoom */}
      <div className="p-3 border-b border-gray-100">
        <p className="label text-[10px]">Zoom</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => designer.changeZoom(ZOOM_LEVELS[Math.max(0, zoomIdx - 1)])}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            disabled={zoomIdx === 0}
          >
            <ZoomOut size={13} />
          </button>
          <span className="flex-1 text-center text-xs text-gray-600 font-medium">
            {Math.round(designer.zoom * 100)}%
          </span>
          <button
            onClick={() => designer.changeZoom(ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1)])}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            disabled={zoomIdx === ZOOM_LEVELS.length - 1}
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* Add elements */}
      <div className="p-3 border-b border-gray-100 space-y-1">
        <p className="label text-[10px]">Añadir elementos</p>

        <button
          onClick={() => designer.addText()}
          className="btn-ghost w-full justify-start text-xs py-1.5"
        >
          <Type size={13} /> Texto
        </button>

        <button
          onClick={() => setShowQrInput(!showQrInput)}
          className="btn-ghost w-full justify-start text-xs py-1.5"
        >
          <QrCode size={13} /> Código QR
        </button>

        {showQrInput && (
          <div className="space-y-1.5 pl-1">
            <input
              autoFocus
              className="input text-xs py-1.5"
              placeholder="URL del QR..."
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddQR()}
            />
            <button onClick={handleAddQR} className="btn-primary w-full justify-center text-xs py-1">
              Añadir QR
            </button>
          </div>
        )}

        <button
          onClick={() => setShowImgPanel(!showImgPanel)}
          className="btn-ghost w-full justify-between text-xs py-1.5"
        >
          <span className="flex items-center gap-1.5"><ImageIcon size={13} /> Imágenes</span>
          <ChevronDown size={12} className={`transition-transform ${showImgPanel ? 'rotate-180' : ''}`} />
        </button>

        {showImgPanel && (
          <div className="space-y-2 pl-1">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
              <Images size={10} /> Galería de imágenes
            </div>
            {loadingImgGallery ? (
              <div className="flex justify-center py-3 text-gray-400"><Spinner size={14} /></div>
            ) : imgGallery.length === 0 ? (
              <p className="text-[10px] text-gray-400 py-1">Aún no hay imágenes guardadas.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                {imgGallery.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => insertAssetImage(a)}
                    disabled={insertingAsset !== null}
                    title={a.name}
                    style={CHECKERBOARD_STYLE}
                    className="relative aspect-[3/4] rounded-md overflow-hidden border border-gray-200 hover:border-gold-400 transition-colors disabled:opacity-50"
                  >
                    <img src={a.thumbnail} alt={a.name} className="w-full h-full object-contain" />
                    {insertingAsset === a.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                        <Spinner size={12} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-1.5">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="btn-ghost flex-1 justify-center text-xs py-1"
              >
                <ImageIcon size={11} /> Subir
              </button>
              <button
                onClick={() => designer.addImagePlaceholder()}
                title="Añadir un hueco para colocar una imagen después"
                className="btn-ghost flex-1 justify-center text-xs py-1"
              >
                <Frame size={11} /> Hueco
              </button>
            </div>
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 pl-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveImgToGallery}
                onChange={(e) => setSaveImgToGallery(e.target.checked)}
                className="accent-gold-500"
              />
              Guardar en la galería para reutilizar
            </label>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        )}
      </div>

      {/* Background */}
      <div className="p-3 border-b border-gray-100 space-y-1">
        <button
          onClick={() => setShowBgPanel(!showBgPanel)}
          className="btn-ghost w-full justify-between text-xs py-1.5"
        >
          <span className="flex items-center gap-1.5"><Palette size={13} /> Fondo</span>
          <ChevronDown size={12} className={`transition-transform ${showBgPanel ? 'rotate-180' : ''}`} />
        </button>

        {showBgPanel && (
          <div className="space-y-2 pl-1">
            {/* Solid color */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5"
              />
              <button
                onClick={() => { designer.setBackgroundColor(bgColor); setShowBgPanel(false); }}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                Color sólido
              </button>
            </div>

            {/* Background image opacity */}
            <div>
              <label className="label text-[10px]">Opacidad del fondo ({Math.round(bgOpacity * 100)}%)</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={bgOpacity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBgOpacity(v);
                  designer.setBackgroundOpacity(v);
                }}
                className="w-full accent-gold-500"
              />
            </div>

            {/* Gallery */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                <Images size={10} /> Galería de fondos
              </div>
              {loadingGallery ? (
                <div className="flex justify-center py-3 text-gray-400"><Spinner size={14} /></div>
              ) : gallery.length === 0 ? (
                <p className="text-[10px] text-gray-400 py-1">Aún no hay fondos guardados.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {gallery.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => applyGalleryBackground(bg)}
                      disabled={applyingBg !== null}
                      title={bg.name}
                      className="relative aspect-[3/4] rounded-md overflow-hidden border border-gray-200 hover:border-gold-400 transition-colors disabled:opacity-50"
                    >
                      <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover" />
                      {applyingBg === bg.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <Spinner size={12} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost w-full justify-start text-xs py-1"
            >
              <ImageIcon size={11} /> Subir imagen
            </button>
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 pl-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToGallery}
                onChange={(e) => setSaveToGallery(e.target.checked)}
                className="accent-gold-500"
              />
              Guardar en la galería para reutilizar
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

            {/* AI */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-gold-600 font-medium">
                <Wand2 size={10} /> Generar con IA
              </div>
              <textarea
                className="input text-xs py-1.5 resize-none"
                rows={2}
                placeholder="Ej: boda elegante con flores blancas..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button
                onClick={handleGenerateAI}
                disabled={generatingAI || !aiPrompt.trim()}
                className="btn-primary w-full justify-center text-xs py-1 disabled:opacity-50"
              >
                {generatingAI ? <><Spinner size={11} /> Generando...</> : <><Wand2 size={11} /> Generar</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected object actions */}
      {designer.selected && (
        <div className="p-3 space-y-1">
          <p className="label text-[10px]">Objeto seleccionado</p>
          <div className="flex gap-1">
            <button onClick={designer.bringForward} className="btn-ghost flex-1 justify-center text-xs py-1">
              <ArrowUp size={12} />
            </button>
            <button onClick={designer.sendBackward} className="btn-ghost flex-1 justify-center text-xs py-1">
              <ArrowDown size={12} />
            </button>
            <button onClick={designer.deleteSelected} className="btn-danger flex-1 justify-center text-xs py-1">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
