import React, { useMemo, useState } from "react";

type Crop = { x: number; y: number; width: number; height: number };

export function PhotoCropper({ src, onCancel, onApply }: { src: string; onCancel: () => void; onApply: (croppedDataUrl: string) => void }) {
  const [crop, setCrop] = useState<Crop>({ x: 5, y: 5, width: 90, height: 90 });
  const rightLimit = useMemo(() => 100 - crop.width, [crop.width]);
  const bottomLimit = useMemo(() => 100 - crop.height, [crop.height]);

  function update<K extends keyof Crop>(key: K, value: number) {
    setCrop((current) => {
      const next = { ...current, [key]: value };
      if (key === "width" && next.x + next.width > 100) next.x = 100 - next.width;
      if (key === "height" && next.y + next.height > 100) next.y = 100 - next.height;
      if (key === "x") next.x = Math.min(next.x, 100 - next.width);
      if (key === "y") next.y = Math.min(next.y, 100 - next.height);
      return next;
    });
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

  return (
    <div className="cropOverlay" role="dialog" aria-modal="true" aria-label="Fotoğrafı kırp">
      <div className="cropDialog">
        <div className="cropHeader"><strong>Fotoğrafı kırp</strong><span>Sorunun olduğu alanı bırakın.</span></div>
        <div className="cropStage">
          <img src={src} alt="Kırpılacak fotoğraf" />
          <div className="cropBox" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }} />
        </div>
        <div className="cropControls">
          <label>Sol <input type="range" min="0" max={rightLimit} value={crop.x} onChange={(e) => update("x", Number(e.target.value))} /></label>
          <label>Üst <input type="range" min="0" max={bottomLimit} value={crop.y} onChange={(e) => update("y", Number(e.target.value))} /></label>
          <label>Genişlik <input type="range" min="20" max="100" value={crop.width} onChange={(e) => update("width", Number(e.target.value))} /></label>
          <label>Yükseklik <input type="range" min="20" max="100" value={crop.height} onChange={(e) => update("height", Number(e.target.value))} /></label>
        </div>
        <div className="cropActions">
          <button type="button" className="secondary" onClick={onCancel}>Vazgeç</button>
          <button type="button" onClick={applyCrop}>✓ Kırpmayı uygula</button>
        </div>
      </div>
    </div>
  );
}
