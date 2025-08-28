// cron-jobs.js
import cron from 'node-cron';
import { buscarJogos } from './scraper.js';
import { setCache } from './cache.js';

// TAREFA 1: Atualizar o cache dos jogos estáticos (diariamente)
async function updateDailyCache() {
    console.log('CRON DIÁRIO: Iniciando atualização do cache para ontem, hoje e amanhã...');
    const dias = ['ontem', 'hoje', 'amanha'];
    for (const dia of dias) {
        try {
            const dados = await buscarJogos(dia);
            setCache(dia, dados);
        } catch (error) {
            console.error(`CRON DIÁRIO: Falha ao atualizar cache para '${dia}':`, error);
        }
    }
    console.log('CRON DIÁRIO: Atualização finalizada.');
}

// TAREFA 2: Atualizar o cache dos jogos ao vivo
async function updateLiveCache() {
    console.log('CRON AO VIVO: Iniciando atualização do cache para "agora"...');
    try {
        const dados = await buscarJogos('agora');
        setCache('agora', dados);
    } catch (error) {
        console.error('CRON AO VIVO: Falha ao atualizar cache para "agora":', error);
    }
    console.log('CRON AO VIVO: Atualização finalizada.');
}

// Função principal que inicia tudo
export function startScheduledJobs() {
    // Agenda a tarefa diária para 00:01 (meia-noite e um minuto)
    cron.schedule('1 0 * * *', updateDailyCache, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    // ✅ ALTERAÇÃO: Agenda a tarefa de jogos ao vivo para rodar a cada 2 minutos.
    cron.schedule('*/2 * * * *', updateLiveCache, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    console.log('Tarefas agendadas: Diária (00:01) e Ao Vivo (a cada 2 min).');

    // Executa as tarefas uma vez na inicialização para criar o primeiro cache
    console.log('Executando aquecimento de cache inicial...');
    updateDailyCache();
    updateLiveCache();
}