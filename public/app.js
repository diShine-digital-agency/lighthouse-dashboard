/* Lighthouse Dashboard — Frontend Application
   by diShine Digital Agency (https://dishine.it) */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const cardsEl = $('#cards');
  const addForm = $('#add-form');
  const trendSection = $('#trend-section');
  const trendTitle = $('#trend-title');
  const trendClose = $('#trend-close');
  const trendCanvas = $('#trend-chart');

  let trendChart = null;
  let refreshTimer = null;
  const REFRESH_INTERVAL = 30000; // 30 seconds

  /* ── Helpers ───────────────────────────────────── */

  function scoreColor(score) {
    if (score >= 90) return 'var(--green)';
    if (score >= 50) return 'var(--orange)';
    return 'var(--red)';
  }

  function formatTime(iso) {
    if (!iso) return 'Never';
    const d = new Date(iso + 'Z');
    return d.toLocaleString();
  }

  function formatMetric(val, unit) {
    if (val == null) return 'N/A';
    if (unit === 'ms') return Math.round(val) + ' ms';
    if (unit === 'cls') return val.toFixed(3);
    return val;
  }

  /* ── API calls ─────────────────────────────────── */

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || res.statusText);
    }
    return res.json();
  }

  async function fetchUrls() {
    return api('/api/urls');
  }

  async function addUrl(url, name) {
    return api('/api/urls', {
      method: 'POST',
      body: JSON.stringify({ url, name: name || undefined }),
    });
  }

  async function removeUrl(id) {
    return api(`/api/urls/${id}`, { method: 'DELETE' });
  }

  async function triggerAudit(id) {
    return api(`/api/urls/${id}/run`, { method: 'POST' });
  }

  async function fetchTrend(id, days) {
    return api(`/api/urls/${id}/trend?days=${days}`);
  }

  /* ── Render score gauge ────────────────────────── */

  function gaugeHTML(label, score) {
    const display = score != null ? score : '--';
    const color = score != null ? scoreColor(score) : 'var(--border)';
    return `
      <div class="gauge">
        <div class="gauge-circle" style="border-color: ${color}; color: ${color}">
          ${display}
        </div>
        <span class="gauge-label">${label}</span>
      </div>`;
  }

  /* ── Render a single URL card ──────────────────── */

  function renderCard(entry) {
    const a = entry.latestAudit;
    const name = entry.name || new URL(entry.url).hostname;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-name">${escapeHtml(name)}</div>
          <div class="card-url">${escapeHtml(entry.url)}</div>
        </div>
        <div class="card-actions">
          <button class="btn-run" title="Run audit now" data-id="${entry.id}">Run</button>
          <button class="btn-trend" title="View trend" data-id="${entry.id}" data-name="${escapeAttr(name)}">Trend</button>
          <button class="btn-delete" title="Remove" data-id="${entry.id}">Del</button>
        </div>
      </div>
      ${a ? `
        <div class="scores">
          ${gaugeHTML('Perf', a.performance)}
          ${gaugeHTML('A11y', a.accessibility)}
          ${gaugeHTML('BP', a.best_practices)}
          ${gaugeHTML('SEO', a.seo)}
        </div>
        <div class="card-time">Last audit: ${formatTime(a.created_at)}</div>
      ` : '<div class="no-data">No audit data yet. Click "Run" to start.</div>'}
    `;

    // Event listeners
    card.querySelector('.btn-run').addEventListener('click', handleRun);
    card.querySelector('.btn-trend').addEventListener('click', handleTrend);
    card.querySelector('.btn-delete').addEventListener('click', handleDelete);

    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── Render all cards ──────────────────────────── */

  async function renderAll() {
    try {
      const urls = await fetchUrls();
      cardsEl.innerHTML = '';
      if (urls.length === 0) {
        cardsEl.innerHTML = '<div class="no-data">No URLs added yet. Use the form above to add one.</div>';
        return;
      }
      for (const entry of urls) {
        cardsEl.appendChild(renderCard(entry));
      }
    } catch (err) {
      console.error('Failed to load URLs:', err);
    }
  }

  /* ── Event handlers ────────────────────────────── */

  async function handleRun(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const card = btn.closest('.card');
    card.classList.add('loading');
    btn.textContent = '...';
    try {
      await triggerAudit(id);
      await renderAll();
    } catch (err) {
      alert('Audit failed: ' + err.message);
    } finally {
      card.classList.remove('loading');
      btn.textContent = 'Run';
    }
  }

  async function handleTrend(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    try {
      const data = await fetchTrend(id, 30);
      if (data.length === 0) {
        alert('No trend data available yet. Run at least one audit first.');
        return;
      }
      showTrendChart(name, data);
    } catch (err) {
      alert('Failed to load trend: ' + err.message);
    }
  }

  async function handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Remove this URL and all its audit history?')) return;
    try {
      await removeUrl(id);
      await renderAll();
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  }

  /* ── Trend chart (Chart.js) ────────────────────── */

  function showTrendChart(name, data) {
    trendTitle.textContent = 'Trend — ' + name;
    trendSection.style.display = 'block';
    trendSection.scrollIntoView({ behavior: 'smooth' });

    const labels = data.map((d) => {
      const dt = new Date(d.created_at + 'Z');
      return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const datasets = [
      { label: 'Performance', data: data.map((d) => d.performance), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)' },
      { label: 'Accessibility', data: data.map((d) => d.accessibility), borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)' },
      { label: 'Best Practices', data: data.map((d) => d.best_practices), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.1)' },
      { label: 'SEO', data: data.map((d) => d.seo), borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.1)' },
    ];

    if (trendChart) {
      trendChart.destroy();
    }

    trendChart = new Chart(trendCanvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { min: 0, max: 100, ticks: { stepSize: 10 } },
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        elements: {
          line: { tension: 0.3, borderWidth: 2 },
          point: { radius: 3, hoverRadius: 5 },
        },
      },
    });
  }

  /* ── Init ───────────────────────────────────────── */

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const urlInput = $('#input-url');
    const nameInput = $('#input-name');
    const url = urlInput.value.trim();
    const name = nameInput.value.trim();

    if (!url) return;

    try {
      await addUrl(url, name);
      urlInput.value = '';
      nameInput.value = '';
      await renderAll();
    } catch (err) {
      alert('Failed to add URL: ' + err.message);
    }
  });

  trendClose.addEventListener('click', () => {
    trendSection.style.display = 'none';
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
  });

  // Initial render
  renderAll();

  // Auto-refresh every 30 seconds
  refreshTimer = setInterval(renderAll, REFRESH_INTERVAL);
})();
