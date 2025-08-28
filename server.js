// server.js
import express from 'express';
import cors from 'cors';
import { getCache } from './cache.js';
import { startScheduledJobs } from './cron-jobs.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// A função de requisição agora apenas LÊ o cache.
const handleJogosRequest = async (dia, res) => {
    console.log(`Recebida requisição para os dados cacheados de '${dia}'.`);
    const cachedData = getCache(dia);

    if (cachedData) {
        return res.status(200).json(cachedData);
    }

    // Se o cache ainda não foi criado, pede para o usuário aguardar.
    res.status(503).json({ 
        message: `Os dados para '${dia}' estão sendo preparados. Por favor, tente novamente em um minuto.` 
    });
};

// As rotas não mudam
app.get('/jogos/:dia', (req, res) => {
  handleJogosRequest(req.params.dia, res);
});

app.get('/jogos', (req, res) => {
  handleJogosRequest('hoje', res);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}!`);
  // Inicia o agendador de tarefas
  startScheduledJobs();
});
