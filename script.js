// สถานะเริ่มต้นของแอป
let pairs = [
   { id: 1, name: "ทีม A" }, { id: 2, name: "ทีม B" }, 
   { id: 3, name: "ทีม C" }, { id: 4, name: "ทีม D" }
];
let matches = []; 
let tournamentRounds = []; 
let quickMatch = null;
let activeMatchIdx = null;
let activeTournamentMatch = null; 
let isGameOver = false;
let isFullscreenMode = false;
let currentView = 'scoreboard';
let currentMode = 'round-robin'; 

// ระบบ Confetti
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createConfetti() {
   particles = [];
   for (let i = 0; i < 150; i++) {
       particles.push({
           x: Math.random() * canvas.width,
           y: Math.random() * canvas.height - canvas.height,
           size: Math.random() * 8 + 4,
           color: `hsl(${Math.random() * 360}, 80%, 60%)`,
           velocity: { x: (Math.random() - 0.5) * 5, y: Math.random() * 5 + 5 },
           rotation: Math.random() * 360,
           rotSpeed: Math.random() * 10 - 5
       });
   }
}

function updateConfetti() {
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   particles.forEach((p, i) => {
       p.y += p.velocity.y; p.x += p.velocity.x; p.rotation += p.rotSpeed;
       ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180);
       ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
       ctx.restore();
       if (p.y > canvas.height) particles.splice(i, 1);
   });
   if (particles.length > 0) requestAnimationFrame(updateConfetti);
}

// การจัดการทีม
function addPair() {
   const input = document.getElementById('pairNameInput');
   if (input.value.trim()) {
       pairs.push({ id: Date.now(), name: input.value.trim() });
       input.value = "";
       renderPairs();
   }
}

function removePair(id) {
   pairs = pairs.filter(p => p.id !== id);
   renderPairs();
}

function renderPairs() {
   const container = document.getElementById('pairsList');
   container.innerHTML = pairs.map(p => `
       <div class="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700">
           <span class="font-bold text-white">${p.name}</span>
           <button onclick="removePair(${p.id})" class="text-red-500 font-bold px-2 hover:text-red-400">✕</button>
       </div>
   `).join('');
}

function changeMode(mode) {
   currentMode = mode;
   document.getElementById('tab-rr').className = mode === 'round-robin' ? 'pb-2 font-bold tab-active' : 'pb-2 font-bold text-slate-500';
   document.getElementById('tab-tm').className = mode === 'tournament' ? 'pb-2 font-bold tab-active' : 'pb-2 font-bold text-slate-500';
   document.getElementById('tab-qs').className = mode === 'quick-score' ? 'pb-2 font-bold tab-active' : 'pb-2 font-bold text-slate-500';
   
   // Toggle Setup UI
   document.getElementById('standard-setup').classList.toggle('hidden', mode === 'quick-score');
   document.getElementById('qs-setup').classList.toggle('hidden', mode !== 'quick-score');
   
   document.getElementById('rr-actions').classList.toggle('hidden', mode !== 'round-robin');
   document.getElementById('tm-actions').classList.toggle('hidden', mode !== 'tournament');
   
   const titleMap = {
       'round-robin': 'ตารางแบบพบกันหมด',
       'tournament': 'สายการแข่งขัน (Tournament)',
       'quick-score': 'ประวัตินับคะแนนด่วน'
   };
   document.getElementById('schedule-title').innerText = titleMap[mode];
   
   if (mode !== 'quick-score') {
       matches = [];
       tournamentRounds = [];
       activeMatchIdx = null;
       activeTournamentMatch = null;
   }
   renderSchedule();
}

// --- QUICK SCORE LOGIC ---
function startQuickMatch() {
   const nameA = document.getElementById('qs-name-a').value || "ทีม A";
   const nameB = document.getElementById('qs-name-b').value || "ทีม B";
   
   quickMatch = {
       teamA: { id: 'qs-a', name: nameA },
       teamB: { id: 'qs-b', name: nameB },
       scoreA: 0,
       scoreB: 0,
       completed: false,
       winner: null
   };
   
   isGameOver = false;
   activeMatchIdx = null;
   activeTournamentMatch = null;
   
   switchView('scoreboard');
   renderScoreboard();
   
   document.getElementById('match-info').classList.remove('hidden');
   document.getElementById('round-tag').innerText = `QUICK`;
   document.getElementById('current-match-label').innerText = `${nameA} vs ${nameB}`;
}

