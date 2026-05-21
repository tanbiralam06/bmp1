/**
 * qAMI MOBILE UI PROTOTYPE - INTERACTION LOGIC
 * Powered by Vanilla JS, Chart.js, & Lucide Icons
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // ROOM CONFIGURATION DATA & STATES
  // ==========================================================================
  const ROOM_DATA = {
    ivf_ot: {
      name: "Cloudnine IVF OT",
      score: 98,
      status: "ULTRA SAFE",
      cfu: 4,
      co2: 410,
      pm25: 3.2,
      tvoc: 85,
      temp: 22.4,
      humid: 46,
      uv: true,
      fan: 2, // Auto
      silent: false,
      co2Threshold: 600,
      pm25Threshold: 12.0,
      filterLife: 87
    },
    icu_1: {
      name: "ICU Ward 1",
      score: 94,
      status: "SAFE STATUS",
      cfu: 14,
      co2: 472,
      pm25: 7.8,
      tvoc: 115,
      temp: 21.8,
      humid: 50,
      uv: true,
      fan: 2, // Auto
      silent: false,
      co2Threshold: 650,
      pm25Threshold: 15.0,
      filterLife: 62
    },
    nicu: {
      name: "Neo-Natal ICU (NICU)",
      score: 99,
      status: "STERILE STATE",
      cfu: 2,
      co2: 395,
      pm25: 1.8,
      tvoc: 68,
      temp: 23.0,
      humid: 44,
      uv: true,
      fan: 2,
      silent: true,
      co2Threshold: 550,
      pm25Threshold: 8.0,
      filterLife: 94
    },
    post_op: {
      name: "Post-Operative Recovery",
      score: 74,
      status: "WARN LEVEL",
      cfu: 58,
      co2: 685,
      pm25: 18.4,
      tvoc: 242,
      temp: 22.1,
      humid: 54,
      uv: false,
      fan: 1, // Min
      silent: false,
      co2Threshold: 700,
      pm25Threshold: 20.0,
      filterLife: 41
    }
  };

  // State Controller
  let currentRoomKey = 'ivf_ot';
  let activeState = { ...ROOM_DATA[currentRoomKey] };
  let telemetryInterval = null;
  let hapticsEnabled = true;
  let calibrationEnabled = true;

  // Unified Haptic Tactile feedback triggers
  function triggerHaptic(pattern) {
    if (hapticsEnabled && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Fallback silently if vibration permission is denied by browser context
      }
    }
  }

  // Layout 2 State Variables
  let trendsChartInstance = null;
  let activeParam = 'cfu';
  let activePeriod = '24h';

  // Cache DOM Elements (Dashboard)
  const safetyGaugeFill = document.getElementById('safetyGaugeFill');
  const safetyScoreText = document.getElementById('safetyScoreText');
  const safetyStatusText = document.getElementById('safetyStatusText');
  const activeRoomLabel = document.getElementById('activeRoomLabel');

  // Telemetry elements
  const metricCfu = document.getElementById('metricCfu');
  const metricCo2 = document.getElementById('metricCo2');
  const metricPm25 = document.getElementById('metricPm25');
  const metricTvoc = document.getElementById('metricTvoc');
  const metricTemp = document.getElementById('metricTemp');
  const metricHumid = document.getElementById('metricHumid');

  // Controls elements
  const toggleUv = document.getElementById('toggleUv');
  const toggleSilent = document.getElementById('toggleSilent');
  const cardUv = document.getElementById('cardUv');
  const cardSilent = document.getElementById('cardSilent');
  const cardFan = document.getElementById('cardFan');
  const statusTextUv = document.getElementById('statusTextUv');
  const statusTextSilent = document.getElementById('statusTextSilent');
  const statusTextFan = document.getElementById('statusTextFan');
  const fanIcon = document.getElementById('fanIcon');

  // Bottom Sheet elements
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationSheet = document.getElementById('notificationSheet');
  const bottomSheetOverlay = document.getElementById('bottomSheetOverlay');
  const sheetCloseBtn = document.getElementById('sheetCloseBtn');

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function init() {
    // Graceful Lucide Icons fallback
    if (typeof lucide !== 'undefined') {
      try {
        lucide.createIcons();
      } catch (err) {
        console.error("Lucide failed to create icons:", err);
      }
    } else {
      console.warn("Lucide library not loaded. Icons will be empty or text.");
    }

    updateClock();
    setInterval(updateClock, 1000);

    // Initialize Layout 2 Interactive Charts
    try {
      initChart();
    } catch (err) {
      console.error("Chart.js failed to initialize:", err);
    }

    // Set active room configurations
    loadRoomState(currentRoomKey);

    // Initialize Layout 3 Interactive AI Chat
    initAiChat();

    // Attach Event Listeners
    setupEventListeners();

    // Start dynamic sensor simulations
    startSensorSimulation();
  }

  // Sync Phone Clock with local OS Time
  function updateClock() {
    const statusTime = document.getElementById('statusTime');
    if (statusTime) {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const strHours = hours < 10 ? '0' + hours : hours;
      const strMinutes = minutes < 10 ? '0' + minutes : minutes;
      statusTime.textContent = `${strHours}:${strMinutes}`;
    }
  }

  // ==========================================================================
  // SAFETY GAUGE MATHEMATICS (Ring Stroke Dash Offset)
  // ==========================================================================

  function updateSafetyGauge(score) {
    if (!safetyGaugeFill) return;
    const radius = 85;
    const circumference = 2 * Math.PI * radius; // Approx 534.07

    const offset = circumference - (score / 100) * circumference;

    safetyGaugeFill.style.strokeDasharray = `${circumference}`;
    safetyGaugeFill.style.strokeDashoffset = `${offset}`;

    animateNumberCounter(safetyScoreText, parseInt(safetyScoreText.textContent) || 0, score);

    const glow = document.querySelector('.gauge-glow-effect');
    if (score >= 95) {
      safetyGaugeFill.style.stroke = 'var(--primary)';
      safetyGaugeFill.style.filter = 'drop-shadow(0px 0px 10px rgba(169, 189, 61, 0.75))';
      safetyStatusText.style.color = 'var(--primary)';
      safetyStatusText.textContent = "ULTRA SAFE";
      if (glow) glow.style.backgroundColor = 'rgba(169, 189, 61, 0.18)';
    } else if (score >= 85) {
      safetyGaugeFill.style.stroke = 'var(--status-safe)';
      safetyGaugeFill.style.filter = 'drop-shadow(0px 0px 10px rgba(16, 185, 129, 0.75))';
      safetyStatusText.style.color = 'var(--status-safe)';
      safetyStatusText.textContent = "SAFE LIMIT";
      if (glow) glow.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
    } else if (score >= 70) {
      safetyGaugeFill.style.stroke = 'var(--status-warning)';
      safetyGaugeFill.style.filter = 'drop-shadow(0px 0px 10px rgba(245, 158, 11, 0.75))';
      safetyStatusText.style.color = 'var(--status-warning)';
      safetyStatusText.textContent = "MODERATE INDEX";
      if (glow) glow.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
    } else {
      safetyGaugeFill.style.stroke = 'var(--status-danger)';
      safetyGaugeFill.style.filter = 'drop-shadow(0px 0px 10px rgba(239, 68, 68, 0.75))';
      safetyStatusText.style.color = 'var(--status-danger)';
      safetyStatusText.textContent = "ALERT THRESHOLD";
      if (glow) glow.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
    }
  }

  // Smooth integer transition animation
  function animateNumberCounter(element, start, end) {
    if (!element || start === end) return;
    const range = end - start;
    const duration = 800; // 0.8s
    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = Math.floor(start + progress * range);
      element.textContent = current;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = end;
      }
    }
    window.requestAnimationFrame(step);
  }

  // ==========================================================================
  // ROOM STATE LOADER
  // ==========================================================================

  function loadRoomState(roomKey) {
    currentRoomKey = roomKey;
    activeState = { ...ROOM_DATA[roomKey] };

    // Update labels across BOTH layouts
    activeRoomLabel.textContent = activeState.name;
    const analyticsLabel = document.getElementById('activeRoomLabelAnalytics');
    if (analyticsLabel) analyticsLabel.textContent = activeState.name;

    // Synchronize both sets of room pills (Dashboard + Analytics)
    document.querySelectorAll(`.room-pill[data-room="${roomKey}"]`).forEach(btn => {
      const parent = btn.parentElement;
      parent.querySelectorAll('.room-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    });

    // Update dial safety index
    updateSafetyGauge(activeState.score);

    // Load physical telemetry values
    metricCfu.textContent = activeState.cfu;
    metricCo2.textContent = activeState.co2;
    metricPm25.textContent = activeState.pm25.toFixed(1);
    metricTvoc.textContent = activeState.tvoc;
    metricTemp.textContent = activeState.temp.toFixed(1);
    metricHumid.textContent = activeState.humid;

    // Recalibrate Badges depending on values
    updateTelemetryBadges();

    // Sync UV Control State
    toggleUv.checked = activeState.uv;
    if (activeState.uv) {
      cardUv.classList.add('active-state');
      statusTextUv.textContent = "Active & Sanitizing";
      cardUv.querySelector('.icon-frame').classList.add('uv-active');
      cardUv.querySelector('.control-icon').classList.add('spin-slow');
    } else {
      cardUv.classList.remove('active-state');
      statusTextUv.textContent = "Inactive / Off";
      cardUv.querySelector('.icon-frame').classList.remove('uv-active');
      cardUv.querySelector('.control-icon').classList.remove('spin-slow');
    }

    // Sync Silent Protection State
    toggleSilent.checked = activeState.silent;
    if (activeState.silent) {
      cardSilent.classList.add('active-state');
      statusTextSilent.textContent = "Low Noise engaged";
    } else {
      cardSilent.classList.remove('active-state');
      statusTextSilent.textContent = "Standard Operation";
    }

    // Sync ACH Speed Level state
    updateFanSpeedUI(activeState.fan);

    // Layout 2 Update Actions
    populateLogsFeed(roomKey);
    updateChartData();

    // Layout 3 Update Actions
    const aiLabel = document.getElementById('activeRoomLabelAi');
    if (aiLabel) aiLabel.textContent = activeState.name;
    updateAiDiagnosticsUI();
    populateAiRecommendations();

    // Settings Page Update Actions
    syncSettingsPageUI();
  }

  function syncSettingsPageUI() {
    const settingsLabel = document.getElementById('activeRoomLabelSettings');
    if (settingsLabel) settingsLabel.textContent = activeState.name;

    const co2Slider = document.getElementById('co2ThresholdSlider');
    const co2Val = document.getElementById('co2ThresholdVal');
    const pm25Slider = document.getElementById('pm25ThresholdSlider');
    const pm25Val = document.getElementById('pm25ThresholdVal');

    if (co2Slider && co2Val) {
      co2Slider.value = activeState.co2Threshold || 600;
      co2Val.textContent = `${co2Slider.value} ppm`;
    }
    if (pm25Slider && pm25Val) {
      pm25Slider.value = activeState.pm25Threshold || 12.0;
      pm25Val.textContent = `${parseFloat(pm25Slider.value).toFixed(1)} µg`;
    }

    const filterBar = document.getElementById('filterBarFill');
    const filterText = document.getElementById('filterPercentText');
    const filterEst = document.querySelector('.filter-estimate');

    if (filterBar && filterText) {
      const life = activeState.filterLife || 87;
      filterBar.style.width = `${life}%`;
      filterText.textContent = `${life}%`;
      if (filterEst) {
        const days = Math.round(life * 2.8); // estimate days left based on life %
        filterEst.textContent = `Est. replacement in ${days} days`;
      }

      if (life > 50) {
        filterBar.style.background = 'linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 100%)';
      } else if (life > 20) {
        filterBar.style.background = 'linear-gradient(90deg, var(--status-warning) 0%, var(--status-warning) 100%)';
      } else {
        filterBar.style.background = 'linear-gradient(90deg, var(--status-danger) 0%, var(--status-danger) 100%)';
      }
    }

    const toggleHaptics = document.getElementById('toggleHaptics');
    if (toggleHaptics) {
      toggleHaptics.checked = hapticsEnabled;
    }

    const toggleCalibration = document.getElementById('toggleCalibration');
    if (toggleCalibration) {
      toggleCalibration.checked = calibrationEnabled;
    }

    const calBadge = document.querySelector('.calibration-badge');
    if (calBadge) {
      if (calibrationEnabled) {
        calBadge.className = 'calibration-badge green';
        calBadge.innerHTML = '<span class="calibration-dot"></span>Calibrated';
      } else {
        calBadge.className = 'calibration-badge yellow';
        calBadge.innerHTML = '<span class="calibration-dot warning"></span>Manual Mode';
      }
    }
  }

  function updateTelemetryBadges() {
    // Bacterial Badge (CFU)
    const cfuVal = parseInt(metricCfu.textContent);
    const cfuCard = metricCfu.closest('.telemetry-card');
    const cfuBadge = cfuCard ? cfuCard.querySelector('.tel-badge') : null;
    if (cfuBadge) {
      cfuBadge.className = 'tel-badge';
      if (cfuVal <= 10) {
        cfuBadge.classList.add('safe');
        cfuBadge.textContent = 'Sterile Limit';
      } else if (cfuVal <= 50) {
        cfuBadge.classList.add('warn');
        cfuBadge.textContent = 'Moderate';
      } else {
        cfuBadge.classList.add('danger');
        cfuBadge.textContent = 'High Load';
      }
    }

    // PM2.5 Badge
    const pmVal = parseFloat(metricPm25.textContent);
    const pmCard = metricPm25.closest('.telemetry-card');
    const pmBadge = pmCard ? pmCard.querySelector('.tel-badge') : null;
    if (pmBadge) {
      pmBadge.className = 'tel-badge';
      if (pmVal <= 10) {
        pmBadge.classList.add('safe');
        pmBadge.textContent = 'Clean Air';
      } else if (pmVal <= 25) {
        pmBadge.classList.add('warn');
        pmBadge.textContent = 'Acceptable';
      } else {
        pmBadge.classList.add('danger');
        pmBadge.textContent = 'Poor';
      }
    }
  }

  function updateFanSpeedUI(speed) {
    const buttons = document.querySelectorAll('.speed-btn');
    buttons.forEach(btn => {
      if (parseInt(btn.getAttribute('data-speed')) === speed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const frame = cardFan.querySelector('.icon-frame');

    if (speed === 1) { // Min
      statusTextFan.textContent = "Silent Shield Mode (4.0 ACH)";
      fanIcon.className = "control-icon spin-slow";
      frame.classList.add('fan-active');
      cardFan.classList.add('active-state');
    } else if (speed === 2) { // Auto
      statusTextFan.textContent = "Auto Flow Boost (8.5 ACH)";
      fanIcon.className = "control-icon spin-fast";
      frame.classList.add('fan-active');
      cardFan.classList.remove('active-state');
    } else if (speed === 3) { // Max
      statusTextFan.textContent = "Maximum Sanitization (12.0 ACH)";
      fanIcon.className = "control-icon spin-fast";
      frame.classList.add('fan-active');
      cardFan.classList.add('active-state');
      fanIcon.style.animationDuration = '0.5s';
    } else {
      statusTextFan.textContent = "System Fans Idle";
      fanIcon.className = "control-icon";
      frame.classList.remove('fan-active');
      cardFan.classList.remove('active-state');
    }

    if (speed !== 3) {
      fanIcon.style.animationDuration = '';
    }
  }

  // ==========================================================================
  // LAYOUT 2: CHARTJS INTEGRATION & DYNAMIC UPDATING
  // ==========================================================================

  function initChart() {
    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
      console.warn("Chart.js not loaded. Displaying offline trends placeholder.");
      const wrapper = canvas.parentElement;
      if (wrapper) {
        wrapper.innerHTML = `
          <div class="offline-chart-placeholder" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
            text-align: center;
            border: 1px dashed rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.01);
            color: var(--text-secondary);
            padding: 20px;
          ">
            <i data-lucide="wifi-off" style="width: 32px; height: 32px; color: var(--primary); margin-bottom: 8px;"></i>
            <span style="font-family: var(--font-title); font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 4px;">Offline Mode Analytics</span>
            <span style="font-size: 11px; max-width: 220px; line-height: 1.4; color: var(--text-secondary);">Connecting to Chart.js CDN failed. Reconnect to load interactive vector charts.</span>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
      return;
    }

    const ctx = canvas.getContext('2d');

    // Set custom visual gradient fill representing the brand
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 180);
    gradientFill.addColorStop(0, 'rgba(169, 189, 61, 0.22)');
    gradientFill.addColorStop(1, 'rgba(169, 189, 61, 0.00)');

    const config = {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Trend Readings',
          data: [],
          borderColor: '#A9BD3D',
          borderWidth: 2.5,
          pointBackgroundColor: '#A9BD3D',
          pointBorderColor: '#111724',
          pointBorderWidth: 1.5,
          pointRadius: 4.5,
          pointHoverRadius: 6.5,
          tension: 0.35,
          fill: true,
          backgroundColor: gradientFill
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131A27',
            titleColor: '#8E9BAF',
            bodyColor: '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            titleFont: { family: 'Outfit', size: 10 },
            bodyFont: { family: 'Inter', weight: 'bold', size: 13 },
            callbacks: {
              label: function (context) {
                let val = context.parsed.y;
                let unit = getUnitForParam(activeParam);
                return `${val} ${unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8E9BAF', font: { family: 'Outfit', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#8E9BAF', font: { family: 'Outfit', size: 10 } }
          }
        }
      }
    };

    trendsChartInstance = new Chart(ctx, config);
  }

  function syncChartTheme(isLight) {
    if (!trendsChartInstance) return;

    const tooltip = trendsChartInstance.options.plugins.tooltip;
    const scales = trendsChartInstance.options.scales;

    if (isLight) {
      tooltip.backgroundColor = '#FFFFFF';
      tooltip.bodyColor = '#1E293B';
      tooltip.borderColor = 'rgba(0, 0, 0, 0.08)';
      scales.x.ticks.color = '#475569';
      scales.y.ticks.color = '#475569';
      scales.y.grid.color = 'rgba(0, 0, 0, 0.06)';

      trendsChartInstance.data.datasets[0].pointBorderColor = '#FFFFFF';
    } else {
      tooltip.backgroundColor = '#131A27';
      tooltip.bodyColor = '#FFFFFF';
      tooltip.borderColor = 'rgba(255,255,255,0.06)';
      scales.x.ticks.color = '#8E9BAF';
      scales.y.ticks.color = '#8E9BAF';
      scales.y.grid.color = 'rgba(255, 255, 255, 0.04)';

      trendsChartInstance.data.datasets[0].pointBorderColor = '#111724';
    }

    trendsChartInstance.update();
  }

  function getUnitForParam(param) {
    switch (param) {
      case 'cfu': return 'CFU/m³';
      case 'pm25': return 'µg/m³';
      case 'co2': return 'ppm';
      case 'tvoc': return 'Index';
      default: return '';
    }
  }

  // Mock Trend Analytics Database
  const CHART_DATABASE = {
    ivf_ot: {
      cfu: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [5, 3, 2, 7, 4, 3] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [6, 4, 3, 5, 8, 4, 3] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [8, 5, 4, 3] }
      },
      pm25: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [2.5, 3.8, 4.2, 3.0, 2.1, 2.8] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [3.1, 2.9, 3.5, 4.0, 3.8, 2.5, 3.2] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [4.2, 3.8, 3.1, 2.9] }
      },
      co2: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [405, 415, 420, 412, 400, 408] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [412, 418, 408, 422, 430, 415, 410] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [425, 420, 415, 410] }
      },
      tvoc: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [80, 85, 92, 88, 75, 82] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [85, 90, 82, 88, 95, 80, 84] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [92, 88, 85, 82] }
      }
    },
    icu_1: {
      cfu: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [18, 22, 16, 12, 14, 15] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [12, 15, 18, 22, 19, 14, 13] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [20, 18, 16, 14] }
      },
      pm25: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [6.5, 8.2, 9.4, 8.0, 6.8, 7.5] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [8.5, 9.0, 7.8, 8.2, 9.5, 7.0, 7.6] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [9.2, 8.5, 8.0, 7.8] }
      },
      co2: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [460, 482, 490, 475, 465, 470] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [465, 475, 485, 492, 480, 468, 472] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [490, 482, 478, 472] }
      },
      tvoc: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [110, 118, 125, 120, 112, 115] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [115, 122, 120, 118, 126, 110, 114] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [125, 120, 118, 115] }
      }
    },
    nicu: {
      cfu: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [2, 1, 3, 2, 4, 2] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [3, 2, 2, 4, 3, 1, 2] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [4, 3, 2, 2] }
      },
      pm25: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [1.5, 2.0, 2.2, 1.8, 1.6, 1.7] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [2.0, 1.8, 2.1, 2.4, 2.2, 1.5, 1.8] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [2.5, 2.2, 2.0, 1.8] }
      },
      co2: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [390, 395, 400, 396, 392, 394] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [395, 402, 398, 405, 400, 392, 395] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [405, 400, 396, 395] }
      },
      tvoc: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [65, 70, 72, 68, 66, 67] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [70, 72, 68, 74, 71, 65, 68] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [75, 71, 69, 68] }
      }
    },
    post_op: {
      cfu: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [42, 58, 72, 62, 54, 48] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [55, 64, 72, 58, 42, 50, 58] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [78, 62, 55, 58] }
      },
      pm25: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [14.5, 18.4, 24.2, 21.0, 16.8, 18.0] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [16.5, 19.0, 24.2, 22.0, 15.6, 17.0, 18.4] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [22.2, 19.5, 17.0, 18.4] }
      },
      co2: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [650, 685, 720, 695, 660, 672] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [670, 690, 715, 685, 640, 660, 685] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [740, 715, 680, 685] }
      },
      tvoc: {
        '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [220, 242, 265, 250, 230, 238] },
        '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [230, 252, 260, 248, 215, 228, 242] },
        '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [275, 260, 238, 242] }
      }
    }
  };

  function updateChartData() {
    if (!trendsChartInstance) return;

    // Fallback in case period 'custom' is active
    let periodKey = activePeriod === 'custom' ? '7d' : activePeriod;

    // Get dataset
    const roomDataset = CHART_DATABASE[currentRoomKey];
    if (!roomDataset) return;

    const paramDataset = roomDataset[activeParam];
    if (!paramDataset) return;

    const plotData = paramDataset[periodKey];
    if (!plotData) return;

    // Adjust colors depending on parameter
    const glowColor = getChartColorForParam(activeParam);
    trendsChartInstance.data.datasets[0].borderColor = glowColor;
    trendsChartInstance.data.datasets[0].pointBackgroundColor = glowColor;

    // Recreate area gradient fill with new color
    const ctx = document.getElementById('trendsChart').getContext('2d');
    const newGradient = ctx.createLinearGradient(0, 0, 0, 180);
    newGradient.addColorStop(0, hexToRgba(glowColor, 0.22));
    newGradient.addColorStop(1, hexToRgba(glowColor, 0.00));
    trendsChartInstance.data.datasets[0].backgroundColor = newGradient;

    // Load labels and values
    trendsChartInstance.data.labels = plotData.labels;
    trendsChartInstance.data.datasets[0].data = plotData.values;

    // Trigger animated chart update
    trendsChartInstance.update('active');
  }

  function getChartColorForParam(param) {
    switch (param) {
      case 'cfu': return '#A9BD3D';  // Brand Green/Lime
      case 'pm25': return '#3b82f6'; // Blue
      case 'co2': return '#8b5cf6';  // Purple
      case 'tvoc': return '#ec4899'; // Pink
      default: return '#A9BD3D';
    }
  }

  function hexToRgba(hex, alpha) {
    if (hex === '#A9BD3D') return `rgba(169, 189, 61, ${alpha})`;
    if (hex === '#3b82f6') return `rgba(59, 130, 246, ${alpha})`;
    if (hex === '#8b5cf6') return `rgba(139, 92, 246, ${alpha})`;
    if (hex === '#ec4899') return `rgba(236, 72, 153, ${alpha})`;
    return `rgba(255, 255, 255, ${alpha})`;
  }

  // ==========================================================================
  // HISTORICAL EVENT LOG GENERATOR (Layout 2 Feed list)
  // ==========================================================================

  const HISTORICAL_LOGS_DB = {
    ivf_ot: [
      { type: 'safe', title: 'Optimal Pathogen Clearance', desc: 'Bacterial load dropped to 4 CFU/m³ following maximum ACH cycle.', time: '14:20 PM', val: '4 CFU' },
      { type: 'safe', title: 'Self-Sanitization Complete', desc: 'UV-C sanitization cycle completed in 15 minutes.', time: '11:05 AM', val: '0 CFU' },
      { type: 'info', title: 'Sensor Alignment Diagnostics', desc: 'All ZeBox biological and physical sensors calibrated. Diagnostic: OK.', time: '08:00 AM', val: 'Normal' }
    ],
    icu_1: [
      { type: 'safe', title: 'Dust Anomaly Neutralized', desc: 'Particulate matter PM2.5 levels stabilized below 10 µg/m³ threshold.', time: '16:40 PM', val: '7.8 µg' },
      { type: 'info', title: 'Automated Fan Increase', desc: 'Air exchange speed increased to Auto Mode following patient check.', time: '12:15 PM', val: '8.5 ACH' },
      { type: 'warn', title: 'Minor Particle Warning', desc: 'PM2.5 levels briefly touched 18.5 µg/m³. System auto-responded.', time: '09:30 AM', val: '18.5 µg' }
    ],
    nicu: [
      { type: 'safe', title: 'Environment Verified Sterile', desc: 'CFU bacterial check matches Class-100 Cleanroom specs.', time: '18:00 PM', val: '2 CFU' },
      { type: 'info', title: 'Silent Shield Active', desc: 'Sound reduction activated. Fan noise decibels stabilized at 32dB.', time: '13:00 PM', val: 'Silent' },
      { type: 'info', title: 'Manual Wipe Cycle Complete', desc: 'Clinical inspection completed by Chief Nurse.', time: '07:30 AM', val: 'Verified' }
    ],
    post_op: [
      { type: 'danger', title: 'Critical Particle Breached', desc: 'PM2.5 rose to 35 µg/m³. Automated sanitization boost mode active.', time: '17:45 PM', val: '35 µg' },
      { type: 'warn', title: 'Temperature Fluctuation', desc: 'Room temperature drifted below optimal levels. Auto-recalibrating.', time: '14:30 PM', val: '19.8 °C' },
      { type: 'warn', title: 'Bacterial Load Rising', desc: 'Pathogen index spiked above warning limit of 50 CFU/m³.', time: '12:10 PM', val: '58 CFU' }
    ]
  };

  function populateLogsFeed(roomKey) {
    const feed = document.getElementById('logsFeed');
    if (!feed) return;

    feed.innerHTML = '';
    const logs = HISTORICAL_LOGS_DB[roomKey] || [];

    logs.forEach(log => {
      const card = document.createElement('div');
      card.className = 'log-card';

      let icon = 'shield-check';
      if (log.type === 'warn') icon = 'alert-triangle';
      if (log.type === 'danger') icon = 'alert-octagon';
      if (log.type === 'info') icon = 'info';

      card.innerHTML = `
        <div class="log-meta-group">
          <div class="log-status-dot-frame ${log.type}">
            <i data-lucide="${icon}"></i>
          </div>
          <div class="log-details">
            <h4 class="log-event-title">${log.title}</h4>
            <p class="log-event-desc">${log.desc}</p>
          </div>
        </div>
        <div class="log-time-group">
          <span class="log-time">${log.time}</span>
          <span class="log-val-badge">${log.val}</span>
        </div>
      `;
      feed.appendChild(card);
    });

    // Instruct Lucide to draw the icons inside the newly generated DOM elements!
    lucide.createIcons();
  }

  // ==========================================================================
  // EVENT HANDLERS & BINDINGS
  // ==========================================================================

  function setupEventListeners() {

    // 1. Room pill switches (Dashboard & Analytics)
    const pills = document.querySelectorAll('.room-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const roomKey = pill.getAttribute('data-room');
        loadRoomState(roomKey);
        triggerHaptic(10);
      });
    });

    // 2. UV-C Switch toggling
    toggleUv.addEventListener('change', (e) => {
      const active = e.target.checked;
      activeState.uv = active;

      const frame = cardUv.querySelector('.icon-frame');
      const icon = cardUv.querySelector('.control-icon');

      if (active) {
        cardUv.classList.add('active-state');
        statusTextUv.textContent = "Active & Sanitizing";
        frame.classList.add('uv-active');
        icon.classList.add('spin-slow');

        activeState.score = Math.min(activeState.score + 5, 100);
        updateSafetyGauge(activeState.score);
      } else {
        cardUv.classList.remove('active-state');
        statusTextUv.textContent = "Inactive / Off";
        frame.classList.remove('uv-active');
        icon.classList.remove('spin-slow');

        activeState.score = Math.max(activeState.score - 8, 40);
        updateSafetyGauge(activeState.score);
      }
    });

    // 3. Silent Switch toggling
    toggleSilent.addEventListener('change', (e) => {
      const active = e.target.checked;
      activeState.silent = active;

      if (active) {
        cardSilent.classList.add('active-state');
        statusTextSilent.textContent = "Low Noise engaged";
        activeState.fan = 1;
        updateFanSpeedUI(1);
      } else {
        cardSilent.classList.remove('active-state');
        statusTextSilent.textContent = "Standard Operation";
        activeState.fan = 2;
        updateFanSpeedUI(2);
      }
    });

    // 4. ACH Fan speeds
    const fanBtns = document.querySelectorAll('.speed-btn');
    fanBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const speed = parseInt(btn.getAttribute('data-speed'));
        activeState.fan = speed;
        updateFanSpeedUI(speed);

        if (speed === 3 && toggleSilent.checked) {
          toggleSilent.checked = false;
          toggleSilent.dispatchEvent(new Event('change'));
        }
      });
    });

    // 5. Drawer Actions
    if (notificationBtn) {
      notificationBtn.addEventListener('click', () => {
        notificationSheet.classList.add('open');
        bottomSheetOverlay.classList.add('open');
        const badge = document.querySelector('.notification-badge');
        if (badge) badge.style.display = 'none';
      });
    }

    sheetCloseBtn.addEventListener('click', closeDrawer);
    bottomSheetOverlay.addEventListener('click', closeDrawer);

    // ==========================================================================
    // LAYOUT 2 & 3: TAB ROUTING INTERACTION
    // ==========================================================================
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = tab.getAttribute('data-tab');

        // Block unused settings tab in Layouts 1, 2 & 3
        if (targetTab !== 'dashboard' && targetTab !== 'analytics' && targetTab !== 'ai' && targetTab !== 'settings' && targetTab !== 'account') return;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Hide views
        document.querySelectorAll('.tab-view').forEach(view => {
          view.classList.remove('active-view');
          view.style.display = 'none';
        });

        // Swap views
        if (targetTab === 'dashboard') {
          const v = document.getElementById('dashboardView');
          v.style.display = 'block';
          setTimeout(() => v.classList.add('active-view'), 10);
        } else if (targetTab === 'analytics') {
          const v = document.getElementById('analyticsView');
          v.style.display = 'block';
          setTimeout(() => {
            v.classList.add('active-view');
            // Redraw chart to scale inside its canvas container
            if (trendsChartInstance) {
              trendsChartInstance.resize();
              updateChartData();
            }
          }, 10);
        } else if (targetTab === 'ai') {
          const v = document.getElementById('aiView');
          v.style.display = 'block';
          setTimeout(() => {
            v.classList.add('active-view');
            populateAiRecommendations();
            updateAiDiagnosticsUI();
            scrollChatToBottom();
          }, 10);
        } else if (targetTab === 'settings') {
          const v = document.getElementById('settingsView');
          v.style.display = 'block';
          setTimeout(() => {
            v.classList.add('active-view');
            syncSettingsPageUI();
          }, 10);
        } else if (targetTab === 'account') {
          const v = document.getElementById('accountView');
          v.style.display = 'block';
          setTimeout(() => {
            v.classList.add('active-view');
          }, 10);
        }

        triggerHaptic(10);
      });
    });

    // 6. Time Period Filters
    const timePills = document.querySelectorAll('.time-pill');
    timePills.forEach(pill => {
      pill.addEventListener('click', () => {
        timePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        activePeriod = pill.getAttribute('data-period');
        updateChartData();
        triggerHaptic(8);
      });
    });

    // 7. Telemetry Parameter Filters
    const paramChips = document.querySelectorAll('.param-chip');
    paramChips.forEach(chip => {
      chip.addEventListener('click', () => {
        paramChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        activeParam = chip.getAttribute('data-param');

        // Update Chart Title Card
        const titleText = document.getElementById('chartTitleText');
        if (titleText) {
          if (activeParam === 'cfu') titleText.textContent = "Bacterial Load (CFU)";
          if (activeParam === 'pm25') titleText.textContent = "PM 2.5 Index (Dust)";
          if (activeParam === 'co2') titleText.textContent = "Carbon Dioxide (CO₂)";
          if (activeParam === 'tvoc') titleText.textContent = "Chemical index (TVOC)";
        }

        updateChartData();
        triggerHaptic(8);
      });
    });

    // 8. Download / Export trigger
    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        alert(`Generating and compiling historical report for ${activeState.name} (${activePeriod} duration). Starting CSV download...`);

        // Mocking native CSV file trigger
        const headers = ["Timestamp", "Reading Value", "Parameter", "Safety Code"];
        const roomDb = CHART_DATABASE[currentRoomKey][activeParam][activePeriod === 'custom' ? '7d' : activePeriod];

        const rows = roomDb.values.map((val, idx) => {
          return [roomDb.labels[idx], val, activeParam.toUpperCase(), activeState.score];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `qAMI_${currentRoomKey}_${activeParam}_trends.csv`);
        link.click();
      });
    }

    // 9. CO2 Threshold Slider
    const co2Slider = document.getElementById('co2ThresholdSlider');
    const co2Val = document.getElementById('co2ThresholdVal');
    if (co2Slider && co2Val) {
      co2Slider.addEventListener('input', (e) => {
        const val = e.target.value;
        co2Val.textContent = `${val} ppm`;
        activeState.co2Threshold = parseInt(val);
        ROOM_DATA[currentRoomKey].co2Threshold = parseInt(val);
      });
    }

    // 10. PM2.5 Threshold Slider
    const pm25Slider = document.getElementById('pm25ThresholdSlider');
    const pm25Val = document.getElementById('pm25ThresholdVal');
    if (pm25Slider && pm25Val) {
      pm25Slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(1);
        pm25Val.textContent = `${val} µg`;
        activeState.pm25Threshold = parseFloat(val);
        ROOM_DATA[currentRoomKey].pm25Threshold = parseFloat(val);
      });
    }

    // 11. HEPA Filter Reset
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        if (activeState.filterLife === 100) {
          showNotificationOverlay("HEPA filter is already at 100% capacity.");
          return;
        }

        triggerHaptic([30, 50]);

        const filterBar = document.getElementById('filterBarFill');
        const filterText = document.getElementById('filterPercentText');
        const filterEst = document.querySelector('.filter-estimate');

        let currentLife = activeState.filterLife || 87;
        activeState.filterLife = 100;
        ROOM_DATA[currentRoomKey].filterLife = 100;

        if (filterBar) {
          filterBar.style.width = '100%';
          filterBar.style.background = 'linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 100%)';
        }

        animateNumberCounter(filterText, currentLife, 100);

        if (filterEst) {
          filterEst.textContent = "Est. replacement in 280 days";
        }

        showNotificationOverlay(`HEPA filter life recalibrated to 100% for ${activeState.name}.`);
      });
    }

    // 12. Haptics Preference Toggle
    const toggleHaptics = document.getElementById('toggleHaptics');
    if (toggleHaptics) {
      toggleHaptics.addEventListener('change', (e) => {
        hapticsEnabled = e.target.checked;
        if (hapticsEnabled) {
          triggerHaptic(15);
          showNotificationOverlay("Haptic touch feedback enabled.");
        } else {
          showNotificationOverlay("Haptic feedback disabled.");
        }
      });
    }

    // 13. Calibration Preference Toggle
    const toggleCalibration = document.getElementById('toggleCalibration');
    const calBadge = document.querySelector('.calibration-badge');
    if (toggleCalibration) {
      toggleCalibration.addEventListener('change', (e) => {
        calibrationEnabled = e.target.checked;
        triggerHaptic(15);

        if (calBadge) {
          if (calibrationEnabled) {
            calBadge.className = 'calibration-badge green';
            calBadge.innerHTML = '<span class="calibration-dot"></span>Calibrated';
            showNotificationOverlay("Continuous autocalibration engaged.");
          } else {
            calBadge.className = 'calibration-badge yellow';
            calBadge.innerHTML = '<span class="calibration-dot warning"></span>Manual Mode';
            showNotificationOverlay("Autocalibration disabled. Manual drift control active.");
          }
        }
      });
    }

    // 14. Test UV-C Lamps Action
    const btnTestUv = document.getElementById('btnTestUv');
    if (btnTestUv) {
      btnTestUv.addEventListener('click', () => {
        const originalContent = btnTestUv.innerHTML;
        btnTestUv.disabled = true;
        btnTestUv.innerHTML = `<span class="btn-spinner" style="
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(169, 189, 61, 0.3);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        "></span><span>Testing Lamps...</span>`;

        triggerHaptic(15);

        setTimeout(() => {
          btnTestUv.disabled = false;
          btnTestUv.innerHTML = originalContent;
          showNotificationOverlay("UV-C Intensity: 99.4% Output. All emission tubes operating optimally.");
          triggerHaptic([40, 20, 40]);
        }, 1500);
      });
    }

    // 15. Recalibrate Sensors Action
    const btnRecalibrate = document.getElementById('btnRecalibrate');
    if (btnRecalibrate) {
      btnRecalibrate.addEventListener('click', () => {
        const originalContent = btnRecalibrate.innerHTML;
        btnRecalibrate.disabled = true;
        btnRecalibrate.innerHTML = `<span class="btn-spinner" style="
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: var(--text-secondary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        "></span><span>Recalibrating...</span>`;

        triggerHaptic(15);

        // Temporarily pause the main simulation interval
        clearInterval(telemetryInterval);

        // Force ideal values
        activeState.cfu = 0;
        activeState.co2 = 400;
        activeState.pm25 = 1.0;
        activeState.tvoc = 50;
        activeState.temp = 21.0;
        activeState.humid = 45;

        // Update UI
        metricCfu.textContent = activeState.cfu;
        metricCo2.textContent = activeState.co2;
        metricPm25.textContent = activeState.pm25.toFixed(1);
        metricTvoc.textContent = activeState.tvoc;
        metricTemp.textContent = activeState.temp.toFixed(1);
        metricHumid.textContent = activeState.humid;

        updateTelemetryBadges();
        recalculateSafetyRating();
        updateAiDiagnosticsUI();

        setTimeout(() => {
          btnRecalibrate.disabled = false;
          btnRecalibrate.innerHTML = originalContent;
          showNotificationOverlay("ZeBox sensor matrix recalibrated to sterile baselines.");
          triggerHaptic([30, 10, 30]);

          // Resume simulation
          startSensorSimulation();
        }, 2000);
      });
    }

    // 16. Clinical Theme Switcher & Caching
    const toggleTheme = document.getElementById('toggleTheme');

    // Check localStorage cache on load
    const savedTheme = localStorage.getItem('qami-theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      if (toggleTheme) toggleTheme.checked = true;
      setTimeout(() => syncChartTheme(true), 250);
    } else {
      document.body.classList.remove('light-mode');
      if (toggleTheme) toggleTheme.checked = false;
      setTimeout(() => syncChartTheme(false), 250);
    }

    if (toggleTheme) {
      toggleTheme.addEventListener('change', () => {
        const isLight = toggleTheme.checked;
        if (isLight) {
          document.body.classList.add('light-mode');
          localStorage.setItem('qami-theme', 'light');
          syncChartTheme(true);
          showNotificationOverlay("Soft clinical light theme active.");
        } else {
          document.body.classList.remove('light-mode');
          localStorage.setItem('qami-theme', 'dark');
          syncChartTheme(false);
          showNotificationOverlay("Deep space dark theme active.");
        }
        triggerHaptic(12);
      });
    }

    // 17. Biometric Face ID Switcher
    const toggleBiometrics = document.getElementById('toggleBiometrics');
    if (toggleBiometrics) {
      toggleBiometrics.addEventListener('change', () => {
        triggerHaptic(12);
        if (toggleBiometrics.checked) {
          showNotificationOverlay("Biometric clinical face lock enabled.");
        } else {
          showNotificationOverlay("Biometric clinical security disabled.");
        }
      });
    }
  }

  function closeDrawer() {
    notificationSheet.classList.remove('open');
    bottomSheetOverlay.classList.remove('open');
  }

  // ==========================================================================
  // REAL-TIME SENSOR TELEMETRY FLUCTUATOR (Simulation ticks)
  // ==========================================================================

  function startSensorSimulation() {
    if (telemetryInterval) clearInterval(telemetryInterval);

    telemetryInterval = setInterval(() => {
      const randPmChange = (Math.random() - 0.5) * 0.4;
      const randCo2Change = Math.floor((Math.random() - 0.5) * 6);
      const randTvocChange = Math.floor((Math.random() - 0.5) * 4);
      const randTempChange = (Math.random() - 0.5) * 0.1;
      const randHumidChange = Math.floor((Math.random() - 0.5) * 2);

      activeState.pm25 = Math.max(0.5, activeState.pm25 + randPmChange);
      activeState.co2 = Math.max(350, activeState.co2 + randCo2Change);
      activeState.tvoc = Math.max(10, activeState.tvoc + randTvocChange);
      activeState.temp = Math.max(16, Math.min(30, activeState.temp + randTempChange));
      activeState.humid = Math.max(20, Math.min(80, activeState.humid + randHumidChange));

      if (Math.random() > 0.8) {
        const randCfuChange = Math.floor((Math.random() - 0.5) * 2);
        activeState.cfu = Math.max(0, activeState.cfu + randCfuChange);
        metricCfu.textContent = activeState.cfu;
      }

      metricPm25.textContent = activeState.pm25.toFixed(1);
      metricCo2.textContent = activeState.co2;
      metricTvoc.textContent = activeState.tvoc;
      metricTemp.textContent = activeState.temp.toFixed(1);
      metricHumid.textContent = activeState.humid;

      updateTelemetryBadges();
      recalculateSafetyRating();
      updateAiDiagnosticsUI();

    }, 2500);
  }

  function recalculateSafetyRating() {
    let score = 100;

    if (activeState.cfu > 50) score -= 15;
    else if (activeState.cfu > 10) score -= 5;

    if (activeState.pm25 > 15) score -= 12;
    else if (activeState.pm25 > 8) score -= 4;

    if (activeState.co2 > 700) score -= 10;
    else if (activeState.co2 > 550) score -= 3;

    if (!activeState.uv) score -= 8;

    score = Math.max(5, Math.min(100, score));

    if (activeState.score !== score) {
      activeState.score = score;
      updateSafetyGauge(score);
    }
  }

  // ==========================================================================
  // LAYOUT 3: AI DIAGNOSTICS & CHAT SYSTEM FUNCTIONS
  // ==========================================================================

  function updateAiDiagnosticsUI() {
    const aiDiagCfu = document.getElementById('aiDiagCfu');
    const aiDiagAch = document.getElementById('aiDiagAch');
    const aiDiagPm25 = document.getElementById('aiDiagPm25');
    const aiDiagCfuBar = document.getElementById('aiDiagCfuBar');
    const aiDiagAchBar = document.getElementById('aiDiagAchBar');
    const aiDiagPm25Bar = document.getElementById('aiDiagPm25Bar');

    if (!aiDiagCfu) return;

    // 1. CFU Sterility Index
    aiDiagCfu.textContent = `${activeState.cfu} CFU/m³`;
    let cfuPercent = Math.max(10, Math.min(100, 100 - (activeState.cfu / 100) * 100));
    aiDiagCfuBar.style.width = `${cfuPercent}%`;
    aiDiagCfuBar.className = 'diag-bar-fill';
    if (activeState.cfu <= 10) {
      aiDiagCfuBar.classList.add('safe');
    } else if (activeState.cfu <= 50) {
      aiDiagCfuBar.classList.add('warning');
    } else {
      aiDiagCfuBar.classList.add('danger');
    }

    // 2. Air Exchange (ACH)
    let achValue = activeState.fan === 1 ? 4.0 : activeState.fan === 2 ? 8.5 : activeState.fan === 3 ? 12.0 : 0.0;
    aiDiagAch.textContent = `${achValue.toFixed(1)} ACH`;
    let achPercent = activeState.fan === 1 ? 40 : activeState.fan === 2 ? 75 : activeState.fan === 3 ? 100 : 10;
    aiDiagAchBar.style.width = `${achPercent}%`;
    aiDiagAchBar.className = 'diag-bar-fill';
    if (activeState.fan === 3) {
      aiDiagAchBar.classList.add('safe');
    } else if (activeState.fan === 2) {
      aiDiagAchBar.classList.add('active'); // default brand color
    } else {
      aiDiagAchBar.classList.add('warning');
    }

    // 3. PM 2.5 Particulate
    aiDiagPm25.textContent = `${activeState.pm25.toFixed(1)} µg/m³`;
    let pmPercent = Math.max(10, Math.min(100, 100 - (activeState.pm25 / 35) * 100));
    aiDiagPm25Bar.style.width = `${pmPercent}%`;
    aiDiagPm25Bar.className = 'diag-bar-fill';
    if (activeState.pm25 <= 8) {
      aiDiagPm25Bar.classList.add('safe');
    } else if (activeState.pm25 <= 15) {
      aiDiagPm25Bar.classList.add('warning');
    } else {
      aiDiagPm25Bar.classList.add('danger');
    }
  }

  const AI_RECOMMENDATIONS_DB = {
    ivf_ot: [
      {
        id: "ot_calib",
        type: "safe",
        title: "Cleanroom Standard Maintained",
        desc: "Pathogen score is 98%. Active sanitization systems are fully loaded and operational.",
        icon: "shield-check",
        actionText: "Verify Calibration",
        actionType: "info"
      }
    ],
    icu_1: [
      {
        id: "icu_vent",
        type: "warn",
        title: "Dynamic Flow Optimization",
        desc: "ACH fan speed is running at Auto Flow (8.5 ACH). Increase to Max Sanitization (12.0 ACH) to speed up chemical and dust clearance.",
        icon: "wind",
        actionText: "Increase ACH to Max",
        actionType: "fan"
      }
    ],
    nicu: [
      {
        id: "nicu_silent",
        type: "safe",
        title: "Optimal Sterile Atmosphere",
        desc: "Neo-natal safety score is 99% (Sterile). Sound insulation has capped noise decibels under 32dB.",
        icon: "shield-check",
        actionText: "Run Sound Audit",
        actionType: "info"
      }
    ],
    post_op: [
      {
        id: "post_uv",
        type: "danger",
        title: "Pathogen Level High (UV-C Idle)",
        desc: "Pathogen index spiked above warning threshold to 58 CFU/m³. ZeBox UV-C lamps are currently OFF. Activate sanitizer immediately.",
        icon: "alert-triangle",
        actionText: "Engage UV-C Sanitizer",
        actionType: "uv"
      },
      {
        id: "post_fan",
        type: "warn",
        title: "Ventilation Rate Critical (4.0 ACH)",
        desc: "Air exchange rate is critically low (4.0 ACH) in Recovery. Elevate fan speed to Maximum Sanitization (12.0 ACH) to purge CO₂ and dust.",
        icon: "wind",
        actionText: "Set Fan to Max Speed",
        actionType: "fan"
      }
    ]
  };

  function populateAiRecommendations() {
    const list = document.getElementById('aiRecommendationsList');
    if (!list) return;

    list.innerHTML = '';
    const recs = AI_RECOMMENDATIONS_DB[currentRoomKey] || [];

    recs.forEach(rec => {
      let isApplied = false;
      if (rec.actionType === 'uv' && activeState.uv) isApplied = true;
      if (rec.actionType === 'fan' && activeState.fan === 3) isApplied = true;

      const card = document.createElement('div');
      card.className = `recommendation-card ${rec.type}-rec`;

      card.innerHTML = `
        <div class="rec-header">
          <div class="rec-icon-frame">
            <i data-lucide="${rec.icon}"></i>
          </div>
          <div class="rec-info">
            <h4 class="rec-title">${rec.title}</h4>
            <p class="rec-desc">${rec.desc}</p>
          </div>
        </div>
        <div class="rec-action-panel">
          <button class="one-tap-btn ${isApplied ? 'applied' : ''}" data-rec-id="${rec.id}" data-action-type="${rec.actionType}">
            ${isApplied ? '<i data-lucide="check"></i><span>Applied Successfully</span>' : `<i data-lucide="zap"></i><span>${rec.actionText}</span>`}
          </button>
        </div>
      `;
      list.appendChild(card);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    list.querySelectorAll('.one-tap-btn:not(.applied)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const actionType = btn.getAttribute('data-action-type');

        if (actionType === 'info') {
          alert("Smart Audit report generated. Real-time telemetry calibration verified as accurate.");
          return;
        }

        btn.innerHTML = `<span class="btn-spinner"></span><span>Applying...</span>`;
        btn.style.pointerEvents = 'none';

        setTimeout(() => {
          triggerHaptic([40, 10, 40]);

          if (actionType === 'uv') {
            ROOM_DATA[currentRoomKey].uv = true;
            activeState.uv = true;
          } else if (actionType === 'fan') {
            ROOM_DATA[currentRoomKey].fan = 3;
            ROOM_DATA[currentRoomKey].silent = false;
            activeState.fan = 3;
            activeState.silent = false;
          }

          loadRoomState(currentRoomKey);

          populateAiRecommendations();
          updateAiDiagnosticsUI();

          showNotificationOverlay("Smart parameters applied across all layouts.");
        }, 1000);
      });
    });

    // ==========================================================================
    // DEVICE DISCOVERY & PROVISIONING WORKFLOW
    // ==========================================================================
    const addDeviceBtn = document.getElementById('addDeviceBtn');
    const deviceModalOverlay = document.getElementById('deviceModalOverlay');
    const deviceModal = document.getElementById('deviceModal');
    const closeDeviceModalBtn = document.getElementById('closeDeviceModalBtn');
    const pairDeviceBtn = document.getElementById('pairDeviceBtn');
    const scannerStateContainer = document.getElementById('scannerStateContainer');
    const discoveredStateContainer = document.getElementById('discoveredStateContainer');

    let scanningTimeout = null;

    if (addDeviceBtn && deviceModalOverlay && deviceModal) {
      // 1. Open Modal and start scanner
      addDeviceBtn.addEventListener('click', () => {
        triggerHaptic(15);
        deviceModalOverlay.classList.add('open');
        deviceModal.classList.add('open');

        // Reset state elements to scanning state
        scannerStateContainer.style.display = 'flex';
        discoveredStateContainer.style.display = 'none';

        // Clear any old timeout
        if (scanningTimeout) clearTimeout(scanningTimeout);

        // 1.8s delay before device discovery
        scanningTimeout = setTimeout(() => {
          scannerStateContainer.style.display = 'none';
          discoveredStateContainer.style.display = 'flex';
          triggerHaptic([30, 40, 30]); // double heartbeat haptic
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 1800);
      });

      // 2. Close Modal triggers
      const closeModal = () => {
        deviceModalOverlay.classList.remove('open');
        deviceModal.classList.remove('open');
        if (scanningTimeout) {
          clearTimeout(scanningTimeout);
          scanningTimeout = null;
        }
      };

      if (closeDeviceModalBtn) {
        closeDeviceModalBtn.addEventListener('click', () => {
          triggerHaptic(8);
          closeModal();
        });
      }

      deviceModalOverlay.addEventListener('click', () => {
        closeModal();
      });

      // 3. Pair and Provision Action
      if (pairDeviceBtn) {
        pairDeviceBtn.addEventListener('click', () => {
          triggerHaptic([40, 60, 40]);
          pairDeviceBtn.classList.add('loading');
          pairDeviceBtn.innerHTML = '<i data-lucide="loader" class="spin-slow"></i><span>Provisioning...</span>';
          if (typeof lucide !== 'undefined') lucide.createIcons();

          setTimeout(() => {
            // Provision Room Data
            ROOM_DATA.nicu_2 = {
              name: "Neo-Natal ICU Ward 2",
              score: 97,
              status: "STERILE STATE",
              cfu: 3,
              co2: 405,
              pm25: 2.1,
              tvoc: 75,
              temp: 22.8,
              humid: 45,
              uv: true,
              fan: 2, // Auto
              silent: true,
              co2Threshold: 550,
              pm25Threshold: 8.0,
              filterLife: 99
            };

            // Provision Database records for other components
            CHART_DATABASE.nicu_2 = {
              cfu: {
                '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [3, 2, 4, 3, 5, 3] },
                '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [4, 3, 3, 5, 4, 2, 3] },
                '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [5, 4, 3, 3] }
              },
              pm25: {
                '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [1.8, 2.2, 2.4, 2.0, 1.8, 1.9] },
                '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [2.2, 2.0, 2.3, 2.6, 2.4, 1.7, 2.1] },
                '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [2.7, 2.4, 2.2, 2.0] }
              },
              co2: {
                '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [400, 405, 410, 406, 402, 404] },
                '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [405, 412, 408, 415, 410, 402, 405] },
                '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [415, 410, 406, 405] }
              },
              tvoc: {
                '24h': { labels: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'], values: [70, 75, 77, 73, 71, 72] },
                '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [75, 77, 73, 79, 76, 70, 73] },
                '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], values: [80, 76, 74, 73] }
              }
            };

            HISTORICAL_LOGS_DB.nicu_2 = [
              { type: 'safe', title: 'Clinical Pairing Active', desc: 'qAMI Device paired and registered under Biomoneta ZeBox specifications.', time: 'Just now', val: 'Paired' },
              { type: 'safe', title: 'Zone Ingress Sterile', desc: 'HEPA particle barriers engaged. Estimated biological load is 3 CFU/m³.', time: '1 min ago', val: '3 CFU' },
              { type: 'info', title: 'Acoustic Compliance Audit', desc: 'ZeBox fan adjusted to silent mode, capping noise index below 32dB.', time: '1 min ago', val: 'Silent' }
            ];

            AI_RECOMMENDATIONS_DB.nicu_2 = [
              {
                id: "nicu_2_sterile",
                type: "safe",
                title: "Provisioned Zone Operational",
                desc: "Pathogen score is 97% (Sterile). Continuous HEPA filtration is active in Ward 2 with Silent Protection enabled.",
                icon: "shield-check",
                actionText: "Run Safety Diagnostics",
                actionType: "info"
              }
            ];

            // Dynamic DOM injection of Room Pills
            document.querySelectorAll('.room-pills').forEach(pillsContainer => {
              if (pillsContainer.querySelector('[data-room="nicu_2"]')) return;

              const newPill = document.createElement('button');
              newPill.className = 'room-pill';
              newPill.setAttribute('data-room', 'nicu_2');
              newPill.textContent = 'NICU Ward 2';
              pillsContainer.appendChild(newPill);

              // Attach click event to this specific pill
              newPill.addEventListener('click', () => {
                loadRoomState('nicu_2');
                triggerHaptic(10);
              });
            });

            // Set paired state button back to original representation
            pairDeviceBtn.classList.remove('loading');
            pairDeviceBtn.innerHTML = '<i data-lucide="link-2"></i><span>Pair & Provision</span>';

            // Close the modal cleanly
            closeModal();

            // Direct load room state immediately
            loadRoomState('nicu_2');

            // Dispatch dynamic glass connection success toast
            showNotificationOverlay("Device SN: AG-9912 connected. Provisioned zone 'Neo-Natal ICU Ward 2' successfully.");

          }, 1200);
        });
      }
    }
  }

  function showNotificationOverlay(msg) {
    const container = document.querySelector('.phone-screen');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'glass-toast';
    toast.innerHTML = `<i data-lucide="info" style="width: 14px; height: 14px; color: var(--primary);"></i><span>${msg}</span>`;
    toast.style.cssText = `
      position: absolute;
      top: 52px;
      left: 16px;
      right: 16px;
      background: rgba(19, 26, 39, 0.95);
      border: 1px solid var(--border-active);
      border-radius: 16px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: #fff;
      z-index: 9999;
      box-shadow: 0px 8px 30px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      animation: toastFadeIn 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    `;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
      toast.style.animation = 'toastFadeOut 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards';
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  function initAiChat() {
    const chatFeed = document.getElementById('aiChatMessages');
    if (!chatFeed) return;

    chatFeed.innerHTML = `
      <div class="chat-message assistant">
        <div class="chat-avatar">AI</div>
        <div class="chat-text">
          Hello! I am qAMI Copilot. I scan the real-time physical indices of clinical zones. Ask me anything about room air safety diagnostics.
        </div>
      </div>
    `;

    // Inject custom toast animation rules dynamically
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @keyframes toastFadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes toastFadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-15px); }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleEl);

    const chips = document.querySelectorAll('.chat-chip');
    const indicator = document.getElementById('chatTypingIndicator');

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const queryType = chip.getAttribute('data-query');
        let userText = "";

        if (queryType === 'diagnostic') userText = `⚡ Run diagnostics for ${activeState.name}`;
        if (queryType === 'sterile') userText = `🛡️ Verify sterile index for ${activeState.name}`;
        if (queryType === 'suggest') userText = `💨 Suggest optimal ACH ventilation rate`;

        appendChatMessage('user', userText);
        triggerHaptic(12);

        chip.parentElement.parentElement.style.opacity = '0.5';
        chip.parentElement.parentElement.style.pointerEvents = 'none';

        indicator.style.display = 'flex';
        scrollChatToBottom();

        setTimeout(() => {
          let replyText = "";

          if (queryType === 'diagnostic') {
            if (currentRoomKey === 'post_op') {
              replyText = `⚠️ Critical Diagnostic Warning for ${activeState.name}: Pathogen levels are high at ${activeState.cfu} CFU/m³ (limit is <=10). Particulate load is poor at ${activeState.pm25.toFixed(1)} µg/m³. Smart recommendation: Engage UV-C boost and set ACH fan speed to Maximum Sanitization.`;
            } else if (currentRoomKey === 'nicu') {
              replyText = `✨ NICU Diagnostic: Perfect Sterile State. Paths score is 99%. Biological loading is extremely low at ${activeState.cfu} CFU/m³ and dust particles are optimal at ${activeState.pm25.toFixed(1)} µg/m³. Silent Protection mode is active at 32dB to maintain noise limits. No manual actions needed.`;
            } else {
              replyText = `🛡️ Diagnostics for ${activeState.name}: Pathogen protection score is ${activeState.score}% (Safe Status). CFU index is secure at ${activeState.cfu} CFU/m³ and CO₂ levels are optimal at ${activeState.co2} ppm. Mechanical functions are calibrated correctly.`;
            }
          } else if (queryType === 'sterile') {
            if (activeState.cfu <= 10 && activeState.pm25 <= 8) {
              replyText = `🛡️ Sterility Audit: SECURE. Active load in ${activeState.name} is ${activeState.cfu} CFU/m³ (clinical safe limit is <=10) and PM2.5 density is clean at ${activeState.pm25.toFixed(1)} µg/m³. The environment meets sterile clinical guidelines.`;
            } else {
              replyText = `⚠️ Sterility Audit: EXCEEDED. Pathogen load is ${activeState.cfu} CFU/m³ (Clinical limit <=10) and PM2.5 particulate count is ${activeState.pm25.toFixed(1)} µg/m³. Pathogen indices fail sterility rating. Engage smart action buttons to enforce safety protocols.`;
            }
          } else if (queryType === 'suggest') {
            if (activeState.cfu > 10 || activeState.pm25 > 10 || activeState.co2 > 600) {
              replyText = `💨 Ventilation Suggestion: Current room air volume is running at ${activeState.fan === 1 ? '4.0' : activeState.fan === 2 ? '8.5' : '12.0'} ACH. Due to slight parameter drift (CO₂: ${activeState.co2} ppm, Bacterial: ${activeState.cfu} CFU), I suggest elevating ventilation exchanges to Maximum Speed (12.0 ACH) to increase molecular purification speed.`;
            } else {
              replyText = `💨 Ventilation Suggestion: Air exchange rate is running at ${activeState.fan === 1 ? '4.0' : activeState.fan === 2 ? '8.5' : '12.0'} ACH. Current CO₂ load is optimal at ${activeState.co2} ppm. Standard Auto Mode is highly sufficient for this baseline.`;
            }
          }

          indicator.style.display = 'none';
          appendChatMessage('assistant', replyText);
          scrollChatToBottom();

          chip.parentElement.parentElement.style.opacity = '1';
          chip.parentElement.parentElement.style.pointerEvents = 'auto';

        }, 1100);
      });
    });

    const inputField = document.querySelector('.mock-input-field');
    const sendBtn = document.querySelector('.mock-send-btn');
    if (inputField) {
      const runMockTyping = () => {
        appendChatMessage('user', "Evaluate TVOC risk profiles");
        indicator.style.display = 'flex';
        scrollChatToBottom();
        setTimeout(() => {
          indicator.style.display = 'none';
          appendChatMessage('assistant', `🧬 Chemical Analysis: Active Room TVOC reading is ${activeState.tvoc} Index (Optimal range <= 150). Gas sensor matrix reports zero hazardous clinical chemical VOC anomalies. Ventilation level is secure.`);
          scrollChatToBottom();
        }, 1200);
      };
      inputField.addEventListener('click', runMockTyping);
      if (sendBtn) sendBtn.addEventListener('click', runMockTyping);
    }
  }

  function appendChatMessage(sender, text) {
    const chatFeed = document.getElementById('aiChatMessages');
    if (!chatFeed) return;

    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    msg.innerHTML = `
      <div class="chat-avatar">${sender === 'assistant' ? 'AI' : 'ME'}</div>
      <div class="chat-text">${text}</div>
    `;
    chatFeed.appendChild(msg);
  }

  function scrollChatToBottom() {
    const chatCard = document.querySelector('.ai-chat-card');
    if (chatCard) {
      chatCard.scrollTo({
        top: chatCard.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  // ==========================================================================
  // BOOTSTRAP APPS
  // ==========================================================================
  init();

});
