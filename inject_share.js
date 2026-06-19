const fs = require('fs');

let content = fs.readFileSync('articles.html', 'utf8');

// 1. Add share button to the card
const originalFooter = `<button onclick="openArticleModal('\${article.id}')" class="inline-flex items-center text-sm font-bold text-gray-900 group-hover:text-brand-magenta transition-colors uppercase tracking-widest focus:outline-none">
                                    Read Article
                                    <svg class="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                </button>`;

const newFooter = `<button onclick="openArticleModal('\${article.id}')" class="inline-flex items-center text-sm font-bold text-gray-900 group-hover:text-brand-magenta transition-colors uppercase tracking-widest focus:outline-none">
                                    Read Article
                                    <svg class="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                </button>
                                <button onclick="shareArticle('\${article.id}', '\${article.title.replace(/'/g, "\\\\'")}')" class="inline-flex items-center justify-center p-2 rounded-full bg-gray-50 text-gray-500 hover:text-brand-magenta hover:bg-rose-50 transition-colors focus:outline-none" title="Share Article">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                                </button>`;

if (!content.includes('shareArticle')) {
    content = content.replace(originalFooter, newFooter);

    // 2. Add the window.shareArticle function
    const shareFunction = `
        window.shareArticle = async function (id, title) {
            const url = window.location.origin + window.location.pathname + '?article=' + id;
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Praise Dynasty | ' + title,
                        text: 'Check out this market insight from Praise Dynasty Real Estate: ' + title,
                        url: url
                    });
                } catch (err) {
                    console.log('Share canceled or failed', err);
                }
            } else {
                navigator.clipboard.writeText(url).then(() => {
                    alert('Article link copied to clipboard!');
                });
            }
        };

        window.openArticleModal = function (id) {`;

    content = content.replace('window.openArticleModal = function (id) {', shareFunction);

    fs.writeFileSync('articles.html', content);
    console.log('Added share button to articles.html');
} else {
    console.log('Share button already exists.');
}
