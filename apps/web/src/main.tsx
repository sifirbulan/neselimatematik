import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PhotoCropper, type Crop } from "./PhotoCropper";
import { SolutionResult } from "./SolutionResult";
import type { SolveResponse } from "./types";
import "./styles.css";

const configuredApiUrl = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
const API_URL = !configuredApiUrl || configuredApiUrl === "https://nesevren-api.onrender.com" ? "https://nesevren-api-v2.onrender.com" : configuredApiUrl;

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
  const questionInput = useRef<HTMLTextAreaElement>(null);

  async function submitQuestion() {
    const value = question.trim();
    if (!value && !photoPreview) { setError("Lütfen matematik sorunuzu yazın veya bir soru fotoğrafı seçin."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const isImageQuestion = Boolean(photoPreview);
      const response = await fetch(`${API_URL}/api/v1/questions/analyze`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({question:value,inputType:isImageQuestion?"image":"text",intent:"solve",...(isImageQuestion?{imageDataUrl:photoPreview}:{})}) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? `Soru çözme servisi ${response.status} hatası döndürdü.`);
      setResult(data as SolveResponse);
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Neşevren API servisine bağlantı kurulamadı. Lütfen biraz sonra tekrar deneyin." : requestError instanceof Error ? requestError.message : "Beklenmeyen bir hata oluştu.");
    } finally { setLoading(false); }
  }

  function choosePhoto(){ photoInput.current?.click(); }
  function onPhotoChange(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]; if(!file)return;
    if(!file.type.startsWith("image/")){setError("Lütfen galeriden veya dosyalardan bir fotoğraf seçin.");return;}
    if(file.size>8*1024*1024){setError("Fotoğraf en fazla 8 MB olabilir.");return;}
    if(originalPhoto.startsWith("blob:"))URL.revokeObjectURL(originalPhoto);
    const objectUrl=URL.createObjectURL(file); setPhotoName(file.name); setOriginalPhoto(objectUrl); setCropSource(objectUrl); setLastCrop(undefined); setPhotoPreview(""); setResult(null); setError(""); event.target.value="";
  }
  function applyCrop(dataUrl:string,crop:Crop){setPhotoPreview(dataUrl);setLastCrop(crop);setCropSource("");setError("");}
  function editCropAgain(){if(originalPhoto)setCropSource(originalPhoto);}

  return <main className="shell appShell">
    <section className="hero appHero">
      <header className="appTopbar"><div className="brandMark"><span className="brandOrb">N</span><div><strong>Neş'eli Matematik</strong><small>Neşevren • Matematik Asistanı</small></div></div><span className="aiStatus">● AI hazır</span></header>
      <div className="welcome"><span className="eyebrow">NEŞEVREN</span><h1>Bugün hangi soruyu<br/>çözelim?</h1><p>Fotoğrafını çek, sorunu yaz veya sesli anlat. Neşevren sana sadece cevabı değil, çözüm yolunu da anlatsın.</p></div>

      <div className="quickActions">
        <button className="quickAction primaryQuick" onClick={choosePhoto}><span>📷</span><strong>Fotoğrafla Sor</strong><small>Soruyu çek veya galeriden seç</small></button>
        <button className="quickAction" onClick={()=>questionInput.current?.focus()}><span>✍️</span><strong>Soruyu Yaz</strong><small>Matematik sorunu metin olarak gir</small></button>
        <button className="quickAction" disabled><span>🎙️</span><strong>Sesli Sor</strong><small>Yakında</small></button>
      </div>

      <div className="questionBox modernQuestionBox">
        <div className="composerTitle"><strong>✦ Neşevren'e sor</strong><span>Matematik</span></div>
        <textarea ref={questionInput} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Sorunu buraya yazabilirsin..." rows={4}/>
        {photoPreview&&<div className="photoPreview"><img src={photoPreview} alt="Kırpılmış soru fotoğrafı"/><div className="photoPreviewFooter"><span>{photoName}</span><button type="button" className="secondary" onClick={editCropAgain}>✂️ Kırpmayı düzenle</button></div></div>}
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={onPhotoChange} style={{display:"none"}}/>
        <div className="composerActions"><button className="attachButton" type="button" onClick={choosePhoto}>＋ Fotoğraf ekle</button><button className="solveButton" type="button" onClick={submitQuestion} disabled={loading}>{loading?"Neşevren düşünüyor…":"Soruyu Çöz →"}</button></div>
      </div>
      {loading&&<div className="thinking"><span>✦</span><div><strong>Neşevren düşünüyor…</strong><small>Soruyu analiz edip en uygun çözüm yolunu hazırlıyor.</small></div></div>}
      {error&&<div className="errorBox">{error}</div>}
      {result&&<SolutionResult result={result}/>} 
    </section>

    <section className="cards featureCards"><article><span className="featureIcon">💡</span><strong>İpucu Al</strong><span>Cevabı görmeden doğru adıma yönel.</span></article><article><span className="featureIcon">📝</span><strong>Benzer Soru</strong><span>Öğrendiğini yeni bir soruyla pekiştir.</span></article><article><span className="featureIcon">✓</span><strong>Doğrula</strong><span>Çözümünü matematiksel olarak kontrol et.</span></article></section>

    <nav className="bottomNav"><button className="active">⌂<small>Ana Sayfa</small></button><button onClick={choosePhoto}>▣<small>Soru Sor</small></button><button disabled>▤<small>Dersler</small></button><button disabled>○<small>Profil</small></button></nav>
    {cropSource&&<PhotoCropper src={cropSource} initialCrop={lastCrop} onCancel={()=>setCropSource("")} onApply={applyCrop}/>} 
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
