document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadStats();
    loadLanguages();
    setupEventListeners();
});

function loadSettings() {
    chrome.storage.sync.get({ autoSave: true }, (result) => {
        document.getElementById('autoSave').checked = result.autoSave;
    });
}

function loadStats() {
    chrome.storage.sync.get(['stats'], (result) => {
        const stats = result.stats || {
            total: 0,
            easy: 0,
            medium: 0,
            hard: 0,
            languages: {}
        };

        animateValue('total-solved', 0, stats.total, 800);
        animateValue('easy-solved', 0, stats.easy, 800);
        animateValue('medium-solved', 0, stats.medium, 800);
        animateValue('hard-solved', 0, stats.hard, 800);
    });
}

function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    if (!element) return;

    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

function loadLanguages() {
    chrome.storage.sync.get(['stats'], (result) => {
        const stats = result.stats || { languages: {} };
        const languagesList = document.getElementById('languages-list');

        if (Object.keys(stats.languages).length === 0) {
            languagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>No solutions saved yet</p>
        </div>
      `;
            return;
        }

        const sortedLanguages = Object.entries(stats.languages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        languagesList.innerHTML = sortedLanguages
            .map(([lang, count]) => `
        <div class="language-item">
          <span class="language-name">${getLanguageIcon(lang)} ${lang}</span>
          <span class="language-count">${count}</span>
        </div>
      `)
            .join('');
    });
}

function getLanguageIcon(lang) {
    const icons = {
        'JavaScript': '🟨',
        'Python': '🐍',
        'Python3': '🐍',
        'Java': '☕',
        'C++': '⚡',
        'C': '🔷',
        'C#': '💜',
        'Go': '🔵',
        'Ruby': '💎',
        'Swift': '🦅',
        'Kotlin': '🟣',
        'Rust': '🦀',
        'TypeScript': '🔷',
        'PHP': '🐘',
        'Scala': '🔴'
    };
    return icons[lang] || '📝';
}

function setupEventListeners() {
    document.getElementById('autoSave').addEventListener('change', (e) => {
        chrome.storage.sync.set({ autoSave: e.target.checked });
        showToast(e.target.checked ? 'Auto-save enabled ✅' : 'Auto-save disabled ⏸️');
    });

    document.getElementById('resetStats').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            chrome.storage.sync.set({
                stats: {
                    total: 0,
                    easy: 0,
                    medium: 0,
                    hard: 0,
                    languages: {}
                }
            }, () => {
                loadStats();
                loadLanguages();
                showToast('Statistics reset successfully 🔄');
            });
        }
    });

    document.getElementById('exportData').addEventListener('click', () => {
        chrome.storage.sync.get(['stats'], (result) => {
            const stats = result.stats || {
                total: 0,
                easy: 0,
                medium: 0,
                hard: 0,
                languages: {}
            };

            const dataStr = JSON.stringify(stats, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `leetcode-stats-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            showToast('Data exported successfully 📥');
        });
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    transition: transform 0.3s ease;
    white-space: nowrap;
  `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.stats) {
        loadStats();
        loadLanguages();
    }
});