// การสร้างตารางแบบพบกันหมด
function generateSchedule() {
   if (pairs.length < 2) { alert("ต้องมีอย่างน้อย 2 ทีม"); return; }
   matches = [];
   let tempPairs = [...pairs];
   if (tempPairs.length % 2 !== 0) tempPairs.push({ id: null, name: "พัก (Bye)" });

   const numTeams = tempPairs.length;
   const numRounds = numTeams - 1;
   for (let round = 0; round < numRounds; round++) {
       for (let i = 0; i < numTeams / 2; i++) {
           const tA = tempPairs[i]; const tB = tempPairs[numTeams - 1 - i];
           if (tA.id !== null && tB.id !== null) {
               matches.push({ round: round + 1, teamA: tA, teamB: tB, scoreA: 0, scoreB: 0, completed: false });
           }
       }
       tempPairs.splice(1, 0, tempPairs.pop());
   }
   renderSchedule();
}

// การสร้างสายการแข่งทัวร์นาเมนต์
function generateTournament() {
   if (pairs.length < 2) { alert("ต้องมีอย่างน้อย 2 ทีม"); return; }
   tournamentRounds = [];
   let currentRoundTeams = [...pairs].sort(() => Math.random() - 0.5);
   let roundIdx = 0;

   while (currentRoundTeams.length > 1) {
       let roundMatches = [];
       let nextRoundTeams = [];
       for (let i = 0; i < currentRoundTeams.length; i += 2) {
           if (i + 1 < currentRoundTeams.length) {
               roundMatches.push({
                   teamA: currentRoundTeams[i], teamB: currentRoundTeams[i+1],
                   scoreA: 0, scoreB: 0, completed: false, winner: null
               });
               nextRoundTeams.push({ id: `placeholder-${roundIdx}-${i}`, name: "รอผล..." });
           } else {
               roundMatches.push({
                   teamA: currentRoundTeams[i], teamB: { id: null, name: "BYE" },
                   scoreA: 1, scoreB: 0, completed: true, winner: currentRoundTeams[i]
               });
               nextRoundTeams.push(currentRoundTeams[i]);
           }
       }
       tournamentRounds.push(roundMatches);
       currentRoundTeams = nextRoundTeams;
       roundIdx++;
   }
   renderSchedule();
}

function renderSchedule() {
   const container = document.getElementById('scheduleContainer');
   if (currentMode === 'round-robin') renderRRSchedule(container);
   else if (currentMode === 'tournament') renderTMSchedule(container);
   else {
       container.innerHTML = quickMatch ? 
           matchRowHtml(quickMatch, `startQuickMatch()`, true) : 
           `<p class="text-slate-500 text-center py-10">ยังไม่มีการนับคะแนนด่วน</p>`;
   }
}

function renderRRSchedule(container) {
   if (matches.length === 0) { container.innerHTML = `<p class="text-slate-500 text-center py-10">กดสร้างตารางเพื่อเริ่ม</p>`; return; }
   let html = ''; let curR = 0;
   matches.forEach((m, idx) => {
       if (m.round !== curR) { curR = m.round; html += `<div class="mt-6 mb-2 text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-1 tracking-widest">รอบที่ ${curR}</div>`; }
       html += matchRowHtml(m, `startMatch(${idx})`, activeMatchIdx === idx);
   });
   container.innerHTML = html;
}

function renderTMSchedule(container) {
   if (tournamentRounds.length === 0) { container.innerHTML = `<p class="text-slate-500 text-center py-10">กดสร้างสายการแข่งเพื่อเริ่ม</p>`; return; }
   let html = '';
   tournamentRounds.forEach((round, rIdx) => {
       const labels = ["รอบแรก", "รอบก่อนรอง", "รอบรองชนะเลิศ", "รอบชิงชนะเลิศ"];
       const label = rIdx === tournamentRounds.length - 1 ? "รอบชิงชนะเลิศ" : (labels[rIdx] || `รอบที่ ${rIdx + 1}`);
       html += `<div class="mt-6 mb-2 text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-1 tracking-widest">${label}</div>`;
       round.forEach((m, mIdx) => {
           const isActive = activeTournamentMatch?.roundIdx === rIdx && activeTournamentMatch?.matchIdx === mIdx;
           if (m.teamB.id === null) {
               html += `<div class="p-3 bg-slate-900/40 rounded-xl text-xs text-slate-500 italic mb-2">${m.teamA.name} ผ่านเข้ารอบอัตโนมัติ</div>`;
           } else {
               html += matchRowHtml(m, `startTMMatch(${rIdx}, ${mIdx})`, isActive);
           }
       });
   });
   container.innerHTML = html;
}

