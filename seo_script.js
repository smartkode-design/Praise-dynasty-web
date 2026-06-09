const fs = require('fs');

const domain = 'https://www.praisedynastyrealty.com';

const seoData = {
    'index.html': {
        title: 'Praise Dynasty Real Estate Ltd | Luxury Properties in Abuja',
        desc: 'Discover ultra-luxury real estate, off-market properties, and prime investments in Abuja, Nigeria with Praise Dynasty Real Estate.',
        h1Fix: null
    },
    'all-listings.html': {
        title: 'Exclusive Properties & Listings | Praise Dynasty Real Estate',
        desc: 'Browse our complete global inventory of exclusive properties, luxury duplexes, and prime real estate investments.',
        h1Fix: (content) => content.replace(/<h2 class="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-blue/g, '<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-blue').replace(/Exclusive Global Inventory<\/h2>/, 'Exclusive Global Inventory</h1>')
    },
    'details.html': {
        title: 'Exclusive Property Details | Praise Dynasty Real Estate',
        desc: 'View detailed information, galleries, and specifications for our exclusive luxury properties.',
        h1Fix: (content) => content.replace(/<h1 class="text-3xl font-extrabold text-brand-blue mb-2 tracking-tight">Portfolio Unavailable<\/h1>/g, '<h2 class="text-3xl font-extrabold text-brand-blue mb-2 tracking-tight">Portfolio Unavailable</h2>')
    },
    'articles.html': {
        title: 'Market Insights & Articles | Praise Dynasty Real Estate',
        desc: 'Read the latest insights, news, and market trends in the Abuja and global luxury real estate market.',
        h1Fix: (content) => content.replace(/<h2 class="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-blue/g, '<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-blue').replace(/Market Insights & News<\/h2>/, 'Market Insights & News</h1>')
    },
    'videos.html': {
        title: 'Property Video Gallery | Praise Dynasty Real Estate',
        desc: 'Take virtual tours and watch high-definition video walkthroughs of our luxury properties.',
        h1Fix: null
    },
    'funnel.html': {
        title: 'VIP Property List | Praise Dynasty Real Estate',
        desc: 'Request access to our exclusive VIP property list and off-market luxury real estate opportunities in Abuja.',
        h1Fix: null
    },
    'admin.html': {
        title: 'Admin Dashboard | Praise Dynasty',
        desc: 'Praise Dynasty real estate management dashboard.',
        h1Fix: null
    },
    'login.html': {
        title: 'Admin Gateway | Praise Dynasty',
        desc: 'Secure admin login gateway.',
        h1Fix: null
    }
};

for (const [file, data] of Object.entries(seoData)) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');

    // 1. Remove existing title, description, og tags, and canonical tags to prevent duplicates
    content = content.replace(/<title>.*?<\/title>\s*/gi, '');
    content = content.replace(/<meta name="description".*?>\s*/gi, '');
    content = content.replace(/<meta property="og:.*?">\s*/gi, '');
    content = content.replace(/<link rel="canonical".*?>\s*/gi, '');

    // 2. Build the new SEO block
    const canonicalUrl = `${domain}/${file === 'index.html' ? '' : file}`;
    const seoBlock = `    <title>${data.title}</title>
    <meta name="description" content="${data.desc}">
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${data.title}" />
    <meta property="og:description" content="${data.desc}" />
    <meta property="og:image" content="${domain}/images/logo-light.jpg" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
`;

    // 3. Inject after <meta name="viewport"...>
    const viewportRegex = /<meta name="viewport"[^>]*>/i;
    content = content.replace(viewportRegex, `$& \n${seoBlock}`);

    // 4. Fix H1s
    if (data.h1Fix) {
        content = data.h1Fix(content);
        // Also check if any other generic <h2> was the main one if regex missed
        if (file === 'articles.html' && !content.includes('<h1')) {
            content = content.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/, '<h1$1>$2</h1>');
        }
        if (file === 'all-listings.html' && !content.includes('<h1')) {
            content = content.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/, '<h1$1>$2</h1>');
        }
    }

    fs.writeFileSync(file, content);
    console.log(`Updated SEO tags for ${file}`);
}
