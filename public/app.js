/* Lighthouse Dashboard — Frontend Application */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const cardsEl = $('#cards');
  const addForm = $('#add-form');
  const trendSection = $('#trend-section');
  const trendTitle = $('#trend-title');
  const trendClose = $('#trend-close');
  const trendCanvas = $('#trend-chart');
  const toastEl = $('#toast');
  const themeToggle = $('#theme-toggle');

  let trendChart = null;
  let refreshTimer = null;
  const REFRESH_INTERVAL = 60000; // 60 seconds

  /* ── Theme ─────────────────────────────────────── */

  function initTheme() {
    const stored = localStorage.getItem('lh-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('lh-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('lh-theme', 'dark');
    }
  }

  initTheme();
  themeToggle.addEventListener('click', toggleTheme);

  /* ── Toast notifications ───────────────────────── */

  let toastTimeout = null;

  function showToast(message, type) {
    toastEl.textContent = message;
    toastEl.className = 'toast visible' + (type ? ' toast-' + type : '');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 3500);
  }

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

  /* ── API calls ─────────────────────────────────── */

  async function api(path, opts) {
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
    return api('/api/urls/' + id, { method: 'DELETE' });
  }

  async function triggerAudit(id) {
    return api('/api/urls/' + id + '/run', { method: 'POST' });
  }

  async function fetchTrend(id, days) {
    return api('/api/urls/' + id + '/trend?days=' + days);
  }

  async function fetchStats() {
    return api('/api/stats');
  }

  /* ── Stats bar ─────────────────────────────────── */

  async function renderStats() {
    try {
      const stats = await fetchStats();
      $('#stat-urls').textContent = stats.totalUrls;
      $('#stat-audits').textContent = stats.totalAudits;
      $('#stat-perf').textContent = stats.avgScores?.performance ?? '—';
      $('#stat-a11y').textContent = stats.avgScores?.accessibility ?? '—';
    } catch {
      // Stats are non-critical; silently ignore
    }
  }

  /* ── Render score gauge ────────────────────────── */

  function gaugeHTML(label, score) {
    const display = score != null ? score : '—';
    const color = score != null ? scoreColor(score) : 'var(--border)';
    return '<div class="gauge">' +
      '<div class="gauge-circle" style="border-color: ' + color + '; color: ' + color + '" role="meter" aria-valuenow="' + (score ?? 0) + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + label + ' score">' +
      display +
      '</div>' +
      '<span class="gauge-label">' + label + '</span>' +
      '</div>';
  }

  /* ── Render a single URL card ──────────────────── */

  function renderCard(entry) {
    const a = entry.latestAudit;
    const name = entry.name || new URL(entry.url).hostname;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="card-header">' +
        '<div>' +
          '<div class="card-name">' + escapeHtml(name) + '</div>' +
          '<div class="card-url">' + escapeHtml(entry.url) + '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<button class="btn-run" title="Run audit now" data-id="' + entry.id + '" aria-label="Run audit for ' + escapeAttr(name) + '">Run</button>' +
          '<button class="btn-trend" title="View trend" data-id="' + entry.id + '" data-name="' + escapeAttr(name) + '" aria-label="View trend for ' + escapeAttr(name) + '">Trend</button>' +
          '<button class="btn-delete" title="Remove" data-id="' + entry.id + '" aria-label="Remove ' + escapeAttr(name) + '">Del</button>' +
        '</div>' +
      '</div>' +
      (a
        ? '<div class="scores">' +
            gaugeHTML('Perf', a.performance) +
            gaugeHTML('A11y', a.accessibility) +
            gaugeHTML('BP', a.best_practices) +
            gaugeHTML('SEO', a.seo) +
          '</div>' +
          '<div class="card-time">Last audit: ' + formatTime(a.created_at) + '</div>'
        : '<div class="no-data">No audit data yet. Click "Run" to start.</div>');

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
    btn.textContent = '…';
    btn.disabled = true;
    try {
      await triggerAudit(id);
      showToast('Audit completed', 'success');
      await renderAll();
      await renderStats();
    } catch (err) {
      showToast('Audit failed: ' + err.message, 'error');
    } finally {
      card.classList.remove('loading');
      btn.textContent = 'Run';
      btn.disabled = false;
    }
  }

  async function handleTrend(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    try {
      const data = await fetchTrend(id, 30);
      if (data.length === 0) {
        showToast('No trend data yet. Run at least one audit first.', 'error');
        return;
      }
      showTrendChart(name, data);
    } catch (err) {
      showToast('Failed to load trend: ' + err.message, 'error');
    }
  }

  async function handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Remove this URL and all its audit history?')) return;
    try {
      await removeUrl(id);
      showToast('URL removed', 'success');
      await renderAll();
      await renderStats();
    } catch (err) {
      showToast('Failed to remove: ' + err.message, 'error');
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
      data: { labels: labels, datasets: datasets },
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
      showToast('URL added', 'success');
      await renderAll();
      await renderStats();
    } catch (err) {
      showToast('Failed to add URL: ' + err.message, 'error');
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
  renderStats();

  // Auto-refresh every 60 seconds
  refreshTimer = setInterval(() => {
    renderAll();
    renderStats();
  }, REFRESH_INTERVAL);
})();
