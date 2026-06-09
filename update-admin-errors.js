const fs = require('fs');
let t = fs.readFileSync('admin.html', 'utf8');

t = t.replace(/if \(propertyCount\) propertyCount\.innerText = count \+ ' Total Properties';\s*\}\);/g, `if (propertyCount) propertyCount.innerText = count + ' Total Properties';\n            }, (error) => { propertiesList.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 font-bold">Firebase Error: ' + error.message + '</td></tr>'; });`);

t = t.replace(/if \(videoCount\) videoCount\.innerText = count \+ ' Total Videos';\s*\}\);/g, `if (videoCount) videoCount.innerText = count + ' Total Videos';\n            }, (error) => { videosList.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-red-500 font-bold">Firebase Error: ' + error.message + '</td></tr>'; });`);

t = t.replace(/if \(articleCount\) articleCount\.innerText = count \+ ' Total Articles';\s*\}\);/g, `if (articleCount) articleCount.innerText = count + ' Total Articles';\n            }, (error) => { articlesList.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-red-500 font-bold">Firebase Error: ' + error.message + '</td></tr>'; });`);

fs.writeFileSync('admin.html', t);
console.log('Added error handlers to admin.html');
