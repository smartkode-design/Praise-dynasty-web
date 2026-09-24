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

// Helper to parse Q&A string into structured items
function parseFaqs(faqText) {
    if (!faqText || typeof faqText !== 'string') return [];
    const faqs = [];
    const blocks = faqText.split(/\n\s*\n/);
    for (const block of blocks) {
        const qMatch = block.match(/Q:\s*(.*?)(?=\nA:|\r\nA:|$)/is);
        const aMatch = block.match(/A:\s*(.*)/is);
        if (qMatch && aMatch) {
            faqs.push({
                question: qMatch[1].trim(),
                answer: aMatch[1].trim()
            });
        }
    }
    return faqs;
}

async function runGenerator() {
    console.log("Starting SmartKode AI SEO & Pre-rendering Generator...");

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

    // Build active property list with slugs for linking
    const activePropertyList = [];
    for (const key in properties) {
        const p = properties[key];
        p.id = key;
        if (p.status === 'Off-Market') continue;
        p.slug = generateSlug(p.title, p.location, key);
        activePropertyList.push(p);
    }

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
    <loc>https://praisedynastyrealty.com/tech-training</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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
  </url>`;

    console.log(`Pre-rendering ${activePropertyList.length} active property pages with AI SEO & Internal Linking...`);

    let count = 0;
    for (const property of activePropertyList) {
        const key = property.id;
        const slug = property.slug;

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

        // 4. Extract AI SEO Intelligence
        const seo = property.seo || {};
        const seoTitle = (seo.metaTitle && seo.metaTitle.trim()) 
            ? seo.metaTitle.trim() 
            : `${property.title} | Praise Dynasty Real Estate`;
        const seoDesc = (seo.metaDescription && seo.metaDescription.trim()) 
            ? seo.metaDescription.trim().replace(/"/g, '&quot;') 
            : cleanDesc;
        const seoKeywords = (seo.keywords && seo.keywords.trim()) 
            ? seo.keywords.trim().replace(/"/g, '&quot;') 
            : `${property.title}, real estate Abuja, luxury property Nigeria`;

        // 5. Construct JSON-LD Schema (RealEstateListing)
        const schemaObj = {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "name": seoTitle,
            "description": seoDesc,
            "url": `https://praisedynastyrealty.com/property/${slug}/`,
            "image": imgSource,
            "numberOfRooms": beds,
            "numberOfBathroomsTotal": baths,
            "offeredIn": {
                "@type": "Offer",
                "price": price,
                "priceCurrency": property.currency === '$' ? 'USD' : 'NGN',
                "availability": property.status === 'Recently Sold' ? "https://schema.org/Sold" : "https://schema.org/InStock"
            },
            "address": {
                "@type": "PostalAddress",
                "addressLocality": property.location || "Nigeria",
                "addressCountry": "NG"
            }
        };

        // 6. Handle AI FAQs & FAQPage Schema
        let faqSchemaTag = '';
        let faqSectionHtml = '';
        const parsedFaqs = parseFaqs(seo.faqs);

        if (parsedFaqs.length > 0) {
            const faqSchema = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": parsedFaqs.map(f => ({
                    "@type": "Question",
                    "name": f.question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f.answer
                    }
                }))
            };
            faqSchemaTag = `\n    <!-- Schema.org FAQPage Rich Snippet -->\n    <script type="application/ld+json">\n    ${JSON.stringify(faqSchema, null, 2)}\n    </script>`;

            let faqItemsHtml = '';
            for (const f of parsedFaqs) {
                faqItemsHtml += `
                <div class="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                    <h4 class="font-bold text-gray-900 text-base mb-2 flex items-start gap-2">
                        <span class="text-brand-magenta font-black">Q:</span> ${f.question}
                    </h4>
                    <p class="text-gray-600 text-sm leading-relaxed pl-6">${f.answer}</p>
                </div>`;
            }

            faqSectionHtml = `
            <!-- SmartKode AI Local FAQs & Buyer Intelligence -->
            <section class="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 mt-10">
                <h3 class="text-2xl font-bold text-brand-blue mb-6 border-b border-gray-100 pb-4 flex items-center gap-2">
                    <span>📍</span> Neighborhood Intelligence & Buyer FAQs
                </h3>
                <div class="space-y-4">
                    ${faqItemsHtml}
                </div>
            </section>`;
        }

        // 7. Contextual Internal Linking (Similar Properties in this Neighborhood)
        const currentLoc = (property.location || '').toLowerCase();
        const currentDistrict = (property.neighborhood || '').toLowerCase();
        const related = [];

        // Match by neighborhood or city
        for (const other of activePropertyList) {
            if (other.id === key) continue;
            const otherLoc = (other.location || '').toLowerCase();
            const otherDistrict = (other.neighborhood || '').toLowerCase();

            const matchDistrict = currentDistrict && otherDistrict && (currentDistrict.includes(otherDistrict) || otherDistrict.includes(currentDistrict));
            const matchCity = currentLoc && otherLoc && (currentLoc.split(',')[0].trim() === otherLoc.split(',')[0].trim());

            if (matchDistrict || matchCity) {
                related.push(other);
                if (related.length >= 3) break;
            }
        }

        // Backfill with other active listings if under 3
        if (related.length < 3) {
            for (const other of activePropertyList) {
                if (other.id === key) continue;
                if (!related.some(r => r.id === other.id)) {
                    related.push(other);
                    if (related.length >= 3) break;
                }
            }
        }

        let relatedCardsHtml = '';
        for (const rel of related) {
            const relPrice = getPropPrice(rel);
            const relCurrency = rel.currency || '₦';
            const relPriceFormatted = relPrice > 0 ? `${relCurrency}${new Intl.NumberFormat('en-US').format(relPrice)}` : 'Price on Request';
            const relImg = (rel.imageUrl && rel.imageUrl.trim() !== '') ? rel.imageUrl : "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80";

            relatedCardsHtml += `
            <a href="/property/${rel.slug}/" class="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                <div class="h-44 w-full overflow-hidden relative">
                    <img src="${relImg}" alt="${rel.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <span class="absolute top-3 left-3 bg-brand-magenta text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full">${rel.type || 'Exclusive'}</span>
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <p class="text-xs text-gray-400 font-medium mb-1">${rel.location || 'Abuja, Nigeria'}</p>
                        <h4 class="font-bold text-gray-900 group-hover:text-brand-magenta transition-colors line-clamp-1">${rel.title}</h4>
                    </div>
                    <p class="text-base font-extrabold text-brand-blue mt-3">${relPriceFormatted}</p>
                </div>
            </a>`;
        }

        const internalLinkingSection = `
        <!-- SmartKode Automated Property Internal Linking -->
        <section class="max-w-7xl mx-auto px-6 md:px-12 py-14 border-t border-gray-200 mt-12">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                <div>
                    <p class="text-xs font-bold text-brand-magenta uppercase tracking-widest">Internal Property Directory</p>
                    <h3 class="text-2xl md:text-3xl font-bold text-brand-blue mt-1">Similar Properties in this Neighborhood</h3>
                </div>
                <a href="/all-listings.html" class="text-brand-magenta font-bold text-sm hover:underline flex items-center gap-1">Browse All Listings &rarr;</a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${relatedCardsHtml}
            </div>
        </section>`;

        // 8. Pre-render HTML markup
        let pageHtml = templateContent;

        // Inject pre-rendered payload at head
        const preRenderScript = `<script>window.preRenderedProperty = ${JSON.stringify(property)};</script>\n</head>`;
        pageHtml = pageHtml.replace('</head>', preRenderScript);

        // Replace Head SEO Metadata with AI SEO
        pageHtml = pageHtml.replace(/<title>.*?<\/title>/, `<title>${seoTitle}</title>`);
        pageHtml = pageHtml.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${seoDesc}">\n    <meta name="keywords" content="${seoKeywords}">`);
        pageHtml = pageHtml.replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="https://praisedynastyrealty.com/property/${slug}/" />`);
        pageHtml = pageHtml.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${seoTitle}" />`);
        pageHtml = pageHtml.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${seoDesc}" />`);
        pageHtml = pageHtml.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${imgSource}" />`);
        pageHtml = pageHtml.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="https://praisedynastyrealty.com/property/${slug}/" />`);

        // Replace Legacy Schema block with RealEstateListing + FAQPage schema
        const legacySchemaRegex = /<!-- Schema\.org Markup -->[\s\S]*?<\/script>/;
        const newSchemaTag = `<!-- Schema.org RealEstateListing Markup -->\n    <script type="application/ld+json">\n    ${JSON.stringify(schemaObj, null, 2)}\n    </script>${faqSchemaTag}`;
        pageHtml = pageHtml.replace(legacySchemaRegex, newSchemaTag);

        // Pre-hydrate Hero Layout Images & Labels
        pageHtml = pageHtml.replace('id="detail-hero-img" src=""', `id="detail-hero-img" src="${imgSource}"`);
        pageHtml = pageHtml.replace('id="detail-title"\n                    class="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight shadow-black drop-shadow-lg max-w-4xl">\n                    Premium Estate', `id="detail-title" class="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight shadow-black drop-shadow-lg max-w-4xl">${property.title}`);
        pageHtml = pageHtml.replace('id="detail-location">Global Market', `id="detail-location">${property.location}`);
        pageHtml = pageHtml.replace('id="detail-status"\n                    class="bg-brand-magenta text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-xl">Exclusive', `id="detail-status" class="bg-brand-magenta text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-xl">${property.status || 'Exclusive'}`);
        pageHtml = pageHtml.replace('id="detail-desc" class="text-gray-600 leading-relaxed text-lg whitespace-pre-line"></p>', `id="detail-desc" class="text-gray-600 leading-relaxed text-lg whitespace-pre-line">${property.description || ''}</p>${faqSectionHtml}`);

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

        // Inject Contextual Internal Linking right before the footer
        pageHtml = pageHtml.replace('<div class="mt-10 text-center pb-8 border-t border-gray-100', `${internalLinkingSection}\n\n        <div class="mt-10 text-center pb-8 border-t border-gray-100`);

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

    // INJECT STATIC SEO LINKS INTO ALL-LISTINGS.HTML
    console.log("Injecting static SEO links into all-listings.html...");
    let seoLinksHtml = `
<div id="seo-property-directory" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white">
    <h3 class="text-xl font-bold text-brand-blue mb-6">Property Directory</h3>
    <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
`;
    for (const property of activePropertyList) {
        seoLinksHtml += `        <li><a href="https://praisedynastyrealty.com/property/${property.slug}/" class="text-gray-600 hover:text-brand-magenta transition-colors">${property.title} in ${property.location}</a></li>\n`;
    }
    seoLinksHtml += `    </ul>\n</div>\n<!-- END SEO DIRECTORY -->`;

    const listingsPath = path.join(__dirname, 'all-listings.html');
    let listingsHtml = fs.readFileSync(listingsPath, 'utf8');
    
    // Remove old directory if it exists
    listingsHtml = listingsHtml.replace(/<div id="seo-property-directory"[\s\S]*?<!-- END SEO DIRECTORY -->/, '');
    
    // Insert new directory right before the footer
    listingsHtml = listingsHtml.replace('<footer ', `${seoLinksHtml}\n    <footer `);
    fs.writeFileSync(listingsPath, listingsHtml);

    console.log(`✅ Successfully generated ${count} property detail pages with AI SEO, FAQ schema, and Internal Linking!`);
}

runGenerator();
