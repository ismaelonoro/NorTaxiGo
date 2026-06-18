import { useState, useRef } from 'react';
import {
  Type, QrCode, ImageIcon, Palette, Wand2, Trash2,
  ArrowUp, ArrowDown, ZoomIn, ZoomOut, Save, Download, ChevronDown,
  Undo2, Redo2,
} from 'lucide-react';
import type { useDesigner } from './useDesigner';
import { generateBackground } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

type Designer = ReturnType<typeof useDesigner>;

interface Props {
  designer: Designer;
  onSave: () => Promise<void>;
  onExport?: () => void;
  saving: boolean;
}


const ZOOM_LEVELS = [0.4, 0.5, 0.65, 0.75, 0.9, 1];

export default function Toolbar({ designer, onSave, onExport, saving }: Props) {
  const [qrUrl, setQrUrl] = useState('');
  const [showQrInput, setShowQrInput] = useState(false);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target?.result as string;
      designer.setBackground(dataURL);
      setShowBgPanel(false);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target?.result as string;
      designer.addImageFromURL(dataURL, { left: 297, top: 80, scaleX: 0.3, scaleY: 0.3 });
    };
    reader.readAsDataURL(file);
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
          onClick={() => logoInputRef.current?.click()}
          className="btn-ghost w-full justify-start text-xs py-1.5"
        >
          <ImageIcon size={13} /> Imagen / Logo
        </button>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
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

            {/* Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost w-full justify-start text-xs py-1"
            >
              <ImageIcon size={11} /> Subir imagen
            </button>
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
