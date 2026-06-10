const fs = require('fs');

const domain = 'https://www.praisedynastyrealty.com';

const baseOrganization = `
    <!-- Schema.org Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      "name": "Praise Dynasty Real Estate Ltd",
      "image": "${domain}/images/logo-light.jpg",
      "@id": "${domain}",
      "url": "${domain}",
      "telephone": "+2348081975967",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Asokoro, Abuja",
        "addressCountry": "NG"
      },
      "priceRange": "$$$$"
    }
    </script>
`;

const files = ['index.html', 'all-listings.html', 'details.html', 'articles.html', 'videos.html', 'funnel.html'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');

  // Prevent multiple injections if run multiple times
  content = content.replace(/<!-- Schema\.org Markup -->\s*<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');

  let schemaToInject = '';

  if (f === 'index.html') {
    schemaToInject = baseOrganization;
  } else {
    schemaToInject = `
    <!-- Schema.org Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": "${domain}/${f}",
      "publisher": {
        "@type": "RealEstateAgent",
        "name": "Praise Dynasty Real Estate Ltd"
      }
    }
    </script>
`;
  }

  content = content.replace('</head>', schemaToInject + '</head>');
  fs.writeFileSync(f, content);
  console.log('Injected Schema into ' + f);
});
