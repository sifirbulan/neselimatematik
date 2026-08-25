import React, { useRef, useState } from "react";

type Crop = { x: number; y: number; width: number; height: number };
type Mode = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type DragState = { mode: Mode; startX: number; startY: number; crop: Crop } | null;

const MIN_SIZE = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PhotoCropper({ src, onCancel, onApply }: { src: string; onCancel: () => void; onApply: (croppedDataUrl: string) => void }) {
  const [crop, setCrop] = useState<Crop>({ x: 6, y: 6, width: 88, height: 88 });
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);

  function startDrag(event: React.PointerEvent, mode: Mode) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, crop: { ...crop } };
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;
    const original = drag.crop;

    if (drag.mode === "move") {
      setCrop({
        ...original,
        x: clamp(original.x + dx, 0, 100 - original.width),
        y: clamp(original.y + dy, 0, 100 - original.height),
      });
      return;
    }

    let left = original.x;
    let top = original.y;
    let right = original.x + original.width;
    let bottom = original.y + original.height;

    if (drag.mode.includes("w")) left = clamp(original.x + dx, 0, right - MIN_SIZE);
    if (drag.mode.includes("e")) right = clamp(original.x + original.width + dx, left + MIN_SIZE, 100);
    if (drag.mode.includes("n")) top = clamp(original.y + dy, 0, bottom - MIN_SIZE);
    if (drag.mode.includes("s")) bottom = clamp(original.y + original.height + dy, top + MIN_SIZE, 100);

    setCrop({ x: left, y: top, width: right - left, height: bottom - top });
  }

  function stopDrag(event: React.PointerEvent) {
    if (dragRef.current) {
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture already released */ }
    }
    dragRef.current = null;
  }

  async function applyCrop() {
    const image = new Image();
    image.src = src;
    await image.decode();
    const sx = Math.round((crop.x / 100) * image.naturalWidth);
    const sy = Math.round((crop.y / 100) * image.naturalHeight);
    const sw = Math.max(1, Math.round((crop.width / 100) * image.naturalWidth));
    const sh = Math.max(1, Math.round((crop.height / 100) * image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    onApply(canvas.toDataURL("image/jpeg", 0.92));
  }

  const boxStyle = { left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` };

  return (
    <div className="cropOverlay" role="dialog" aria-modal="true" aria-label="Fotoğrafı kırp">
      <div className="cropDialog">
        <div className="cropHeader">
          <strong>Fotoğrafı elinle kırp</strong>
          <span>Beyaz çerçeveyi sürükle; köşe ve kenarlardan tutarak boyutunu değiştir.</span>
        </div>
        <div ref={stageRef} className="cropStage">
          <img src={src} alt="Kırpılacak fotoğraf" draggable={false} />
          <div
            className="cropBox"
            style={boxStyle}
            onPointerDown={(event) => startDrag(event, "move")}
            onPointerMove={onPointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Mode[]).map((mode) => (
              <span
                key={mode}
                className={`cropHandle cropHandle-${mode}`}
                onPointerDown={(event) => startDrag(event, mode)}
                onPointerMove={onPointerMove}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
              />
            ))}
          </div>
        </div>
        <div className="cropHelp">İpucu: Çerçevenin içinden tutarsan alanı taşırsın; beyaz noktaları sürüklersen kırpma alanını büyütüp küçültürsün.</div>
        <div className="cropActions">
          <button type="button" className="secondary" onClick={onCancel}>Vazgeç</button>
          <button type="button" onClick={applyCrop}>✓ Kırpmayı uygula</button>
        </div>
      </div>
    </div>
  );
}
