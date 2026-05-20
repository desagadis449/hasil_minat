// ============================================================
// Dashboard Peminatan Konsentrasi — Sains Data
// ============================================================

// ============ SUPABASE CONFIG ============
const SUPABASE_URL = 'https://ujswyksemvfljescqiuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqc3d5a3NlbXZmbGplc2NxaXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzE2ODksImV4cCI6MjA5NDAwNzY4OX0.tFABBDoOuwXKF0RKTssM-kG6DFJLS_kNh_xWlFP_1xk';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ STATE ============
let allData = [];
let kelasMap = {};
let globalKelas = '';
let alasanConcFilter = '';
const chartInstances = {};

// ============ CONSTANTS ============
const CONCENTRATIONS = [
  {
    id: 'data_engineering',
    key: 'de',
    name: 'Data Engineering and Big Data Analytics',
    shortName: 'Data Engineering',
    icon: '⚙️',
    color: '#06b6d4',
    description: 'Infrastruktur data, pipeline, distributed systems, cloud computing',
    courses: [
      { name: 'Big Data Infrastructure', sks: 2 },
      { name: 'Distributed Systems', sks: 3 },
      { name: 'Data Pipeline Development', sks: 3 },
      { name: 'Cloud Computing', sks: 2 },
      { name: 'ETL Processes', sks: 3 },
      { name: 'Data Lakes', sks: 3 }
    ]
  },
  {
    id: 'ai_ml',
    key: 'ai',
    name: 'Artificial Intelligence (AI) and Machine Learning (ML) Development',
    shortName: 'AI & Machine Learning',
    icon: '🤖',
    color: '#8b5cf6',
    description: 'Deep learning, NLP, computer vision, model deployment',
    courses: [
      { name: 'Deep Learning', sks: 3 },
      { name: 'Natural Language Processing', sks: 3 },
      { name: 'Computer Vision', sks: 3 },
      { name: 'Reinforcement Learning', sks: 3 },
      { name: 'AI-Planning & Search', sks: 2 },
      { name: 'Model Deployment', sks: 2 }
    ]
  },
  {
    id: 'business_intelligence',
    key: 'bi',
    name: 'Business Intelligence and Advanced Data Analytics',
    shortName: 'Business Intelligence',
    icon: '📈',
    color: '#f59e0b',
    description: 'Analisis bisnis, visualisasi data, customer & predictive analytics',
    courses: [
      { name: 'Business Intelligence Tools', sks: 2 },
      { name: 'Statistical Modeling', sks: 2 },
      { name: 'Customer Analytics', sks: 3 },
      { name: 'Predictive Analytics', sks: 3 },
      { name: 'BI and Reporting', sks: 3 },
      { name: 'Supply Chain Management', sks: 3 }
    ]
  }
];

const KELAS_LABELS = { 'Reg': 'Reguler', 'Pro': 'Profesional', 'Aksel': 'Akselerasi' };
const CONC_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b'];

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
  await loadKelasMap();
  await loadData();
});

// ============ LOAD KELAS MAPPING ============
async function loadKelasMap() {
  try {
    const res = await fetch('kelas_mahasiswa.json');
    const json = await res.json();
    kelasMap = {};
    Object.entries(json).forEach(([nim, info]) => {
      kelasMap[nim] = info.kelas_type;
    });
  } catch (e) {
    console.warn('Could not load kelas map:', e);
  }
}

// ============ LOAD DATA ============
async function loadData() {
  try {
    const { data, error } = await sb.from('peminatan').select('*').order('created_at', { ascending: false });
    document.getElementById('loading').style.display = 'none';

    if (error) {
      console.error('Supabase error:', error);
      document.getElementById('empty').style.display = '';
      return;
    }

    if (!data || data.length === 0) {
      document.getElementById('empty').style.display = '';
      return;
    }

    // Enrich data with kelas type
    allData = data.map(r => ({
      ...r,
      kelas_type: kelasMap[r.nim?.toString().trim()] || ''
    }));

    document.getElementById('dashboard').style.display = '';
    document.getElementById('badge-total').textContent = `${allData.length} responden`;
    document.getElementById('badge-date').textContent = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    buildKelasChips();
    renderAll();
    bindTableFilters();
  } catch (e) {
    console.error('Load error:', e);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('empty').style.display = '';
  }
}

