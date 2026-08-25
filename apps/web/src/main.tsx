import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PhotoCropper, type Crop } from "./PhotoCropper";
import { SolutionResult } from "./SolutionResult";
import type { SolveResponse } from "./types";
import "./styles.css";

const API_URL = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");

function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [originalPhoto, setOriginalPhoto] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [lastCrop, setLastCrop] = useState<Crop | undefined>();
  const photoInput = useRef<HTMLInputElement>(null);

  async function submitQuestion() {
    const value = question.trim();
    if (!value) {
      setError(photoName ? "Fotoğraf hazır. Görselden soru okuma bağlantısı hazırlanıyor; şimdilik soruyu metin olarak da yazın." : "Lütfen önce matematik sorunuzu yazın.");
      return;
    }
    if (!API_URL) { setError("Neşevren API adresi yapılandırılmamış. Lütfen sistem yöneticisine bildirin."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/questions/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value, inputType: "text", intent: "solve" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? `Soru çözme servisi ${response.status} hatası döndürdü.`);
      setResult(data as SolveResponse);
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Neşevren API servisine bağlantı kurulamadı. Lütfen biraz sonra tekrar deneyin." : requestError instanceof Error ? requestError.message : "Beklenmeyen bir hata oluştu.");
    } finally { setLoading(false); }
  }

  function choosePhoto() { photoInput.current?.click(); }
  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Lütfen galeriden veya dosyalardan bir fotoğraf seçin."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Fotoğraf en fazla 8 MB olabilir."); return; }
    if (originalPhoto.startsWith("blob:")) URL.revokeObjectURL(originalPhoto);
    const objectUrl = URL.createObjectURL(file);
    setPhotoName(file.name);
    setOriginalPhoto(objectUrl);
    setCropSource(objectUrl);
    setLastCrop(undefined);
    setPhotoPreview("");
    setError("");
    event.target.value = "";
  }

  function applyCrop(dataUrl: string, crop: Crop) {
    setPhotoPreview(dataUrl);
    setLastCrop(crop);
    setCropSource("");
  }

  function editCropAgain() {
    if (originalPhoto) setCropSource(originalPhoto);
  }

  return (
    <main className="shell"><section className="hero">
      <span className="eyebrow">Neşevren</span>
      <h1>Matematiği sadece çözme.<br />Anla, öğren, geliş.</h1>
      <p>Neşevren sorunu analiz eder, en uygun çalışan yapay zekâya yönlendirir ve mümkün olduğunda sonucu matematiksel olarak doğrular.</p>
      <div className="questionBox">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Matematik sorunu yaz..." rows={4} />
        {photoPreview && <div className="photoPreview"><img src={photoPreview} alt="Kırpılmış soru fotoğrafı" /><div className="photoPreviewFooter"><span>{photoName}</span><button type="button" className="secondary" onClick={editCropAgain}>✂️ Kırpmayı düzelt / büyüt</button></div></div>}
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={onPhotoChange} style={{display:"none"}} />
        <div className="actions">
          <button type="button" onClick={submitQuestion} disabled={loading}>{loading ? "Çözülüyor..." : "🧠 Soruyu Çöz"}</button>
          <button type="button" className="secondary" onClick={choosePhoto}>📷 Fotoğraf / Galeri</button>
          <button type="button" className="secondary" disabled aria-label="Sesli anlatım">🎙️ Sesli anlatım</button>
        </div>
      </div>
      {error && <div className="errorBox">{error}</div>}
      {result && <SolutionResult result={result} />}
    </section>
    <section className="cards">
      <article><strong>🎯 Soru Çöz</strong><span>Metinle sorunu gönder, çözüm ve doğrulama al.</span></article>
      <article><strong>💡 İpucu Al</strong><span>Cevabı hemen vermeden adım adım yönlendirme altyapısı.</span></article>
      <article><strong>📝 Test Hazırla</strong><span>Konu ve seviyene göre online veya PDF test altyapısı.</span></article>
    </section>
    {cropSource && <PhotoCropper src={cropSource} initialCrop={lastCrop} onCancel={() => setCropSource("")} onApply={applyCrop} />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
