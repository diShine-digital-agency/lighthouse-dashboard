import Database from 'better-sqlite3';

export class DB {
  #db;

  constructor(dbPath = './lighthouse.db') {
    this.#db = new Database(dbPath);
    this.#db.pragma('journal_mode = WAL');
    this.#db.pragma('foreign_keys = ON');
    this.#init();
  }

  #init() {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        url   TEXT NOT NULL UNIQUE,
        name  TEXT,
        budget_performance INTEGER,
        budget_accessibility INTEGER,
        budget_best_practices INTEGER,
        budget_seo INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audits (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        url_id      INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
        performance REAL,
        accessibility REAL,
        best_practices REAL,
        seo         REAL,
        fcp         REAL,
        lcp         REAL,
        cls         REAL,
        tbt         REAL,
        si          REAL,
        tti         REAL,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audits_url_id ON audits(url_id);
      CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at);
    `);

    // Migrate: add budget columns to existing databases
    const cols = this.#db.prepare("PRAGMA table_info(urls)").all().map(c => c.name);
    for (const col of ['budget_performance', 'budget_accessibility', 'budget_best_practices', 'budget_seo']) {
      if (!cols.includes(col)) {
        this.#db.exec(`ALTER TABLE urls ADD COLUMN ${col} INTEGER`);
      }
    }
  }

  /* ── URL CRUD ─────────────────────────────────── */

  addUrl(url, name = null) {
    const stmt = this.#db.prepare(
      'INSERT INTO urls (url, name) VALUES (?, ?)'
    );
    const info = stmt.run(url, name || null);
    return this.getUrl(info.lastInsertRowid);
  }

  getUrl(id) {
    return this.#db.prepare('SELECT * FROM urls WHERE id = ?').get(id) || null;
  }

  listUrls() {
    return this.#db.prepare('SELECT * FROM urls ORDER BY id').all();
  }

  removeUrl(id) {
    this.#db.prepare('DELETE FROM urls WHERE id = ?').run(id);
  }

  updateUrl(id, fields) {
    const allowed = ['name', 'budget_performance', 'budget_accessibility', 'budget_best_practices', 'budget_seo'];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (key in fields) {
        sets.push(`${key} = ?`);
        values.push(fields[key] ?? null);
      }
    }
    if (sets.length === 0) return this.getUrl(id);
    values.push(id);
    this.#db.prepare(`UPDATE urls SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getUrl(id);
  }

  /* ── Audit CRUD ───────────────────────────────── */

  saveAudit(urlId, data) {
    const stmt = this.#db.prepare(`
      INSERT INTO audits (url_id, performance, accessibility, best_practices, seo,
                          fcp, lcp, cls, tbt, si, tti)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      urlId,
      data.performance ?? null,
      data.accessibility ?? null,
      data.bestPractices ?? null,
      data.seo ?? null,
      data.fcp ?? null,
      data.lcp ?? null,
      data.cls ?? null,
      data.tbt ?? null,
      data.si ?? null,
      data.tti ?? null
    );
    return this.#db.prepare('SELECT * FROM audits WHERE id = ?').get(info.lastInsertRowid);
  }

  getLatestAudit(urlId) {
    return this.#db.prepare(
      'SELECT * FROM audits WHERE url_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(urlId) || null;
  }

  getAudits(urlId, limit = 50) {
    return this.#db.prepare(
      'SELECT * FROM audits WHERE url_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(urlId, limit);
  }

  /* ── Trend queries ────────────────────────────── */

  getTrend(urlId, days = 30) {
    return this.#db.prepare(`
      SELECT id, performance, accessibility, best_practices, seo,
             fcp, lcp, cls, tbt, si, tti, created_at
      FROM audits
      WHERE url_id = ?
        AND created_at >= datetime('now', ?)
      ORDER BY created_at ASC
    `).all(urlId, `-${days} days`);
  }

  /* ── Stats ────────────────────────────────────── */

  getStats() {
    const totalUrls = this.#db.prepare('SELECT COUNT(*) AS count FROM urls').get().count;
    const totalAudits = this.#db.prepare('SELECT COUNT(*) AS count FROM audits').get().count;
    const avgScores = this.#db.prepare(`
      SELECT
        ROUND(AVG(performance), 1) as performance,
        ROUND(AVG(accessibility), 1) as accessibility,
        ROUND(AVG(best_practices), 1) as best_practices,
        ROUND(AVG(seo), 1) as seo
      FROM audits
    `).get();

    return { totalUrls, totalAudits, avgScores };
  }

  /* ── Lifecycle ────────────────────────────────── */

  close() {
    this.#db.close();
  }
}
