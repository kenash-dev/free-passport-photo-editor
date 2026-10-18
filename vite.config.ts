import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import faq from './src/data/faq.json';

// GitHub Pages serves the site from /<repo>/; override with BASE_PATH and SITE_URL for other hosts.
const base = process.env.BASE_PATH ?? '/on-browser-passport-photo/';
const siteUrl = process.env.SITE_URL ?? `https://kenash-dev.github.io${base}`;
const repoUrl = 'https://github.com/kenash-dev/on-browser-passport-photo';

/** Adds the canonical URL and structured data (web app + FAQ) so search engines see them without running JS. */
function seo(): Plugin {
  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Free Passport Photo Editor',
      url: siteUrl,
      description:
        'Free passport photo editor that runs entirely in your browser. Photos are never uploaded. Supports US, UK, Canada, Australia, New Zealand, India passport and OCI sizes.',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Any (web browser)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      sameAs: [repoUrl],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  return {
    name: 'seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Escape '<' so the JSON can't close the script tag.
        const json = JSON.stringify(structured).replace(/</g, '\\u003c');
        return html
          .replace(/%SITE_URL%/g, siteUrl)
          .replace('</head>', `    <script type="application/ld+json">${json}</script>\n  </head>`);
      },
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n` });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), seo()],
});
