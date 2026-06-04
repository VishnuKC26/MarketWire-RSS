import express from 'express';
import cors from 'cors';
import RSSParser from 'rss-parser';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { GoogleDecoder } from 'google-news-url-decoder';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const googleDecoder = new GoogleDecoder();
const decodedUrlCache = new Map();

// Concurrency-limited promise runner
async function pMap(items, mapper, concurrency = 5) {
  const results = [];
  let index = 0;
  
  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }
  
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  
  await Promise.all(workers);
  return results;
}

// Resolves a Google News URL to its original destination URL
async function resolveUrl(url) {
  if (!url) return url;
  if (!url.includes('news.google.com')) return url;
  
  if (decodedUrlCache.has(url)) {
    return decodedUrlCache.get(url);
  }
  
  try {
    const res = await googleDecoder.decode(url);
    if (res.status && res.decoded_url) {
      decodedUrlCache.set(url, res.decoded_url);
      return res.decoded_url;
    }
  } catch (err) {
    console.error(`Failed to decode URL ${url}:`, err.message);
  }
  
  return url; // fallback to original
}

const parser = new RSSParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

// Configure the feeds to aggregate for each region based on Tiers 1, 2, and 3
const FEEDS = {
americas: [
{
name: 'Reuters Americas',
url: 'https://news.google.com/rss/search?q=site:reuters.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"wall+street"+OR+"global+markets"+OR+"market+wrap"+OR+"S%26P+500"+OR+Nasdaq+OR+"Dow+Jones"+OR+"Russell+2000"+OR+VIX)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 1
},
{
name: 'Bloomberg Americas',
url: 'https://news.google.com/rss/search?q=site:bloomberg.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"wall+street"+OR+"global+markets"+OR+"S%26P+500"+OR+Nasdaq+OR+"Dow+Jones"+OR+"Russell+2000"+OR+VIX)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 1
},
{
name: 'CNBC Markets',
url: 'https://news.google.com/rss/search?q=site:cnbc.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"wall+street"+OR+"S%26P+500"+OR+Nasdaq+OR+"Dow+Jones"+OR+"Russell+2000"+OR+VIX)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 2
},
{
name: 'MarketWatch Markets',
url: 'https://news.google.com/rss/search?q=site:marketwatch.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"wall+street"+OR+"S%26P+500"+OR+Nasdaq+OR+"Dow+Jones"+OR+"Russell+2000"+OR+VIX)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 2
},
{
name: 'Yahoo Finance Americas',
url: 'https://news.google.com/rss/search?q=site:finance.yahoo.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"wall+street"+OR+"S%26P+500"+OR+Nasdaq+OR+"Dow+Jones"+OR+"Russell+2000"+OR+VIX)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 3
},
{
name: 'Investing Americas',
url: 'https://news.google.com/rss/search?q=site:investing.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"wall+street"+OR+"S%26P+500"+OR+Nasdaq+OR+"Dow+Jones"+OR+"Russell+2000"+OR+VIX)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 3
}
],

europe: [
{
name: 'Reuters Europe',
url: 'https://news.google.com/rss/search?q=site:reuters.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+europe+OR+european+OR+DAX+OR+"FTSE+100"+OR+"CAC+40"+OR+"STOXX+600"+OR+"Euro+Stoxx+50"+OR+"FTSE+MIB"+OR+"IBEX+35"+OR+AEX)+when:2d&hl=en-GB&gl=GB&ceid=GB:en',
tier: 1
},
{
name: 'Bloomberg Europe',
url: 'https://news.google.com/rss/search?q=site:bloomberg.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+europe+OR+european+OR+DAX+OR+"FTSE+100"+OR+"CAC+40"+OR+"STOXX+600"+OR+"Euro+Stoxx+50"+OR+"FTSE+MIB"+OR+"IBEX+35"+OR+AEX)+when:2d&hl=en-GB&gl=GB&ceid=GB:en',
tier: 1
},
{
name: 'CNBC Europe',
url: 'https://news.google.com/rss/search?q=site:cnbc.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+europe+OR+european+OR+DAX+OR+"FTSE+100"+OR+"CAC+40"+OR+"STOXX+600"+OR+"Euro+Stoxx+50"+OR+"FTSE+MIB"+OR+"IBEX+35"+OR+AEX)+when:2d&hl=en-GB&gl=GB&ceid=GB:en',
tier: 2
},
{
name: 'Yahoo Finance Europe',
url: 'https://news.google.com/rss/search?q=site:finance.yahoo.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+europe+OR+european+OR+DAX+OR+"FTSE+100"+OR+"CAC+40"+OR+"STOXX+600"+OR+"Euro+Stoxx+50"+OR+"FTSE+MIB"+OR+"IBEX+35"+OR+AEX)+when:2d&hl=en-GB&gl=GB&ceid=GB:en',
tier: 3
},
{
name: 'Investing Europe',
url: 'https://news.google.com/rss/search?q=site:investing.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+europe+OR+european+OR+DAX+OR+"FTSE+100"+OR+"CAC+40"+OR+"STOXX+600"+OR+"Euro+Stoxx+50"+OR+"FTSE+MIB"+OR+"IBEX+35"+OR+AEX)+when:2d&hl=en-GB&gl=GB&ceid=GB:en',
tier: 3
}
],

mideast: [
{
name: 'Reuters Middle East',
url: 'https://news.google.com/rss/search?q=site:reuters.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+israel+OR+israeli+OR+"middle+east"+OR+mideast)+when:2d&hl=en-AE&gl=AE&ceid=AE:en',
tier: 1
},
{
name: 'Bloomberg Middle East',
url: 'https://news.google.com/rss/search?q=site:bloomberg.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+israel+OR+israeli+OR+"middle+east"+OR+mideast)+when:2d&hl=en-AE&gl=AE&ceid=AE:en',
tier: 1
},
{
name: 'CNBC Middle East',
url: 'https://news.google.com/rss/search?q=site:cnbc.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+israel+OR+israeli+OR+"middle+east"+OR+mideast)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 2
},
{
name: 'Yahoo Finance Middle East',
url: 'https://news.google.com/rss/search?q=site:finance.yahoo.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+israel+OR+israeli+OR+"middle+east"+OR+mideast)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 3
},
{
name: 'Investing Middle East',
url: 'https://news.google.com/rss/search?q=site:investing.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+israel+OR+israeli+OR+"middle+east"+OR+mideast)+when:2d&hl=en-US&gl=US&ceid=US:en',
tier: 3
}
],

asia: [
{
name: 'Reuters Asia',
url: 'https://news.google.com/rss/search?q=site:reuters.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+asia+OR+asian+OR+"Nikkei+225"+OR+TOPIX+OR+"Hang+Seng"+OR+"Shanghai+Composite"+OR+"CSI+300"+OR+Kospi+OR+"Nifty+50"+OR+Sensex+OR+"ASX+200")+when:2d&hl=en-SG&gl=SG&ceid=SG:en',
tier: 1
},
{
name: 'Bloomberg Asia',
url: 'https://news.google.com/rss/search?q=site:bloomberg.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+asia+OR+asian+OR+"Nikkei+225"+OR+TOPIX+OR+"Hang+Seng"+OR+"Shanghai+Composite"+OR+"CSI+300"+OR+Kospi+OR+"Nifty+50"+OR+Sensex+OR+"ASX+200")+when:2d&hl=en-SG&gl=SG&ceid=SG:en',
tier: 1
},
{
name: 'Nikkei Asia',
url: 'https://news.google.com/rss/search?q=site:asia.nikkei.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"Nikkei+225"+OR+TOPIX)+when:2d&hl=en-SG&gl=SG&ceid=SG:en',
tier: 2
},
{
name: 'Economic Times Markets',
url: 'https://news.google.com/rss/search?q=site:economictimes.indiatimes.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"Nifty+50"+OR+Sensex)+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
tier: 2
},
{
name: 'Mint Markets',
url: 'https://news.google.com/rss/search?q=site:livemint.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+"Nifty+50"+OR+Sensex)+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
tier: 2
},
{
name: 'Yahoo Finance Asia',
url: 'https://news.google.com/rss/search?q=site:finance.yahoo.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+asia+OR+asian+OR+"Nikkei+225"+OR+TOPIX+OR+"Hang+Seng"+OR+"Shanghai+Composite"+OR+"CSI+300"+OR+Kospi+OR+"Nifty+50"+OR+Sensex+OR+"ASX+200")+when:2d&hl=en-SG&gl=SG&ceid=SG:en',
tier: 3
},
{
name: 'Investing Asia',
url: 'https://news.google.com/rss/search?q=site:investing.com+(stock+OR+stocks+OR+equity+OR+equities+OR+market+OR+markets+OR+share+OR+shares+OR+asia+OR+asian+OR+"Nikkei+225"+OR+TOPIX+OR+"Hang+Seng"+OR+"Shanghai+Composite"+OR+"CSI+300"+OR+Kospi+OR+"Nifty+50"+OR+Sensex+OR+"ASX+200")+when:2d&hl=en-SG&gl=SG&ceid=SG:en',
tier: 3
}
]
};


