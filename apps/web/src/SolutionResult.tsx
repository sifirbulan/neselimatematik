import { MathRichText, MathVisualization } from "./MathVisual";
import type { SolveResponse } from "./types";

export function SolutionResult({ result }: { result: SolveResponse }) {
  const answer = result.finalAnswer ?? result.answer;
  if (!answer) return null;

  const statusText = answer.verificationStatus === "verified"
    ? "Doğrulandı ✓"
    : result.consensusStatus === "agreement"
      ? "Doğrulandı ✓"
      : "Neşevren çözümü";

  return (
    <section className="solutionCard" aria-live="polite">
      <div className="solutionHeader">
        <div>
          <span className="solutionEyebrow">NEŞEVREN ÇÖZÜMÜ</span>
          <h2><MathRichText text={answer.answer}/></h2>
        </div>
        <span className={`verificationBadge ${answer.verified ? "verified" : "pending"}`}>{statusText}</span>
      </div>
      <MathVisualization spec={answer.visualization}/>
      <div className="solutionBlock"><strong>Açıklama</strong><p><MathRichText text={answer.explanation}/></p></div>
      {answer.steps.length > 0 && <div className="solutionBlock"><strong>Adım adım</strong><ol>{answer.steps.map((step, index) => <li key={`${index}-${step}`}><MathRichText text={step}/></li>)}</ol></div>}
      {answer.hint && <div className="hintBox"><strong>💡 İpucu</strong><p><MathRichText text={answer.hint}/></p></div>}
      <div className="solutionMeta"><span>{result.analysis.topic} · {result.analysis.subtopic}</span><span>Güven: %{Math.round(answer.confidence * 100)}</span></div>
    </section>
  );
}
