import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Neş'eli Matematik AI</span>
        <h1>Matematiği sadece çözme.<br />Anla, öğren, geliş.</h1>
        <p>Bir soruyu yükle; yapay zekâ soruyu analiz etsin, çözümü doğrulasın ve sana seviyene uygun şekilde anlatsın.</p>
        <div className="actions">
          <button>📷 Soru Yükle</button>
          <button className="secondary">✏️ Soru Yaz</button>
        </div>
      </section>
      <section className="cards">
        <article><strong>🎯 Soru Çöz</strong><span>Fotoğraf veya metinle sorunu gönder.</span></article>
        <article><strong>💡 İpucu Al</strong><span>Cevabı hemen vermeden adım adım yönlendirelim.</span></article>
        <article><strong>📝 Test Hazırla</strong><span>Konu ve seviyene göre online veya PDF test oluştur.</span></article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
