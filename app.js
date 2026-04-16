// APP STATE
let appState = {
    isLoggedIn: false,
    currentPage: 'overview',
    version: '2.2',
    chartRange: '24h',
    waterData: [],
    logsData: [],
    alertsData: [],
    warningThreshold: 50,
    dangerThreshold: 80,
    maxDataPoints: 48,
    lastUpdate: null,
    map: null,
    mapMarker: null,
    sensorConnected: false,
    sensorFeed: 'Local simulation',
    batteryLevel: 95,
    signalQuality: 'Excellent',
    notificationsEnabled: true,
    soundEnabled: true,
    browserNotifications: false,
    darkMode: true,
    refreshInterval: 2000,
    dataRetention: 24,
    weatherData: {
        temp: 28,
        desc: 'Sunny',
        humidity: 65,
        wind: 5,
        rain: 0,
        icon: '☀️'
    }
};

// CHARTS
let mainChart = null;
let hourlyChart = null;
let statusChart = null;

// ==================== LOGIN SYSTEM ====================
function login(event) {
    event.preventDefault();
    
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    if (username === "admin" && password === "1234") {
        appState.isLoggedIn = true;
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("dashboard").classList.add("active");
        
        // Initialize the system
        initializeDashboard();
        startRealTimeMonitoring();
    } else {
        alert("Invalid credentials. Demo: admin / 1234");
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    }
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        appState.isLoggedIn = false;
        location.reload();
    }
}

// ==================== DASHBOARD INITIALIZATION ====================
function initializeDashboard() {
    // Initialize charts
    initializeMainChart();
    initializeHourlyChart();
    initializeStatusChart();
    initializeMap();
    
    // Generate initial data
    for (let i = 0; i < 24; i++) {
        generateDataPoint();
    }
    
    // Update UI
    updateDashboard();
    updateSensorUI();
    updateWeather();
    renderLogs();
    renderAlerts();
    document.getElementById('versionTag').textContent = 'v' + appState.version;
    
    // Set initial UI states
    document.body.className = appState.darkMode ? 'dark-mode' : 'light-mode';
    document.getElementById('darkModeToggle').textContent = appState.darkMode ? '🌙' : '☀️';
    document.getElementById('notificationToggle').textContent = appState.notificationsEnabled ? '🔔' : '🔕';
    
    // Show sidebar initially
    document.querySelector('.sidebar').classList.add('active');
    document.querySelector('.sidebar-overlay').classList.remove('active');
    
    // Load settings into UI
    document.getElementById('warningThreshold').value = appState.warningThreshold;
    document.getElementById('dangerThreshold').value = appState.warningThreshold;
    document.getElementById('pushNotifications').checked = appState.notificationsEnabled;
    document.getElementById('soundAlerts').checked = appState.soundEnabled;
    document.getElementById('browserNotifications').checked = appState.browserNotifications;
    document.getElementById('refreshInterval').value = appState.refreshInterval;
    document.getElementById('dataRetention').value = appState.dataRetention;
}

// ==================== REAL-TIME DATA GENERATION ====================
function generateDataPoint() {
    // Realistic water level simulation with trending
    let lastLevel = appState.waterData.length > 0 
        ? appState.waterData[appState.waterData.length - 1].level 
        : 25;
    
    let change = (Math.random() - 0.5) * 8;
    let newLevel = Math.max(0, Math.min(120, lastLevel + change));
    
    let dataPoint = {
        level: Math.round(newLevel),
        temperature: Math.round(20 + Math.random() * 15),
        humidity: Math.round(40 + Math.random() * 50),
        timestamp: new Date(),
        status: getStatus(newLevel)
    };
    
    appState.waterData.push(dataPoint);
    
    if (appState.waterData.length > appState.maxDataPoints) {
        appState.waterData.shift();
    }
    
    // Add to logs
    addLog(dataPoint);
    
    // Check for alerts
    checkAlerts(dataPoint);
    
    return dataPoint;
}

function getStatus(level) {
    if (level >= appState.dangerThreshold) return 'DANGER';
    if (level >= appState.warningThreshold) return 'WARNING';
    return 'SAFE';
}

function addLog(dataPoint) {
    appState.logsData.unshift({
        time: dataPoint.timestamp.toLocaleTimeString(),
        level: dataPoint.level,
        temperature: dataPoint.temperature,
        humidity: dataPoint.humidity,
        status: dataPoint.status,
        id: Date.now()
    });
    
    // Keep only last 100 logs
    if (appState.logsData.length > 100) {
        appState.logsData.pop();
    }
}

