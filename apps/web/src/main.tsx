import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Analysis = {
  topic: string;
  subtopic: string;
  exam: string;
  difficulty: string;
  needsVision: boolean;
  needsVerification: boolean;
  confidence: number;
};

type ApiResponse = {
  status: string;
  message: string;
  question: string;
  analysis: Analysis;
  next: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function App() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitQuestion() {
    const value = question.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/questions/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: value, inputType: 'text', intent: 'solve' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? 'Soru analiz edilirken bir hata oluştu.');
      }

      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Neşevren</span>
        <h1>Matematiği sadece çözme.<br />Anla, öğren, geliş.</h1>
        <p>Neşevren sorunu önce analiz eder; ardından en uygun yapay zekâ ve doğrulama katmanlarıyla güvenilir çözüme yönlendirir.</p>

        <div className="questionBox">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Matematik sorunu yaz..."
            rows={4}
          />
          <div className="actions">
            <button type="button" onClick={submitQuestion} disabled={loading}>
              {loading ? 'Analiz ediliyor...' : '🧠 Soruyu Analiz Et'}
            </button>
            <button type="button" className="secondary">📷 Fotoğraf</button>
            <button type="button" className="secondary">🎙️ Sesli Anlatım</button>
          </div>
        </div>

        {error && <div className="errorBox">{error}</div>}

        {result && (
          <div className="resultBox">
            <strong>{result.message}</strong>
            <span>Konu: {result.analysis.topic} / {result.analysis.subtopic}</span>
            <span>Sınav: {result.analysis.exam}</span>
            <span>Zorluk: {result.analysis.difficulty}</span>
            <span>Sonraki aşama: {result.next}</span>
          </div>
        )}
      </section>

      <section className="cards">
        <article><strong>🎯 Soru Çöz</strong><span>Metin veya fotoğrafla sorunu gönder.</span></article>
        <article><strong>💡 İpucu Al</strong><span>Cevabı hemen vermeden adım adım yönlendirme.</span></article>
        <article><strong>📝 Test Hazırla</strong><span>Konu ve seviyene göre online veya PDF test.</span></article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
