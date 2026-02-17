// --- Security Utils ---
const escapeHTML = (str) => {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
};

const APP_VERSION = "1.0.1"; // Define app version here

let pairs = [{ id: 1, name: "คู่ A" }, { id: 2, name: "คู่ B" }, { id: 3, name: "คู่ C" }, { id: 4, name: "คู่ D" }];
let matches = []; let tournamentRounds = []; let quickMatches = [];
let activeMatchIdx = null; let activeTournamentMatch = null; let activeQuickMatchIdx = null;
let isGameOver = false; let isFullscreenMode = false; let currentView = 'home';
let currentMode = 'round-robin'; let activeTheme = 'default';

const themeConfig = {
    'default': { body: 'theme-default', card: 'bg-slate-800/80', score: 'drop-shadow-2xl' },
    'high-contrast': { body: 'theme-high-contrast', card: 'bg-black border-4 border-yellow-400', score: 'text-yellow-400 font-black' },
    'neon': { body: 'theme-neon', card: 'bg-black border-2 border-green-500', score: 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]' },
    'light': { body: 'theme-light', card: 'bg-white border-4 border-slate-200 shadow-2xl', score: 'font-black' }
};

function openThemeModal() { document.getElementById('themeModal').classList.remove('hidden'); }
function closeThemeModal() { document.getElementById('themeModal').classList.add('hidden'); }
function applyTheme(theme) { activeTheme = theme; document.body.className = `min-h-screen p-2 md:p-6 text-slate-200 overflow-x-hidden ${themeConfig[theme].body}`; closeThemeModal(); if (currentView === 'scoreboard') renderScoreboard(); }

const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

function getOrientationGridClass() {
    if (window.matchMedia("(orientation: landscape)").matches) {
        return "grid-cols-2"; // Landscape: side-by-side
    } else {
        return "grid-cols-1"; // Portrait: top-bottom
    }
}

function getScoreFontSizeClass() {
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    if (isLandscape) {
        return isFullscreenMode ? 'text-[clamp(10rem,35vh,25rem)]' : 'text-8xl md:text-9xl';
    } else {
        return isFullscreenMode ? 'text-[clamp(8rem,20vh,15rem)]' : 'text-7xl';
    }
}

function handleResizeAndOrientation() {
    resizeCanvas();
    if (currentView === 'scoreboard') {
        renderScoreboard();
    }
}
window.addEventListener('resize', handleResizeAndOrientation);
resizeCanvas();

function createConfetti() {
    particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4, color: `hsl(${Math.random() * 360}, 80%, 60%)`,
            velocity: { x: (Math.random() - 0.5) * 5, y: Math.random() * 5 + 5 },
            rotation: Math.random() * 360, rotSpeed: Math.random() * 10 - 5
        });
    }
}

function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
        p.y += p.velocity.y; p.x += p.velocity.x; p.rotation += p.rotSpeed;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        if (p.y > canvas.height) particles.splice(i, 1);
    });
    if (particles.length > 0) requestAnimationFrame(updateConfetti);
}

function launchMode(mode) { changeMode(mode); switchView('setup'); }

function switchView(target) {
    currentView = target;
    const views = { home: 'home-view', setup: 'setup-view', scoreboard: 'scoreboard-view' };
    Object.keys(views).forEach(v => document.getElementById(views[v]).classList.add('hidden'));
    document.getElementById(views[target]).classList.remove('hidden');
    if (target === 'setup') document.getElementById(views[target]).classList.add('grid');

    document.getElementById('home-nav-btn').classList.toggle('hidden', target === 'home');
    document.getElementById('mode-tabs').classList.toggle('hidden', target === 'home');
    document.getElementById('target-score-wrapper').classList.toggle('hidden', target === 'home');
    document.getElementById('theme-btn').classList.toggle('hidden', target === 'home');
    document.getElementById('toggle-view-btn').classList.toggle('hidden', target !== 'scoreboard');
    document.getElementById('fs-btn').classList.toggle('hidden', target !== 'scoreboard');

    if (target === 'home' && isFullscreenMode) toggleFullscreen();
    if (target === 'setup') renderSchedule();
    if (target === 'scoreboard') renderScoreboard();
}