function checkAlerts(dataPoint) {
    if (dataPoint.status !== 'SAFE') {
        appState.alertsData.unshift({
            timestamp: dataPoint.timestamp,
            time: dataPoint.timestamp.toLocaleTimeString(),
            level: dataPoint.level,
            status: dataPoint.status,
            message: `Water level at ${dataPoint.level} cm - ${dataPoint.status}`,
            id: Date.now()
        });
        
        // Show alert banner if danger
        if (dataPoint.status === 'DANGER') {
            document.getElementById("alertBox").style.display = "block";
        }
        
        // Play sound alert
        playAlertSound();
        
        // Show browser notification
        showBrowserNotification(dataPoint.message, dataPoint.status);
    }
}

// ==================== UPDATE UI ====================
function updateDashboard() {
    if (appState.waterData.length === 0) return;
    
    let latestData = appState.waterData[appState.waterData.length - 1];
    
    // Update main stats
    document.getElementById("waterLevel").textContent = latestData.level;
    document.getElementById("temperature").textContent = latestData.temperature;
    document.getElementById("humidity").textContent = latestData.humidity;
    
    // Update status
    let statusColor = latestData.status === 'SAFE' ? 'safe' : 
                     latestData.status === 'WARNING' ? 'warning' : 'danger';
    let statusEmoji = latestData.status === 'SAFE' ? '✅' : 
                     latestData.status === 'WARNING' ? '⚠️' : '🚨';
    
    document.getElementById("statusDisplay").textContent = statusEmoji + ' ' + latestData.status;
    document.getElementById("statusBadge").textContent = latestData.status;
    document.getElementById("statusBadge").className = 'badge ' + statusColor;
    
    // Update status indicator
    let statusDot = document.querySelector('.status-dot');
    statusDot.className = 'status-dot ' + statusColor;
    document.getElementById("statusText").textContent = 
        latestData.status === 'SAFE' ? 'System Operational' : 
        latestData.status === 'WARNING' ? 'Warning Active' : 'Critical Alert';
    
    // Update progress bar
    let percentage = (latestData.level / 120) * 100;
    document.getElementById("levelBar").style.width = percentage + '%';
    
    // Update time
    let now = new Date();
    let timeStr = now.toLocaleTimeString();
    document.getElementById("updateTime").textContent = 'Updated: ' + timeStr;
    
    // Update charts
    updateMainChart();
    updateHourlyChart();
    updateStatusChart();
    updateMap();
    
    // Update analytics
    updateAnalytics();

    // Update document title for alert visibility
    document.title = latestData.status === 'DANGER' ? '⚠️ Flood Alert — Flood Monitor' : 'Flood Monitoring and Alert System';
}

function dismissAlert() {
    document.getElementById("alertBox").style.display = "none";
}

