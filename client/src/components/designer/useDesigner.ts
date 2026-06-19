import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { generateQRDataURL } from '@/lib/qr';
import { WEB_FONTS } from '@/lib/fonts';

export const CANVAS_WIDTH = 794;
export const CANVAS_HEIGHT = 1123;

// Custom object props that must survive toJSON/loadFromJSON (QR + image holders)
const EXTRA_PROPS = ['isQR', 'qrUrl', 'isImageHolder', 'holderW', 'holderH'];
const serialize = (canvas: fabric.Canvas) => JSON.stringify(canvas.toObject(EXTRA_PROPS));

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
  textAlign?: string;
  text?: string;
  opacity: number;
  isQR?: boolean;
  qrUrl?: string;
  isImageHolder?: boolean;
};

const MAX_HISTORY = 50;

// Make a textbox behave like a real text box: only the side handles (ml/mr)
// remain, which change the box WIDTH and re-wrap the text. Corner and
// top/bottom handles are hidden so the glyphs can never be stretched/deformed;
// font size is changed via the panel control instead.
function configureTextbox(t: fabric.Textbox) {
  t.setControlsVisibility({
    mt: false, mb: false, tl: false, tr: false, bl: false, br: false,
  });
}

export function useDesigner(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [selected, setSelected] = useState<SelectedObjectProps | null>(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [multiTextSelected, setMultiTextSelected] = useState(false);
  const [zoom, setZoom] = useState(0.65);
  const [ready, setReady] = useState(false);

  // Undo/redo history
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getProps = useCallback((obj: fabric.Object): SelectedObjectProps => {
    const o = obj as fabric.Object & { isQR?: boolean; qrUrl?: string; isImageHolder?: boolean };
    const base = {
      type: obj.type ?? 'object',
      left: Math.round(obj.left ?? 0),
      top: Math.round(obj.top ?? 0),
      width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
      height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
      angle: Math.round(obj.angle ?? 0),
      opacity: obj.opacity ?? 1,
      isQR: o.isQR,
      qrUrl: o.qrUrl,
      isImageHolder: o.isImageHolder,
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
        textAlign: t.textAlign as string,
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
        const json = serialize(canvas);
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

    // Preload the designer web fonts so canvas text renders in the right font
    // from the start. Otherwise a font used only on the canvas loads lazily and
    // the text repaints from a fallback to the real font on the next render —
    // which looks like the font/size changing when you edit something else.
    if (document.fonts?.load) {
      Promise.all(WEB_FONTS.map((f) => document.fonts.load(`20px "${f}"`)))
        .then(() => fabricRef.current?.renderAll())
        .catch(() => {});
    }

    setReady(true);

    const syncSelection = () => {
      const active = canvas.getActiveObject();
      const objs = active?.type === 'activeselection'
        ? (active as fabric.ActiveSelection).getObjects()
        : active ? [active] : [];
      setSelectionCount(objs.length);
      setMultiTextSelected(
        objs.length > 1 && objs.every((o) => o.type === 'textbox' || o.type === 'i-text'),
      );
    };
    const configureSelectedTextboxes = (sel?: fabric.Object[]) => {
      for (const o of sel ?? []) {
        if (o.type === 'textbox') configureTextbox(o as fabric.Textbox);
      }
    };
    // A multi-selection (ActiveSelection) scales its children when dragged,
    // which stretches text. Disable group resizing: in a group you can move,
    // align and match sizes (via the buttons), but not stretch by dragging.
    const lockGroupScaling = () => {
      const active = canvas.getActiveObject();
      if (active?.type === 'activeselection') {
        active.set({ lockScalingX: true, lockScalingY: true });
        active.setControlsVisibility({
          mt: false, mb: false, ml: false, mr: false,
          tl: false, tr: false, bl: false, br: false,
        });
      }
    };
    canvas.on('selection:created', (e) => {
      configureSelectedTextboxes(e.selected);
      lockGroupScaling();
      syncSelection();
      if (e.selected?.[0]) setSelected(getProps(e.selected[0]));
    });
    canvas.on('selection:updated', (e) => {
      configureSelectedTextboxes(e.selected);
      lockGroupScaling();
      syncSelection();
      if (e.selected?.[0]) setSelected(getProps(e.selected[0]));
    });
    canvas.on('selection:cleared', () => { setSelected(null); setSelectionCount(0); setMultiTextSelected(false); });
    canvas.on('object:modified', (e) => {
      if (e.target) setSelected(getProps(e.target));
    });

    // --- Smart guides / snapping ---------------------------------------
    // While moving or resizing a single object, snap its edges/centers to the
    // edges/centers of other objects (and the page), and draw guide lines.
    const SNAP = 7; // threshold in canvas px
    type SnapRect = { left: number; top: number; width: number; height: number };
    type Target = { pos: number; rect: SnapRect | null }; // rect=null for page guides
    let guides: { axis: 'x' | 'y'; pos: number; rect: SnapRect | null }[] = [];
    let dragTarget: fabric.Object | null = null; // object being moved/resized

    const selfEdges = (o: fabric.Object, axis: 'x' | 'y') => {
      const r = o.getBoundingRect();
      return axis === 'x'
        ? [r.left, r.left + r.width / 2, r.left + r.width]
        : [r.top, r.top + r.height / 2, r.top + r.height];
    };

    // Snap targets from every other object (carrying its rect so we can
    // highlight it) plus the page edges/center (rect=null).
    const targetsExcept = (skip: fabric.Object) => {
      const xs: Target[] = [
        { pos: 0, rect: null }, { pos: CANVAS_WIDTH / 2, rect: null }, { pos: CANVAS_WIDTH, rect: null },
      ];
      const ys: Target[] = [
        { pos: 0, rect: null }, { pos: CANVAS_HEIGHT / 2, rect: null }, { pos: CANVAS_HEIGHT, rect: null },
      ];
      for (const o of canvas.getObjects()) {
        if (o === skip) continue;
        const r = o.getBoundingRect();
        const rect: SnapRect = { left: r.left, top: r.top, width: r.width, height: r.height };
        xs.push({ pos: r.left, rect }, { pos: r.left + r.width / 2, rect }, { pos: r.left + r.width, rect });
        ys.push({ pos: r.top, rect }, { pos: r.top + r.height / 2, rect }, { pos: r.top + r.height, rect });
      }
      return { xs, ys };
    };

    const nearest = (val: number, targets: Target[]) => {
      let best: { d: number; t: Target } | null = null;
      for (const t of targets) {
        const d = Math.abs(val - t.pos);
        if (d <= SNAP && (!best || d < best.d)) best = { d, t };
      }
      return best;
    };

    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;
      dragTarget = obj;
      obj.setCoords();
      const { xs, ys } = targetsExcept(obj);
      const oxs = selfEdges(obj, 'x');
      const oys = selfEdges(obj, 'y');
      guides = [];

      let snapX: { d: number; t: Target; ox: number } | null = null;
      for (const ox of oxs) {
        const n = nearest(ox, xs);
        if (n && (!snapX || n.d < snapX.d)) snapX = { ...n, ox };
      }
      if (snapX) {
        obj.set('left', (obj.left ?? 0) + (snapX.t.pos - snapX.ox));
        guides.push({ axis: 'x', pos: snapX.t.pos, rect: snapX.t.rect });
      }

      let snapY: { d: number; t: Target; oy: number } | null = null;
      for (const oy of oys) {
        const n = nearest(oy, ys);
        if (n && (!snapY || n.d < snapY.d)) snapY = { ...n, oy };
      }
      if (snapY) {
        obj.set('top', (obj.top ?? 0) + (snapY.t.pos - snapY.oy));
        guides.push({ axis: 'y', pos: snapY.t.pos, rect: snapY.t.rect });
      }
      obj.setCoords();
    });

    // Fires on corner scaling (images/QR) AND on textbox side-handle resizing
    const onResize = (e: { target?: fabric.Object; transform?: { corner?: string } }) => {
      const obj = e.target;
      if (!obj || (obj.angle ?? 0) !== 0) return; // skip rotated objects
      dragTarget = obj;
      obj.setCoords();
      const corner = (e.transform?.corner ?? (obj as unknown as { __corner?: string }).__corner ?? '') as string;
      if (!corner) return;
      const r = obj.getBoundingRect();
      const { xs, ys } = targetsExcept(obj);
      const isText = obj.type === 'textbox';
      guides = [];

      // Horizontal edges (left/right)
      if (corner.includes('r')) {
        const n = nearest(r.left + r.width, xs);
        if (n) {
          const targetW = n.t.pos - r.left;
          if (targetW > 5) {
            if (isText) obj.set('width', targetW / (obj.scaleX || 1));
            else obj.set('scaleX', targetW / (obj.width || 1));
            guides.push({ axis: 'x', pos: n.t.pos, rect: n.t.rect });
          }
        }
      } else if (corner.includes('l')) {
        const n = nearest(r.left, xs);
        if (n) {
          const targetW = r.left + r.width - n.t.pos;
          if (targetW > 5) {
            if (isText) obj.set('width', targetW / (obj.scaleX || 1));
            else obj.set('scaleX', targetW / (obj.width || 1));
            obj.set('left', n.t.pos);
            guides.push({ axis: 'x', pos: n.t.pos, rect: n.t.rect });
          }
        }
      }

      // Vertical edges (top/bottom) — not for text (height is content-driven)
      if (!isText) {
        if (corner.includes('b')) {
          const n = nearest(r.top + r.height, ys);
          if (n) {
            const targetH = n.t.pos - r.top;
            if (targetH > 5) { obj.set('scaleY', targetH / (obj.height || 1)); guides.push({ axis: 'y', pos: n.t.pos, rect: n.t.rect }); }
          }
        } else if (corner.includes('t')) {
          const n = nearest(r.top, ys);
          if (n) {
            const targetH = r.top + r.height - n.t.pos;
            if (targetH > 5) { obj.set('scaleY', targetH / (obj.height || 1)); obj.set('top', n.t.pos); guides.push({ axis: 'y', pos: n.t.pos, rect: n.t.rect }); }
          }
        }
      }
      obj.setCoords();
    };
    canvas.on('object:scaling', onResize);
    canvas.on('object:resizing', onResize);

    canvas.on('after:render', () => {
      if (!dragTarget) return;
      const ctx = canvas.getContext();
      ctx.save();

      // Faint outline on every OTHER element, so you see all alignment options
      ctx.strokeStyle = 'rgba(148,163,184,0.7)'; // soft gray
      ctx.lineWidth = 1;
      for (const o of canvas.getObjects()) {
        if (o === dragTarget) continue;
        const r = o.getBoundingRect();
        ctx.strokeRect(r.left, r.top, r.width, r.height);
      }

      // Strong gold highlight on the element(s) we're actually aligning to
      ctx.strokeStyle = '#C4973A';
      ctx.lineWidth = 2;
      const drawn = new Set<string>();
      for (const g of guides) {
        if (!g.rect) continue;
        const key = `${g.rect.left},${g.rect.top},${g.rect.width},${g.rect.height}`;
        if (drawn.has(key)) continue;
        drawn.add(key);
        ctx.strokeRect(g.rect.left, g.rect.top, g.rect.width, g.rect.height);
      }

      // Gold guide lines spanning the page at the snap positions
      ctx.lineWidth = 1;
      for (const g of guides) {
        ctx.beginPath();
        if (g.axis === 'x') { ctx.moveTo(g.pos, 0); ctx.lineTo(g.pos, CANVAS_HEIGHT); }
        else { ctx.moveTo(0, g.pos); ctx.lineTo(CANVAS_WIDTH, g.pos); }
        ctx.stroke();
      }
      ctx.restore();
    });

    canvas.on('mouse:up', () => {
      if (dragTarget || guides.length) { dragTarget = null; guides = []; canvas.requestRenderAll(); }
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
    configureTextbox(t);
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
      // Tag as QR + remember its URL so it can be regenerated later
      Object.assign(img, { isQR: true, qrUrl: url });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  }, []);

  // Regenerate the selected QR with a new URL, keeping its position/size/angle
  const regenerateQR = useCallback(async (url: string) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject() as (fabric.Image & { isQR?: boolean; qrUrl?: string }) | undefined;
    if (!canvas || !obj || !obj.isQR) return;
    const dataURL = await generateQRDataURL(url, 400);
    await obj.setSrc(dataURL);
    obj.qrUrl = url;
    obj.setCoords();
    canvas.renderAll();
    setSelected(getProps(obj));
    canvas.fire('object:modified');
  }, [getProps]);

  const addImageFromURL = useCallback((dataURL: string, opts?: Partial<fabric.Image>) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    fabric.Image.fromURL(dataURL).then((img) => {
      img.set({ left: 0, top: 0, selectable: true, ...opts });
      canvas.add(img);
      canvas.renderAll();
    });
  }, []);

  // Add an empty image placeholder (a styled, dashed box) that can be selected
  // and filled with an image later. Tagged isImageHolder + holderW/holderH.
  const addImagePlaceholder = useCallback((w = 320, h = 320) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const left = (CANVAS_WIDTH - w) / 2;
    const top = (CANVAS_HEIGHT - h) / 2;
    const rect = new fabric.Rect({
      width: w, height: h, fill: '#f1f3f5', stroke: '#c4973a',
      strokeDashArray: [8, 6], strokeWidth: 2, rx: 10, ry: 10,
      originX: 'left', originY: 'top',
    });
    const label = new fabric.Textbox('🖼️  Imagen', {
      width: w, fontSize: 22, fill: '#9aa0a6', fontFamily: 'Inter',
      textAlign: 'center', originX: 'center', originY: 'center',
      left: w / 2, top: h / 2,
    });
    const group = new fabric.Group([rect, label], { left, top });
    Object.assign(group, { isImageHolder: true, holderW: w, holderH: h });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, []);

  // Replace the selected image holder (empty placeholder or already-filled
  // image) with a new image. mode 'fit' scales it to fit the holder frame
  // (keeping aspect, centered); 'real' places it at its natural size.
  const replaceHolderImage = useCallback((dataURL: string, mode: 'fit' | 'real') => {
    const canvas = fabricRef.current;
    const holder = canvas?.getActiveObject() as
      (fabric.Object & { isImageHolder?: boolean; isQR?: boolean; holderW?: number; holderH?: number }) | undefined;
    // Allow replacing image placeholders AND any plain image (but not QRs)
    const canReplace = !!holder && (holder.isImageHolder || (holder.type === 'image' && !holder.isQR));
    if (!canvas || !holder || !canReplace) return;
    // Use the holder's bounding rect (absolute canvas coords) so this works
    // regardless of its origin — groups are positioned by their center.
    holder.setCoords();
    const r = holder.getBoundingRect();
    const frameLeft = r.left;
    const frameTop = r.top;
    const frameW = r.width;
    const frameH = r.height;

    fabric.Image.fromURL(dataURL).then((img) => {
      const iw = img.width ?? 1;
      const ih = img.height ?? 1;
      // fit: scale to fit inside the frame (keep aspect); real: natural size.
      // Either way, center it within the frame so it lands where the holder was.
      const scale = mode === 'fit' ? Math.min(frameW / iw, frameH / ih) : 1;
      img.set({
        originX: 'left', originY: 'top', angle: 0,
        scaleX: scale, scaleY: scale,
        left: frameLeft + (frameW - iw * scale) / 2,
        top: frameTop + (frameH - ih * scale) / 2,
      });
      Object.assign(img, { isImageHolder: true });
      canvas.remove(holder);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      canvas.fire('object:modified');
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

  // Opacity of the background image (0–1). No effect when there's no image.
  const setBackgroundOpacity = useCallback((opacity: number) => {
    const canvas = fabricRef.current;
    if (!canvas?.backgroundImage) return;
    canvas.backgroundImage.set({ opacity });
    canvas.renderAll();
  }, []);

  const getBackgroundOpacity = useCallback((): number => {
    const img = fabricRef.current?.backgroundImage;
    return img ? (img.opacity ?? 1) : 1;
  }, []);

  // Distinct text colors already used in the design (for a quick-pick palette)
  const getUsedTextColors = useCallback((): string[] => {
    const canvas = fabricRef.current;
    if (!canvas) return [];
    const colors = new Set<string>();
    for (const o of canvas.getObjects()) {
      if ((o.type === 'textbox' || o.type === 'i-text')) {
        const fill = (o as fabric.Textbox).fill;
        if (typeof fill === 'string') colors.add(fill);
      }
    }
    return [...colors];
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
    if (props.textAlign !== undefined) (obj as fabric.Textbox).set('textAlign', props.textAlign);
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

  // Align the currently multi-selected objects relative to their combined
  // bounding box. Works for any origin/rotation because each object is moved
  // by the delta between its current bounding rect and the target edge.
  type AlignMode = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
  const alignObjects = useCallback((mode: AlignMode) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || active?.type !== 'activeselection') return;
    const objs = [...(active as fabric.ActiveSelection).getObjects()];
    if (objs.length < 2) return;

    // Drop the selection so each object reports absolute canvas coordinates
    canvas.discardActiveObject();
    const rects = objs.map((o) => ({ o, r: o.getBoundingRect() }));
    const minLeft = Math.min(...rects.map((x) => x.r.left));
    const maxRight = Math.max(...rects.map((x) => x.r.left + x.r.width));
    const minTop = Math.min(...rects.map((x) => x.r.top));
    const maxBottom = Math.max(...rects.map((x) => x.r.top + x.r.height));
    const cx = (minLeft + maxRight) / 2;
    const cy = (minTop + maxBottom) / 2;

    for (const { o, r } of rects) {
      let dx = 0;
      let dy = 0;
      if (mode === 'left') dx = minLeft - r.left;
      else if (mode === 'center-h') dx = cx - r.width / 2 - r.left;
      else if (mode === 'right') dx = maxRight - r.width - r.left;
      else if (mode === 'top') dy = minTop - r.top;
      else if (mode === 'center-v') dy = cy - r.height / 2 - r.top;
      else if (mode === 'bottom') dy = maxBottom - r.height - r.top;
      o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
      o.setCoords();
    }

    // Re-select the same objects so the user keeps the multi-selection
    const sel = new fabric.ActiveSelection(objs, { canvas });
    canvas.setActiveObject(sel);
    canvas.requestRenderAll();
    canvas.fire('object:modified'); // record one history step
  }, []);

  // Apply text-style props to every text object in the current multi-selection
  const updateSelectedTexts = useCallback((props: Partial<SelectedObjectProps>) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || active?.type !== 'activeselection') return;
    const texts = (active as fabric.ActiveSelection)
      .getObjects()
      .filter((o) => o.type === 'textbox' || o.type === 'i-text') as fabric.Textbox[];
    if (texts.length === 0) return;

    for (const t of texts) {
      if (props.fontSize !== undefined) t.set('fontSize', props.fontSize);
      if (props.fontFamily !== undefined) {
        t.set('fontFamily', props.fontFamily);
        if (document.fonts?.load) {
          document.fonts.load(`32px "${props.fontFamily}"`).then(() => canvas.renderAll()).catch(() => {});
        }
      }
      if (props.fill !== undefined) t.set('fill', props.fill);
      if (props.fontWeight !== undefined) t.set('fontWeight', props.fontWeight as 'normal' | 'bold');
      if (props.fontStyle !== undefined) t.set('fontStyle', props.fontStyle as 'normal' | 'italic');
      if (props.textAlign !== undefined) t.set('textAlign', props.textAlign);
    }
    canvas.renderAll();
    // Reflect the change on the panel (values come from the first selected text)
    setSelected((prev) => (prev ? { ...prev, ...props } : prev));
    canvas.fire('object:modified');
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
    const c = fabricRef.current;
    return c ? serialize(c) : '{}';
  }, []);

  const toDataURL = useCallback(() => {
    // JPEG at multiplier 3 (≈ 285 dpi): embeds directly into the PDF (no slow
    // deflate of a huge PNG). Same resolution, crisp print quality.
    return fabricRef.current?.toDataURL({ format: 'jpeg', quality: 0.95, multiplier: 3 }) ?? '';
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
      // Apply the non-deforming text behaviour to loaded textboxes too
      for (const o of canvas.getObjects()) {
        if (o.type === 'textbox') configureTextbox(o as fabric.Textbox);
      }
      canvas.renderAll();
      // Web fonts in the saved design may not be ready yet — repaint once loaded
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => canvas.renderAll()).catch(() => {});
      }
      const snapshot = serialize(canvas);
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
    selectionCount,
    multiTextSelected,
    alignObjects,
    updateSelectedTexts,
    zoom,
    canUndo,
    canRedo,
    addText,
    addQR,
    regenerateQR,
    addImageFromURL,
    addImagePlaceholder,
    replaceHolderImage,
    setBackground,
    setBackgroundColor,
    setBackgroundOpacity,
    getBackgroundOpacity,
    getUsedTextColors,
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
