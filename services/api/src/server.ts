import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ service: 'neseli-matematik-api', status: 'ok' });
});

app.post('/api/v1/questions/analyze', (req, res) => {
  const { question } = req.body ?? {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Soru metni gerekli.' });
  }
  return res.json({
    status: 'accepted',
    message: 'Soru AI Orchestrator kuyruğuna alındı.',
    question,
    next: 'question-analyzer',
  });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API listening on :${port}`));