// ==================== MAP INITIALIZATION ====================
function initializeMap() {
    let mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    appState.map = L.map('map', {
        center: [14.239019, 121.1581048],
        zoom: 15,
        scrollWheelZoom: false,
        dragging: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(appState.map);

    appState.mapMarker = L.marker([14.239019, 121.1581048]).addTo(appState.map)
        .bindPopup('Monitoring Station: Mamatid, Cabuyao, Laguna')
        .openPopup();
}

function updateMap() {
    if (!appState.map || !appState.mapMarker) return;

    let latestData = appState.waterData[appState.waterData.length - 1];
    if (!latestData) return;

    let newPopup = `Mamatid, Cabuyao, Laguna<br>Level: ${latestData.level} cm<br>Status: ${latestData.status}`;
    appState.mapMarker.setPopupContent(newPopup);
}

function updateSensorUI() {
    document.getElementById('sensorStatusText').textContent = appState.sensorConnected ? 'Online' : 'Offline';
    document.getElementById('sensorFeedSource').textContent = appState.sensorFeed;
    document.getElementById('sensorConnectButton').textContent = appState.sensorConnected ? 'Disconnect Sensor' : 'Connect Sensor';
    document.getElementById('deviceStatusText').textContent = appState.sensorConnected ? '🟢 Connected' : '⚠️ Disconnected';
    document.getElementById('signalText').textContent = appState.sensorConnected ? `${appState.signalQuality} (5/5)` : 'No signal';
    document.getElementById('batteryText').textContent = appState.batteryLevel + '%';
}

function toggleSensorConnection() {
    appState.sensorConnected = !appState.sensorConnected;
    appState.sensorFeed = appState.sensorConnected ? 'Live sensor feed' : 'Local simulation';
    appState.signalQuality = appState.sensorConnected ? 'Excellent' : 'N/A';
    if (!appState.sensorConnected) {
        appState.batteryLevel = Math.max(0, appState.batteryLevel - 1);
    }
    updateSensorUI();
}

function downloadSensorLog() {
    let csv = 'Time,Water Level (cm),Temperature (°C),Humidity (%),Status\n';
    appState.logsData.slice(0, 100).forEach(log => {
        csv += `${log.time},${log.level},${log.temperature},${log.humidity},${log.status}\n`;
    });

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sensor_report.csv');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('active');
    document.querySelector('.sidebar-overlay').classList.remove('active');
}

function toggleDarkMode() {
    appState.darkMode = !appState.darkMode;
    document.body.className = appState.darkMode ? 'dark-mode' : 'light-mode';
    document.getElementById('darkModeToggle').textContent = appState.darkMode ? '🌙' : '☀️';
    localStorage.setItem('darkMode', appState.darkMode);
}

function toggleNotifications() {
    appState.notificationsEnabled = !appState.notificationsEnabled;
    document.getElementById('notificationToggle').textContent = appState.notificationsEnabled ? '🔔' : '🔕';
}

function updateWeather() {
    // Simulate weather changes
    let conditions = ['Sunny', 'Cloudy', 'Rainy', 'Stormy'];
    let icons = ['☀️', '☁️', '🌧️', '⛈️'];
    let randomIndex = Math.floor(Math.random() * conditions.length);
    
    appState.weatherData.desc = conditions[randomIndex];
    appState.weatherData.icon = icons[randomIndex];
    appState.weatherData.temp = Math.round(25 + Math.random() * 10);
    appState.weatherData.humidity = Math.round(50 + Math.random() * 30);
    appState.weatherData.wind = Math.round(2 + Math.random() * 10);
    appState.weatherData.rain = randomIndex === 2 ? Math.round(Math.random() * 20) : 0;
    
    document.getElementById('weatherIcon').textContent = appState.weatherData.icon;
    document.getElementById('weatherTemp').textContent = appState.weatherData.temp + '°C';
    document.getElementById('weatherDesc').textContent = appState.weatherData.desc;
    document.getElementById('weatherHumidity').textContent = appState.weatherData.humidity + '%';
    document.getElementById('weatherWind').textContent = appState.weatherData.wind + ' km/h';
    document.getElementById('weatherRain').textContent = appState.weatherData.rain + ' mm';
}

function playAlertSound() {
    if (appState.soundEnabled) {
        // Create a simple beep sound
        let audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let oscillator = audioContext.createOscillator();
        let gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }
}

function showBrowserNotification(message, level) {
    if (appState.browserNotifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            new Notification('Flood Monitor Alert', {
                body: message,
                icon: '/favicon.ico',
                tag: 'flood-alert'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    appState.browserNotifications = true;
                    showBrowserNotification(message, level);
                }
            });
        }
    }
}

function updateNotificationSettings() {
    appState.notificationsEnabled = document.getElementById('pushNotifications').checked;
    appState.soundEnabled = document.getElementById('soundAlerts').checked;
    appState.browserNotifications = document.getElementById('browserNotifications').checked;
}

function updateSystemSettings() {
    appState.refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    appState.dataRetention = parseInt(document.getElementById('dataRetention').value);
    
    // Update max data points based on retention
    appState.maxDataPoints = Math.max(24, (appState.dataRetention / 24) * 48);
    
    // Restart monitoring with new interval
    clearInterval(window.monitoringInterval);
    startRealTimeMonitoring();
}

