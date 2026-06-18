import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { generateQRDataURL } from '@/lib/qr';

export const CANVAS_WIDTH = 794;
export const CANVAS_HEIGHT = 1123;

export type SelectedObjectProps = {
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontWeight?: string;
  fontStyle?: string;
  text?: string;
  opacity: number;
};

const MAX_HISTORY = 50;

export function useDesigner(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [selected, setSelected] = useState<SelectedObjectProps | null>(null);
  const [zoom, setZoom] = useState(0.65);
  const [ready, setReady] = useState(false);

  // Undo/redo history
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getProps = useCallback((obj: fabric.Object): SelectedObjectProps => {
    const base = {
      type: obj.type ?? 'object',
      left: Math.round(obj.left ?? 0),
      top: Math.round(obj.top ?? 0),
      width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
      height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
      angle: Math.round(obj.angle ?? 0),
      opacity: obj.opacity ?? 1,
    };
    if (obj.type === 'textbox' || obj.type === 'i-text') {
      const t = obj as fabric.Textbox;
      return {
        ...base,
        fontSize: t.fontSize,
        fontFamily: t.fontFamily,
        fill: t.fill as string,
        fontWeight: t.fontWeight as string,
        fontStyle: t.fontStyle as string,
        text: t.text,
      };
    }
    return base;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Canvas always at full logical size; zoom is handled by CSS transform on the wrapper
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    const saveSnapshot = () => {
      if (isRestoringRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const json = JSON.stringify(canvas.toJSON());
        const history = historyRef.current;
        const idx = historyIndexRef.current;
        // Drop any redo states ahead of current position
        const next = history.slice(0, idx + 1);
        next.push(json);
        if (next.length > MAX_HISTORY) next.shift();
        historyRef.current = next;
        historyIndexRef.current = next.length - 1;
        setHistoryIndex(next.length - 1);
      }, 250);
    };

    canvas.on('object:added', saveSnapshot);
    canvas.on('object:removed', saveSnapshot);
    canvas.on('object:modified', saveSnapshot);

    setReady(true);

    canvas.on('selection:created', (e) => {
      if (e.selected?.[0]) setSelected(getProps(e.selected[0]));
    });
    canvas.on('selection:updated', (e) => {
      if (e.selected?.[0]) setSelected(getProps(e.selected[0]));
    });
    canvas.on('selection:cleared', () => setSelected(null));
    canvas.on('object:modified', (e) => {
      if (e.target) setSelected(getProps(e.target));
    });

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      canvas.dispose();
      fabricRef.current = null;
      historyRef.current = [];
      historyIndexRef.current = -1;
      setReady(false);
    };
  }, [getProps]);

  const addText = useCallback((text = 'Escribe aquí', options: Partial<fabric.Textbox> = {}) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const t = new fabric.Textbox(text, {
      left: 80,
      top: 80,
      width: 600,
      fontSize: 32,
      fontFamily: 'Georgia',
      fill: '#1a1a1a',
      textAlign: 'center',
      ...options,
    });
    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.renderAll();
  }, []);

  const addQR = useCallback(async (url: string, darkColor = '#000000', lightColor = '#ffffff') => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataURL = await generateQRDataURL(url, 400, darkColor, lightColor);
    fabric.Image.fromURL(dataURL).then((img) => {
      img.set({ left: 280, top: 400, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  }, []);

  const addImageFromURL = useCallback((dataURL: string, opts?: Partial<fabric.Image>) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    fabric.Image.fromURL(dataURL).then((img) => {
      img.set({ left: 0, top: 0, selectable: true, ...opts });
      canvas.add(img);
      canvas.renderAll();
    });
  }, []);

  const setBackground = useCallback((dataURL: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    fabric.Image.fromURL(dataURL).then((img) => {
      const scaleX = CANVAS_WIDTH / (img.width ?? 1);
      const scaleY = CANVAS_HEIGHT / (img.height ?? 1);
      img.set({ scaleX, scaleY, left: 0, top: 0, originX: 'left', originY: 'top' });
      // Use Fabric's native background: never selectable/movable, always behind
      // every object, and serialized/restored correctly by toJSON/loadFromJSON.
      canvas.backgroundImage = img;
      canvas.renderAll();
    });
  }, []);

  const setBackgroundColor = useCallback((color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = color;
    canvas.renderAll();
  }, []);

  const updateSelected = useCallback((props: Partial<SelectedObjectProps>) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    if (props.text !== undefined && (obj.type === 'textbox' || obj.type === 'i-text')) {
      (obj as fabric.Textbox).set('text', props.text);
    }
    if (props.fontSize !== undefined) (obj as fabric.Textbox).set('fontSize', props.fontSize);
    if (props.fontFamily !== undefined) {
      const fam = props.fontFamily;
      (obj as fabric.Textbox).set('fontFamily', fam);
      // Ensure the web font is loaded, then repaint so it actually renders
      if (document.fonts?.load) {
        document.fonts.load(`32px "${fam}"`).then(() => canvas.renderAll()).catch(() => {});
      }
    }
    if (props.fill !== undefined) obj.set('fill', props.fill);
    if (props.fontWeight !== undefined) (obj as fabric.Textbox).set('fontWeight', props.fontWeight as 'normal' | 'bold');
    if (props.fontStyle !== undefined) (obj as fabric.Textbox).set('fontStyle', props.fontStyle as 'normal' | 'italic');
    if (props.angle !== undefined) obj.set('angle', props.angle);
    if (props.opacity !== undefined) obj.set('opacity', props.opacity);
    canvas.renderAll();
    setSelected(getProps(obj));
  }, [getProps]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    setSelected(null);
  }, []);

  const bringForward = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    canvas.bringObjectForward(obj);
    canvas.renderAll();
  }, []);

  const sendBackward = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    canvas.sendObjectBackwards(obj);
    canvas.renderAll();
  }, []);

  const toJSON = useCallback(() => JSON.stringify(fabricRef.current?.toJSON() ?? {}), []);

  const toDataURL = useCallback(() => {
    // multiplier 2 ≈ 190 dpi on A4: good print quality, and fast enough that
    // mobile Web Share stays within the user-activation window.
    return fabricRef.current?.toDataURL({ format: 'png', quality: 1, multiplier: 2 }) ?? '';
  }, []);

  const toThumbnail = useCallback(() => {
    return fabricRef.current?.toDataURL({ format: 'jpeg', quality: 0.7, multiplier: 0.3 }) ?? '';
  }, []);

  const loadFromJSON = useCallback((json: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return Promise.resolve();
    // Loading external design resets history
    isRestoringRef.current = true;
    return canvas.loadFromJSON(JSON.parse(json)).then(() => {
      canvas.renderAll();
      // Web fonts in the saved design may not be ready yet — repaint once loaded
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => canvas.renderAll()).catch(() => {});
      }
      const snapshot = JSON.stringify(canvas.toJSON());
      historyRef.current = [snapshot];
      historyIndexRef.current = 0;
      setHistoryIndex(0);
      isRestoringRef.current = false;
    });
  }, []);

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    const prev = historyRef.current[idx - 1];
    isRestoringRef.current = true;
    canvas.loadFromJSON(JSON.parse(prev)).then(() => {
      canvas.renderAll();
      historyIndexRef.current = idx - 1;
      setHistoryIndex(idx - 1);
      canvas.discardActiveObject();
      setSelected(null);
      isRestoringRef.current = false;
    });
  }, []);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    const next = historyRef.current[idx + 1];
    isRestoringRef.current = true;
    canvas.loadFromJSON(JSON.parse(next)).then(() => {
      canvas.renderAll();
      historyIndexRef.current = idx + 1;
      setHistoryIndex(idx + 1);
      canvas.discardActiveObject();
      setSelected(null);
      isRestoringRef.current = false;
    });
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;

  // Zoom only changes CSS scale — canvas coordinates stay in document units
  const changeZoom = useCallback((z: number) => setZoom(z), []);

  return {
    ready,
    selected,
    zoom,
    canUndo,
    canRedo,
    addText,
    addQR,
    addImageFromURL,
    setBackground,
    setBackgroundColor,
    updateSelected,
    deleteSelected,
    bringForward,
    sendBackward,
    toJSON,
    toDataURL,
    toThumbnail,
    loadFromJSON,
    undo,
    redo,
    changeZoom,
  };
}