// Help helper to estimate reading time in minutes
function estimateReadTime(text) {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  const wordsPerMinute = 200; 
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// Clean title of unnecessary site suffixes
function cleanTitle(title, sourceName) {
  if (!title) return '';
  let cleaned = title
    .replace(/\s*-\s*CNBC$/i, '')
    .replace(/\s*\|\s*Reuters$/i, '')
    .replace(/\s*-\s*Yahoo Finance$/i, '')
    .replace(/\s*-\s*Investing\.com$/i, '')
    .replace(/\s*-\s*Bloomberg$/i, '')
    .trim();
  
  if (sourceName) {
    const escapedSourceName = sourceName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const sourceRegex = new RegExp(`\\s*-\\s*${escapedSourceName}$`, 'i');
    cleaned = cleaned.replace(sourceRegex, '').trim();
  }
  return cleaned;
}

// v2.0 - Relevance Filter Keywords
// ----------------------------
// RELEVANT MARKET TERMS
// ----------------------------

const RELEVANT_KEYWORDS = [
'stock',
'stocks',
'equity',
'equities',
'share',
'shares',
'market',
'markets',
'wall street',

's&p',
's&p 500',
'nasdaq',
'dow',
'russell 2000',
'vix',

'nikkei',
'topix',
'hang seng',
'kospi',
'shanghai',
'shenzhen',
'nifty',
'sensex',
'asx',

'dax',
'ftse',
'cac',
'stoxx',
'stoxx 600',
'euro stoxx',
'euro stoxx 50',
'shanghai composite',
'csi 300',
'ftse mib',
'ibex',
'aex',
'asx 200',
'tsx',
'bovespa',

'yield',
'yields',
'treasury',
'bond market',
'bond',
'bonds',

'fed',
'federal reserve',
'ecb',
'boj',
'pboc',
'rbi',

'inflation',
'cpi',
'ppi',
'payrolls',
'employment',
'jobs report',
'gdp',

'oil',
'crude',
'energy',

'dollar',
'yen',
'euro',
'currency',
'currencies',
'rate',
'rates',

'tariff',
'trade tensions',
'geopolitics',
'risk sentiment',
'risk appetite',
'risk-off',
'risk-on'
];

// ----------------------------
// CORPORATE NOISE TERMS
// ----------------------------

const COMPANY_KEYWORDS = [
'earnings',
'quarterly results',
'revenue',
'profit',
'sales',
'guidance',
'analyst upgrade',
'analyst downgrade',
'price target',
'ipo',
'merger',
'acquisition',
'partnership',
'ceo',
'board of directors'
];

// ----------------------------
// ARTICLE FILTER
// ----------------------------

function isRelevant(item) {
const title = (item.title || '').toLowerCase();
const summary = (item.summary || '').toLowerCase();

const content = `${title} ${summary}`;

const marketRelated =
RELEVANT_KEYWORDS.some(keyword =>
content.includes(keyword)
);

if (!marketRelated) {
return false;
}

const corporateOnly =
COMPANY_KEYWORDS.some(keyword =>
content.includes(keyword)
);

if (corporateOnly) {


const marketContextTerms = [
  'stock',
  'stocks',
  'equity',
  'equities',
  'share',
  'shares',
  'market',
  'markets',
  'wall street',
  's&p',
  'nasdaq',
  'dow',
  'nikkei',
  'hang seng',
  'nifty',
  'dax',
  'yield',
  'fed',
  'inflation',
  'rate',
  'rates',
  'bond',
  'bonds',
  'index',
  'cpi',
  'gdp'
];

const hasMarketContext =
  marketContextTerms.some(keyword =>
    content.includes(keyword)
  );

if (!hasMarketContext) {
  return false;
}


}

return true;
}

// ----------------------------
// ARTICLE SCORING
// ----------------------------

// ----------------------------
// ARTICLE SCORING
// ----------------------------

function calculateScore(item, tier) {

let score = 0;

// Source quality

if (tier === 1) score += 25;
else if (tier === 2) score += 15;
else score += 5;

const title = (item.title || '').toLowerCase();
const content =
`${item.title || ''} ${item.summary || ''}`.toLowerCase();

// Market wrap articles

if (
content.includes('market wrap') ||
content.includes('global markets') ||
content.includes('markets today') ||
content.includes('wall street')
) {
score += 20;
}

// Central banks

if (
content.includes('fed') ||
content.includes('federal reserve') ||
content.includes('ecb') ||
content.includes('boj') ||
content.includes('pboc') ||
content.includes('rbi')
) {
score += 15;
}

// Inflation & macro

if (
content.includes('inflation') ||
content.includes('cpi') ||
content.includes('ppi') ||
content.includes('payrolls') ||
content.includes('employment') ||
content.includes('gdp')
) {
score += 12;
}

// Bond market

if (
content.includes('yield') ||
content.includes('yields') ||
content.includes('treasury') ||
content.includes('bond market')
) {
score += 12;
}

// Energy

if (
content.includes('oil') ||
content.includes('crude') ||
content.includes('energy')
) {
score += 10;
}

// Major index mentions (Priority 2 & 4)

const majorIndices = [
's&p',
'nasdaq',
'dow',
'nikkei',
'hang seng',
'kospi',
'nifty',
'sensex',
'dax',
'ftse',
'cac',
'topix',
'stoxx 600',
'euro stoxx',
'euro stoxx 50',
'shanghai composite',
'csi 300',
'ftse mib',
'ibex',
'aex',
'asx 200',
'tsx',
'bovespa'
];

if (
majorIndices.some(index =>
content.includes(index)
)
) {
score += 25;
}

// Reward multiple index mentions (Priority 3)
const indexCount = majorIndices.filter(index =>
content.includes(index)
).length;

score += indexCount * 8;

// Dedicated Index Boost (Priority 5)
const indexKeywords = [
  's&p',
  'nasdaq',
  'dow',
  'russell 2000',
  'vix',
  'dax',
  'ftse',
  'cac',
  'stoxx',
  'nikkei',
  'topix',
  'hang seng',
  'kospi',
  'shanghai',
  'csi 300',
  'nifty',
  'sensex',
  'asx'
];

if (
  indexKeywords.some(index =>
    content.includes(index)
  )
) {
  score += 25;
}

// Boost for core market terms in title
if (
title.includes('stock') ||
title.includes('market') ||
title.includes('share') ||
title.includes('equity')
) {
score += 10;
}

// Freshness boost

const ageHours =
(Date.now() - item.isoDate) /
(1000 * 60 * 60);

if (ageHours < 1) score += 30;
else if (ageHours < 3) score += 25;
else if (ageHours < 6) score += 20;
else if (ageHours < 12) score += 10;
else if (ageHours < 24) score += 5;

// Penalize corporate stories (reduced from -20 to -10 to be more inclusive)

if (
content.includes('earnings') ||
content.includes('ipo') ||
content.includes('analyst upgrade') ||
content.includes('analyst downgrade') ||
content.includes('price target')
) {
score -= 10;
}

return score;
}


async function fetchRegionFeeds(region) {
  const sources = FEEDS[region];

  if (!sources) {
    return {
      articles: []
    };
  }

  const feedPromises = sources.map(async (source) => {
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 8000
      });

      let cleanXml = response.data;

      if (typeof cleanXml === 'string') {
        cleanXml = cleanXml.replace(
          /&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g,
          '&amp;'
        );
      }

      const feed = await parser.parseString(cleanXml);

      const mapped = feed.items.map(item => ({
        id: item.guid || item.link || item.title,
        title: cleanTitle(item.title, source.name),
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        isoDate: item.isoDate
          ? new Date(item.isoDate).getTime()
          : Date.now(),
        source: source.name,
        summary: item.contentSnippet || item.content || '',
        category: item.categories ? item.categories[0] : null,
        tier: source.tier
      }));

      return mapped;

    } catch (error) {
      console.error(
        `Error fetching feed ${source.name}:`,
        error.message
      );

      return [];
    }
  });

  const results = await Promise.allSettled(feedPromises);

  let aggregated = [];

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      aggregated = aggregated.concat(result.value);
    }
  });

  // Deduplicate URLs
  const seenUrls = new Set();

  const uniqueArticles = aggregated.filter(article => {
    if (!article.link) return false;

    const normalizedUrl = article.link
      .split('?')[0]
      .replace(/\/$/, '');

    if (seenUrls.has(normalizedUrl)) {
      return false;
    }

    seenUrls.add(normalizedUrl);

    return true;
  });

  // Filter out articles older than 2 days
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const recentArticles = uniqueArticles.filter(article => {
    return (Date.now() - article.isoDate) <= twoDaysMs;
  });

  // Apply relevance filter
  const relevantArticles = recentArticles.filter(isRelevant);

  // Score articles
  const scoredArticles = relevantArticles.map(article => ({
    ...article,
    score: calculateScore(article, article.tier)
  }));

  scoredArticles.sort((a, b) => b.score - a.score);

  const topArticles = scoredArticles.slice(0, 40);

  const resolvedArticles = await pMap(
    topArticles,
    async (article) => {
      if (
        article.link &&
        article.link.includes('news.google.com')
      ) {
        const resolvedLink = await resolveUrl(article.link);

        return {
          ...article,
          link: resolvedLink
        };
      }

      return article;
    },
    5
  );

  return {
    articles: resolvedArticles
  };
}
// Endpoint to fetch news for all regions
// Endpoint to fetch news for all regions
app.get('/api/news', async (req, res) => {
  try {
    const [americas, europe, mideast, asia] = await Promise.all([
      fetchRegionFeeds('americas'),
      fetchRegionFeeds('europe'),
      fetchRegionFeeds('mideast'),
      fetchRegionFeeds('asia')
    ]);

    res.json({
      success: true,
      timestamp: Date.now(),
      data: {
        americas: {
          regionName: 'AMERICAS',
          articles: americas.articles
        },
        europe: {
          regionName: 'EUROPE',
          articles: europe.articles
        },
        mideast: {
          regionName: 'MIDDLE EAST',
          articles: mideast.articles
        },
        asia: {
          regionName: 'ASIA PACIFIC',
          articles: asia.articles
        }
      }
    });

  } catch (error) {
    console.error('Failed to aggregate news feeds:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to aggregate news feeds. Please try again.',
      error: error.message
    });
  }
});

// Endpoint to proxy full article page
app.get('/api/proxy', async (req, res) => {
  let { url } = req.query;
  
  if (!url) {
    return res.status(400).send('URL query parameter is required');
  }

  try {
    if (url.includes('news.google.com')) {
      url = await resolveUrl(url);
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    let html = response.data;
    const finalUrl = response.request.res.responseUrl || url;
    const origin = new URL(finalUrl).origin;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head><base href="${origin}/">`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD><base href="${origin}/">`);
    } else {
      html = `<base href="${origin}/">` + html;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error(`Failed to proxy URL ${url}:`, error.message);
    res.status(500).send('Proxy error');
  }
});

// Serve static assets in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA routing fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

app.listen(PORT, () => {
  console.log(`Market news feed backend is running on http://localhost:${PORT}`);
});