function exportAllData() {
    let data = {
        waterData: appState.waterData,
        logsData: appState.logsData,
        alertsData: appState.alertsData,
        settings: {
            warningThreshold: appState.warningThreshold,
            dangerThreshold: appState.dangerThreshold,
            notificationsEnabled: appState.notificationsEnabled,
            soundEnabled: appState.soundEnabled,
            browserNotifications: appState.browserNotifications,
            darkMode: appState.darkMode,
            refreshInterval: appState.refreshInterval,
            dataRetention: appState.dataRetention
        },
        exportDate: new Date().toISOString()
    };
    
    let json = JSON.stringify(data, null, 2);
    let blob = new Blob([json], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'flood_monitor_backup.json');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// ==================== CHART INITIALIZATION ====================
function initializeMainChart() {
    let ctx = document.getElementById('chart');
    if (!ctx) return;
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Water Level (cm)',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#cbd5e1',
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120,
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#cbd5e1',
                        callback: function(value) {
                            return value + ' cm';
                        }
                    }
                },
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#cbd5e1'
                    }
                }
            }
        }
    });
}

function updateMainChart() {
    if (!mainChart) return;

    let displayData = [];
    let labels = [];
    
    if (appState.chartRange === '6h') {
        let slice = appState.waterData.slice(-6);
        displayData = slice.map(d => d.level);
        labels = slice.map(d => d.timestamp.toLocaleTimeString().slice(0, 5));
    } else if (appState.chartRange === '24h') {
        displayData = appState.waterData.map(d => d.level);
        labels = appState.waterData.map(d => d.timestamp.toLocaleTimeString().slice(0, 5));
    } else if (appState.chartRange === '7d') {
        let chunkSize = Math.max(1, Math.ceil(appState.waterData.length / 7));
        for (let i = 0; i < 7; i++) {
            let chunk = appState.waterData.slice(i * chunkSize, (i + 1) * chunkSize);
            if (chunk.length > 0) {
                let average = Math.round(chunk.reduce((sum, item) => sum + item.level, 0) / chunk.length);
                displayData.push(average);
                labels.push(`Day ${i + 1}`);
            }
        }
    }

    if (displayData.length === 0) {
        displayData = [0];
        labels = [''];
    }

    mainChart.data.labels = labels;
    mainChart.data.datasets[0].data = displayData;
    mainChart.update();
}

function initializeHourlyChart() {
    let ctx = document.getElementById('hourlyChart');
    if (!ctx) return;
    
    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array(12).fill('').map((_, i) => i + ':00'),
            datasets: [{
                label: 'Avg Water Level',
                data: Array(12).fill(50),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: '#10b981',
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#cbd5e1' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120,
                    grid: { color: '#334155' },
                    ticks: { color: '#cbd5e1' }
                },
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#cbd5e1' }
                }
            }
        }
    });
}

function updateHourlyChart() {
    if (!hourlyChart) return;
    
    let dataSlice = appState.waterData.slice(-12);
    let hourlyData = Array(12).fill(0);

    dataSlice.forEach((d, index) => {
        hourlyData[hourlyData.length - dataSlice.length + index] = d.level;
    });
    
    hourlyChart.data.datasets[0].data = hourlyData;
    hourlyChart.update();
}

function initializeStatusChart() {
    let ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Safe', 'Warning', 'Danger'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderColor: '#1e293b',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#cbd5e1' }
                }
            }
        }
    });
}

function updateStatusChart() {
    if (!statusChart) return;
    
    let safe = 0, warning = 0, danger = 0;
    appState.waterData.forEach(d => {
        if (d.status === 'SAFE') safe++;
        else if (d.status === 'WARNING') warning++;
        else danger++;
    });
    
    statusChart.data.datasets[0].data = [safe, warning, danger];
    statusChart.update();
}

// ==================== ANALYTICS ====================
function updateAnalytics() {
    if (appState.waterData.length === 0) return;
    
    let levels = appState.waterData.map(d => d.level);
    let maxLevel = Math.max(...levels);
    let minLevel = Math.min(...levels);
    let avgLevel = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
    
    document.getElementById("maxLevel").textContent = maxLevel + ' cm';
    document.getElementById("minLevel").textContent = minLevel + ' cm';
    document.getElementById("avgLevel").textContent = avgLevel + ' cm';
    document.getElementById("readingsCount").textContent = appState.waterData.length;
}

