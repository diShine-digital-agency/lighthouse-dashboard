export async function fireWebhook(webhookUrl, payload) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error(`[webhook] Failed to deliver to ${webhookUrl}: ${err.message}`);
  }
}

export function checkBudgets(urlEntry, audit) {
  const checks = [
    { key: 'budget_performance', scoreKey: 'performance', label: 'Performance' },
    { key: 'budget_accessibility', scoreKey: 'accessibility', label: 'Accessibility' },
    { key: 'budget_best_practices', scoreKey: 'best_practices', label: 'Best Practices' },
    { key: 'budget_seo', scoreKey: 'seo', label: 'SEO' },
  ];
  const failures = [];
  for (const { key, scoreKey, label } of checks) {
    const budget = urlEntry[key];
    const score = audit[scoreKey];
    if (budget != null && score != null && score < budget) {
      failures.push({ category: label, score, budget });
    }
  }
  return failures;
}
