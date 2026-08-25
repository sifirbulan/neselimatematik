import React, { useRef, useState } from "react";

export type Crop = { x: number; y: number; width: number; height: number };
type Mode = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type DragState = { mode: Mode; startX: number; startY: number; crop: Crop } | null;

const MIN_SIZE = 12;
const DEFAULT_CROP: Crop = { x: 8, y: 8, width: 84, height: 84 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PhotoCropper({
  src,
  initialCrop,
  onCancel,
  onApply,
}: {
  src: string;
  initialCrop?: Crop;
  onCancel: () => void;
  onApply: (croppedDataUrl: string, crop: Crop) => void;
}) {
  const [crop, setCrop] = useState<Crop>(initialCrop ?? DEFAULT_CROP);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);

  function startDrag(event: React.PointerEvent, mode: Mode) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      crop: { ...crop },
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;

    const rect = frame.getBoundingClientRect();
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
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
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
    onApply(canvas.toDataURL("image/jpeg", 0.92), crop);
  }

  const boxStyle = {
    left: `${crop.x}%`,
    top: `${crop.y}%`,
    width: `${crop.width}%`,
    height: `${crop.height}%`,
  };

  const edges: { mode: Mode; className: string }[] = [
    { mode: "n", className: "cropEdge cropEdge-n" },
    { mode: "s", className: "cropEdge cropEdge-s" },
    { mode: "w", className: "cropEdge cropEdge-w" },
    { mode: "e", className: "cropEdge cropEdge-e" },
  ];

  const corners: Mode[] = ["nw", "ne", "se", "sw"];

  return (
    <div className="cropOverlay" role="dialog" aria-modal="true" aria-label="Fotoğrafı kırp">
      <div className="cropDialog cropDialogLens">
        <div className="cropTopbar">
          <button type="button" className="cropIconButton" onClick={onCancel} aria-label="Geri">←</button>
          <div>
            <strong>Soruyu seç</strong>
            <span>Çerçeveyi sorunun etrafına getir</span>
          </div>
          <button type="button" className="cropDoneButton" onClick={applyCrop}>Tamam</button>
        </div>

        <div className="cropViewport">
          <div ref={frameRef} className="cropImageFrame">
            <img src={src} alt="Kırpılacak fotoğraf" draggable={false} />

            <div
              className="cropBox cropBoxLens"
              style={boxStyle}
              onPointerDown={(event) => startDrag(event, "move")}
              onPointerMove={onPointerMove}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
            >
              {edges.map(({ mode, className }) => (
                <span
                  key={mode}
                  className={className}
                  aria-hidden="true"
                  onPointerDown={(event) => startDrag(event, mode)}
                  onPointerMove={onPointerMove}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                />
              ))}

              {corners.map((mode) => (
                <span
                  key={mode}
                  className={`cropCorner cropCorner-${mode}`}
                  aria-hidden="true"
                  onPointerDown={(event) => startDrag(event, mode)}
                  onPointerMove={onPointerMove}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="cropBottomSheet">
          <div className="cropGrabber" />
          <strong>Seçili alan</strong>
          <span>Köşelerden veya kenarlardan sürükle. Çerçevenin içinden tutarak alanı taşıyabilirsin.</span>
          <button type="button" onClick={applyCrop}>✓ Bu alanı kullan</button>
        </div>
      </div>
    </div>
  );
}
