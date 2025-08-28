// cron-jobs.js
import cron from 'node-cron';
import { buscarJogos } from './scraper.js';
import { setCache } from './cache.js';

// TAREFA 1: Atualizar o cache dos jogos estáticos (diariamente)
async function updateDailyCache() {
    console.log('CRON DIÁRIO: Iniciando atualização do cache para hoje e amanhã...');
    
    // Mapeamento corrigido: A chave do cache aponta para a seção do site a ser raspada.
    const mapeamentoDias = {
        'hoje': 'ontem',  // Para obter os jogos de 'hoje', buscamos na URL de 'ontem'.
        'amanha': 'hoje' // Para obter os jogos de 'amanhã', buscamos na URL de 'hoje'.
    };

    for (const [diaCache, diaScraper] of Object.entries(mapeamentoDias)) {
        try {
            console.log(`Atualizando cache para '${diaCache}' usando a URL de '${diaScraper}'...`);
            const dados = await buscarJogos(diaScraper);
            setCache(diaCache, dados);
        } catch (error) {
            console.error(`CRON DIÁRIO: Falha ao atualizar cache para '${diaCache}':`, error);
        }
    }
    
    // Como a fonte de 'ontem' agora é usada para 'hoje', limpamos o cache de 'ontem' para evitar dados errados.
    setCache('ontem', { message: "Dados para 'ontem' não estão disponíveis no momento." });

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

    // ✅ CORREÇÃO: Agenda a tarefa de jogos ao vivo para rodar a cada 1 minuto.
    cron.schedule('* * * * *', updateLiveCache, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    console.log('Tarefas agendadas: Diária (00:01) e Ao Vivo (a cada 1 min).');

    // Executa as tarefas uma vez na inicialização para criar o primeiro cache
    console.log('Executando aquecimento de cache inicial...');
    updateDailyCache();
    updateLiveCache();
}