function changeMode(mode) {
    currentMode = mode;
    ['rr', 'tm', 'qs'].forEach(m => {
        const tab = document.getElementById(`tab-${m}`);
        if (tab) tab.className = mode === (m === 'rr' ? 'round-robin' : (m === 'tm' ? 'tournament' : 'quick-score')) ? 'pb-2 font-bold tab-active' : 'pb-2 font-bold text-slate-500';
    });
    document.getElementById('standard-setup').classList.toggle('hidden', mode === 'quick-score');
    document.getElementById('qs-setup').classList.toggle('hidden', mode !== 'quick-score');
    document.getElementById('rr-actions').classList.toggle('hidden', mode !== 'round-robin');
    document.getElementById('tm-actions').classList.toggle('hidden', mode !== 'tournament');
    renderSchedule();
}

function createQuickMatch() {
    const nA = document.getElementById('qs-name-a').value.trim() || "ทีม A";
    const nB = document.getElementById('qs-name-b').value.trim() || "ทีม B";
    quickMatches.unshift({ id: Date.now(), teamA: { id: 'qs-a', name: nA }, teamB: { id: 'qs-b', name: nB }, scoreA: 0, scoreB: 0, completed: false, timestamp: Date.now() });
    startQuickMatch(0);
}
function startQuickMatch(i) { activeQuickMatchIdx = i; activeMatchIdx = null; activeTournamentMatch = null; setupScoreboard(quickMatches[i].teamA, quickMatches[i].teamB, 'ด่วน', `${quickMatches[i].teamA.name} vs ${quickMatches[i].teamB.name}`); }

function addPair() {
    const i = document.getElementById('pairNameInput');
    const val = i.value.trim();
    if (val) { pairs.push({ id: Date.now(), name: val }); i.value = ""; renderPairs(); }
}
function removePair(id) { pairs = pairs.filter(p => p.id !== id); renderPairs(); }
function renderPairs() {
    document.getElementById('pairsList').innerHTML = pairs.map(p => `
             <div class="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700">
                 <span class="font-bold text-white px-2 break-all">${escapeHTML(p.name)}</span>
                 <button onclick="removePair(${p.id})" class="text-red-500 font-bold px-3 hover:text-red-400">✕</button>
             </div>`).join('');
}

function generateSchedule() {
    if (pairs.length < 2) return;
    matches = []; let temp = [...pairs]; if (temp.length % 2 !== 0) temp.push({ id: null, name: "Bye" });
    const n = temp.length;
    for (let r = 0; r < n - 1; r++) {
        for (let i = 0; i < n / 2; i++) {
            const tA = temp[i], tB = temp[n - 1 - i];
            if (tA.id && tB.id) matches.push({ round: r + 1, teamA: tA, teamB: tB, scoreA: 0, scoreB: 0, completed: false });
        }
        temp.splice(1, 0, temp.pop());
    }
    renderSchedule();
}

function generateTournament() {
    if (pairs.length < 2) return;
    tournamentRounds = []; let cur = [...pairs].sort(() => Math.random() - 0.5);
    let ri = 0;
    while (cur.length > 1) {
        let m = [], next = [];
        for (let i = 0; i < cur.length; i += 2) {
            if (i + 1 < cur.length) { m.push({ teamA: cur[i], teamB: cur[i + 1], scoreA: 0, scoreB: 0, completed: false }); next.push({ id: `p-${ri}-${i}`, name: "รอผล..." }); }
            else { m.push({ teamA: cur[i], teamB: { id: null, name: "BYE" }, scoreA: 1, scoreB: 0, completed: true, winner: cur[i] }); next.push(cur[i]); }
        }
        tournamentRounds.push(m); cur = next; ri++;
    }
    renderSchedule();
}

function renderSchedule() {
    const container = document.getElementById('scheduleContainer');
    if (currentMode === 'round-robin') {
        if (!matches.length) return container.innerHTML = '<p class="text-slate-500 text-center py-10 italic">กรุณากดปุ่มเพื่อสร้างตาราง</p>';
        let h = '', cr = 0;
        matches.forEach((m, i) => {
            if (m.round !== cr) { cr = m.round; h += `<div class="mt-6 mb-2 text-xs font-bold text-slate-500 border-b border-slate-700 pb-1">รอบที่ ${cr}</div>`; }
            h += matchRowHtml(m, `startMatch(${i})`, activeMatchIdx === i);
        });
        container.innerHTML = h;
    } else if (currentMode === 'tournament') {
        if (!tournamentRounds.length) return container.innerHTML = '<p class="text-slate-500 text-center py-10 italic">กรุณากดปุ่มเพื่อสร้างสายแข่ง</p>';
        container.innerHTML = tournamentRounds.map((r, ri) => `<div class="mt-6 text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-1">รอบที่ ${ri + 1}</div>` + r.map((m, mi) => matchRowHtml(m, `startTMMatch(${ri},${mi})`, activeTournamentMatch?.roundIdx === ri && activeTournamentMatch?.matchIdx === mi)).join('')).join('');
    } else {
        if (!quickMatches.length) container.innerHTML = '<p class="text-slate-500 text-center py-10 italic">ยังไม่มีประวัติ (เก็บไว้ 12 ชม.)</p>';
        else container.innerHTML = quickMatches.map((m, i) => matchRowHtml(m, `startQuickMatch(${i})`, activeQuickMatchIdx === i)).join('');
    }
}