function matchRowHtml(m, action, isActive) {
   return `
   <div class="flex flex-col md:flex-row items-center justify-between bg-slate-900/80 p-4 rounded-2xl border ${m.completed ? 'border-emerald-500/50 bg-emerald-900/10' : (isActive ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700')} mb-2">
       <div class="flex items-center gap-4 flex-1">
           <span class="font-bold text-white text-lg ${m.winner?.id === m.teamA.id ? 'text-emerald-400' : ''}">${m.teamA.name}</span>
           <span class="text-slate-500 text-xs uppercase tracking-widest">VS</span>
           <span class="font-bold text-white text-lg ${m.winner?.id === m.teamB.id ? 'text-emerald-400' : ''}">${m.teamB.name}</span>
       </div>
       <div class="flex items-center gap-4 mt-3 md:mt-0">
           ${m.completed ? `<span class="text-emerald-400 font-black text-xl">${m.scoreA} - ${m.scoreB}</span>` : ''}
           <button onclick="${action}" class="px-5 py-2 ${m.completed ? 'bg-slate-700 text-slate-400' : (isActive ? 'bg-amber-600' : 'bg-blue-600')} rounded-xl font-bold text-sm whitespace-nowrap active:scale-95 transition-all shadow-md">
               ${isActive ? 'กำลังเล่น' : (m.completed ? 'ดูคะแนน' : 'ลงสนาม')}
           </button>
       </div>
   </div>`;
}

function startMatch(idx) {
   activeMatchIdx = idx; activeTournamentMatch = null;
   setupScoreboard(matches[idx].teamA, matches[idx].teamB, matches[idx].round, `${matches[idx].teamA.name} vs ${matches[idx].teamB.name}`);
}

function startTMMatch(rIdx, mIdx) {
   const m = tournamentRounds[rIdx][mIdx];
   if (m.teamA.id.toString().includes('placeholder') || m.teamB.id.toString().includes('placeholder')) {
       alert("ต้องรอผลการแข่งจากรอบก่อนหน้า"); return;
   }
   activeTournamentMatch = { roundIdx: rIdx, matchIdx: mIdx }; activeMatchIdx = null;
   setupScoreboard(m.teamA, m.teamB, rIdx + 1, `${m.teamA.name} vs ${m.teamB.name}`);
}

function setupScoreboard(tA, tB, round, label) {
   isGameOver = false; switchView('scoreboard'); renderScoreboard();
   document.getElementById('match-info').classList.remove('hidden');
   document.getElementById('round-tag').innerText = `รอบที่ ${round}`;
   document.getElementById('current-match-label').innerText = label;
}

function switchView(target) {
   currentView = target || (currentView === 'scoreboard' ? 'setup' : 'scoreboard');
   document.getElementById('setup-view').classList.toggle('hidden', currentView !== 'setup');
   document.getElementById('scoreboard-view').classList.toggle('hidden', currentView !== 'scoreboard');
   document.getElementById('toggle-view-btn').innerText = currentView === 'setup' ? "หน้าจอนับคะแนน" : "จัดการคู่แข่งขัน";
   if (currentView === 'setup') renderSchedule(); else renderScoreboard();
}

function changeScore(isTeamB, delta) {
   let m;
   if (currentMode === 'round-robin') m = matches[activeMatchIdx];
   else if (currentMode === 'tournament') m = tournamentRounds[activeTournamentMatch.roundIdx][activeTournamentMatch.matchIdx];
   else m = quickMatch;

   if (!m || (isGameOver && delta > 0)) return;
   if (isTeamB) m.scoreB = Math.max(0, m.scoreB + delta);
   else m.scoreA = Math.max(0, m.scoreA + delta);
   
   const scoreElement = document.getElementById(`score-val-${isTeamB}`);
   if (scoreElement && delta > 0) {
       scoreElement.classList.remove('score-animate'); void scoreElement.offsetWidth; scoreElement.classList.add('score-animate');
   }
   renderScoreboard(); checkWinner();
}

