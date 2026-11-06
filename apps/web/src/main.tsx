import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Stage = 'preschool' | 'primary' | 'middle' | 'high' | 'university';
type Answer = { status?: string; answer?: string; explanation?: string; steps?: string[]; verified?: boolean; notice?: string; review?: { status?: string; findings?: string[] }; message?: string; error?: string };
const API = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'https://nesevren-api-v2.onrender.com';

async function postJson(path: string, data: Record<string, unknown>): Promise<Answer & { question?: string }> {
  const response = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const payload = await response.json() as Answer & { question?: string };
  if (!response.ok) throw new Error(payload.error || payload.message || 'İşlem tamamlanamadı.');
  return payload;
}

function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('middle');
  const [grade, setGrade] = useState(7);
  const [department, setDepartment] = useState('');
  const [subjectId, setSubjectId] = useState('mathematics');
  const [question, setQuestion] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function resetAnswer() { setAnswer(null); setError(''); }
  function changeStage(next: Stage) {
    setStage(next); setSubjectId(''); resetAnswer(); setNeedsConfirmation(false);
    setGrade(next === 'primary' ? 1 : next === 'middle' ? 5 : next === 'high' ? 9 : 1);
  }
  async function uploadPhoto(file?: File) {
    if (!file) return;
    resetAnswer();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('PNG, JPEG veya WebP fotoğraf seçin.'); return; }
    if (file.size > 6_000_000) { setError('Fotoğraf 6 MB sınırını aşıyor.'); return; }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Fotoğraf okunamadı.'));
        reader.readAsDataURL(file);
      });
      setPhotoPreview(dataUrl);
      const result = await postJson('/api/v1/questions/photo/transcribe', { imageDataUrl: dataUrl });
      setQuestion(result.question || '');
      setNeedsConfirmation(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Fotoğraf işlenemedi.'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  async function solve() {
    resetAnswer();
    if (!question.trim()) { setError('Önce bir soru yazın veya fotoğraf yükleyin.'); return; }
    if (!subjectId) { setError('Lütfen ders seçin.'); return; }
    if (stage === 'university' && !department.trim()) { setError('Üniversite bölümünü yazın.'); return; }
    setBusy(true);
    try {
      const result = await postJson('/api/v1/ai/answer', {
        question: question.trim(), stage, ...(stage === 'primary' || stage === 'middle' || stage === 'high' ? { grade } : {}),
        ...(stage === 'university' ? { department: department.trim() } : {}), subjectId, explanationLevel: 'detailed',
      });
      setAnswer(result); setNeedsConfirmation(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Çözüm alınamadı.'); }
    finally { setBusy(false); }
  }

  const subjects: Record<Stage, { id: string; title: string }[]> = {
    preschool: [{ id: 'early-math', title: 'Sayılar ve Matematik' }, { id: 'early-language', title: 'Dil ve İletişim' }, { id: 'early-discovery', title: 'Keşif ve Dikkat' }],
    primary: [{ id: 'mathematics', title: 'Matematik' }, { id: 'turkish', title: 'Türkçe' }, { id: 'science', title: 'Fen Bilimleri' }, { id: 'social-studies', title: 'Sosyal Bilgiler' }, { id: 'english', title: 'İngilizce' }],
    middle: [{ id: 'mathematics', title: 'Matematik' }, { id: 'turkish', title: 'Türkçe' }, { id: 'science', title: 'Fen Bilimleri' }, { id: 'social-studies', title: 'Sosyal Bilgiler' }, { id: 'english', title: 'İngilizce' }],
    high: [{ id: 'mathematics', title: 'Matematik' }, { id: 'physics', title: 'Fizik' }, { id: 'chemistry', title: 'Kimya' }, { id: 'biology', title: 'Biyoloji' }, { id: 'literature', title: 'Edebiyat' }, { id: 'history', title: 'Tarih' }, { id: 'geography', title: 'Coğrafya' }, { id: 'english', title: 'İngilizce' }],
    university: [{ id: 'mathematics', title: 'Matematik' }, { id: 'physics', title: 'Fizik' }, { id: 'chemistry', title: 'Kimya' }, { id: 'biology', title: 'Biyoloji' }, { id: 'history', title: 'Tarih' }, { id: 'english', title: 'İngilizce' }],
  };
  const universityExtras: Record<string, { id: string; title: string }[]> = {
    medicine: [{ id: 'anatomy', title: 'Anatomi' }, { id: 'physiology', title: 'Fizyoloji' }],
    law: [{ id: 'law', title: 'Hukuka Giriş' }],
    'computer-engineering': [{ id: 'programming', title: 'Programlama' }, { id: 'algorithms', title: 'Algoritmalar' }],
    'software-engineering': [{ id: 'programming', title: 'Programlama' }, { id: 'algorithms', title: 'Algoritmalar' }],
  };
  const available = [...subjects[stage], ...(stage === 'university' ? universityExtras[department.trim().toLowerCase()] || [] : [])];
  const range = stage === 'primary' ? [1, 2, 3, 4] : stage === 'middle' ? [5, 6, 7, 8] : stage === 'high' ? [9, 10, 11, 12] : [];

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">NEŞEVREN • NEŞ AI</span>
        <h1>Neşeyle öğren,<br />evrende iz bırak.</h1>
        <p>Ana sınıfından üniversiteye: Sorunu fotoğrafla gönder veya yaz. Neş AI seviyene göre anlatsın.</p>
        <div className="actions">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>📷 Soru Yükle</button>
          <button type="button" className="secondary" onClick={() => document.getElementById('question-text')?.focus()}>✏️ Soru Yaz</button>
        </div>
      </section>
      <section className="question-panel" aria-label="Neş AI soru çözme">
        <h2>✨ Neş AI ile soru çöz</h2>
        <div className="field-grid">
          <label>Eğitim aşaması
            <select value={stage} onChange={(e) => changeStage(e.target.value as Stage)}>
              <option value="preschool">Ana sınıfı</option><option value="primary">İlkokul</option><option value="middle">Ortaokul</option><option value="high">Lise</option><option value="university">Üniversite</option>
            </select>
          </label>
          {range.length > 0 && <label>Sınıf
            <select value={grade} onChange={(e) => { setGrade(Number(e.target.value)); resetAnswer(); }}>{range.map((g) => <option key={g} value={g}>{g}. sınıf</option>)}</select>
          </label>}
          {stage === 'university' && <label>Bölüm kodu
            <input value={department} onChange={(e) => { setDepartment(e.target.value); setSubjectId(''); resetAnswer(); }} placeholder="medicine, law, computer-engineering..." />
          </label>}
          <label>Ders
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); resetAnswer(); }}>
              <option value="">Ders seçin</option>{available.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="visually-hidden" aria-label="Fotoğraf seç" onChange={(e) => void uploadPhoto(e.target.files?.[0])} />
        {photoPreview && <div className="photo-box"><img src={photoPreview} alt="Yüklediğiniz soru fotoğrafı" /><button type="button" className="secondary" onClick={() => { setPhotoPreview(''); setNeedsConfirmation(false); }}>Fotoğrafı kaldır</button></div>}
        <label className="question-label" htmlFor="question-text">Sorun
          <textarea id="question-text" rows={4} maxLength={12000} value={question} onChange={(e) => { setQuestion(e.target.value); resetAnswer(); }} placeholder="Örnek: 2x + 3 = x + 7" />
        </label>
        {needsConfirmation && <p className="confirmation" role="status">🔎 Fotoğraftan okunan soruyu kontrol edin. Yanlış sembolleri düzelttikten sonra “Soruyu Onayla ve Çöz” düğmesine basın.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="button" disabled={busy} onClick={() => void solve()}>{busy ? '⏳ İşleniyor...' : needsConfirmation ? '✓ Soruyu Onayla ve Çöz' : '🧠 Neş AI ile Çöz'}</button>
        {answer && <div className="answer-box" aria-live="polite">
          <h3>{answer.verified ? '✅ Doğrulanmış çözüm' : '💡 Neş AI yanıtı'}</h3>
          <p className="answer-text">{answer.answer}</p>
          {answer.explanation && <p>{answer.explanation}</p>}
          {answer.steps && <ol>{answer.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
          {!answer.verified && <p className="confirmation">Bu yanıt bağımsız olarak doğrulanmadı. Önemli bilgiler için öğretmeninle kontrol et.</p>}
          {answer.review?.findings && answer.review.findings.length > 0 && <p>İkinci kontrol: {answer.review.findings.join(' • ')}</p>}
        </div>}
      </section>
      <section className="cards">
        <article><strong>🎯 Soru Çöz</strong><span>Fotoğraf veya metinle sorunu gönder.</span></article>
        <article><strong>💡 İpucu Al</strong><span>Adım adım öğrenme desteği yakında bu ekrana bağlanacak.</span></article>
        <article><strong>📝 Test Hazırla</strong><span>Konu ve seviyene göre test üretme modülü geliştiriliyor.</span></article>
      </section>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
