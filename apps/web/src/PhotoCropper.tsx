import React, { useEffect, useRef, useState } from "react";

export type Crop = { x: number; y: number; width: number; height: number };
type Mode = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type DragState = { mode: Mode; startX: number; startY: number; crop: Crop } | null;

const MIN_SIZE = 12;
const DEFAULT_CROP: Crop = { x: 6, y: 6, width: 88, height: 88 };

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

export function PhotoCropper({ src, initialCrop, onCancel, onApply }: { src: string; initialCrop?: Crop; onCancel: () => void; onApply: (croppedDataUrl: string, crop: Crop) => void; }) {
  const [crop, setCrop] = useState<Crop>(initialCrop ?? DEFAULT_CROP);
  const [previewUrl, setPreviewUrl] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image(); image.src = src;
    image.decode().then(() => {
      if (cancelled) return;
      const sx = Math.round((crop.x / 100) * image.naturalWidth), sy = Math.round((crop.y / 100) * image.naturalHeight);
      const sw = Math.max(1, Math.round((crop.width / 100) * image.naturalWidth)), sh = Math.max(1, Math.round((crop.height / 100) * image.naturalHeight));
      const canvas = document.createElement("canvas"); const scale = Math.min(1, 900 / sw);
      canvas.width = Math.max(1, Math.round(sw * scale)); canvas.height = Math.max(1, Math.round(sh * scale));
      const context = canvas.getContext("2d"); if (!context) return;
      context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [src, crop]);

  function startDrag(event: React.PointerEvent, mode: Mode) {
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, crop: { ...crop } };
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current, frame = frameRef.current; if (!drag || !frame) return;
    const rect = frame.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const dx = ((event.clientX - drag.startX) / rect.width) * 100, dy = ((event.clientY - drag.startY) / rect.height) * 100, original = drag.crop;
    if (drag.mode === "move") { setCrop({ ...original, x: clamp(original.x + dx, 0, 100 - original.width), y: clamp(original.y + dy, 0, 100 - original.height) }); return; }
    let left = original.x, top = original.y, right = original.x + original.width, bottom = original.y + original.height;
    if (drag.mode.includes("w")) left = clamp(original.x + dx, 0, right - MIN_SIZE);
    if (drag.mode.includes("e")) right = clamp(original.x + original.width + dx, left + MIN_SIZE, 100);
    if (drag.mode.includes("n")) top = clamp(original.y + dy, 0, bottom - MIN_SIZE);
    if (drag.mode.includes("s")) bottom = clamp(original.y + original.height + dy, top + MIN_SIZE, 100);
    setCrop({ x: left, y: top, width: right - left, height: bottom - top });
  }

  function stopDrag(event: React.PointerEvent) { if (dragRef.current) { try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {} } dragRef.current = null; }

  async function applyCrop() {
    const image = new Image(); image.src = src; await image.decode();
    const sx = Math.round((crop.x / 100) * image.naturalWidth), sy = Math.round((crop.y / 100) * image.naturalHeight);
    const sw = Math.max(1, Math.round((crop.width / 100) * image.naturalWidth)), sh = Math.max(1, Math.round((crop.height / 100) * image.naturalHeight));
    const canvas = document.createElement("canvas"); canvas.width = sw; canvas.height = sh;
    const context = canvas.getContext("2d"); if (!context) return;
    context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh); onApply(canvas.toDataURL("image/jpeg", 0.92), crop);
  }

  const boxStyle = { left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` };
  const edges: { mode: Mode; style: React.CSSProperties }[] = [
    { mode: "n", style: { left: 0, right: 0, top: -12, height: 24, cursor: "ns-resize" } },
    { mode: "s", style: { left: 0, right: 0, bottom: -12, height: 24, cursor: "ns-resize" } },
    { mode: "w", style: { top: 0, bottom: 0, left: -12, width: 24, cursor: "ew-resize" } },
    { mode: "e", style: { top: 0, bottom: 0, right: -12, width: 24, cursor: "ew-resize" } },
  ];

  return <div className="cropOverlay" role="dialog" aria-modal="true" aria-label="Fotoğrafı kırp"><div className="cropDialog">
    <div className="cropHeader"><strong>Fotoğrafı elinle kırp</strong><span>Çerçevenin herhangi bir kenarını veya köşesini parmağınla sürükleyebilirsin.</span></div>
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",width:"100%",minHeight:"240px",overflow:"hidden",borderRadius:18,background:"#f7fbfa",padding:"4px"}}>
      <div ref={frameRef} style={{position:"relative",display:"inline-block",maxWidth:"100%",lineHeight:0,touchAction:"none",userSelect:"none"}}>
        <img src={src} alt="Kırpılacak fotoğraf" draggable={false} style={{display:"block",maxWidth:"100%",maxHeight:"58vh",width:"auto",height:"auto",objectFit:"contain",pointerEvents:"none",userSelect:"none"}} />
        <div className="cropBox" style={boxStyle} onPointerDown={(e)=>startDrag(e,"move")} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
          {edges.map(({mode,style})=><span key={`edge-${mode}`} aria-hidden="true" style={{position:"absolute",zIndex:4,touchAction:"none",...style}} onPointerDown={(e)=>startDrag(e,mode)} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}/>)}
          {(["nw","n","ne","e","se","s","sw","w"] as Mode[]).map(mode=><span key={mode} className={`cropHandle cropHandle-${mode}`} onPointerDown={(e)=>startDrag(e,mode)} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}/>) }
        </div>
      </div>
    </div>
    <div className="cropLivePreview"><strong>Kırpınca kalacak bölüm</strong>{previewUrl && <img src={previewUrl} alt="Kırpma sonucu önizlemesi" />}</div>
    <div className="cropHelp">Fotoğraf artık ekranın içine tamamen sığar. Beyaz dikdörtgenin dört çizgisinin herhangi bir yerinden tutup sürükleyebilirsin.</div>
    <div className="cropActions"><button type="button" className="secondary" onClick={onCancel}>Vazgeç</button><button type="button" onClick={applyCrop}>✓ Kırpmayı uygula</button></div>
  </div></div>;
}
