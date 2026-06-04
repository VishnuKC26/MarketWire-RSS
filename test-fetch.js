import RSSParser from 'rss-parser';
import axios from 'axios';

const parser = new RSSParser();
const url = 'https://news.google.com/rss/search?q=site:reuters.com+("equity+markets"+OR+"stocks"+OR+"fed"+OR+"economy"+OR+"dow"+OR+"nasdaq")+when:7d&hl=en-US&gl=US&ceid=US:en';

console.log('Fetching URL:', url);
try {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 5000
  });
  console.log('Fetched successfully! Length:', response.data.length);
  
  // Clean raw XML: replace unescaped ampersands to avoid rss-parser XML parsing errors
  let cleanXml = response.data;
  if (typeof cleanXml === 'string') {
    cleanXml = cleanXml.replace(/&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
  }
  
  const feed = await parser.parseString(cleanXml);
  console.log('Parsed successfully! Title:', feed.title);
  console.log('Items found:', feed.items.length);
  if (feed.items.length > 0) {
    console.log('First item title:', feed.items[0].title);
    console.log('First item source:', feed.items[0].source);
  }
} catch (err) {
  console.error('Error fetching/parsing:', err.message);
}