function checkWinner() {
   const target = parseInt(document.getElementById('targetScore').value);
   let m;
   if (currentMode === 'round-robin') m = matches[activeMatchIdx];
   else if (currentMode === 'tournament') m = tournamentRounds[activeTournamentMatch.roundIdx][activeTournamentMatch.matchIdx];
   else m = quickMatch;

   if ((m.scoreA >= target || m.scoreB >= target) && !isGameOver) {
       isGameOver = true;
       const winner = m.scoreA >= target ? m.teamA : m.teamB;
       m.winner = winner; m.completed = true;
       if (currentMode === 'tournament') advanceWinner(winner);
       createConfetti(); updateConfetti();
       setTimeout(() => {
           document.getElementById('winnerMessage').innerText = `${winner.name} ชนะการแข่งขัน!`;
           document.getElementById('winnerModal').classList.remove('hidden');
       }, 300);
   }
}

function advanceWinner(winner) {
   const { roundIdx, matchIdx } = activeTournamentMatch;
   const nextRoundIdx = roundIdx + 1;
   const nextMatchIdx = Math.floor(matchIdx / 2);
   if (nextRoundIdx < tournamentRounds.length) {
       const nextMatch = tournamentRounds[nextRoundIdx][nextMatchIdx];
       if (matchIdx % 2 === 0) nextMatch.teamA = winner; else nextMatch.teamB = winner;
   }
}

function renderScoreboard() {
   const container = document.getElementById('scoreboard-container');
   let m;
   if (currentMode === 'round-robin') m = activeMatchIdx !== null ? matches[activeMatchIdx] : null;
   else if (currentMode === 'tournament') m = activeTournamentMatch ? tournamentRounds[activeTournamentMatch.roundIdx][activeTournamentMatch.matchIdx] : null;
   else m = quickMatch;

   if (!m) {
       container.innerHTML = `<div class="text-center py-20 bg-slate-800/30 rounded-[3rem] border border-dashed border-slate-700">
           <p class="text-slate-500 mb-4 font-bold">ยังไม่ได้เลือกคู่ลงสนาม</p>
           <button onclick="switchView('setup')" class="bg-blue-600 px-6 py-3 rounded-2xl font-bold shadow-lg">ไปที่หน้าตั้งค่า</button>
       </div>`;
       return;
   }

   const target = parseInt(document.getElementById('targetScore').value);
   const sides = [{ name: m.teamA.name, score: m.scoreA, color: '#3b82f6', isB: false }, { name: m.teamB.name, score: m.scoreB, color: '#ef4444', isB: true }];
   let gridCols = isFullscreenMode ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2";
   container.className = `flex-grow grid gap-4 ${gridCols}`;

   container.innerHTML = sides.map(side => {
       const isWinning = side.score >= target;
       const scoreSize = isFullscreenMode ? 'text-[clamp(10rem,35vh,25rem)]' : 'text-8xl md:text-9xl';
       return `
       <div class="score-card relative flex flex-col bg-slate-800/80 backdrop-blur-sm rounded-[2.5rem] overflow-hidden border-2 ${isWinning ? 'winner-card' : 'border-slate-700'}">
           <div class="p-4 flex items-center justify-center" style="background-color: ${side.color}22">
               <span class="text-2xl font-black text-white uppercase tracking-tighter">${side.name}</span>
           </div>
           <div onclick="changeScore(${side.isB}, 1)" class="flex-grow flex items-center justify-center cursor-pointer tap-target select-none active:bg-white/5 transition-colors">
               <div id="score-val-${side.isB}" class="${scoreSize} font-black leading-none drop-shadow-2xl" style="color: ${side.color}">${side.score}</div>
           </div>
           <div class="p-6 grid grid-cols-2 gap-4">
               <button onclick="event.stopPropagation(); changeScore(${side.isB}, -1)" class="tap-target py-6 bg-slate-700/50 rounded-2xl text-3xl font-bold active:scale-95 text-slate-300 border border-slate-600">-</button>
               <button onclick="event.stopPropagation(); changeScore(${side.isB}, 1)" class="tap-target py-6 rounded-2xl text-5xl font-black active:scale-95 text-white shadow-2xl" style="background-color: ${side.color}">+</button>
           </div>
       </div>`;
   }).join('');
}

function toggleFullscreen() {
   isFullscreenMode = !isFullscreenMode;
   document.body.classList.toggle('fullscreen-active', isFullscreenMode);
   document.getElementById('fs-btn-text').innerText = isFullscreenMode ? "ย่อหน้า" : "เต็มจอ";
   renderScoreboard();
}

function closeModal() {
   document.getElementById('winnerModal').classList.add('hidden');
   switchView('setup');
}

window.onload = () => { renderPairs(); changeMode('round-robin'); };