const fs = require('fs');

let t = fs.readFileSync('index.html', 'utf8');

const searchHtml = `
            <div class="w-full mb-6 relative z-30">
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input type="text" id="text-search-input" placeholder="Search by Neighborhood, District, Title, or Keyword (e.g. Asokoro, Guzape)" class="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all text-gray-900 font-medium shadow-sm">
                </div>
            </div>
`;

t = t.replace('<div class="flex flex-col sm:flex-row gap-4 mb-10 max-w-2xl relative z-30">', searchHtml + '            <div class="flex flex-col sm:flex-row gap-4 mb-10 max-w-2xl relative z-30">');
t = t.replace("let currentStateFilter = 'All';", "let currentStateFilter = 'All';\n        let currentTextSearch = '';");

const searchLogic = `
            if (currentTextSearch) {
                const query = currentTextSearch.toLowerCase();
                filtered = filtered.filter(p => {
                    const titleMatch = p.title && p.title.toLowerCase().includes(query);
                    const locMatch = p.location && p.location.toLowerCase().includes(query);
                    const neighborhoodMatch = p.neighborhood && p.neighborhood.toLowerCase().includes(query);
                    return titleMatch || locMatch || neighborhoodMatch;
                });
            }
`;

t = t.replace('// 3. Tab State Filters', searchLogic + '\n            // 3. Tab State Filters');

const eventHtml = `
        const textSearchInput = document.getElementById('text-search-input');
        if (textSearchInput) {
            textSearchInput.addEventListener('input', (e) => {
                currentTextSearch = e.target.value;
                currentPage = 1;
                renderProperties();
            });
        }
`;

t = t.replace("document.addEventListener('DOMContentLoaded', async () => {", "document.addEventListener('DOMContentLoaded', async () => {" + eventHtml);

fs.writeFileSync('index.html', t);
console.log('index.html updated successfully.');
