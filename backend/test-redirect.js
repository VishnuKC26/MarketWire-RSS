import axios from 'axios';

const url = 'https://news.google.com/rss/articles/CBMigwFBVV95cUxPMGphS3NPLVBWc1FHMDZFdklTMS1VQ2tzOE5zQnlOaXJaUTdwcW13VjNfUkowNnljUmhDTUhuNy0xS05sdVNkTmZqS1F0dDVCYkoyR053M05IR1c5QWFyR0RrY3BDcEtFS0NaRFZxTkhER0N6eHByMlJLTzdBeW8yOFFYSQ?oc=5';

console.log('Fetching Google News Redirect page...');
try {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  
  console.log('Response status:', res.status);
  
  // Find all URLs in the HTML that are NOT google/gstatic/w3/schema
  const urls = res.data.match(/https?:\/\/[^\s"'<>,`]+/g) || [];
  const uniqueUrls = [...new Set(urls)].filter(u => 
    !u.includes('google.com') && 
    !u.includes('gstatic.com') && 
    !u.includes('w3.org') && 
    !u.includes('schema.org')
  );
  
  console.log('\nPotential Target URLs found in HTML:');
  console.log(uniqueUrls);
  
  // Print parts of HTML that look like standard anchor tags
  const anchors = res.data.match(/<a href="[^"]+">[^<]+<\/a>/g) || [];
  console.log('\nAnchors found:');
  console.log(anchors.slice(0, 10));

} catch (err) {
  console.error('Error:', err.message);
}
