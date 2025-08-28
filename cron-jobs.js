// cron-jobs.js
import cron from 'node-cron';
import { buscarJogos } from './scraper.js';
import { setCache } from './cache.js';

/**
 * Retorna a data formatada como YYYY-MM-DD.
 * @param {Date} date - O objeto de data.
 * @returns {string} - A data formatada.
 */
function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// TAREFA 1: Atualizar o cache dos jogos estáticos (diariamente)
async function updateDailyCache() {
    console.log('CRON DIÁRIO: Iniciando atualização do cache por data...');
    
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    const diasParaBuscar = [
        { nome: 'ontem', data: getFormattedDate(ontem) },
        { nome: 'hoje', data: getFormattedDate(hoje) },
        { nome: 'amanha', data: getFormattedDate(amanha) }
    ];

    for (const diaInfo of diasParaBuscar) {
        try {
            console.log(`Buscando jogos para '${diaInfo.nome}'...`);
            const dados = await buscarJogos(diaInfo.nome);
            // Salva o cache usando a data como chave
            setCache(diaInfo.data, dados);
        } catch (error) {
            console.error(`CRON DIÁRIO: Falha ao atualizar cache para '${diaInfo.nome}' (data ${diaInfo.data}):`, error);
        }
    }
    console.log('CRON DIÁRIO: Atualização por data finalizada.');
}

// TAREFA 2: Atualizar o cache dos jogos ao vivo (não precisa de alteração na lógica)
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

    // Agenda a tarefa de jogos ao vivo para rodar a cada 2 minutos.
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
