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
  console.log(`Iniciando scraper para a seção: '${dia}'...`);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
    });
    const page = await browser.newPage();
    console.log(`Navegando para ${urlDoSite}...`);

    await page.goto(urlDoSite, { waitUntil: 'networkidle2', timeout: 120000 });

    console.log('Simulando rolagem LENTA para carregar todas as imagens...');
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
            }, 250); // ✅ ROLAGEM MAIS LENTA: Aumentado de 100ms para 250ms
        });
    });

    // Aumentamos um pouco a pausa final também, para garantir
    await new Promise(resolve => setTimeout(resolve, 8000)); 
    console.log('Rolagem finalizada. Extraindo HTML...');

    const html = await page.content();
    const $ = cheerio.load(html);
    const jogosEncontrados = [];

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

    console.log(`Extração finalizada! ${jogosEncontrados.length} jogos encontrados para '${dia}'.`);
    return jogosEncontrados;

  } catch (error) {
    console.error(`Ocorreu um erro no scraper para a seção '${dia}':`, error);
    throw new Error(`Falha ao buscar os jogos da seção: ${dia}.`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador fechado.');
    }
  }
}