function matchRowHtml(m, action, active) {
    const isL = activeTheme === 'light';
    return `<div class="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border ${m.completed ? 'border-emerald-500/50 bg-emerald-900/10' : (active ? 'border-blue-500' : 'border-slate-700')} mb-2 transition-all ${isL ? 'bg-white shadow-sm' : ''}"><div class="flex-1 font-bold ${isL ? 'text-slate-900' : 'text-white'} truncate pr-2">${escapeHTML(m.teamA.name)} <span class="text-[10px] text-slate-500 mx-2 uppercase">vs</span> ${escapeHTML(m.teamB.name)}</div><div class="flex items-center gap-3">${m.completed ? `<span class="text-emerald-500 font-black">${m.scoreA}-${m.scoreB}</span>` : ''}<button onclick="${action}" class="px-4 py-2 ${active ? 'bg-amber-600' : 'bg-blue-600'} rounded-xl font-bold text-xs text-white shadow active:scale-95 transition-all">${active ? 'กำลังเล่น' : 'ลงสนาม'}</button></div></div>`;
}

function startMatch(i) { activeMatchIdx = i; activeTournamentMatch = null; activeQuickMatchIdx = null; setupScoreboard(matches[i].teamA, matches[i].teamB, matches[i].round, `${escapeHTML(matches[i].teamA.name)} vs ${escapeHTML(matches[i].teamB.name)}`); }
function startTMMatch(ri, mi) { const m = tournamentRounds[ri][mi]; if (m.teamA.id?.toString().includes('p-') || m.teamB.id?.toString().includes('p-')) return; activeTournamentMatch = { roundIdx: ri, matchIdx: mi }; activeMatchIdx = null; activeQuickMatchIdx = null; setupScoreboard(m.teamA, m.teamB, ri + 1, `${escapeHTML(m.teamA.name)} vs ${escapeHTML(m.teamB.name)}`); }
function setupScoreboard(tA, tB, r, l) { isGameOver = false; switchView('scoreboard'); document.getElementById('match-info').classList.remove('hidden'); document.getElementById('round-tag').innerText = `รอบ: ${r}`; document.getElementById('current-match-label').innerHTML = l; }

function changeScore(isB, d) {
    let m = currentMode === 'round-robin' ? matches[activeMatchIdx] : (currentMode === 'tournament' ? tournamentRounds[activeTournamentMatch.roundIdx][activeTournamentMatch.matchIdx] : (activeQuickMatchIdx !== null ? quickMatches[activeQuickMatchIdx] : null));
    if (!m || (isGameOver && d > 0)) return;
    if (isB) m.scoreB = Math.max(0, m.scoreB + d); else m.scoreA = Math.max(0, m.scoreA + d);
    const el = document.getElementById(`score-val-${isB}`); if (el && d > 0) { el.classList.remove('score-animate'); void el.offsetWidth; el.classList.add('score-animate'); }
    renderScoreboard(); checkWinner();
}

function checkWinner() {
    let ts = parseInt(document.getElementById('targetScore').value);
    if (isNaN(ts) || ts <= 0) ts = 21;
    let m = currentMode === 'round-robin' ? matches[activeMatchIdx] : (currentMode === 'tournament' ? tournamentRounds[activeTournamentMatch.roundIdx][activeTournamentMatch.matchIdx] : (activeQuickMatchIdx !== null ? quickMatches[activeQuickMatchIdx] : null));
    if (m && (m.scoreA >= ts || m.scoreB >= ts) && !isGameOver) {
        isGameOver = true; const w = m.scoreA >= ts ? m.teamA : m.teamB; m.winner = w; m.completed = true;
        if (currentMode === 'tournament') advanceWinner(w);
        createConfetti(); updateConfetti();
        setTimeout(() => { const md = document.getElementById('winnerModal'); document.getElementById('winnerMessage').innerText = `${w.name} ชนะการแข่งขัน!`; md.classList.remove('hidden'); md.classList.add('flex'); }, 300);
    }
}

