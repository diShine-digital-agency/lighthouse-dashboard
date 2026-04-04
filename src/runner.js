export async function runAudit(url) {
  let lighthouse;
  try {
    const mod = await import('lighthouse');
    lighthouse = mod.default || mod;
  } catch {
    throw new Error(
      'Lighthouse is not installed. Run: npm install -g lighthouse'
    );
  }

  const result = await lighthouse(url, {
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    chromeFlags: ['--headless', '--no-sandbox'],
  });

  const { lhr } = result;
  const cat = lhr.categories;
  const audits = lhr.audits;

  const score = (c) => Math.round((cat[c]?.score ?? 0) * 100);
  const metric = (key) => audits[key]?.numericValue ?? null;

  return {
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    metrics: {
      fcp: metric('first-contentful-paint'),
      lcp: metric('largest-contentful-paint'),
      cls: metric('cumulative-layout-shift'),
      tbt: metric('total-blocking-time'),
      si: metric('speed-index'),
      tti: metric('interactive'),
    },
  };
}
