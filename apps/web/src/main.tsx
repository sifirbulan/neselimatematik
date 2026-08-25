import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SolutionResult } from "./SolutionResult";
import type { SolveResponse } from "./types";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitQuestion() {
    const value = question.trim();
    if (!value) {
      setError("Lütfen önce matematik sorunuzu yazın.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/questions/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value, inputType: "text", intent: "solve" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "Soru çözülürken bir hata oluştu.");
      setResult(data as SolveResponse);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Neşevren</span>
        <h1>Matematiği sadece çözme.<br />Anla, öğren, geliş.</h1>
        <p>Neşevren sorunu analiz eder, en uygun çalışan yapay zekâya yönlendirir ve mümkün olduğunda sonucu matematiksel olarak doğrular.</p>
        <div className="questionBox">
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Matematik sorunu yaz..." rows={4} />
          <div className="actions">
            <button type="button" onClick={submitQuestion} disabled={loading}>{loading ? "Çözülüyor..." : "🧠 Soruyu Çöz"}</button>
            <button type="button" className="secondary" disabled>📷 Fotoğraf · yakında</button>
            <button type="button" className="secondary" disabled>🎙️ Sesli anlatım · yakında</button>
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
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