// ============ FILTERING ============
function getFiltered() {
  let data = allData;
  if (globalKelas) data = data.filter(r => r.kelas_type === globalKelas);
  return data;
}

function buildKelasChips() {
  const types = [...new Set(allData.map(r => r.kelas_type).filter(Boolean))].sort();
  const container = document.getElementById('kelas-chips');
  container.innerHTML = `<button class="chip active" data-kelas="" onclick="setFilter('')">Semua (${allData.length})</button>`;
  types.forEach(k => {
    const count = allData.filter(r => r.kelas_type === k).length;
    const label = KELAS_LABELS[k] || k;
    container.innerHTML += `<button class="chip" data-kelas="${k}" onclick="setFilter('${k}')">${label} (${count})</button>`;
  });
}

function setFilter(kelas) {
  globalKelas = kelas;
  document.querySelectorAll('#kelas-chips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.kelas === kelas);
  });
  renderAll();
}

function renderAll() {
  const filtered = getFiltered();
  renderHeroStats(filtered);
  renderMainChart(filtered);
  renderLegendCards(filtered);
  renderKelasBar(filtered);
  renderTimeline(filtered);
  renderConcDetails(filtered);
  renderAlasan(filtered);
  renderParticipation(filtered);
  renderTable();
  renderInsights(filtered);
}