// ==================== PAGE NAVIGATION ====================
function showPage(event, pageName) {
    event.preventDefault();
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    let page = document.getElementById('page-' + pageName);
    if (page) {
        page.classList.add('active');
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    let activeLink = event.target.closest('.nav-link');
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Update page title
    let titles = {
        'overview': 'Dashboard Overview',
        'analytics': 'Analytics & Statistics',
        'logs': 'Activity Logs',
        'alerts': 'Alert History',
        'settings': 'System Settings'
    };
    document.getElementById("pageTitle").textContent = titles[pageName] || 'Dashboard Overview';
    
    // Render specific page content
    if (pageName === 'logs') {
        renderLogs();
    } else if (pageName === 'alerts') {
        renderAlerts();
    }
    
    // Close sidebar after navigation on all screen sizes
    closeSidebar();
    
    appState.currentPage = pageName;
}

// ==================== LOGS ====================
function renderLogs() {
    let tbody = document.getElementById("logsBody");
    if (!tbody) return;
    
    tbody.innerHTML = appState.logsData.slice(0, 50).map(log => `
        <tr>
            <td>${log.time}</td>
            <td>${log.level} cm</td>
            <td>${log.temperature}°C</td>
            <td>
                <span class="badge" style="background-color: ${
                    log.status === 'SAFE' ? 'rgba(16, 185, 129, 0.2)' :
                    log.status === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' :
                    'rgba(239, 68, 68, 0.2)'
                }">${log.status}</span>
            </td>
            <td><button class="btn-small" onclick="deleteLog(${log.id})">Delete</button></td>
        </tr>
    `).join('');
}

function deleteLog(id) {
    appState.logsData = appState.logsData.filter(log => log.id !== id);
    renderLogs();
}

function clearLogs() {
    if (confirm("Clear all logs?")) {
        appState.logsData = [];
        renderLogs();
    }
}

// ==================== ALERTS ====================
function renderAlerts() {
    let alertsList = document.getElementById("alertsList");
    if (!alertsList) return;
    
    let alerts = appState.alertsData;
    let filter = document.querySelector('.filter-select');
    if (filter && filter.value !== 'all') {
        alerts = alerts.filter(a => a.status === filter.value.toUpperCase());
    }
    
    if (alerts.length === 0) {
        alertsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No alerts</p>';
        return;
    }
    
    alertsList.innerHTML = alerts.slice(0, 50).map(alert => `
        <div class="alert-item ${alert.status === 'DANGER' ? 'danger' : 'warning'}">
            <div class="alert-info">
                <div class="time">${alert.time}</div>
                <div class="message">${alert.message}</div>
                <div class="level">Water Level: ${alert.level} cm</div>
            </div>
            <button class="btn-small" onclick="deleteAlert(${alert.id})">Dismiss</button>
        </div>
    `).join('');
}

function deleteAlert(id) {
    appState.alertsData = appState.alertsData.filter(a => a.id !== id);
    renderAlerts();
}

function filterAlerts(value) {
    renderAlerts();
}

// ==================== SETTINGS ====================
function updateSettings() {
    let warning = parseInt(document.getElementById("warningThreshold").value);
    let danger = parseInt(document.getElementById("dangerThreshold").value);
    
    appState.warningThreshold = warning;
    appState.dangerThreshold = danger;
    
    document.getElementById("warningValue").textContent = warning + ' cm';
    document.getElementById("dangerValue").textContent = danger + ' cm';
    
    // Re-evaluate all data points
    appState.waterData.forEach(d => {
        d.status = getStatus(d.level);
    });
    
    updateDashboard();
}

function changeChartRange(event, range) {
    let button = event.target.closest('.btn-small');
    if (!button) return;

    event.target.parentElement.querySelectorAll('.btn-small').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    appState.chartRange = range;
    updateMainChart();
}

// ==================== REAL-TIME MONITORING ====================
function startRealTimeMonitoring() {
    // Generate new data every configured interval
    window.monitoringInterval = setInterval(() => {
        if (appState.isLoggedIn) {
            generateDataPoint();
            updateDashboard();
            renderLogs();
            renderAlerts();
        }
    }, appState.refreshInterval);
    
    // Update weather every 5 minutes
    setInterval(() => {
        if (appState.isLoggedIn) {
            updateWeather();
        }
    }, 300000);
}

// ==================== INITIALIZATION ====================
// Check if already logged in
window.addEventListener('load', () => {
    let warningSlider = document.getElementById("warningThreshold");
    if (warningSlider) {
        warningSlider.addEventListener('input', function() {
            document.getElementById("warningValue").textContent = this.value + ' cm';
        });
    }
    
    let dangerSlider = document.getElementById("dangerThreshold");
    if (dangerSlider) {
        dangerSlider.addEventListener('input', function() {
            document.getElementById("dangerValue").textContent = this.value + ' cm';
        });
    }
});