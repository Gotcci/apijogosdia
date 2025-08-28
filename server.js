// server.js
import express from 'express';
import cors from 'cors';
import { getCache } from './cache.js';
import { startScheduledJobs } from './cron-jobs.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

/**
 * Retorna a data formatada como YYYY-MM-DD.
 * @param {Date} date - O objeto de data.
 * @returns {string} - A data formatada.
 */
function getFormattedDate(date) {
    // Ajuste para o fuso horário de São Paulo (UTC-3)
    const offset = -3 * 60;
    const localDate = new Date(date.getTime() + offset * 60 * 1000);
    
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


// A função de requisição agora calcula a data e busca o cache correspondente.
const handleJogosRequest = (dia, res) => {
    const hoje = new Date();
    let dataAlvo;

    switch (dia) {
        case 'ontem':
            const ontem = new Date(hoje);
            ontem.setDate(hoje.getDate() - 1);
            dataAlvo = getFormattedDate(ontem);
            break;
        case 'amanha':
            const amanha = new Date(hoje);
            amanha.setDate(hoje.getDate() + 1);
            dataAlvo = getFormattedDate(amanha);
            break;
        case 'agora':
            dataAlvo = 'agora';
            break;
        case 'hoje':
        default:
            dataAlvo = getFormattedDate(hoje);
            break;
    }

    console.log(`Recebida requisição para '${dia}', buscando cache da chave: '${dataAlvo}'.`);
    const cachedData = getCache(dataAlvo);

    if (cachedData) {
        return res.status(200).json(cachedData);
    }

    // Se o cache ainda não foi criado, pede para o usuário aguardar.
    res.status(503).json({ 
        message: `Os dados para '${dia}' (data: ${dataAlvo}) estão sendo preparados. Por favor, tente novamente em um minuto.` 
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