function advanceWinner(w) {
    const { roundIdx, matchIdx } = activeTournamentMatch; const nr = roundIdx + 1, nm = Math.floor(matchIdx / 2);
    if (nr < tournamentRounds.length) { const nxt = tournamentRounds[nr][nm]; if (matchIdx % 2 === 0) nxt.teamA = w; else nxt.teamB = w; }
}

function renderScoreboard() {
    const container = document.getElementById('scoreboard-container');
    let m = currentMode === 'round-robin' ? (activeMatchIdx !== null ? matches[activeMatchIdx] : null) : (currentMode === 'tournament' ? (activeTournamentMatch ? tournamentRounds[activeTournamentMatch.roundIdx][activeTournamentMatch.matchIdx] : null) : (activeQuickMatchIdx !== null ? quickMatches[activeQuickMatchIdx] : null));
    if (!m) return container.innerHTML = `<div class="text-center py-20 bg-slate-800/30 rounded-[3rem] border-dashed border-2 border-slate-700"><p class="text-slate-500 mb-4 font-bold">โปรดเลือกแมตช์</p><button onclick="switchView('setup')" class="bg-blue-600 px-8 py-3 rounded-2xl font-bold text-white shadow-lg">ไปที่หน้าตั้งค่า</button></div>`;
    const cfg = themeConfig[activeTheme];
    const sides = [{ name: m.teamA.name, score: m.scoreA, isB: false, color: '#3b82f6' }, { name: m.teamB.name, score: m.scoreB, isB: true, color: '#ef4444' }];
    let grid = getOrientationGridClass();
    container.className = `flex-grow grid gap-4 ${grid}`;
    container.innerHTML = sides.map(s => {
        const sz = getScoreFontSizeClass();
        let scoreStyle = (activeTheme === 'default' || activeTheme === 'light') ? `color: ${s.color}` : '';
        return `<div class="score-card relative flex flex-col ${cfg.card} rounded-[2.5rem] overflow-hidden border-2"><div class="p-4 text-center font-black text-2xl uppercase tracking-tighter truncate" style="${activeTheme === 'default' ? 'background-color:' + s.color + '22;' : ''} ${activeTheme === 'light' ? 'color:#1e293b' : ''}">${escapeHTML(s.name)}</div><div onclick="changeScore(${s.isB}, 1)" class="flex-grow flex items-center justify-center cursor-pointer tap-target select-none transition-colors active:bg-slate-200/10"><div id="score-val-${s.isB}" class="${sz} font-black leading-none ${cfg.score}" style="${scoreStyle}">${s.score}</div></div><div class="p-6 grid grid-cols-2 gap-4"><button onclick="event.stopPropagation(); changeScore(${s.isB}, -1)" class="py-6 bg-slate-700/50 rounded-2xl text-3xl font-bold active:scale-95 transition-all text-white border border-slate-600">-</button><button onclick="event.stopPropagation(); changeScore(${s.isB}, 1)" class="py-6 rounded-2xl text-5xl font-black active:scale-95 shadow-2xl transition-all text-white" style="${activeTheme === 'high-contrast' ? 'background:#fbbf24;color:#000' : 'background:' + s.color}">+</button></div></div>`;
    }).join('');
}

function toggleFullscreen() { isFullscreenMode = !isFullscreenMode; document.body.classList.toggle('fullscreen-active', isFullscreenMode); document.getElementById('fs-btn-text').innerText = isFullscreenMode ? "ย่อหน้า" : "เต็มจอ"; renderScoreboard(); }
function closeModal() { const modal = document.getElementById('winnerModal'); modal.classList.remove('flex'); modal.classList.add('hidden'); isGameOver = false; particles = []; ctx.clearRect(0, 0, canvas.width, canvas.height); if (isFullscreenMode) toggleFullscreen(); switchView('setup'); }
window.onload = () => {
    resizeCanvas();
    switchView('home');
    document.getElementById('app-version').innerText = APP_VERSION; // Update footer version
};