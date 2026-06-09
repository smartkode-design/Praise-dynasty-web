const fs = require('fs');
const files = ['index.html', 'all-listings.html', 'videos.html', 'details.html', 'login.html', 'funnel.html', 'articles.html'];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let text = fs.readFileSync(f, 'utf8');
    
    // Fix PowerShell `n corruption
    text = text.replace(/`n/g, '\n');
    
    // Now replace the desktop links correctly, if they are duplicated or messed up
    // Actually, let's just clean up the "articles.html" links if they exist, then re-insert them properly.
    text = text.replace(/\n\s*<a href="articles.html"[\s\S]*?<\/a>/g, '');
    
    // Desktop Nav
    const desktopRegex = /(<a href="videos\.html"\s*class="text-gray-600 font-medium hover:text-brand-magenta transition-colors duration-200">Videos<\/a>)/;
    text = text.replace(desktopRegex, '$1\n                    <a href="articles.html"\n                        class="text-gray-600 font-medium hover:text-brand-magenta transition-colors duration-200">Articles</a>');

    // Mobile Nav
    const mobileRegex = /(<a href="videos\.html"\s*class="mobile-link text-gray-600 font-medium hover:text-brand-magenta transition-colors duration-200 py-2 border-b border-gray-50">Videos<\/a>)/;
    text = text.replace(mobileRegex, '$1\n                    <a href="articles.html"\n                        class="mobile-link text-gray-600 font-medium hover:text-brand-magenta transition-colors duration-200 py-2 border-b border-gray-50">Articles</a>');
    
    fs.writeFileSync(f, text);
});
console.log('Fixed nav links in all files.');
