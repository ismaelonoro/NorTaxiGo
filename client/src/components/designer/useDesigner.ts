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

export function useDesigner(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [selected, setSelected] = useState<SelectedObjectProps | null>(null);
  const [zoom, setZoom] = useState(0.65);

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
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH * zoom,
      height: CANVAS_HEIGHT * zoom,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });
    canvas.setZoom(zoom);
    fabricRef.current = canvas;

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

    return () => { canvas.dispose(); };
  }, []);

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
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl, { left: 280, top: 400, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    };
    imgEl.src = dataURL;
  }, []);

  const addImageFromURL = useCallback((dataURL: string, opts?: Partial<fabric.Image>) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl, {
        left: 0, top: 0,
        selectable: true,
        ...opts,
      });
      canvas.add(img);
      canvas.renderAll();
    };
    imgEl.src = dataURL;
  }, []);

  const setBackground = useCallback((dataURL: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl);
      const scaleX = CANVAS_WIDTH / (img.width ?? 1);
      const scaleY = CANVAS_HEIGHT / (img.height ?? 1);
      img.set({ scaleX, scaleY, left: 0, top: 0, selectable: false, evented: false });
      // Remove previous background image
      const bg = canvas.getObjects().find((o) => (o as fabric.Image & { isBg?: boolean }).isBg);
      if (bg) canvas.remove(bg);
      (img as fabric.Image & { isBg?: boolean }).isBg = true;
      canvas.insertAt(0, img);
      canvas.renderAll();
    };
    imgEl.src = dataURL;
  }, []);

  const setBackgroundColor = useCallback((color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const bg = canvas.getObjects().find((o) => (o as fabric.Image & { isBg?: boolean }).isBg);
    if (bg) canvas.remove(bg);
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
    if (props.fontFamily !== undefined) (obj as fabric.Textbox).set('fontFamily', props.fontFamily);
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

  const toJSON = useCallback(() => {
    return JSON.stringify(fabricRef.current?.toJSON() ?? {});
  }, []);

  const toDataURL = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return '';
    return canvas.toDataURL({ format: 'png', quality: 1, multiplier: 3 });
  }, []);

  const toThumbnail = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return '';
    return canvas.toDataURL({ format: 'jpeg', quality: 0.7, multiplier: 0.3 });
  }, []);

  const loadFromJSON = useCallback((json: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(JSON.parse(json)).then(() => canvas.renderAll());
  }, []);

  const changeZoom = useCallback((newZoom: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setZoom(newZoom);
    canvas.setDimensions({ width: CANVAS_WIDTH * newZoom, height: CANVAS_HEIGHT * newZoom });
    canvas.setZoom(newZoom);
    canvas.renderAll();
  }, []);

  return {
    canvas: fabricRef.current,
    selected,
    zoom,
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
    changeZoom,
  };
}
