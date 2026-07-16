const fs = require('fs');
const path = require('path');

// Helper to extract YouTube ID cleanly
function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Slug Generator with Collision Prevention and MAX_PATH safety
function generateSlug(title, location, propertyId) {
    let cleanTitle = (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    // Truncate title slug to avoid exceeding path limits on Windows (MAX_PATH is 260 chars)
    if (cleanTitle.length > 50) {
        cleanTitle = cleanTitle.substring(0, 50).replace(/-+$/, '');
    }

    let cleanLocation = (location || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    if (cleanLocation.length > 30) {
        cleanLocation = cleanLocation.substring(0, 30).replace(/-+$/, '');
    }

    const shortId = propertyId ? propertyId.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, 'x') : '';
    let base = `${cleanTitle}-${cleanLocation}`;
    base = base.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    return `${base}-${shortId}`;
}

// Extract Bedrooms from title/units
function extractBedrooms(title, units) {
    let match = (title || '').match(/(\d+)\s*bedroom/i);
    if (match) return parseInt(match[1]);
    
    match = (title || '').match(/(\d+)\s*bed/i);
    if (match) return parseInt(match[1]);

    if (units && Array.isArray(units)) {
        for (const u of units) {
            match = (u.type || '').match(/(\d+)\s*bedroom/i);
            if (match) return parseInt(match[1]);
            match = (u.type || '').match(/(\d+)\s*bed/i);
            if (match) return parseInt(match[1]);
        }
    }
    return 0;
}

// Extract Bathrooms from title/units
function extractBathrooms(title, units, beds) {
    let match = (title || '').match(/(\d+)\s*bathroom/i);
    if (match) return parseInt(match[1]);
    
    match = (title || '').match(/(\d+)\s*bath/i);
    if (match) return parseInt(match[1]);

    if (units && Array.isArray(units)) {
        for (const u of units) {
            match = (u.type || '').match(/(\d+)\s*bathroom/i);
            if (match) return parseInt(match[1]);
            match = (u.type || '').match(/(\d+)\s*bath/i);
            if (match) return parseInt(match[1]);
        }
    }
    return beds > 0 ? beds : 0;
}

// Smart Price Extractor
function getPropPrice(p) {
    if (p.units && Array.isArray(p.units) && p.units.length > 0 && p.units[0].price > 0) return p.units[0].price;
    if (p.price && p.price > 0) return p.price;
    return 0;
}

async function runGenerator() {
    console.log("Starting Pre-rendering Generator...");

    // 1. Fetch properties from database
    const dbUrl = "https://praise-dynasty-hni-default-rtdb.firebaseio.com/properties.json";
    let properties = {};
    try {
        const res = await fetch(dbUrl);
        if (!res.ok) throw new Error("Could not fetch database records");
        properties = await res.json();
    } catch (e) {
        console.error("Fetch failed. Loading local sample_properties.json as fallback:", e.message);
        properties = JSON.parse(fs.readFileSync('scratch/sample_properties.json', 'utf8'));
    }

    if (!properties || Object.keys(properties).length === 0) {
        console.error("No properties found to pre-render!");
        return;
    }

    // 2. Clean the property/ directory
    const propertyDir = path.join(__dirname, 'property');
    if (fs.existsSync(propertyDir)) {
        fs.rmSync(propertyDir, { recursive: true, force: true });
    }
    fs.mkdirSync(propertyDir, { recursive: true });

    // 3. Load template details.html
    const templatePath = path.join(__dirname, 'details.html');
    if (!fs.existsSync(templatePath)) {
        console.error("Error: details.html template file not found!");
        return;
    }
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    // Setup sitemap output
    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://praisedynastyrealty.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://praisedynastyrealty.com/all-listings.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://praisedynastyrealty.com/articles.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://praisedynastyrealty.com/videos.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://praisedynastyrealty.com/funnel.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

    console.log(`Pre-rendering ${Object.keys(properties).length} property pages...`);

    let count = 0;
    for (const key in properties) {
        const property = properties[key];
        property.id = key; // Assign ID
        
        // Exclude Off-Market properties from being indexed
        if (property.status === 'Off-Market') continue;

        const slug = generateSlug(property.title, property.location, key);
        property.slug = slug;

        // Parse specifications
        const beds = extractBedrooms(property.title, property.units);
        const baths = extractBathrooms(property.title, property.units, beds);
        const price = getPropPrice(property);

        // Smart cover image
        const ytId = extractYouTubeId(property.youtubeUrl);
        let imgSource = "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&q=80";
        if (property.imageUrl && property.imageUrl.trim() !== '') {
            imgSource = property.imageUrl;
        } else if (ytId) {
            imgSource = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        }

        const cleanDesc = (property.description || "")
            .replace(/"/g, '&quot;')
            .replace(/\n/g, ' ')
            .slice(0, 160) + '...';

        // 4. Construct JSON-LD Schema
        const schemaObj = {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "name": property.title || "Exclusive Offering",
            "description": property.description || "",
            "url": `https://praisedynastyrealty.com/property/${slug}/`,
            "image": imgSource,
            "numberOfRooms": beds,
            "numberOfBathroomsTotal": baths,
            "offeredIn": {
                "@type": "Offer",
                "price": price,
                "priceCurrency": "NGN",
                "availability": "https://schema.org/InStock"
            },
            "address": {
                "@type": "PostalAddress",
                "addressLocality": property.location || "Nigeria",
                "addressCountry": "NG"
            }
        };

        // 5. Pre-render HTML markup
        let pageHtml = templateContent;

        // Inject pre-rendered payload at head
        const preRenderScript = `<script>window.preRenderedProperty = ${JSON.stringify(property)};</script>\n</head>`;
        pageHtml = pageHtml.replace('</head>', preRenderScript);

        // Replace Head SEO Metadata
        pageHtml = pageHtml.replace(/<title>.*?<\/title>/, `<title>${property.title} | Praise Dynasty Real Estate</title>`);
        pageHtml = pageHtml.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${cleanDesc}">`);
        pageHtml = pageHtml.replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="https://praisedynastyrealty.com/property/${slug}/" />`);
        pageHtml = pageHtml.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${property.title} | Praise Dynasty Real Estate" />`);
        pageHtml = pageHtml.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${cleanDesc}" />`);
        pageHtml = pageHtml.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${imgSource}" />`);
        pageHtml = pageHtml.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="https://praisedynastyrealty.com/property/${slug}/" />`);

        // Replace Legacy Schema block
        const legacySchemaRegex = /<!-- Schema\.org Markup -->[\s\S]*?<\/script>/;
        const newSchemaTag = `<!-- Schema.org RealEstateListing Markup -->\n    <script type="application/ld+json">\n    ${JSON.stringify(schemaObj, null, 2)}\n    </script>`;
        pageHtml = pageHtml.replace(legacySchemaRegex, newSchemaTag);

        // Pre-hydrate Hero Layout Images & Labels
        pageHtml = pageHtml.replace('id="detail-hero-img" src=""', `id="detail-hero-img" src="${imgSource}"`);
        pageHtml = pageHtml.replace('id="detail-title"\n                    class="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight shadow-black drop-shadow-lg max-w-4xl">\n                    Premium Estate', `id="detail-title" class="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight shadow-black drop-shadow-lg max-w-4xl">${property.title}`);
        pageHtml = pageHtml.replace('id="detail-location">Global Market', `id="detail-location">${property.location}`);
        pageHtml = pageHtml.replace('id="detail-status"\n                    class="bg-brand-magenta text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-xl">Exclusive', `id="detail-status" class="bg-brand-magenta text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-xl">${property.status || 'Exclusive'}`);
        pageHtml = pageHtml.replace('id="detail-desc" class="text-gray-600 leading-relaxed text-lg whitespace-pre-line"></p>', `id="detail-desc" class="text-gray-600 leading-relaxed text-lg whitespace-pre-line">${property.description || ''}</p>`);

        // Pre-hydrate Units List
        let unitsHtml = '';
        if (property.units && Array.isArray(property.units) && property.units.length > 0) {
            const currencySymbol = property.currency || '₦';
            property.units.forEach((unit) => {
                const priceFormatted = new Intl.NumberFormat('en-US').format(unit.price || 0);
                const displayPrice = unit.price && unit.price > 0 ? `${currencySymbol}${priceFormatted}` : 'Price on Request';
                unitsHtml += `
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                        <span class="font-medium text-brand-light text-base mb-2 sm:mb-0">${unit.type || 'Standard Unit'}</span>
                        <span class="font-bold text-brand-magenta text-lg drop-shadow-md sm:ml-4 text-left sm:text-right">${displayPrice}</span>
                    </div>
                `;
            });
        } else {
            const currencySymbol = property.currency || '₦';
            let fallbackPrice = 'Contact for Pricing';
            if (property.price && property.price > 0) {
                fallbackPrice = `${currencySymbol}${new Intl.NumberFormat('en-US').format(property.price)}`;
            }
            unitsHtml = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 border border-white/10 rounded-xl p-4">
                    <span class="font-medium text-brand-light text-base mb-2 sm:mb-0">${property.type || 'Complete Estate'}</span>
                    <span class="font-bold text-brand-magenta text-lg shadow-black drop-shadow-md">${fallbackPrice}</span>
                </div>
            `;
        }
        pageHtml = pageHtml.replace('<div id="units-list" class="space-y-4">\n                        <!-- Dynamic Units Injection -->\n                        <div class="text-center text-brand-light/50 py-4 animate-pulse text-sm">Synchronizing\n                            configurations...</div>\n                    </div>', `<div id="units-list" class="space-y-4">${unitsHtml}</div>`);

        // Write page to folder structure
        const destDir = path.join(propertyDir, slug);
        fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(path.join(destDir, 'index.html'), pageHtml);

        // Add to sitemap
        sitemapContent += `\n  <url>\n    <loc>https://praisedynastyrealty.com/property/${slug}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
        
        count++;
    }

    // Complete sitemap.xml
    sitemapContent += `\n</urlset>\n`;
    fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapContent);

    console.log(`Successfully generated ${count} property detail pages and updated sitemap.xml!`);
}

runGenerator();
