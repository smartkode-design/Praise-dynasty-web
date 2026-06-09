const fs = require('fs');
const files = ['index.html', 'all-listings.html', 'details.html', 'articles.html', 'videos.html', 'funnel.html', 'admin.html', 'login.html'];
files.forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const h1s = c.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) || [];
    const h2s = (c.match(/<h2[^>]*>/g) || []).length;
    const h3s = (c.match(/<h3[^>]*>/g) || []).length;
    console.log(`\n--- ${f} ---`);
    console.log(`H1s: ${h1s.length}`);
    h1s.forEach(h => console.log('  ' + h.replace(/\n/g, '').replace(/\s+/g, ' ')));
    console.log(`H2s: ${h2s}, H3s: ${h3s}`);
  }
});