// ============ HERO STATS ============
function renderHeroStats(d) {
  const n = d.length;
  const counts = {};
  CONCENTRATIONS.forEach(c => { counts[c.id] = 0; });
  d.forEach(r => { if (counts[r.konsentrasi_id] !== undefined) counts[r.konsentrasi_id]++; });

  let html = `
    <div class="stat-card total">
      <div class="stat-icon">👥</div>
      <div class="stat-value">${n}</div>
      <div class="stat-label">Total Responden</div>
      <div class="stat-pct">${globalKelas ? KELAS_LABELS[globalKelas] || globalKelas : 'Semua Kelas'}</div>
    </div>`;

  CONCENTRATIONS.forEach(conc => {
    const count = counts[conc.id] || 0;
    const pct = n ? Math.round(count / n * 100) : 0;
    html += `
      <div class="stat-card ${conc.key}">
        <div class="stat-icon">${conc.icon}</div>
        <div class="stat-value">${count}</div>
        <div class="stat-label">${conc.shortName}</div>
        <div class="stat-pct">${pct}% dari total</div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  });

  document.getElementById('hero-stats').innerHTML = html;
}

// ============ MAIN DONUT CHART ============
function renderMainChart(d) {
  destroyChart('chart-main-donut');
  const n = d.length;
  if (!n) return;

  const counts = CONCENTRATIONS.map(c => d.filter(r => r.konsentrasi_id === c.id).length);

  chartInstances['chart-main-donut'] = new Chart(document.getElementById('chart-main-donut'), {
    type: 'doughnut',
    data: {
      labels: CONCENTRATIONS.map(c => c.shortName),
      datasets: [{
        data: counts,
        backgroundColor: CONC_COLORS,
        borderWidth: 0,
        hoverOffset: 12,
        borderRadius: 4,
        spacing: 3
      }]
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 10,
          titleFont: { weight: '700', size: 13 },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx) => {
              const pct = Math.round(ctx.parsed / n * 100);
              return ` ${ctx.label}: ${ctx.parsed} mahasiswa (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderLegendCards(d) {
  const n = d.length;
  const container = document.getElementById('legend-cards');
  if (!n) { container.innerHTML = ''; return; }

  container.innerHTML = CONCENTRATIONS.map((conc, i) => {
    const count = d.filter(r => r.konsentrasi_id === conc.id).length;
    const pct = Math.round(count / n * 100);
    return `
      <div class="legend-card">
        <div class="legend-dot" style="background:${conc.color};color:${conc.color}"></div>
        <div class="legend-info">
          <div class="legend-name">${conc.icon} ${conc.shortName}</div>
          <div class="legend-desc">${conc.description}</div>
        </div>
        <div class="legend-stats">
          <div class="legend-count" style="color:${conc.color}">${count}</div>
          <div class="legend-pct">${pct}%</div>
        </div>
      </div>`;
  }).join('');
}

// ============ KELAS BAR CHART ============
function renderKelasBar(d) {
  destroyChart('chart-kelas-bar');
  const n = d.length;
  if (!n) return;

  const kelasTypes = [...new Set(d.map(r => r.kelas_type).filter(Boolean))].sort();
  if (!kelasTypes.length) {
    document.getElementById('summary-kelas').innerHTML = '<span>Tidak ada data kelas untuk ditampilkan.</span>';
    return;
  }

  const datasets = CONCENTRATIONS.map((conc, i) => ({
    label: conc.shortName,
    data: kelasTypes.map(k => d.filter(r => r.kelas_type === k && r.konsentrasi_id === conc.id).length),
    backgroundColor: conc.color,
    borderRadius: 6,
    borderWidth: 0,
    borderSkipped: false
  }));

  chartInstances['chart-kelas-bar'] = new Chart(document.getElementById('chart-kelas-bar'), {
    type: 'bar',
    data: {
      labels: kelasTypes.map(k => KELAS_LABELS[k] || k),
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 14, font: { size: 11, family: 'Inter' }, color: '#94a3b8' }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 } }
      }
    }
  });

  // Summary
  let summaryHTML = '';
  kelasTypes.forEach(k => {
    const total = d.filter(r => r.kelas_type === k).length;
    const top = CONCENTRATIONS.map(c => ({
      name: c.shortName,
      count: d.filter(r => r.kelas_type === k && r.konsentrasi_id === c.id).length
    })).sort((a, b) => b.count - a.count)[0];
    if (top && top.count > 0) {
      const pct = Math.round(top.count / total * 100);
      summaryHTML += `Kelas <strong>${KELAS_LABELS[k] || k}</strong>: paling banyak memilih <strong>${top.name}</strong> (${pct}%). `;
    }
  });
  document.getElementById('summary-kelas').innerHTML = summaryHTML ? `💡 ${summaryHTML}` : '';
}

// ============ TIMELINE CHART ============
function renderTimeline(d) {
  destroyChart('chart-timeline');
  if (!d.length) return;

  const dateMap = {};
  d.forEach(r => {
    if (!r.created_at) return;
    const date = new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    dateMap[date] = (dateMap[date] || 0) + 1;
  });

  const sortedDates = Object.entries(dateMap).reverse();
  if (!sortedDates.length) return;

  // Cumulative
  let cumulative = 0;
  const cumData = sortedDates.map(([date, count]) => {
    cumulative += count;
    return cumulative;
  });

  chartInstances['chart-timeline'] = new Chart(document.getElementById('chart-timeline'), {
    type: 'line',
    data: {
      labels: sortedDates.map(e => e[0]),
      datasets: [
        {
          label: 'Per Hari',
          data: sortedDates.map(e => e[1]),
          backgroundColor: 'rgba(99,102,241,0.15)',
          borderColor: '#6366f1',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
          pointBorderWidth: 0,
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Kumulatif',
          data: cumData,
          borderColor: '#10b981',
          borderWidth: 2,
          borderDash: [5, 3],
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          pointBorderWidth: 0,
          fill: false,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 14, font: { size: 11, family: 'Inter' }, color: '#94a3b8' }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, position: 'left', ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 }, title: { display: true, text: 'Per Hari', color: '#64748b', font: { size: 10 } } },
        y1: { grid: { display: false }, beginAtZero: true, position: 'right', ticks: { color: '#10b981', font: { size: 10 } }, title: { display: true, text: 'Kumulatif', color: '#10b981', font: { size: 10 } } }
      }
    }
  });

  // Summary
  const peakDay = sortedDates.sort((a, b) => b[1] - a[1])[0];
  document.getElementById('summary-timeline').innerHTML = `💡 Pengisian terbanyak terjadi pada <strong>${peakDay[0]}</strong> dengan <strong>${peakDay[1]} responden</strong>. Total sudah mengisi: <strong>${d.length} mahasiswa</strong>.`;
}

