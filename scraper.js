// scraper.js
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const baseUrl = 'https://www.futebolnatv.com.br';

export async function buscarJogos(dia = 'hoje') {
  const urls = {
    agora: `${baseUrl}/jogos-aovivo/`,
    ontem: `${baseUrl}/jogos-ontem/`,
    hoje: `${baseUrl}/jogos-hoje/`,
    amanha: `${baseUrl}/jogos-amanha/`,
  };
  const urlDoSite = urls[dia] || urls['hoje'];
  console.log(`[SCRAPER - ${dia}] Iniciando busca de jogos...`);
  
  let browser = null;
  try {
    console.log(`[SCRAPER - ${dia}] Abrindo o navegador...`);
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
    });
    
    const page = await browser.newPage();
    console.log(`[SCRAPER - ${dia}] Navegando para ${urlDoSite}...`);

    await page.goto(urlDoSite, { waitUntil: 'networkidle2', timeout: 120000 });
    console.log(`[SCRAPER - ${dia}] Página carregada com sucesso.`);

    console.log(`[SCRAPER - ${dia}] Simulando rolagem LENTA para carregar todo o conteúdo...`);
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight; 
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 250);
        });
    });

    await new Promise(resolve => setTimeout(resolve, 8000)); 
    console.log(`[SCRAPER - ${dia}] Rolagem finalizada. Extraindo HTML...`);

    const html = await page.content();
    const $ = cheerio.load(html);
    const jogosEncontrados = [];

    // O seletor foi mantido, pois é o mais provável de funcionar
    $('body').find('div.gamecard:not([wire\\:snapshot])').each((index, element) => {
      const card = $(element);
      
      const campeonato = card.find('div.all-scores-widget-competition-header-container-hora b').text().trim();
      const iconeCampeonatoSrc = card.find('div.all-scores-widget-competition-header-container-hora img').attr('src');
      const iconeCampeonato = iconeCampeonatoSrc ? iconeCampeonatoSrc : null;
      
      const horario = card.find('div.box_time').text().trim();
      const status = card.find('div.cardtime.badge').text().replace(/\s+/g, ' ').trim() || 'Agregado';
      
      const timesRows = card.find('div.col-9.col-sm-10 > div.d-flex');
      const timeCasaElement = $(timesRows[0]);
      const timeForaElement = $(timesRows[1]);
      
      const timeCasa = timeCasaElement.find('span').first().text().trim();
      const placarCasa = timeCasaElement.find('span').last().text().replace(/\s+/g, '').trim();
      const timeFora = timeForaElement.find('span').first().text().trim();
      const placarFora = timeForaElement.find('span').last().text().replace(/\s+/g, '').trim();
      
      const iconeCasaSrc = timeCasaElement.find('img').attr('src');
      const iconeForaSrc = timeForaElement.find('img').attr('src');
      const iconeCasa = iconeCasaSrc ? baseUrl + iconeCasaSrc : null;
      const iconeFora = iconeForaSrc ? baseUrl + iconeForaSrc : null;
      
      const canaisContainer = card.children('a').first().next('div.container.text-center');
      const canais = [];
      canaisContainer.find('div.bcmact').each((i, el) => {
          const nomeCanal = $(el).text().trim().replace(/\s+/g, ' ');
          const iconeCanalSrc = $(el).find('img').attr('src');
          const iconeCanal = iconeCanalSrc ? baseUrl + iconeCanalSrc : null;
          if (nomeCanal) {
            canais.push({ canal: nomeCanal, icone: iconeCanal });
          }
      });

      if (timeCasa && timeFora) {
        jogosEncontrados.push({
          campeonato: { nome: campeonato, icone: iconeCampeonato },
          horario,
          status,
          partida: { timeCasa, iconeCasa, placarCasa, timeFora, iconeFora, placarFora },
          canais,
        });
      }
    });

    console.log(`[SCRAPER - ${dia}] Extração finalizada! ${jogosEncontrados.length} jogos encontrados.`);
    return jogosEncontrados;

  } catch (error) {
    console.error(`[SCRAPER - ${dia}] Ocorreu um erro GRAVE:`, error.message);
    // Retornamos um erro claro para ser capturado no cron-jobs.js
    throw new Error(`Falha ao buscar os jogos da seção '${dia}'. Causa: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log(`[SCRAPER - ${dia}] Navegador fechado.`);
    }
  }
}
