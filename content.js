let settings = {
    autoSave: true
};

chrome.storage.sync.get(settings, (result) => {
    settings = result;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.autoSave) {
        settings.autoSave = changes.autoSave.newValue;
    }
});

let hasSaved = false;

function waitForSubmitButton() {
    const submitBtn = document.querySelector(
        '[data-e2e-locator="console-submit-button"]'
    );

    if (!submitBtn) {
        setTimeout(waitForSubmitButton, 1000);
        return;
    }

    submitBtn.addEventListener("click", () => {
        hasSaved = false; // Reset flag on new submission
        waitForAccepted();
    });
}

function waitForAccepted() {
    const resultNode = document.querySelector(
        '[data-e2e-locator="submission-result"]'
    );

    if (!resultNode) {
        setTimeout(waitForAccepted, 1000);
        return;
    }

    const checkResult = () => {
        const text = resultNode.innerText.trim();
        if (text === "Accepted" && !hasSaved) {
            hasSaved = true;
            onAccepted();
        }
    };

    // Check immediately
    checkResult();

    // Watch for changes
    const observer = new MutationObserver(() => {
        checkResult();
    });

    observer.observe(resultNode, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function getDifficulty() {
    const difficultySelectors = [
        'div[class*="text-difficulty"]',
        'div[class*="text-easy"]',
        'div[class*="text-medium"]',
        'div[class*="text-hard"]',
        '[class*="text-olive"]',
        '[class*="text-yellow"]',
        '[class*="text-pink"]',
        'div.text-label-1',
        'div.text-label-2',
        'div.text-label-3'
    ];

    for (const selector of difficultySelectors) {
        const elems = document.querySelectorAll(selector);
        for (const elem of elems) {
            const text = elem.innerText.toLowerCase();
            if (text === 'easy') return 'Easy';
            if (text === 'medium') return 'Medium';
            if (text === 'hard') return 'Hard';
        }
    }

    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
        const text = div.innerText.trim();
        if (text === 'Easy' && div.children.length === 0) return 'Easy';
        if (text === 'Medium' && div.children.length === 0) return 'Medium';
        if (text === 'Hard' && div.children.length === 0) return 'Hard';
    }

    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('"difficulty"')) {
            if (content.includes('"difficulty":"Easy"') || content.includes('"difficulty":1')) return 'Easy';
            if (content.includes('"difficulty":"Medium"') || content.includes('"difficulty":2')) return 'Medium';
            if (content.includes('"difficulty":"Hard"') || content.includes('"difficulty":3')) return 'Hard';
        }
    }

    return 'Unknown';
}

function getLanguage() {
    const langSelectors = [
        '.ant-select-selection-item',
        'button[id*="headlessui-listbox-button"]',
        '[class*="rounded items-center"]',
        'div[class*="text-label-r"]'
    ];

    for (const selector of langSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.innerText) {
            const lang = elem.innerText.trim();
            if (lang && lang.length > 0 && lang.length < 20) {
                return lang;
            }
        }
    }

    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
        const text = button.innerText.trim();
        const knownLanguages = ['C++', 'Java', 'Python', 'Python3', 'JavaScript', 'TypeScript',
            'C', 'C#', 'Go', 'Ruby', 'Swift', 'Kotlin', 'Rust', 'PHP', 'Scala'];
        if (knownLanguages.includes(text)) {
            return text;
        }
    }

    return "Unknown";
}

