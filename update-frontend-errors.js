const fs = require('fs');

function addErrorHandler(file) {
    if (!fs.existsSync(file)) return;
    let t = fs.readFileSync(file, 'utf8');
    
    // index.html, all-listings.html, videos.html, articles.html have onValue(propertiesRef...) or similar
    t = t.replace(/onValue\(propertiesRef, \(snapshot\) => \{([\s\S]*?)renderProperties\(\);\n\s*\}\);/g, `onValue(propertiesRef, (snapshot) => {$1renderProperties();\n            }, (error) => { propertyGrid.innerHTML = '<div class="col-span-full py-12 text-center text-red-500 font-bold tracking-wide">Firebase Error: ' + error.message + '</div>'; });`);

    fs.writeFileSync(file, t);
}

['index.html', 'all-listings.html', 'articles.html'].forEach(addErrorHandler);
console.log('Added error handlers to frontend pages');