// ============ CONCENTRATION DETAIL CARDS ============
function renderConcDetails(d) {
  const n = d.length;
  const container = document.getElementById('conc-detail-grid');

  container.innerHTML = CONCENTRATIONS.map(conc => {
    const count = d.filter(r => r.konsentrasi_id === conc.id).length;
    const pct = n ? Math.round(count / n * 100) : 0;

    // Kelas breakdown
    const kelasBreakdown = {};
    d.filter(r => r.konsentrasi_id === conc.id).forEach(r => {
      const k = r.kelas_type || 'Unknown';
      kelasBreakdown[k] = (kelasBreakdown[k] || 0) + 1;
    });
    const kelasHTML = Object.entries(kelasBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${KELAS_LABELS[k] || k}: ${v}`)
      .join(', ');

    const coursesHTML = conc.courses.map((c, i) => `
      <div class="conc-course-item">
        <div class="conc-course-num">${i + 1}</div>
        <div class="conc-course-name">${c.name}</div>
        <div class="conc-course-sks">${c.sks} SKS</div>
      </div>`).join('');

    return `
      <div class="conc-detail-card ${conc.key}">
        <div class="conc-detail-header">
          <div class="conc-detail-icon">${conc.icon}</div>
          <div class="conc-detail-info">
            <div class="conc-detail-name">${conc.name}</div>
            <div class="conc-detail-desc">${conc.description}</div>
          </div>
        </div>
        <div class="conc-detail-stats">
          <div class="conc-mini-stat">
            <div class="mini-val">${count}</div>
            <div class="mini-label">Mahasiswa</div>
          </div>
          <div class="conc-mini-stat">
            <div class="mini-val">${pct}%</div>
            <div class="mini-label">dari Total</div>
          </div>
        </div>
        ${kelasHTML ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:14px;padding:8px 10px;background:rgba(0,0,0,0.15);border-radius:6px">📊 ${kelasHTML}</div>` : ''}
        <div class="conc-courses-title">Mata Kuliah (16 SKS)</div>
        ${coursesHTML}
      </div>`;
  }).join('');
}

// ============ ALASAN (REASONS) ============
const STOPWORDS = new Set([
  'yang','dan','di','ke','dari','untuk','dengan','pada','adalah','ini','itu',
  'saya','aku','akan','bisa','juga','tidak','ada','sudah','lebih',
  'sangat','banyak','karena','agar','supaya','apa','bagaimana','merasa',
  'dalam','menjadi','secara','serta','oleh','hal','seperti','telah','belum',
  'dapat','harus','atau','maupun','namun','tetapi','jika','kalau','ketika',
  'setelah','sebelum','sedang','masih','pernah','mau','ingin','perlu',
  'tentang','terhadap','antara','melalui','hingga','sampai','sejak',
  'saat','waktu','sering','jarang','paling','cukup','kurang','terlalu',
  'lagi','baru','hanya','semua','setiap','beberapa','para','nya','kita',
  'kami','mereka','dia','ia','satu','dua','tersebut','yaitu','bahwa',
  'sebagai','menurut','tanpa','selain','baik','jadi',
  'sama','lain','begitu','pun','diri','sendiri','orang','memang',
  'ya','bagi','rata','cuma','nggak','gak','banget','aja','kalo','udah',
  'nih','sih','dong','deh','lah','kok','terus','bikin','dulu','gimana',
  'kayak','kali','yg','ga','maka','dgn','tp','jg','dll','dsb',
  'tak','me','se','ber','ter','per','an','kan','tapi','memilih','pilih',
  'konsentrasi','bidang','saya','minat','tertarik','karena','sangat',
  'ingin','mau','lebih','belajar','pengen','mempelajari'
]);

function extractKeywords(texts, limit = 18) {
  const freq = {};
  texts.forEach(text => {
    if (!text) return;
    const words = text.toString().toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w));
    const seen = new Set();
    words.forEach(w => {
      if (!seen.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
        seen.add(w);
      }
    });
  });
  return Object.entries(freq)
    .filter(e => e[1] >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function renderAlasan(d) {
  // Build filter chips
  const filterRow = document.getElementById('alasan-filter-row');
  filterRow.innerHTML = `<button class="alasan-chip ${alasanConcFilter === '' ? 'active' : ''}" onclick="filterAlasan('')">Semua</button>`;
  CONCENTRATIONS.forEach(c => {
    filterRow.innerHTML += `<button class="alasan-chip ${alasanConcFilter === c.id ? 'active' : ''}" onclick="filterAlasan('${c.id}')">${c.icon} ${c.shortName}</button>`;
  });

  // Filter data
  let filtered = d;
  if (alasanConcFilter) filtered = d.filter(r => r.konsentrasi_id === alasanConcFilter);
  const texts = filtered.map(r => r.alasan).filter(Boolean);

  // Keywords
  const keywords = extractKeywords(texts);
  renderKeywordCloud('keywords-alasan', keywords, filtered.length);

  // Responses
  document.getElementById('count-alasan').textContent = `(${texts.length})`;
  const container = document.getElementById('responses-alasan');
  const responses = filtered.filter(r => r.alasan && r.alasan.toString().trim());
  if (!responses.length) {
    container.innerHTML = '<div class="no-data">Belum ada alasan yang diberikan</div>';
    return;
  }

  container.innerHTML = responses.map(r => {
    const conc = CONCENTRATIONS.find(c => c.id === r.konsentrasi_id);
    const concKey = conc ? conc.key : '';
    const concLabel = conc ? conc.shortName : '';
    return `
      <div class="response-item ${concKey}">
        <div class="response-text">"${escapeHtml(r.alasan)}"</div>
        <div class="response-meta">
          <span class="response-name">${escapeHtml(r.nama || 'Anonim')}</span>
          ${concLabel ? `<span class="response-conc-tag ${concKey}">${concLabel}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

function filterAlasan(concId) {
  alasanConcFilter = concId;
  renderAlasan(getFiltered());
}

function renderKeywordCloud(containerId, keywords, total) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!keywords.length) {
    el.innerHTML = '<span class="no-data">Belum ada kata kunci</span>';
    return;
  }
  const maxCount = keywords[0][1];
  const TAG_COLORS = [
    { bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.35)', text: '#67e8f9' },
    { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', text: '#c4b5fd' },
    { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#fcd34d' },
    { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.35)', text: '#a5b4fc' },
    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#6ee7b7' },
    { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', text: '#f9a8d4' },
  ];
  el.innerHTML = keywords.map((kw, i) => {
    const size = 0.72 + (kw[1] / maxCount) * 0.45;
    const color = TAG_COLORS[i % TAG_COLORS.length];
    const pct = total ? Math.round(kw[1] / total * 100) : 0;
    return `<span class="kw-tag" style="font-size:${size}rem;background:${color.bg};border-color:${color.border};color:${color.text}" title="${kw[1]} responden (${pct}%)">${kw[0]} <small>${kw[1]}</small></span>`;
  }).join('');
}

// ============ PARTICIPATION PROGRESS ============
function renderParticipation(d) {
  const container = document.getElementById('participation-grid');
  const kelasTypes = [...new Set(allData.map(r => r.kelas_type).filter(Boolean))].sort();

  // Count total students per kelas from kelasMap
  const totalPerKelas = {};
  Object.values(kelasMap).forEach(k => {
    totalPerKelas[k] = (totalPerKelas[k] || 0) + 1;
  });

  // Count filled per kelas
  let html = '';
  kelasTypes.forEach(k => {
    const total = totalPerKelas[k] || 0;
    const filled = allData.filter(r => r.kelas_type === k).length;
    const pct = total ? Math.round(filled / total * 100) : 0;
    const label = KELAS_LABELS[k] || k;

    html += `
      <div class="participation-card">
        <div class="participation-header">
          <span class="participation-label">${label}</span>
          <span class="participation-count">${filled} / ${total} mahasiswa</span>
        </div>
        <div class="participation-bar-bg">
          <div class="participation-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="participation-pct">${pct}% sudah mengisi</div>
      </div>`;
  });

  // Overall
  const totalStudents = Object.keys(kelasMap).length;
  const totalFilled = allData.length;
  const overallPct = totalStudents ? Math.round(totalFilled / totalStudents * 100) : 0;

  html = `
    <div class="participation-card" style="border-left:3px solid var(--accent)">
      <div class="participation-header">
        <span class="participation-label">📊 Keseluruhan</span>
        <span class="participation-count">${totalFilled} / ${totalStudents} mahasiswa</span>
      </div>
      <div class="participation-bar-bg">
        <div class="participation-bar-fill" style="width:${overallPct}%"></div>
      </div>
      <div class="participation-pct">${overallPct}% sudah mengisi</div>
    </div>` + html;

  container.innerHTML = html;
}

// ============ TABLE ============
const TABLE_COLS = [
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'kelas_type', label: 'Kelas' },
  { key: 'konsentrasi_id', label: 'Konsentrasi' },
  { key: 'alasan', label: 'Alasan' },
  { key: 'created_at', label: 'Waktu Pengisian' }
];

function bindTableFilters() {
  document.getElementById('search').addEventListener('input', renderTable);
  document.getElementById('filter-konsentrasi').addEventListener('change', renderTable);
}

function getTableData() {
  const q = document.getElementById('search').value.toLowerCase();
  const conc = document.getElementById('filter-konsentrasi').value;
  let data = getFiltered();
  return data.filter(r => {
    if (q && !r.nim?.toLowerCase().includes(q) && !r.nama?.toLowerCase().includes(q)) return false;
    if (conc && r.konsentrasi_id !== conc) return false;
    return true;
  });
}

function renderTable() {
  const filtered = getTableData();
  const total = getFiltered().length;
  document.getElementById('row-count').textContent = `${filtered.length} dari ${total} data`;

  const thead = document.getElementById('table-head');
  thead.innerHTML = '<tr>' + TABLE_COLS.map(c => `<th>${c.label}</th>`).join('') + '</tr>';

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = filtered.map(r => {
    return '<tr>' + TABLE_COLS.map(c => {
      let v = r[c.key];
      if (c.key === 'created_at') {
        v = v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
      } else if (c.key === 'konsentrasi_id') {
        const conc = CONCENTRATIONS.find(cc => cc.id === v);
        if (conc) {
          v = `<span class="conc-badge ${conc.key}">${conc.icon} ${conc.shortName}</span>`;
        } else {
          v = v || '-';
        }
      } else if (c.key === 'kelas_type') {
        v = v ? `<span class="kelas-badge">${KELAS_LABELS[v] || v}</span>` : '-';
      } else if (c.key === 'alasan') {
        v = v ? (v.length > 60 ? escapeHtml(v.substring(0, 60)) + '…' : escapeHtml(v)) : '<span style="color:var(--text-muted)">-</span>';
      } else {
        v = v ?? '-';
      }
      return `<td>${v}</td>`;
    }).join('') + '</tr>';
  }).join('');
}

// ============ EXPORT CSV ============
function exportCSV() {
  const filtered = getTableData();
  const keys = ['nim', 'nama', 'kelas_type', 'konsentrasi', 'konsentrasi_id', 'alasan', 'created_at'];
  let csv = keys.join(',') + '\n';
  filtered.forEach(r => {
    csv += keys.map(k => {
      let v = r[k];
      if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n')))
        v = '"' + v.replace(/"/g, '""') + '"';
      return v ?? '';
    }).join(',') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `peminatan_konsentrasi_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ============ INSIGHTS ============
function renderInsights(d) {
  const container = document.getElementById('insight-content');
  if (!container || !d.length) {
    if (container) container.innerHTML = '<p class="insight-empty">Tidak ada data untuk dianalisis.</p>';
    return;
  }

  const n = d.length;
  const kelasLabel = globalKelas ? ` kelas ${KELAS_LABELS[globalKelas] || globalKelas}` : '';

  // Count concentrations
  const concCounts = {};
  CONCENTRATIONS.forEach(c => { concCounts[c.id] = 0; });
  d.forEach(r => { if (concCounts[r.konsentrasi_id] !== undefined) concCounts[r.konsentrasi_id]++; });

  const sorted = CONCENTRATIONS.map(c => ({
    ...c,
    count: concCounts[c.id],
    pct: Math.round(concCounts[c.id] / n * 100)
  })).sort((a, b) => b.count - a.count);

  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  // Kelas breakdown
  const kelasTypes = [...new Set(d.map(r => r.kelas_type).filter(Boolean))].sort();
  const kelasFavorites = {};
  kelasTypes.forEach(k => {
    const kelasData = d.filter(r => r.kelas_type === k);
    if (!kelasData.length) return;
    const counts = CONCENTRATIONS.map(c => ({
      name: c.shortName,
      count: kelasData.filter(r => r.konsentrasi_id === c.id).length
    })).sort((a, b) => b.count - a.count);
    kelasFavorites[k] = counts[0];
  });

  // Alasan analysis
  const alasanTexts = d.map(r => r.alasan).filter(Boolean);
  const keywords = extractKeywords(alasanTexts, 5);

  let html = '';

  // 1. Overview
  html += `<div class="insight-block">
    <div class="insight-title">📊 Gambaran Umum</div>
    <p>Dari total <strong>${n} mahasiswa${kelasLabel}</strong> yang telah mengisi peminatan, 
    konsentrasi yang paling banyak diminati adalah <strong>${top.icon} ${top.shortName}</strong> 
    dengan <strong>${top.count} mahasiswa (${top.pct}%)</strong>. 
    ${sorted.length > 1 ? `Di urutan kedua terdapat <strong>${sorted[1].icon} ${sorted[1].shortName}</strong> 
    dengan <strong>${sorted[1].count} mahasiswa (${sorted[1].pct}%)</strong>. ` : ''}
    Konsentrasi dengan peminat paling sedikit adalah <strong>${bottom.icon} ${bottom.shortName}</strong> 
    sebanyak <strong>${bottom.count} mahasiswa (${bottom.pct}%)</strong>.</p>
  </div>`;

  // 2. Kelas Analysis
  if (kelasTypes.length) {
    html += `<div class="insight-block">
      <div class="insight-title">🏫 Analisis per Kelas</div>
      <p>`;
    kelasTypes.forEach(k => {
      const fav = kelasFavorites[k];
      const total = d.filter(r => r.kelas_type === k).length;
      if (fav) {
        const favPct = Math.round(fav.count / total * 100);
        html += `Pada kelas <strong>${KELAS_LABELS[k] || k}</strong> (${total} mahasiswa), konsentrasi terfavorit adalah <strong>${fav.name}</strong> (${favPct}%). `;
      }
    });
    html += `</p></div>`;
  }

  // 3. Distribusi & Balance
  const maxPct = top.pct;
  const minPct = bottom.pct;
  const spread = maxPct - minPct;

  html += `<div class="insight-block">
    <div class="insight-title">⚖️ Keseimbangan Distribusi</div>
    <p>`;
  if (spread <= 10) {
    html += `Distribusi peminatan cukup <strong>merata</strong> dengan selisih hanya <strong>${spread}%</strong> antara konsentrasi terpopuler dan yang paling sedikit diminati. Ini menunjukkan ketiga konsentrasi sama-sama menarik bagi mahasiswa.`;
  } else if (spread <= 25) {
    html += `Terdapat perbedaan yang <strong>cukup signifikan</strong> (selisih <strong>${spread}%</strong>) antara konsentrasi terpopuler (<strong>${top.shortName}</strong>) dan yang paling sedikit diminati (<strong>${bottom.shortName}</strong>). Perlu dipertimbangkan apakah konsentrasi yang kurang diminati perlu promosi lebih lanjut.`;
  } else {
    html += `Distribusi peminatan <strong>tidak merata</strong> dengan selisih <strong>${spread}%</strong>. Konsentrasi <strong>${top.shortName}</strong> sangat mendominasi, sementara <strong>${bottom.shortName}</strong> memerlukan perhatian khusus. Disarankan untuk mensosialisasikan prospek karier dan keunggulan konsentrasi yang kurang diminati.`;
  }
  html += `</p></div>`;

  // 4. Alasan
  if (keywords.length) {
    html += `<div class="insight-block">
      <div class="insight-title">✍️ Analisis Alasan</div>
      <p>Dari <strong>${alasanTexts.length} mahasiswa</strong> yang memberikan alasan, 
      kata kunci yang paling sering muncul adalah ${keywords.map(k => `<strong>${k[0]}</strong>`).join(', ')}. 
      Ini mengindikasikan bahwa faktor-faktor tersebut menjadi pertimbangan utama mahasiswa dalam memilih konsentrasi.</p>
    </div>`;
  }

  // 5. Participation
  const totalStudents = Object.keys(kelasMap).length;
  const participationPct = totalStudents ? Math.round(allData.length / totalStudents * 100) : 0;

  if (totalStudents) {
    html += `<div class="insight-block">
      <div class="insight-title">📈 Tingkat Partisipasi</div>
      <p>Saat ini <strong>${allData.length} dari ${totalStudents} mahasiswa (${participationPct}%)</strong> sudah mengisi formulir peminatan. 
      ${participationPct >= 80 ? 'Tingkat partisipasi sudah sangat baik!' :
        participationPct >= 50 ? 'Masih ada cukup banyak mahasiswa yang belum mengisi. Perlu pengingat tambahan.' :
        'Tingkat partisipasi masih rendah. Diperlukan upaya lebih untuk mendorong mahasiswa mengisi formulir.'}</p>
    </div>`;
  }

  // 6. Conclusion
  html += `<div class="insight-block insight-summary">
    <div class="insight-title">📝 Kesimpulan</div>
    <p>Berdasarkan data peminatan${kelasLabel}, konsentrasi <strong>${top.icon} ${top.shortName}</strong> 
    menjadi pilihan utama mahasiswa (${top.pct}%). 
    ${sorted.length >= 3 ? `Distribusi pilihan: ${sorted.map(s => `${s.icon} ${s.shortName} (${s.pct}%)`).join(', ')}. ` : ''}
    ${spread > 20 ? `Perlu strategi untuk menyeimbangkan minat mahasiswa agar distribusi lebih merata. ` : ''}
    Data ini dapat menjadi acuan dalam perencanaan kapasitas kelas, alokasi dosen, dan penyiapan fasilitas praktikum untuk masing-masing konsentrasi.</p>
  </div>`;

  container.innerHTML = html;
}

// ============ HELPERS ============
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Chart.js defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
Chart.defaults.font.family = 'Inter';