function getProblemTitle() {
    const titleSelectors = [
        '[data-cy="question-title"]',
        'div[class*="text-title"]',
        'div.text-title-large',
        'a[class*="text-title"]'
    ];

    for (const selector of titleSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.innerText) {
            const title = elem.innerText.trim();
            if (title && title.length > 0) {
                return title.replace(/[\\/:*?"<>|]/g, '-');
            }
        }
    }

    const pageTitle = document.title;
    if (pageTitle && pageTitle.includes(' - LeetCode')) {
        const title = pageTitle.split(' - LeetCode')[0].trim();
        if (title) {
            return title.replace(/[\\/:*?"<>|]/g, '-');
        }
    }

    return window.location.pathname.split("/")[2];
}

function onAccepted() {
    if (!settings.autoSave) {
        return;
    }

    const code = extractCode();
    if (!code) {
        return;
    }

    const slug = window.location.pathname.split("/")[2];
    const problemTitle = getProblemTitle();
    const lang = getLanguage();
    const difficulty = getDifficulty();

    const extMap = {
        "C++": "cpp",
        "Java": "java",
        "Python": "py",
        "Python3": "py",
        "JavaScript": "js",
        "TypeScript": "ts",
        "C": "c",
        "C#": "cs",
        "Go": "go",
        "Ruby": "rb",
        "Swift": "swift",
        "Kotlin": "kt",
        "Rust": "rs",
        "PHP": "php",
        "Scala": "scala",
        "Racket": "rkt",
        "Erlang": "erl",
        "Elixir": "ex"
    };

    const ext = extMap[lang] || "txt";
    const filename = `${problemTitle}.${ext}`;

    const metadata = generateMetadata(slug, difficulty, lang, problemTitle);
    const finalContent = metadata + "\n\n" + code;

    downloadFile(filename, finalContent);
    updateStats(difficulty, lang);
    showNotification(`✅ Saved: ${filename}`, difficulty);
}

function generateMetadata(slug, difficulty, lang, problemTitle) {
    const date = new Date().toISOString().split('T')[0];
    const url = window.location.href;

    const commentMap = {
        "cpp": "//",
        "java": "//",
        "py": "#",
        "js": "//",
        "ts": "//",
        "c": "//",
        "cs": "//",
        "go": "//",
        "rb": "#",
        "swift": "//",
        "kt": "//",
        "rs": "//",
        "php": "//",
        "scala": "//",
        "rkt": ";",
        "erl": "%",
        "ex": "#"
    };

    const langToExt = {
        "C++": "cpp",
        "Java": "java",
        "Python": "py",
        "Python3": "py",
        "JavaScript": "js",
        "TypeScript": "ts",
        "C": "c",
        "C#": "cs",
        "Go": "go",
        "Ruby": "rb",
        "Swift": "swift",
        "Kotlin": "kt",
        "Rust": "rs",
        "PHP": "php",
        "Scala": "scala"
    };

    const extKey = langToExt[lang] || "txt";
    const comment = commentMap[extKey] || "//";

    return `${comment} Problem: ${problemTitle}
${comment} Difficulty: ${difficulty}
${comment} Language: ${lang}
${comment} Date: ${date}
${comment} URL: ${url}`;
}

function updateStats(difficulty, lang) {
    chrome.storage.sync.get(['stats'], (result) => {
        const stats = result.stats || {
            total: 0,
            easy: 0,
            medium: 0,
            hard: 0,
            languages: {}
        };

        stats.total++;
        if (difficulty === 'Easy') stats.easy++;
        if (difficulty === 'Medium') stats.medium++;
        if (difficulty === 'Hard') stats.hard++;

        stats.languages[lang] = (stats.languages[lang] || 0) + 1;

        chrome.storage.sync.set({ stats });
    });
}

function showNotification(message, difficulty) {
    const notification = document.createElement('div');
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
    display: flex;
    align-items: center;
    gap: 12px;
  `;

    const difficultyColors = {
        'Easy': '#00b8a3',
        'Medium': '#ffc01e',
        'Hard': '#ff375f'
    };

    if (difficultyColors[difficulty]) {
        notification.style.background = difficultyColors[difficulty];
    }

    notification.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="white"/>
    </svg>
    <span>${message}</span>
  `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

function extractCode() {
    const lines = document.querySelectorAll(".view-line");
    if (!lines.length) return null;

    return Array.from(lines).map(line => line.innerText).join("\n");
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

waitForSubmitButton();
