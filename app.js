// Global error handler — prevents blank screen on JS errors
window.onerror = function(msg, src, line) {
  console.error('Greenside error:', msg, src, line);
  const el = document.getElementById('error-toast');
  if (el) { el.textContent = '⚠️ Error: ' + msg + ' (line ' + line + '). Tap to reload.'; el.classList.remove('hidden'); el.onclick = () => location.reload(); }
  return false;
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                    GREENSIDE - app.js                       ║
// ║              Golf Betting Tracker Application               ║
// ╠══════════════════════════════════════════════════════════════╣
// ║  TABLE OF CONTENTS                                          ║
// ║                                                              ║
// ║  §1  STATE & CONFIG .............. Constants, state, undo    ║
// ║  §2  INITIALIZATION .............. DOMContentLoaded, swipe   ║
// ║  §3  COURSE SETUP ................ Par grid, hole count      ║
// ║  §4  PLAYER MANAGEMENT ........... Profiles, quick-add       ║
// ║  §5  GAME OPTIONS ................ Game types, descriptions  ║
// ║  §6  HANDICAP ENGINE ............. Strokes, net scores       ║
// ║  §7  ROUND LIFECYCLE ............. Start, home, navigation   ║
// ║  §8  SCORING UI .................. Hole render, score entry  ║
// ║  §9  WOLF GAME ................... Partners, pairings, hammer║
// ║  §10 MONEY CALCULATIONS .......... All game type calcs       ║
// ║  §11 GAME STATUS DISPLAY ......... Money banner, details     ║
// ║  §12 SCORECARD & STANDINGS ....... Tables, modals            ║
// ║  §13 FINISH ROUND ................ Summary, stats, share     ║
// ║  §14 PERSISTENCE ................. localStorage, save/load   ║
// ║  §15 SCREEN MANAGEMENT ........... Nav, live, history        ║
// ║  §16 COURSE SEARCH ............... Database, search, select  ║
// ╚══════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════
// §1  STATE & CONFIG
// ═══════════════════════════════════════
const COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#264653','#6a4c93','#1982c4'];
const STANDARD_PARS = [4,4,3,5,4,4,3,4,5, 4,4,3,5,4,4,3,4,5];
const STANDARD_HDCP = [7,3,15,1,9,5,17,11,13, 8,4,16,2,10,6,18,12,14];

let state = {
  course: '', pars: [...STANDARD_PARS], hdcps: [...STANDARD_HDCP],
  players: [], gameType: 'nassau', gameOpts: {}, handicapMode: 'full',
  scores: {}, currentHole: 0, started: false, holeCount: 9,
};


var GAME_DESCS = {
  nassau: 'Three separate match-play bets: Front 9, Back 9, and Overall 18. Each is its own bet. Optional auto-press when 2-down on any nine.',
  skins: 'Lowest net score wins the skin on each hole. Ties carry the pot to the next hole. Each skin is worth a fixed $.',
  match: 'Every hole is worth $. Lowest net score wins the hole from all other players. Ties push — no one pays.',
  stableford: 'Modified Stableford points per hole based on net score vs par. Players settle the point differential at the end.',
  bingo: 'Three points per hole: Bingo (first on green), Bango (closest to pin once all on), Bongo (first to hole out). Each point is worth $.',
  dots: 'Side bets on each hole: Greenie (closest on par 3), Sandy (up-and-down from sand), Birdie, Eagle, Polie (1-putt). Each dot is worth $.',
  wolf: 'Best with 4 players. Wolf rotates each hole and picks a partner after seeing tee shots — or goes Lone Wolf for double. Wolf+partner vs the other two. Lowest combined net wins.',
};

const undoStack = []; // stores snapshots of scores/wolfHoles/bonusPoints/matchPresses

function pushUndo() {
  undoStack.push({
    scores: JSON.parse(JSON.stringify(state.scores)),
    wolfHoles: JSON.parse(JSON.stringify(state.wolfHoles || {})),
    bonusPoints: JSON.parse(JSON.stringify(state.bonusPoints || {})),
    matchPresses: JSON.parse(JSON.stringify(state.matchPresses || [])),
    currentHole: state.currentHole,
  });
  if (undoStack.length > 30) undoStack.shift();
  updateUndoBtn();
}

function doUndo() {
  if (!undoStack.length) return;
  const snap = undoStack.pop();
  state.scores = snap.scores;
  state.wolfHoles = snap.wolfHoles;
  state.bonusPoints = snap.bonusPoints;
  state.matchPresses = snap.matchPresses;
  state.currentHole = snap.currentHole;
  invalidateMoneyCache();
  saveCurrentRound();
  renderHole();
  updateUndoBtn();
}

function updateUndoBtn() {
  const btn = document.getElementById('undo-btn');
  if (btn) btn.classList.toggle('hidden', undoStack.length === 0);
}

function maxHole() { return state.holeCount; }

// ═══════════════════════════════════════
// §2  INITIALIZATION
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Show welcome screen, check for resumable round
  const liveRounds = Object.values(JSON.parse(localStorage.getItem('golfRounds') || '{}')).filter(r => !r.finished && r.started);
  if (liveRounds.length) {
    const btn = document.getElementById('welcome-resume');
    if (btn) btn.classList.remove('hidden');
    window._welcomeResumeId = liveRounds.sort((a, b) => new Date(b.date) - new Date(a.date))[0].id;
  }

  buildParGrid();
  addPlayer(); addPlayer(); addPlayer(); addPlayer();
  updateGameOptions();

  document.getElementById('game-type').addEventListener('change', updateGameOptions);
  document.getElementById('add-player-btn').addEventListener('click', addPlayer);
  updateNavCounts();
  renderResumeCard();
  document.getElementById('start-btn').addEventListener('click', startRound);
  document.getElementById('prev-hole').addEventListener('click', () => goToHole(state.currentHole - 1));
  document.getElementById('next-hole').addEventListener('click', () => goToHole(state.currentHole + 1));
  document.getElementById('scorecard-btn').addEventListener('click', showScorecard);
  document.getElementById('standings-btn').addEventListener('click', showStandings);

  // Swipe navigation
  let touchStartX = 0, touchStartY = 0;
  const scoring = document.getElementById('scoring-screen');
  scoring.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  scoring.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goToHole(state.currentHole + 1); // swipe left = next
      else goToHole(state.currentHole - 1); // swipe right = prev
    }
  }, { passive: true });
});

// ═══════════════════════════════════════
// §3  COURSE SETUP
// ═══════════════════════════════════════
function setHoleCount(n) {
  state.holeCount = n;
  document.querySelectorAll('.hole-toggle-btn').forEach(b => b.classList.toggle('active', +b.dataset.holes === n));
  // Show/hide back nine
  const backSection = document.getElementById('back-nine-section');
  if (backSection) backSection.classList.toggle('hidden', n === 9);
  updateParTotal();
}

function buildParGrid() {
  ['front-pars','back-pars'].forEach((id, nine) => {
    const el = document.getElementById(id); el.innerHTML = '';
    // Header row
    let hdr = '<div class="par-row-label"></div>';
    for (let i = 0; i < 9; i++) hdr += `<div class="par-col-hdr">${nine * 9 + i + 1}</div>`;
    el.innerHTML += `<div class="par-table-row">${hdr}</div>`;
    // Par row
    let parRow = '<div class="par-row-label par-label">Par</div>';
    for (let i = 0; i < 9; i++) {
      const h = nine * 9 + i;
      parRow += `<div class="par-cell"><input type="number" min="3" max="6" value="${state.pars[h]}" data-hole="${h}" class="par-input"></div>`;
    }
    el.innerHTML += `<div class="par-table-row">${parRow}</div>`;
    // Hdcp row
    let hdcpRow = '<div class="par-row-label hdcp-label">Hdcp</div>';
    for (let i = 0; i < 9; i++) {
      const h = nine * 9 + i;
      hdcpRow += `<div class="par-cell"><input type="number" min="1" max="18" value="${state.hdcps[h]}" data-hole="${h}" class="hdcp-input"></div>`;
    }
    el.innerHTML += `<div class="par-table-row">${hdcpRow}</div>`;
  });
  document.querySelectorAll('.par-input').forEach(el => el.addEventListener('change', e => {
    state.pars[+e.target.dataset.hole] = +e.target.value;
    updateParTotal();
  }));
  document.querySelectorAll('.hdcp-input').forEach(el => el.addEventListener('change', e => {
    state.hdcps[+e.target.dataset.hole] = +e.target.value;
  }));
  updateParTotal();
}

function updateParTotal() {
  const total = state.pars.slice(0, state.holeCount).reduce((a, b) => a + b, 0);
  const el = document.getElementById('par-total');
  if (el) el.textContent = `Par ${total} (${state.holeCount}H)`;
}

// ═══════════════════════════════════════
// §4  PLAYER MANAGEMENT
// ═══════════════════════════════════════
function getSavedProfiles() {
  return JSON.parse(localStorage.getItem('golfProfiles') || '[]');
}

function saveProfiles() {
  const profiles = state.players.map(p => ({ name: p.name, hdcp: p.hdcp, color: p.color }));
  const existing = getSavedProfiles();
  // Merge: update existing by name, add new
  profiles.forEach(p => {
    const idx = existing.findIndex(e => e.name.toLowerCase() === p.name.toLowerCase());
    if (idx >= 0) existing[idx] = p;
    else existing.push(p);
  });
  localStorage.setItem('golfProfiles', JSON.stringify(existing));
}

function addPlayer() {
  const idx = state.players.length;
  if (idx >= 8) return;
  state.players.push({ name: `Player ${idx+1}`, hdcp: 0, color: COLORS[idx] });
  renderPlayers();
}

function addPlayerFromProfile(profile) {
  if (state.players.length >= 8) return;
  if (state.players.find(p => p.name === profile.name)) return;
  state.players.push({ ...profile, color: profile.color || COLORS[state.players.length] });
  renderPlayers();
}

function addProfileByIndex(idx) {
  const profiles = getSavedProfiles();
  if (profiles[idx]) addPlayerFromProfile(profiles[idx]);
}

function removePlayer(idx) {
  if (state.players.length <= 2) return;
  state.players.splice(idx, 1);
  renderPlayers();
}

function renderPlayers() {
  const el = document.getElementById('players-list'); el.innerHTML = '';

  // Player Database section - always visible
  const profiles = getSavedProfiles();
  const notAdded = profiles.filter(p => !state.players.find(sp => sp.name.toLowerCase() === p.name.toLowerCase()));

  let dbHtml = '<div class="saved-profiles">';
  dbHtml += '<div class="saved-profiles-label">Player Database <button class="manage-profiles-btn" onclick="toggleManageProfiles()">✏️ Manage</button></div>';

  if (notAdded.length) {
    dbHtml += '<div class="saved-profiles-list">';
    notAdded.forEach(p => {
      const idx = profiles.indexOf(p);
      const hdcpStr = p.hdcp < 0 ? '+' + Math.abs(p.hdcp) : p.hdcp;
      dbHtml += '<button class="saved-profile-btn" onclick="addProfileByIndex(' + idx + ')">';
      dbHtml += '<span class="dot" style="background:' + (p.color || '#94a3b8') + '"></span>' + p.name + ' (' + hdcpStr + ')';
      dbHtml += '</button>';
    });
    dbHtml += '</div>';
  } else {
    dbHtml += '<div class="hint" style="margin-bottom:6px">' + (profiles.length ? 'All saved players added' : 'No saved players yet — tap Manage to add') + '</div>';
  }

  dbHtml += '<div id="manage-profiles" class="manage-profiles hidden">';
  profiles.forEach(function(p, i) {
    dbHtml += '<div class="manage-profile-row">';
    dbHtml += '<span class="dot" style="background:' + (p.color || '#94a3b8') + '"></span>';
    dbHtml += '<input type="text" class="mp-name" value="' + p.name + '" data-idx="' + i + '">';
    dbHtml += '<input type="number" class="mp-hdcp" value="' + p.hdcp + '" min="-10" max="54" step="0.1" data-idx="' + i + '">';
    dbHtml += '<input type="color" class="mp-color" value="' + (p.color || '#94a3b8') + '" data-idx="' + i + '">';
    dbHtml += '<button class="mp-del" onclick="deleteProfile(' + i + ')">🗑️</button>';
    dbHtml += '</div>';
  });
  dbHtml += '<div class="manage-profile-actions">';
  dbHtml += '<button class="btn secondary" onclick="saveEditedProfiles()" style="flex:1">💾 Save Changes</button>';
  dbHtml += '<button class="btn secondary" onclick="addNewProfile()" style="flex:1">+ New Player</button>';
  dbHtml += '</div></div></div>';

  el.innerHTML = dbHtml;

  state.players.forEach((p, i) => {
    el.innerHTML += `<div class="player-card" draggable="true" data-pidx="${i}" ondragstart="dragPlayer(event,${i})" ondragover="event.preventDefault()" ondrop="dropPlayer(event,${i})">
      <div class="player-card-top">
        <div class="player-reorder">
          <button class="reorder-btn" onclick="movePlayer(${i},-1)" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="reorder-btn" onclick="movePlayer(${i},1)" ${i === state.players.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <input type="color" class="color-dot" value="${p.color}" data-idx="${i}">
        <input type="text" value="${p.name}" placeholder="Player name" data-idx="${i}" class="pname">
        <button class="remove-btn" onclick="removePlayer(${i})">✕</button>
      </div>
      <div class="player-card-hdcp">
        <label>Handicap Index</label>
        <div class="hdcp-input-wrap">
          <button onclick="adjHdcp(${i},-1)">−</button>
          <input type="number" class="hdcp" value="${p.hdcp}" min="-10" max="54" step="0.1" data-idx="${i}">
          <button onclick="adjHdcp(${i},1)">+</button>
        </div>
      </div>
    </div>`;
  });
  el.querySelectorAll('.pname').forEach(el => el.addEventListener('change', e => {
    state.players[+e.target.dataset.idx].name = e.target.value;
  }));
  el.querySelectorAll('.hdcp').forEach(el => el.addEventListener('change', e => {
    state.players[+e.target.dataset.idx].hdcp = Math.max(-10, Math.min(54, +e.target.value));
  }));
  el.querySelectorAll('.color-dot').forEach(el => el.addEventListener('change', e => {
    state.players[+e.target.dataset.idx].color = e.target.value;
  }));
}

function adjHdcp(idx, delta) {
  state.players[idx].hdcp = Math.round(Math.max(-10, Math.min(54, state.players[idx].hdcp + delta)) * 10) / 10;
  invalidateHdcpCache();
  renderPlayers();
}

function movePlayer(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.players.length) return;
  const temp = state.players[idx];
  state.players[idx] = state.players[newIdx];
  state.players[newIdx] = temp;
  renderPlayers();
}

let _dragIdx = null;
function dragPlayer(e, idx) { _dragIdx = idx; e.dataTransfer.effectAllowed = 'move'; }
function dropPlayer(e, idx) {
  e.preventDefault();
  if (_dragIdx === null || _dragIdx === idx) return;
  const player = state.players.splice(_dragIdx, 1)[0];
  state.players.splice(idx, 0, player);
  _dragIdx = null;
  renderPlayers();
}

function toggleManageProfiles() {
  const el = document.getElementById('manage-profiles');
  if (el) el.classList.toggle('hidden');
}

function deleteProfile(idx) {
  const profiles = getSavedProfiles();
  profiles.splice(idx, 1);
  localStorage.setItem('golfProfiles', JSON.stringify(profiles));
  renderPlayers();
}

function saveEditedProfiles() {
  const profiles = getSavedProfiles();
  document.querySelectorAll('.mp-name').forEach(el => {
    const i = +el.dataset.idx;
    if (profiles[i]) profiles[i].name = el.value.trim();
  });
  document.querySelectorAll('.mp-hdcp').forEach(el => {
    const i = +el.dataset.idx;
    if (profiles[i]) profiles[i].hdcp = Math.max(-10, Math.min(54, +el.value));
  });
  document.querySelectorAll('.mp-color').forEach(el => {
    const i = +el.dataset.idx;
    if (profiles[i]) profiles[i].color = el.value;
  });
  localStorage.setItem('golfProfiles', JSON.stringify(profiles));
  renderPlayers();
}

function addNewProfile() {
  const name = prompt('Player name:');
  if (!name) return;
  const hdcp = +(prompt('Handicap index (e.g. 15, or -3 for plus):') || 0);
  const profiles = getSavedProfiles();
  profiles.push({ name: name.trim(), hdcp, color: COLORS[profiles.length % COLORS.length] });
  localStorage.setItem('golfProfiles', JSON.stringify(profiles));
  renderPlayers();
}

// ═══════════════════════════════════════
// §5  GAME OPTIONS
// ═══════════════════════════════════════

function updateGameOptions() {
  state.gameType = document.getElementById('game-type').value;
  document.getElementById('game-desc').textContent = GAME_DESCS[state.gameType] || '';
  const el = document.getElementById('game-options');
  const opts = {
    nassau: `
      <div class="game-opt"><label>Front 9 Bet ($)</label> <input type="number" id="opt-front" value="5" min="1"></div>
      <div class="game-opt"><label>Back 9 Bet ($)</label> <input type="number" id="opt-back" value="5" min="1"></div>
      <div class="game-opt"><label>Overall 18 Bet ($)</label> <input type="number" id="opt-overall" value="5" min="1"></div>
      <div class="game-opt"><label><input type="checkbox" id="opt-press" checked> Auto 2-Down Press ($)</label> <input type="number" id="opt-press-val" value="5" min="1"></div>
      <div class="hint">Press creates a new side bet from that hole forward on the nine. Presses can re-press.</div>`,
    skins: `<div class="game-opt"><label>$ Per Skin</label> <input type="number" id="opt-skin" value="5" min="1"></div>
      <div class="game-opt"><label><input type="checkbox" id="opt-carry" checked> Carry-over ties (pot grows)</label></div>`,
    match: `<div class="game-opt"><label>$ Per Hole Won</label> <input type="number" id="opt-match" value="2" min="1"></div>
      <div class="game-opt"><label>Press Bet ($)</label> <input type="number" id="opt-match-press-val" value="2" min="1"></div>
      <div class="hint">Each player pays the hole winner. Use the Press button during the round to start a new side match from the current hole.</div>`,
    stableford: `<div class="game-opt"><label>$ Per Point</label> <input type="number" id="opt-stab-val" value="2" min="1"></div>
      <div class="hint">Net Double Eagle: 8 | Eagle: 5 | Birdie: 2 | Par: 0 | Bogey: −1 | Double+: −3</div>`,
    bingo: `<div class="game-opt"><label>$ Per Point</label> <input type="number" id="opt-bingo-val" value="1" min="1"></div>
      <div class="hint">Award points manually each hole: Bingo / Bango / Bongo buttons appear during scoring.</div>`,
    dots: `<div class="game-opt"><label>$ Per Dot</label> <input type="number" id="opt-dot-val" value="1" min="1"></div>
      <div class="hint">Award dots manually: Greenie, Sandy, Birdie, Eagle, Polie buttons appear during scoring.</div>`,
    wolf: `<div class="game-opt"><label>$ Per Point</label> <input type="number" id="opt-wolf-val" value="1" min="1"></div>
      <div class="game-opt"><label><input type="checkbox" id="opt-wolf-lone2x" checked> Lone Wolf pays/collects 2×</label></div>
      <div class="game-opt"><label><input type="checkbox" id="opt-wolf-blind3x"> Blind Lone Wolf (before tee shots) pays/collects 3×</label></div>
      <div class="game-opt"><label><input type="checkbox" id="opt-wolf-pairs"> Fixed Pairings (2v2v2... set at Hole 1)</label></div>
      <div class="hint">Wolf rotation: Wolf picks a partner or goes alone. Fixed pairings locks teams for the round — choose at Hole 1.</div>`,
  };
  el.innerHTML = opts[state.gameType] || '';
}

function readGameOpts() {
  const g = state.gameType, o = {};
  if (g === 'nassau') {
    o.front = +(document.getElementById('opt-front')?.value || 5);
    o.back = +(document.getElementById('opt-back')?.value || 5);
    o.overall = +(document.getElementById('opt-overall')?.value || 5);
    o.press = document.getElementById('opt-press')?.checked || false;
    o.pressVal = +(document.getElementById('opt-press-val')?.value || 5);
  } else if (g === 'skins') {
    o.skinVal = +(document.getElementById('opt-skin')?.value || 5);
    o.carry = document.getElementById('opt-carry')?.checked ?? true;
  } else if (g === 'match') {
    o.holeVal = +(document.getElementById('opt-match')?.value || 2);
    o.matchPressVal = +(document.getElementById('opt-match-press-val')?.value || 2);
  } else if (g === 'stableford') {
    o.ptVal = +(document.getElementById('opt-stab-val')?.value || 2);
  } else if (g === 'bingo') {
    o.ptVal = +(document.getElementById('opt-bingo-val')?.value || 1);
  } else if (g === 'dots') {
    o.dotVal = +(document.getElementById('opt-dot-val')?.value || 1);
  } else if (g === 'wolf') {
    o.wolfVal = +(document.getElementById('opt-wolf-val')?.value || 1);
    o.lone2x = document.getElementById('opt-wolf-lone2x')?.checked ?? true;
    o.blind3x = document.getElementById('opt-wolf-blind3x')?.checked || false;
    o.fixedPairs = document.getElementById('opt-wolf-pairs')?.checked || false;
  }
  return o;
}

// ═══════════════════════════════════════
// §6  HANDICAP ENGINE
// ═══════════════════════════════════════
let _hdcpCache = null;
let _hdcpCacheKey = '';

function getPlayingHandicaps() {
  const mode = document.getElementById('handicap-mode')?.value || state.handicapMode;
  state.handicapMode = mode;
  const key = mode + '|' + state.players.map(p => p.hdcp).join(',');
  if (_hdcpCache && _hdcpCacheKey === key) return _hdcpCache;
  const raw = state.players.map(p => p.hdcp);
  if (mode === 'none') { _hdcpCache = raw.map(() => 0); _hdcpCacheKey = key; return _hdcpCache; }
  let adj = [...raw];
  if (mode === '80pct') adj = raw.map(h => h * 0.8);
  const min = Math.min(...adj);
  _hdcpCache = adj.map(h => Math.round(h - min));
  _hdcpCacheKey = key;
  return _hdcpCache;
}

function invalidateHdcpCache() { _hdcpCache = null; _hdcpCacheKey = ''; }

function getStrokesOnHole(playingHdcp, holeIdx) {
  const rank = state.hdcps[holeIdx];
  if (playingHdcp >= 18 + rank) return 2;
  if (playingHdcp >= rank) return 1;
  return 0;
}

function getNetScore(playerIdx, holeIdx) {
  const gross = state.scores[playerIdx]?.[holeIdx];
  if (gross == null) return null;
  const hdcps = getPlayingHandicaps();
  return gross - getStrokesOnHole(hdcps[playerIdx], holeIdx);
}

// ═══════════════════════════════════════
// §7  ROUND LIFECYCLE
// ═══════════════════════════════════════
function dismissWelcome() {
  document.getElementById('welcome-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function resumeFromWelcome() {
  dismissWelcome();
  if (window._welcomeResumeId) loadRound(window._welcomeResumeId);
}

function goHome() {
  if (state.started) {
    if (!confirm('Return to home? Your round is auto-saved.')) return;
    saveCurrentRound();
  }
  hideAllScreens();
  document.getElementById('setup-screen').classList.remove('hidden');
  document.getElementById('home-btn').classList.add('hidden');
  document.getElementById('nav-bar').classList.remove('hidden');
  const lb = document.getElementById('sticky-leaderboard'); if (lb) lb.classList.add('hidden');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.screen === 'setup'));
  updateNavCounts();
  renderResumeCard();
  ['scorecard-modal','standings-modal','results-modal','hole-result-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function startRound() {
  // Validation
  if (state.players.length < 2) { alert('Add at least 2 players.'); return; }
  const names = state.players.map(p => p.name.trim().toLowerCase());
  if (names.some(n => !n)) { alert('All players need a name.'); return; }
  if (new Set(names).size !== names.length) { alert('Player names must be unique.'); return; }

  state.course = document.getElementById('course-name').value || 'Round';
  state.gameOpts = readGameOpts();
  saveProfiles(); // persist player profiles
  state.scores = {};
  state.players.forEach((_, i) => { state.scores[i] = {}; });
  state.bonusPoints = {}; // for bingo/dots: bonusPoints[holeIdx] = {playerIdx: count}
  state.players.forEach((_, i) => { state.bonusPoints[i] = {}; });
  // Wolf state: wolfHoles[holeIdx] = { wolf: playerIdx, partner: playerIdx|null (null=lone), blind: bool, hammers: count }
  state.wolfHoles = {};
  state.pairingsLocked = false;
  state.matchPresses = []; // manual presses: [{start: holeIdx, by: playerName}]
  state.currentHole = 0;
  state.started = true;

  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('scoring-screen').classList.remove('hidden');
  document.getElementById('home-btn').classList.remove('hidden');
  document.getElementById('nav-bar').classList.add('hidden');
  state.roundId = generateRoundId();
  state.roundDate = new Date().toISOString();
  saveCurrentRound();
  renderStrokeSummary();
  invalidateMoneyCache();
  renderHole();
}

function renderStrokeSummary() {
  const el = document.getElementById('stroke-summary');
  const hdcps = getPlayingHandicaps();
  const mode = state.handicapMode;
  const raw = state.players.map(p => p.hdcp);
  const lowMan = Math.min(...raw);
  const lowName = state.players[raw.indexOf(lowMan)].name;

  if (mode === 'none') {
    el.innerHTML = '<div class="summary-toggle">🏌️ Playing Scratch — No Strokes Given <span class="toggle-arrow">▼</span></div>';
    return;
  }

  let html = `<div class="summary-toggle">🏌️ Stroke Summary <span class="toggle-arrow">▼</span></div><div class="summary-body">
    <div class="summary-meta">Low handicap: <strong>${lowName} (${lowMan < 0 ? '+' + Math.abs(lowMan) : lowMan})</strong> — plays scratch${mode === '80pct' ? ' · 80% applied' : ''}</div>
    <div class="summary-players">`;

  state.players.forEach((p, i) => {
    const playing = hdcps[i];
    const hdcpDisplay = p.hdcp < 0 ? '+' + Math.abs(p.hdcp) : p.hdcp;

    // Which holes they get strokes on
    const strokeHoles = [];
    const doubleHoles = [];
    for (let h = 0; h < maxHole(); h++) {
      const s = getStrokesOnHole(playing, h);
      if (s === 2) doubleHoles.push(h + 1);
      else if (s === 1) strokeHoles.push(h + 1);
    }

    html += `<div class="summary-player">
      <div class="summary-player-top">
        <span class="dot" style="background:${p.color}"></span>
        <span class="summary-name">${p.name}</span>
        <span class="summary-hdcp">${playing === 0 ? 'Scratch' : `<strong>${playing}</strong> strokes`}</span>
      </div>
      ${playing > 0 ? `<div class="summary-holes">
        ${strokeHoles.length ? `<span class="stroke-dot-label">● Holes:</span> ${strokeHoles.join(', ')}` : ''}
        ${doubleHoles.length ? `<span class="stroke-dot-label double">●● Holes:</span> ${doubleHoles.join(', ')}` : ''}
      </div>` : ''}
    </div>`;
  });

  html += '</div></div>'; // close summary-players + summary-body
  el.innerHTML = html;
}

// §7.1 Hole Navigation
function goToHole(h) {
  if (h < 0 || h > maxHole()-1) return;
  state.currentHole = h;
  invalidateMoneyCache();
  renderHole();
}

function renderHoleDots() {
  const el = document.getElementById('hole-dots'); el.innerHTML = '';
  for (let h = 0; h < maxHole(); h++) {
    const active = h === state.currentHole ? ' active' : '';
    const scored = !active && state.scores[0]?.[h] != null ? ' scored' : '';
    el.innerHTML += `<div class="hole-dot${active}${scored}" onclick="goToHole(${h})">${h+1}</div>`;
  }
}

// ═══════════════════════════════════════
// §8  SCORING UI
// ═══════════════════════════════════════

function renderHole() {
  const h = state.currentHole;
  document.getElementById('hole-indicator').textContent = `Hole ${h+1} of ${maxHole()}`;
  document.getElementById('prev-hole').disabled = h === 0;
  document.getElementById('next-hole').disabled = h === maxHole() - 1;

  document.getElementById('hole-info').innerHTML = `
    <div class="hole-stat"><div class="label">Par</div><div class="value">${state.pars[h]}</div></div>
    <div class="hole-stat"><div class="label">Hdcp Rank</div><div class="value">${state.hdcps[h]}</div></div>
    <div class="hole-stat"><div class="label">Nine</div><div class="value">${h < 9 ? 'Front' : 'Back'}</div></div>`;

  const hdcps = getPlayingHandicaps();
  const el = document.getElementById('score-inputs'); el.innerHTML = '';
  state.players.forEach((p, i) => {
    const strokes = getStrokesOnHole(hdcps[i], h);
    const score = state.scores[i][h] ?? state.pars[h];
    // Don't persist default — only store when user changes it
    const net = score - strokes;
    const diff = net - state.pars[h];
    const cls = diff <= -2 ? 'birdie' : diff === -1 ? 'birdie' : diff === 0 ? 'par' : diff === 1 ? 'bogey' : 'double';
    const lbl = diff <= -2 ? `${-diff > 2 ? 'Albatross' : 'Eagle'}` : diff === -1 ? 'Birdie' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : `+${diff}`;
    const strokeDots = strokes > 0 ? `<span class="stroke-dots">${'●'.repeat(strokes)}</span>` : '';
    el.innerHTML += `<div class="score-row">
      <div class="player-info">
        <div class="player-name"><span class="dot" style="background:${p.color}"></span>${p.name}</div>
        ${strokes ? `<div class="strokes-badge">${strokeDots} ${strokes} stroke${strokes>1?'s':''} received</div>` : '<div class="strokes-badge none">No strokes</div>'}
      </div>
      <div class="score-counter">
        <button onclick="adjScore(${i},${h},-1)">−</button>
        <div class="score-val" onclick="quickScore(${i},${h})">${score}</div>
        <button onclick="adjScore(${i},${h},1)">+</button>
      </div>
      <div class="score-result ${cls}">${lbl}<br><span class="net-label">${score} → Net ${net}</span></div>
    </div>`;
  });
  // Match play press button
  if (state.gameType === 'match') {
    const presses = state.matchPresses || [];
    const activePresses = presses.filter(p => p.start <= h);
    el.innerHTML += `<div class="match-press-section">
      <button class="btn secondary" onclick="addMatchPress(${h})" style="width:100%;margin-bottom:6px">📢 Press from Hole ${h+1}</button>
      ${activePresses.length ? `<div class="active-presses">${activePresses.map((p, idx) => {
        const realIdx = presses.indexOf(p);
        return `<span class="press-badge">Press #${realIdx+1}: ${p.by} H${p.start+1}→18 <button class="press-remove" onclick="removeMatchPress(${realIdx})">✕</button></span>`;
      }).join('')}</div>` : ''}
    </div>`;
  }
  // Bonus point buttons for bingo/dots
  if (state.gameType === 'bingo' || state.gameType === 'dots') {
    const labels = state.gameType === 'bingo'
      ? ['🟢 Bingo','🎯 Bango','🏁 Bongo']
      : ['🟢 Greenie','🏖️ Sandy','🐦 Birdie','🦅 Eagle','🎯 Polie'];
    el.innerHTML += `<div class="bonus-section">
      <div class="bonus-header">${state.gameType === 'bingo' ? 'Award Points' : 'Award Dots'}</div>
      ${state.players.map((p, i) => {
        const pts = state.bonusPoints[i]?.[h] || 0;
        return `<div class="bonus-row">
          <span class="bonus-player"><span class="dot" style="background:${p.color}"></span>${p.name} <strong class="bonus-count">${pts} pt${pts!==1?'s':''}</strong></span>
          <div class="bonus-btns">${labels.map(l =>
            `<button class="bonus-btn" onclick="addBonus(${i},${h})">${l}</button>`
          ).join('')}<button class="bonus-btn undo" onclick="removeBonus(${i},${h})">↩</button></div>
        </div>`;
      }).join('')}
    </div>`;
  }
  // Wolf partner selection + hammer
  if (state.gameType === 'wolf' && state.players.length >= 2) {
   if (state.gameOpts.fixedPairs) {
    // Fixed pairings mode — show builder if not locked, otherwise show teams
    const n = state.players.length;
    const numTeams = Math.floor(n / 2);

    if (!state.pairingsLocked) {
      // Show pairing builder
      if (!state.pairings || state.pairings.length !== numTeams) {
        state.pairings = [];
        for (let t = 0; t < numTeams; t++) state.pairings.push([t * 2, t * 2 + 1]);
      }
      el.innerHTML += `<div class="wolf-section">
        <div class="wolf-header">🐺 Set Pairings <span class="wolf-hole-num">Hole ${h+1}</span></div>
        <div class="hint" style="margin-bottom:10px">Choose your teams for the round, then lock them in.</div>
        <div class="pairing-grid">
          ${state.pairings.map((pair, t) => `<div class="pairing-team">
            <div class="pairing-team-label">Team ${t+1}</div>
            <select class="pairing-select" data-team="${t}" data-slot="0" onchange="updatePairing(this)">
              ${state.players.map((p, i) => `<option value="${i}" ${i === pair[0] ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
            <span class="pairing-amp">&</span>
            <select class="pairing-select" data-team="${t}" data-slot="1" onchange="updatePairing(this)">
              ${state.players.map((p, i) => `<option value="${i}" ${i === pair[1] ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>`).join('')}
        </div>
        <button class="btn primary" onclick="lockPairings()" style="width:100%;margin-top:10px">🔒 Lock Pairings for Round</button>
      </div>`;
    } else {
      // Pairings locked — wolf rotates by team, picks allies from other teams
      const numTeams = state.pairings.length;
      const wolfTeamIdx = h % numTeams;
      const wolfPair = state.pairings[wolfTeamIdx];
      const wolfNames = wolfPair.map(i => state.players[i].name).join(' & ');

      if (!state.wolfHoles[h]) state.wolfHoles[h] = { fixedPairs: true, wolfTeam: wolfTeamIdx, allyTeams: undefined, hammers: 0, lastHammerTeam: null, hammerLog: [] };
      const wd = state.wolfHoles[h];
      const allyTeams = wd.allyTeams; // undefined = not set, [] = lone pair, [teamIdx] = allied
      const teamsChosen = allyTeams !== undefined;
      const isLonePair = teamsChosen && allyTeams.length === 0;

      // Build wolf side and field side
      const wolfSideTeams = teamsChosen ? [wolfTeamIdx, ...allyTeams] : [wolfTeamIdx];
      const fieldTeams = [];
      for (let t = 0; t < numTeams; t++) { if (!wolfSideTeams.includes(t)) fieldTeams.push(t); }
      const wolfSidePlayers = wolfSideTeams.flatMap(t => state.pairings[t]);
      const fieldPlayers = fieldTeams.flatMap(t => state.pairings[t]);

      const hammers = wd.hammers || 0;
      const hammerMultiplier = hammers > 0 ? Math.pow(2, hammers) : 1;
      const baseMultiplier = isLonePair && state.gameOpts.lone2x ? 2 : 1;
      const allGross = state.players.map((_, i) => state.scores[i]?.[h]);
      const bestGross = allGross.some(v => v == null) ? null : Math.min(...allGross);
      const scoreDiff = bestGross != null ? bestGross - state.pars[h] : 0;
      const scoreMultiplier = scoreDiff <= -2 ? 3 : scoreDiff === -1 ? 2 : 1;
      const scoreBonusLabel = scoreMultiplier === 3 ? ' 🦅3×' : scoreMultiplier === 2 ? ' 🐦2×' : '';
      const totalMult = baseMultiplier * hammerMultiplier * scoreMultiplier;

      el.innerHTML += `<div class="wolf-section">
        <div class="wolf-header">🐺 Wolf Team: ${wolfNames} <span class="wolf-hole-num">Hole ${h+1}</span></div>
        <div class="wolf-pick-label">Pick ally team(s) or go Lone Pair:</div>
        <div class="wolf-choices">
          ${state.pairings.map((pair, t) => {
            if (t === wolfTeamIdx) return '';
            const names = pair.map(i => state.players[i].name).join(' & ');
            const selected = Array.isArray(allyTeams) && allyTeams.includes(t);
            return `<button class="wolf-pick ${selected ? 'selected' : ''}" onclick="toggleAllyTeam(${h},${t})">
              Team ${t+1}: ${names}${selected ? ' ✓' : ''}
            </button>`;
          }).join('')}
          <button class="wolf-pick lone ${isLonePair ? 'selected' : ''}" onclick="setLonePair(${h})">
            🐺 Lone Pair${isLonePair ? ' ✓' : ''}
          </button>
        </div>
        ${teamsChosen && !isLonePair ? `<div class="wolf-teams">
          <span class="wolf-team-label">🐺 Wolf Side (${wolfSidePlayers.length}):</span> ${wolfSidePlayers.map(i => state.players[i].name).join(', ')}
          <span class="wolf-team-label" style="margin-left:10px">🐑 Field (${fieldPlayers.length}):</span> ${fieldPlayers.map(i => state.players[i].name).join(', ')}
        </div>` : ''}
        ${isLonePair ? `<div class="wolf-teams">
          <span class="wolf-team-label">🐺 Lone Pair:</span> ${wolfNames} vs ${fieldPlayers.length} opponents (2×)
        </div>` : ''}
        ${teamsChosen ? `<div class="hammer-zone">
          <div class="hammer-status">
            <span class="hammer-multiplier">${totalMult}×</span>
            <span class="hammer-label">$${state.gameOpts.wolfVal * totalMult}/pt${hammers > 0 ? ` (${hammers} 🔨)` : ''}${scoreBonusLabel}</span>
          </div>
          <div class="hammer-btns">
            ${wd.lastHammerTeam !== 'wolf' ? `<button class="hammer-btn wolf-hammer" onclick="hammer(${h},'wolf')">🔨 Wolf Side Hammers!</button>` : ''}
            ${wd.lastHammerTeam !== 'sheep' ? `<button class="hammer-btn sheep-hammer" onclick="hammer(${h},'sheep')">🔨 Field Hammers Back!</button>` : ''}
          </div>
          ${hammers > 0 ? `<div class="hammer-history">${getHammerHistory(wd)}
            <button class="hammer-undo" onclick="undoHammer(${h})">↩ Undo</button>
          </div>` : ''}
        </div>` : ''}
      </div>`;
    }
   } else {
    // Standard wolf rotation mode
    const wolfIdx = getWolfForHole(h);
    const wolfData = state.wolfHoles[h] || { wolf: wolfIdx, partners: undefined, blind: false, hammers: 0 };
    const wolfPlayer = state.players[wolfIdx];
    const partners = wolfData.partners; // null=lone, []=lone, [i]=1 partner, [i,j]=2 partners
    const isLone = partners !== undefined && (partners === null || partners.length === 0);
    const isBlind = wolfData.blind === true;
    const teamsSet = partners !== undefined;
    const hammers = wolfData.hammers || 0;
    const hammerMultiplier = hammers > 0 ? Math.pow(2, hammers) : 1;
    const baseMultiplier = isBlind ? 3 : (isLone && state.gameOpts.lone2x) ? 2 : 1;
    // Check if any player has a gross birdie/eagle on this hole
    const allGross = state.players.map((_, i) => state.scores[i]?.[h]);
    const bestGross = allGross.some(v => v == null) ? null : Math.min(...allGross);
    const scoreDiff = bestGross != null ? bestGross - state.pars[h] : 0;
    const scoreMultiplier = scoreDiff <= -2 ? 3 : scoreDiff === -1 ? 2 : 1;
    const scoreBonusLabel = scoreMultiplier === 3 ? ' 🦅 Eagle 3×' : scoreMultiplier === 2 ? ' 🐦 Birdie 2×' : '';
    const totalMultiplier = baseMultiplier * hammerMultiplier * scoreMultiplier;
    const n = state.players.length;

    const maxPartners = n < 5 ? 1 : 2;

    const wolfTeamIdxs = teamsSet && partners ? [wolfIdx, ...partners] : [wolfIdx];
    const sheepIdxs = state.players.map((_, i) => i).filter(i => !wolfTeamIdxs.includes(i));

    const lastHammerTeam = wolfData.lastHammerTeam;
    const canWolfHammer = teamsSet && lastHammerTeam !== 'wolf';
    const canSheepHammer = teamsSet && lastHammerTeam !== 'sheep';

    // Determine if player is selected as partner
    const isPartner = (i) => Array.isArray(partners) && partners.includes(i);

    el.innerHTML += `<div class="wolf-section">
      <div class="wolf-header">🐺 Wolf: <strong style="color:${wolfPlayer.color}">${wolfPlayer.name}</strong>
        <span class="wolf-hole-num">Hole ${h+1}</span>
      </div>
      <div class="wolf-pick-label">${maxPartners > 1 ? 'Pick 1 or 2 partners' : 'Pick a partner'} or go Lone Wolf:</div>
      <div class="wolf-choices">
        ${state.players.map((p, i) => {
          if (i === wolfIdx) return '';
          const selected = isPartner(i);
          return `<button class="wolf-pick ${selected ? 'selected' : ''}" onclick="toggleWolfPartner(${h},${i})" style="border-color:${selected ? p.color : '#e0e0e0'}">
            <span class="dot" style="background:${p.color}"></span>${p.name}${selected ? ' ✓' : ''}
          </button>`;
        }).join('')}
        <button class="wolf-pick lone ${isLone && !isBlind ? 'selected' : ''}" onclick="setWolfLone(${h},false)">
          🐺 Lone Wolf${isLone && !isBlind ? ' ✓' : ''}
        </button>
        ${state.gameOpts.blind3x ? `<button class="wolf-pick blind ${isBlind ? 'selected' : ''}" onclick="setWolfLone(${h},true)">
          ⚡ Blind Lone (3×)${isBlind ? ' ✓' : ''}
        </button>` : ''}
      </div>
      ${teamsSet && !isLone && partners.length > 0 ? `<div class="wolf-teams">
        <span class="wolf-team-label">🐺 Wolf Pack (${wolfTeamIdxs.length}):</span> ${wolfTeamIdxs.map(i => state.players[i].name).join(' & ')}
        <span class="wolf-team-label" style="margin-left:12px">🐑 Field (${sheepIdxs.length}):</span> ${sheepIdxs.map(i => state.players[i].name).join(' & ')}
        ${n >= 5 && wolfTeamIdxs.length !== sheepIdxs.length ? `<div class="team-stakes-note">⚖️ Smaller team (${Math.min(wolfTeamIdxs.length, sheepIdxs.length)}) bets 2× · Larger team (${Math.max(wolfTeamIdxs.length, sheepIdxs.length)}) bets 1×</div>` : ''}
      </div>` : ''}
      ${isLone ? `<div class="wolf-teams">
        <span class="wolf-team-label">🐺 Lone Wolf:</span> ${wolfPlayer.name} vs ${sheepIdxs.length} opponents ${isBlind ? '(3×)' : '(2×)'}
      </div>` : ''}
      ${teamsSet ? `<div class="hammer-zone">
        <div class="hammer-status">
          <span class="hammer-multiplier">${totalMultiplier}×</span>
          <span class="hammer-label">$${state.gameOpts.wolfVal * totalMultiplier}/pt${hammers > 0 ? ` (${hammers} 🔨)` : ''}${scoreBonusLabel}</span>
        </div>
        <div class="hammer-btns">
          ${canWolfHammer ? `<button class="hammer-btn wolf-hammer" onclick="hammer(${h},'wolf')">
            🔨 Wolf Pack Hammers!
          </button>` : ''}
          ${canSheepHammer ? `<button class="hammer-btn sheep-hammer" onclick="hammer(${h},'sheep')">
            🔨 Field Hammers Back!
          </button>` : ''}
        </div>
        ${hammers > 0 ? `<div class="hammer-history">${getHammerHistory(wolfData)}
          <button class="hammer-undo" onclick="undoHammer(${h})">↩ Undo Last Hammer</button>
        </div>` : ''}
      </div>` : ''}
    </div>`;
   } // end else standard wolf
  }
  renderGameStatus();
  renderHoleDots();

  // Confirm button
  const allLocked = state.players.every((_, i) => state.scores[i][h] != null);
  if (!allLocked) {
    el.innerHTML += `<div class="confirm-area"><button class="btn primary" onclick="confirmHoleScores(${h})" style="width:100%">✅ Confirm Hole ${h+1} Scores</button></div>`;
  } else {
    el.innerHTML += `<div class="confirm-area"><div class="confirmed-badge">✅ Hole ${h+1} locked <button class="unlock-btn" onclick="unlockHole(${h})">🔓 Edit</button></div></div>`;
  }
}

function adjScore(pi, hole, delta) {
  pushUndo();
  const cur = state.scores[pi][hole] ?? state.pars[hole];
  const nv = Math.max(1, cur + delta);
  state.scores[pi][hole] = nv;
  invalidateMoneyCache();
  renderHole();
}

function quickScore(pi, hole) {
  const par = state.pars[hole];
  const current = state.scores[pi][hole] ?? par;
  const opts = [];
  for (let s = Math.max(1, par - 2); s <= par + 5; s++) opts.push(s);
  // Remove existing picker
  const old = document.getElementById('quick-picker');
  if (old) old.remove();
  const picker = document.createElement('div');
  picker.id = 'quick-picker';
  picker.className = 'quick-picker';
  picker.innerHTML = `<div class="qp-label">${state.players[pi].name} — Hole ${hole+1}</div>
    <div class="qp-grid">${opts.map(s => {
      const diff = s - par;
      const cls = diff <= -2 ? 'qp-eagle' : diff === -1 ? 'qp-birdie' : diff === 0 ? 'qp-par' : diff === 1 ? 'qp-bogey' : 'qp-other';
      return `<button class="qp-btn ${cls} ${s === current ? 'qp-active' : ''}" onclick="setQuickScore(${pi},${hole},${s})">${s}</button>`;
    }).join('')}</div>`;
  document.body.appendChild(picker);
  // Close on outside tap
  setTimeout(() => document.addEventListener('click', closeQuickPicker, { once: true }), 10);
}

function setQuickScore(pi, hole, val) {
  pushUndo();
  state.scores[pi][hole] = val;
  invalidateMoneyCache();
  closeQuickPicker();
  renderHole();
}

function closeQuickPicker() {
  const el = document.getElementById('quick-picker');
  if (el) el.remove();
}

function confirmHoleScores(hole) {
  pushUndo();
  // Capture money before this hole
  invalidateMoneyCache();
  const moneyBefore = [...calcMoney()];

  state.players.forEach((_, i) => {
    if (state.scores[i][hole] == null) {
      state.scores[i][hole] = state.pars[hole];
    }
  });

  // Calc money after (must invalidate since scores changed)
  invalidateMoneyCache();
  const moneyAfter = calcMoney();
  const deltas = state.players.map((_, i) => moneyAfter[i] - moneyBefore[i]);

  // Show hole result announcement
  showHoleResult(hole, deltas);
  saveCurrentRound();
  // Auto-advance to next hole
  if (hole < maxHole() - 1) {
    state.currentHole = hole + 1;
  }
  renderHole();
}

function unlockHole(hole) {
  pushUndo();
  state.players.forEach((_, i) => { delete state.scores[i][hole]; });
  invalidateMoneyCache();
  saveCurrentRound();
  renderHole();
}

function showHoleResult(hole, deltas) {
  // Remove any existing overlay first
  const existing = document.getElementById('hole-result-overlay');
  if (existing) existing.remove();

  const hdcps = getPlayingHandicaps();
  const winners = [], losers = [], pushes = [];
  state.players.forEach((p, i) => {
    const gross = state.scores[i][hole];
    const net = gross - getStrokesOnHole(hdcps[i], hole);
    const diff = net - state.pars[hole];
    const lbl = diff <= -2 ? 'Eagle' : diff === -1 ? 'Birdie' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : `+${diff}`;
    const entry = { name: p.name, color: p.color, gross, net, lbl, delta: deltas[i] };
    if (deltas[i] > 0.01) winners.push(entry);
    else if (deltas[i] < -0.01) losers.push(entry);
    else pushes.push(entry);
  });

  winners.sort((a, b) => b.delta - a.delta);
  losers.sort((a, b) => a.delta - b.delta);

  // Notify on birdies/eagles
  if (typeof sendNotification === 'function') {
    state.players.forEach((p, i) => {
      const gross = state.scores[i][hole];
      const diff = gross - state.pars[hole];
      if (diff <= -2) sendNotification('🦅 EAGLE!', p.name + ' eagled Hole ' + (hole+1));
      else if (diff === -1) sendNotification('🐦 BIRDIE!', p.name + ' birdied Hole ' + (hole+1));
    });
  }

  let html = `<div class="hole-result-header">Hole ${hole + 1} Results</div>`;

  if (winners.length === 0 && losers.length === 0) {
    html += `<div class="hole-result-push">🤝 All Square — No money moves</div>`;
  } else {
    if (winners.length) {
      html += '<div class="hole-result-section winners">';
      winners.forEach(w => {
        html += `<div class="hole-result-row win">
          <span class="dot" style="background:${w.color}"></span>
          <span class="hr-name">${w.name}</span>
          <span class="hr-score">${w.gross} (${w.lbl})</span>
          <span class="hr-money win">+$${w.delta.toFixed(0)}</span>
        </div>`;
      });
      html += '</div>';
    }
    if (losers.length) {
      html += '<div class="hole-result-section losers">';
      losers.forEach(l => {
        html += `<div class="hole-result-row lose">
          <span class="dot" style="background:${l.color}"></span>
          <span class="hr-name">${l.name}</span>
          <span class="hr-score">${l.gross} (${l.lbl})</span>
          <span class="hr-money lose">−$${Math.abs(l.delta).toFixed(0)}</span>
        </div>`;
      });
      html += '</div>';
    }
    if (pushes.length) {
      html += '<div class="hole-result-section">';
      pushes.forEach(p => {
        html += `<div class="hole-result-row push">
          <span class="dot" style="background:${p.color}"></span>
          <span class="hr-name">${p.name}</span>
          <span class="hr-score">${p.gross} (${p.lbl})</span>
          <span class="hr-money push">$0</span>
        </div>`;
      });
      html += '</div>';
    }
  }

  html += `<button class="btn primary" onclick="closeHoleResult()" style="width:100%;margin-top:14px">👍 Continue</button>`;

  const overlay = document.createElement('div');
  overlay.id = 'hole-result-overlay';
  overlay.className = 'modal';
  overlay.innerHTML = `<div class="modal-content hole-result-modal">${html}</div>`;
  document.body.appendChild(overlay);
  // Auto-dismiss after 10 seconds
  window._holeResultTimer = setTimeout(closeHoleResult, 10000);
}

function closeHoleResult() {
  clearTimeout(window._holeResultTimer);
  const el = document.getElementById('hole-result-overlay');
  if (el) el.remove();
}

function addBonus(pi, hole) {
  pushUndo();
  if (!state.bonusPoints[pi]) state.bonusPoints[pi] = {};
  state.bonusPoints[pi][hole] = (state.bonusPoints[pi][hole] || 0) + 1;
  invalidateMoneyCache();
  renderHole();
}

function removeBonus(pi, hole) {
  pushUndo();
  if (!state.bonusPoints[pi]) return;
  state.bonusPoints[pi][hole] = Math.max(0, (state.bonusPoints[pi][hole] || 0) - 1);
  invalidateMoneyCache();
  renderHole();
}

// ═══════════════════════════════════════
// §9  WOLF GAME UI
// ═══════════════════════════════════════

function getWolfForHole(hole) {
  return hole % state.players.length;
}

function updatePairing(sel) {
  const team = +sel.dataset.team;
  const slot = +sel.dataset.slot;
  state.pairings[team][slot] = +sel.value;
}

function lockPairings() {
  state.pairingsLocked = true;
  for (let h = 0; h < maxHole(); h++) {
    const wolfTeamIdx = h % state.pairings.length;
    if (!state.wolfHoles[h]) state.wolfHoles[h] = { fixedPairs: true, wolfTeam: wolfTeamIdx, allyTeams: undefined, hammers: 0, lastHammerTeam: null, hammerLog: [] };
  }
  invalidateMoneyCache();
  renderHole();
}

function toggleAllyTeam(hole, teamIdx) {
  pushUndo();
  const wd = state.wolfHoles[hole];
  if (!wd) return;
  let allies = Array.isArray(wd.allyTeams) ? [...wd.allyTeams] : [];
  if (allies.includes(teamIdx)) {
    allies = allies.filter(t => t !== teamIdx);
  } else {
    allies.push(teamIdx);
  }
  wd.allyTeams = allies;
  invalidateMoneyCache();
  renderHole();
}

function setLonePair(hole) {
  pushUndo();
  const wd = state.wolfHoles[hole];
  if (!wd) return;
  wd.allyTeams = [];
  invalidateMoneyCache();
  renderHole();
}

function toggleWolfPartner(hole, playerIdx) {
  pushUndo();
  const wolfIdx = getWolfForHole(hole);
  const existing = state.wolfHoles[hole];
  const n = state.players.length;
  const maxPartners = n < 5 ? 1 : 2;
  let partners = Array.isArray(existing?.partners) ? [...existing.partners] : [];

  if (partners.includes(playerIdx)) {
    partners = partners.filter(i => i !== playerIdx);
  } else {
    if (partners.length >= maxPartners) partners.shift();
    partners.push(playerIdx);
  }
  state.wolfHoles[hole] = {
    wolf: wolfIdx, partners, blind: false,
    hammers: existing?.hammers || 0,
    lastHammerTeam: existing?.lastHammerTeam || null,
    hammerLog: existing?.hammerLog || []
  };
  invalidateMoneyCache();
  renderHole();
}

function setWolfLone(hole, blind) {
  pushUndo();
  const wolfIdx = getWolfForHole(hole);
  state.wolfHoles[hole] = { wolf: wolfIdx, partners: [], blind, hammers: 0, lastHammerTeam: null, hammerLog: [] };
  invalidateMoneyCache();
  renderHole();
}

function pickWolfBlind(hole) {
  setWolfLone(hole, true);
}

function hammer(hole, team) {
  pushUndo();
  const wd = state.wolfHoles[hole];
  if (!wd) return;
  wd.hammers = (wd.hammers || 0) + 1;
  wd.lastHammerTeam = team;
  if (!wd.hammerLog) wd.hammerLog = [];
  wd.hammerLog.push(team);
  if (typeof sendNotification === 'function') sendNotification('🔨 HAMMER!', 'Hole ' + (hole+1) + ' — stakes doubled to ' + Math.pow(2, wd.hammers) + '×');
  invalidateMoneyCache();
  renderHole();
}

function undoHammer(hole) {
  pushUndo();
  const wd = state.wolfHoles[hole];
  if (!wd || !wd.hammers) return;
  wd.hammers--;
  wd.hammerLog.pop();
  wd.lastHammerTeam = wd.hammerLog.length ? wd.hammerLog[wd.hammerLog.length - 1] : null;
  invalidateMoneyCache();
  renderHole();
}

function getHammerHistory(wd) {
  if (!wd.hammerLog || !wd.hammerLog.length) return '';
  return wd.hammerLog.map((t, i) => {
    const icon = t === 'wolf' ? '🐺' : '🐑';
    const label = t === 'wolf' ? 'Wolf' : 'Sheep';
    const mult = Math.pow(2, i + 1);
    return `<span class="hammer-chip ${t}">${icon} ${label} → ${mult}×</span>`;
  }).join('');
}

function getHammerHistoryPairs(wd) {
  if (!wd.hammerLog || !wd.hammerLog.length) return '';
  return wd.hammerLog.map((t, i) => {
    const mult = Math.pow(2, i + 1);
    return `<span class="hammer-chip wolf">Team ${+t + 1} → ${mult}×</span>`;
  }).join('');
}

// ═══════════════════════════════════════
// §11 GAME STATUS DISPLAY
// ═══════════════════════════════════════
function renderGameStatus() {
  const el = document.getElementById('game-status');
  const g = state.gameType;
  const money = calcMoney();
  // Always show running money totals
  let html = `<div class="money-banner">
    <div class="money-title">💰 Running Money</div>
    <div class="money-grid">
      ${state.players.map((p, i) => {
        const v = money[i];
        const cls = v > 0.01 ? 'money-up' : v < -0.01 ? 'money-down' : 'money-even';
        return `<div class="money-cell ${cls}">
          <span class="dot" style="background:${p.color}"></span>
          <span class="money-name">${p.name}</span>
          <span class="money-val">${v >= 0 ? '+' : ''}$${v.toFixed(0)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
  // Game-specific detail
  if (g === 'nassau') html += renderNassauDetail();
  else if (g === 'skins') html += renderSkinsDetail();
  else if (g === 'match') html += renderMatchDetail();
  else if (g === 'stableford') html += renderStablefordDetail();
  else if (g === 'bingo' || g === 'dots') html += renderBonusDetail();
  else if (g === 'wolf') html += renderWolfDetail();
  el.innerHTML = html;

  // Update sticky leaderboard
  const lb = document.getElementById('sticky-leaderboard');
  if (lb && state.started) {
    lb.classList.remove('hidden');
    const sorted = state.players.map((p, i) => ({ name: p.name, color: p.color, m: money[i] })).sort((a, b) => b.m - a.m);
    lb.innerHTML = sorted.map(s => {
      const cls = s.m > 0.01 ? 'lb-up' : s.m < -0.01 ? 'lb-dn' : 'lb-even';
      return `<span class="lb-item ${cls}"><span class="dot" style="background:${s.color}"></span>${s.name} ${s.m >= 0 ? '+' : ''}$${s.m.toFixed(0)}</span>`;
    }).join('');
  }
}

// ═══════════════════════════════════════
// §10 MONEY CALCULATIONS
// ═══════════════════════════════════════
let _moneyCache = null;
let _moneyCacheVer = 0;

function invalidateMoneyCache() { _moneyCacheVer++; _moneyCache = null; }

function calcMoney() {
  if (_moneyCache) return _moneyCache;
  const g = state.gameType;
  if (g === 'nassau') _moneyCache = calcNassauMoney();
  else if (g === 'skins') _moneyCache = calcSkinsMoney();
  else if (g === 'match') _moneyCache = calcMatchMoney();
  else if (g === 'stableford') _moneyCache = calcStablefordMoney();
  else if (g === 'bingo' || g === 'dots') _moneyCache = calcBonusMoney();
  else if (g === 'wolf') _moneyCache = calcWolfMoney();
  else _moneyCache = state.players.map(() => 0);
  return _moneyCache;
}

// §10.1 Nassau
function calcNassauMoney() {
  const o = state.gameOpts, n = state.players.length;
  const money = Array(n).fill(0);
  // Front 9 match, Back 9 match, Overall match — each is head-to-head cumulative net
  // Plus presses
  const bets = [];
  bets.push({ start: 0, end: Math.min(8, maxHole()-1), val: o.front, label: 'Front 9' });
  if (maxHole() > 9) {
    bets.push({ start: 9, end: maxHole()-1, val: o.back, label: 'Back 9' });
  }
  bets.push({ start: 0, end: maxHole()-1, val: o.overall, label: 'Overall' });

  // Auto-press detection for front and back
  if (o.press) {
    [{ s: 0, e: Math.min(8, maxHole()-1), label: 'F' }, ...(maxHole() > 9 ? [{ s: 9, e: maxHole()-1, label: 'B' }] : [])].forEach(nine => {
      // Track cumulative net for each player pair — press when any player is 2-down
      // Simplified: track vs field. If a player is 2 holes down, a press starts
      const cumNet = Array(n).fill(0); // cumulative net strokes vs best
      for (let h = nine.s; h <= nine.e; h++) {
        const nets = state.players.map((_, i) => getNetScore(i, h));
        if (nets.some(v => v == null)) continue;
        const best = Math.min(...nets);
        for (let i = 0; i < n; i++) cumNet[i] += nets[i] - best;
        // Check if anyone is 2+ down — they press
        for (let i = 0; i < n; i++) {
          // "2-down" means cumNet is 2+ worse than the leader
          const leaderNet = Math.min(...cumNet);
          if (cumNet[i] - leaderNet >= 2) {
            // Check if we already have a press starting at h+1
            const pressStart = h + 1;
            if (pressStart <= nine.e && !bets.find(b => b.start === pressStart && b.end === nine.e && b.pressBy === i)) {
              bets.push({ start: pressStart, end: nine.e, val: o.pressVal, label: `${nine.label} Press H${pressStart+1}`, pressBy: i });
            }
          }
        }
      }
    });
  }

  // Settle each bet
  bets.forEach(bet => {
    const cumNet = Array(n).fill(0);
    for (let h = bet.start; h <= bet.end; h++) {
      const nets = state.players.map((_, i) => getNetScore(i, h));
      if (nets.some(v => v == null)) continue;
      const best = Math.min(...nets);
      for (let i = 0; i < n; i++) cumNet[i] += nets[i] - best;
    }
    const bestTotal = Math.min(...cumNet);
    const winners = cumNet.reduce((a, v, i) => v === bestTotal ? [...a, i] : a, []);
    for (let i = 0; i < n; i++) {
      if (winners.includes(i)) {
        money[i] += bet.val * (n - winners.length) / winners.length;
      } else {
        money[i] -= bet.val;
      }
    }
  });
  state._nassauBets = bets; // stash for detail view
  return money;
}

function renderNassauDetail() {
  const bets = state._nassauBets || [];
  const n = state.players.length;
  let html = '<div class="game-detail">';
  bets.forEach(bet => {
    const cumNet = Array(n).fill(0);
    let holesPlayed = 0;
    for (let h = bet.start; h <= bet.end; h++) {
      const nets = state.players.map((_, i) => getNetScore(i, h));
      if (nets.some(v => v == null)) continue;
      holesPlayed++;
      const best = Math.min(...nets);
      for (let i = 0; i < n; i++) cumNet[i] += nets[i] - best;
    }
    const bestTotal = Math.min(...cumNet);
    const leader = cumNet.indexOf(bestTotal);
    const margin = cumNet.filter(v => v !== bestTotal).length ? Math.min(...cumNet.filter(v => v !== bestTotal)) - bestTotal : 0;
    html += `<div class="detail-bet">
      <span class="detail-label">${bet.label} ($${bet.val})</span>
      <span class="detail-status">${holesPlayed === 0 ? 'Not started' : margin === 0 ? 'All Square' : `${state.players[leader].name} ${margin > 0 ? margin + ' UP' : 'leads'}`}</span>
    </div>`;
  });
  html += '</div>';
  return html;
}

// §10.2 Skins
function calcSkinsMoney() {
  const n = state.players.length, o = state.gameOpts;
  const skins = calcSkins();
  const totalSkins = skins.reduce((a, b) => a + b, 0);
  return state.players.map((_, i) => {
    return skins[i] * o.skinVal * (n - 1) - (totalSkins - skins[i]) * o.skinVal;
  });
}

function renderSkinsDetail() {
  const skins = calcSkins();
  const o = state.gameOpts;
  let pot = 0, carry = 0;
  let html = '<div class="game-detail">';
  // Show carry pot
  for (let h = 0; h <= state.currentHole; h++) {
    const nets = state.players.map((_, i) => getNetScore(i, h));
    if (nets.some(v => v == null)) { carry++; continue; }
    const best = Math.min(...nets);
    const winners = nets.filter(v => v === best);
    if (winners.length === 1) {
      carry = 0;
    } else if (o.carry) {
      carry++;
    }
  }
  if (carry > 0) {
    html += `<div class="detail-bet"><span class="detail-label">🔥 Carry Pot</span><span class="detail-status">${carry + 1} skins on next hole ($${(carry + 1) * o.skinVal * state.players.length})</span></div>`;
  }
  state.players.forEach((p, i) => {
    html += `<div class="detail-bet"><span class="detail-label">${p.name}</span><span class="detail-status">${skins[i]} skin${skins[i]!==1?'s':''}</span></div>`;
  });
  html += '</div>';
  return html;
}

// §10.3 Match Play
function calcMatchMoney() {
  const n = state.players.length, o = state.gameOpts;
  const money = Array(n).fill(0);

  // Build matches: main + manual presses
  const matches = [{ start: 0, end: maxHole()-1, val: o.holeVal, label: 'Main Match' }];
  (state.matchPresses || []).forEach((p, idx) => {
    matches.push({ start: p.start, end: maxHole()-1, val: o.matchPressVal, label: `Press #${idx + 1} (${p.by}, H${p.start + 1})` });
  });

  state._matchPresses = matches;

  matches.forEach(m => {
    for (let h = m.start; h <= m.end; h++) {
      const nets = state.players.map((_, i) => getNetScore(i, h));
      if (nets.some(v => v == null)) continue;
      const best = Math.min(...nets);
      const winners = nets.filter(v => v === best);
      if (winners.length === 1) {
        const w = nets.indexOf(best);
        for (let i = 0; i < n; i++) {
          if (i !== w) { money[w] += m.val; money[i] -= m.val; }
        }
      }
    }
  });

  return money;
}

function addMatchPress(hole) {
  const playerName = prompt('Who is pressing? (enter player name)');
  if (!playerName) return;
  pushUndo();
  if (!state.matchPresses) state.matchPresses = [];
  state.matchPresses.push({ start: hole, by: playerName.trim() });
  invalidateMoneyCache();
  renderHole();
}

function removeMatchPress(idx) {
  pushUndo();
  state.matchPresses.splice(idx, 1);
  invalidateMoneyCache();
  renderHole();
}

function renderMatchDetail() {
  const n = state.players.length;
  const matches = state._matchPresses || [{ start: 0, end: maxHole()-1, val: state.gameOpts.holeVal, label: 'Main Match' }];

  let html = '<div class="game-detail">';

  // Per-match breakdown
  matches.forEach((m, mi) => {
    const wins = Array(n).fill(0);
    const cum = Array(n).fill(0);
    let played = 0, ties = 0;
    const holeLog = [];

    for (let h = m.start; h <= m.end; h++) {
      const nets = state.players.map((_, i) => getNetScore(i, h));
      if (nets.some(v => v == null)) continue;
      played++;
      const best = Math.min(...nets);
      const w = nets.filter(v => v === best);
      let winner = null;
      if (w.length === 1) {
        winner = nets.indexOf(best);
        wins[winner]++;
        for (let i = 0; i < n; i++) { if (i === winner) cum[i]++; else cum[i]--; }
      } else { ties++; }
      holeLog.push({ hole: h, winner, cum: [...cum] });
    }

    // Money for this match
    const matchMoney = Array(n).fill(0);
    for (let h = m.start; h <= m.end; h++) {
      const nets = state.players.map((_, i) => getNetScore(i, h));
      if (nets.some(v => v == null)) continue;
      const best = Math.min(...nets);
      const w = nets.filter(v => v === best);
      if (w.length === 1) {
        const wi = nets.indexOf(best);
        for (let i = 0; i < n; i++) { if (i !== wi) { matchMoney[wi] += m.val; matchMoney[i] -= m.val; } }
      }
    }

    const isMain = mi === 0;
    html += `<div class="match-block ${isMain ? '' : 'press-block'}">
      <div class="match-block-header">
        <span class="match-block-title">${m.label}</span>
        <span class="match-block-meta">$${m.val}/hole · H${m.start+1}–${m.end+1} · ${played} played${ties ? ` · ${ties} tied` : ''}</span>
      </div>`;

    // Player standings for this match
    const sorted = state.players.map((p, i) => ({ name: p.name, color: p.color, idx: i, wins: wins[i], cum: cum[i], money: matchMoney[i] }))
      .sort((a, b) => b.cum - a.cum);
    html += '<div class="match-block-players">';
    sorted.forEach(s => {
      const status = s.cum > 0 ? `${s.cum} UP` : s.cum < 0 ? `${Math.abs(s.cum)} DN` : 'AS';
      const cls = s.cum > 0 ? 'match-up' : s.cum < 0 ? 'match-dn' : 'match-as';
      const mCls = s.money > 0.01 ? 'match-up' : s.money < -0.01 ? 'match-dn' : 'match-as';
      html += `<div class="match-block-row">
        <span class="dot" style="background:${s.color};width:8px;height:8px;display:inline-block;border-radius:50%"></span>
        <span class="mb-name">${s.name}</span>
        <span class="mb-wins">${s.wins}W</span>
        <span class="${cls} mb-status">${status}</span>
        <span class="${mCls} mb-money">${s.money >= 0 ? '+' : ''}$${s.money.toFixed(0)}</span>
      </div>`;
    });
    html += '</div>';

    // Mini timeline for this match (last 9 holes)
    if (holeLog.length > 0) {
      const recent = holeLog.slice(-9);
      html += '<div class="match-tl-grid mini">';
      html += '<div class="match-tl-row"><div class="match-tl-name"></div>';
      recent.forEach(r => html += `<div class="match-tl-hole">${r.hole + 1}</div>`);
      html += '</div>';
      state.players.forEach((p, i) => {
        html += `<div class="match-tl-row"><div class="match-tl-name"><span class="dot" style="background:${p.color};width:5px;height:5px;display:inline-block;border-radius:50%;margin-right:2px"></span>${p.name}</div>`;
        recent.forEach(r => {
          const c = r.cum[i];
          const won = r.winner === i;
          const cls = won ? 'tl-win' : c > 0 ? 'tl-up' : c < 0 ? 'tl-dn' : 'tl-as';
          html += `<div class="match-tl-cell ${cls}">${won ? '●' : c > 0 ? '+' + c : c === 0 ? '·' : c}</div>`;
        });
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
  });

  html += '</div>';
  return html;
}

// §10.4 Stableford
function calcStablefordMoney() {
  const pts = calcStableford(), val = state.gameOpts.ptVal, n = state.players.length;
  // Each player pays/collects the point differential vs each other player
  return state.players.map((_, i) => {
    let m = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) m += (pts[i] - pts[j]) * val;
    }
    return m;
  });
}

function renderStablefordDetail() {
  const pts = calcStableford();
  let html = '<div class="game-detail">';
  const sorted = state.players.map((p, i) => ({ name: p.name, pts: pts[i], color: p.color })).sort((a, b) => b.pts - a.pts);
  sorted.forEach((s, rank) => {
    html += `<div class="detail-bet"><span class="detail-label">${rank === 0 ? '👑 ' : ''}${s.name}</span><span class="detail-status">${s.pts} pts</span></div>`;
  });
  // Show last hole breakdown
  const h = state.currentHole;
  const nets = state.players.map((_, i) => getNetScore(i, h));
  if (!nets.some(v => v == null)) {
    html += '<div class="detail-bet" style="margin-top:4px;border-top:1px solid #eee;padding-top:4px"><span class="detail-label">This Hole</span><span class="detail-status">';
    html += state.players.map((p, i) => {
      const diff = nets[i] - state.pars[h];
      const pt = diff <= -3 ? 8 : diff === -2 ? 5 : diff === -1 ? 2 : diff === 0 ? 0 : diff === 1 ? -1 : -3;
      return `${p.name}: ${pt > 0 ? '+' : ''}${pt}`;
    }).join(' | ');
    html += '</span></div>';
  }
  html += '</div>';
  return html;
}

// §10.5 Bingo Bango Bongo / Dots
function calcBonusMoney() {
  const n = state.players.length;
  const val = state.gameType === 'bingo' ? state.gameOpts.ptVal : state.gameOpts.dotVal;
  const totals = state.players.map((_, i) => {
    let t = 0;
    for (let h = 0; h < maxHole(); h++) t += (state.bonusPoints[i]?.[h] || 0);
    return t;
  });
  // Each player pays/collects differential vs each other
  return state.players.map((_, i) => {
    let m = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) m += (totals[i] - totals[j]) * val;
    }
    return m;
  });
}

function renderBonusDetail() {
  const label = state.gameType === 'bingo' ? 'Points' : 'Dots';
  const totals = state.players.map((_, i) => {
    let t = 0;
    for (let h = 0; h < maxHole(); h++) t += (state.bonusPoints[i]?.[h] || 0);
    return t;
  });
  let html = '<div class="game-detail">';
  state.players.forEach((p, i) => {
    html += `<div class="detail-bet"><span class="detail-label">${p.name}</span><span class="detail-status">${totals[i]} ${label.toLowerCase()}</span></div>`;
  });
  html += '</div>';
  return html;
}

// §10.6 Wolf
function getWolfTeams(wd) {
  const wolfPack = [wd.wolf, ...(wd.partners || [])];
  const field = [];
  for (let i = 0; i < state.players.length; i++) {
    if (!wolfPack.includes(i)) field.push(i);
  }
  const isLone = !wd.partners || wd.partners.length === 0;
  return { wolfPack, field, isLone };
}

function calcWolfMoney() {
  const n = state.players.length, o = state.gameOpts;
  const money = Array(n).fill(0);
  for (let h = 0; h < maxHole(); h++) {
    const nets = state.players.map((_, i) => getNetScore(i, h));
    if (nets.some(v => v == null)) continue;
    const wd = state.wolfHoles[h];
    if (!wd) continue;

    // Fixed pairings mode — wolf team + allies vs field
    if (wd.fixedPairs && state.pairings) {
      if (wd.allyTeams === undefined) continue; // teams not chosen yet

      const wolfTeamIdx = wd.wolfTeam;
      const wolfSideTeams = [wolfTeamIdx, ...(wd.allyTeams || [])];
      const fieldTeams = [];
      for (let t = 0; t < state.pairings.length; t++) { if (!wolfSideTeams.includes(t)) fieldTeams.push(t); }
      const wolfSidePlayers = wolfSideTeams.flatMap(t => state.pairings[t]);
      const fieldPlayers = fieldTeams.flatMap(t => state.pairings[t]);
      if (!fieldPlayers.length) continue;

      const isLonePair = (wd.allyTeams || []).length === 0;
      const baseM = isLonePair && o.lone2x ? 2 : 1;
      const hammerM = (wd.hammers || 0) > 0 ? Math.pow(2, wd.hammers) : 1;

      const wolfBest = Math.min(...wolfSidePlayers.map(i => nets[i]));
      const fieldBest = Math.min(...fieldPlayers.map(i => nets[i]));
      const result = wolfBest < fieldBest ? 1 : wolfBest > fieldBest ? -1 : 0;

      const winGross = result > 0
        ? Math.min(...wolfSidePlayers.map(i => state.scores[i]?.[h] ?? 99))
        : result < 0 ? Math.min(...fieldPlayers.map(i => state.scores[i]?.[h] ?? 99)) : null;
      const diff = winGross != null ? winGross - state.pars[h] : 0;
      const scoreM = diff <= -2 ? 3 : diff === -1 ? 2 : 1;
      const mult = baseM * hammerM * scoreM * o.wolfVal;

      // Each wolf-side player settles vs each field player
      wolfSidePlayers.forEach(w => {
        fieldPlayers.forEach(f => {
          money[w] += result * mult;
          money[f] -= result * mult;
        });
      });
      continue;
    }

    if (wd.partners === undefined) continue;

    const { wolfPack, field, isLone } = getWolfTeams(wd);
    const baseMultiplier = wd.blind ? 3 : (isLone && o.lone2x) ? 2 : 1;
    const hammerMultiplier = (wd.hammers || 0) > 0 ? Math.pow(2, wd.hammers) : 1;

    // Best ball: lowest net on each team
    const wolfBest = Math.min(...wolfPack.map(i => nets[i]));
    const fieldBest = Math.min(...field.map(i => nets[i]));
    const result = wolfBest < fieldBest ? 1 : wolfBest > fieldBest ? -1 : 0;

    // Birdie doubles, eagle triples (based on winning team's best GROSS vs par)
    const wolfGross = Math.min(...wolfPack.map(i => state.scores[i]?.[h] ?? 99));
    const fieldGross = Math.min(...field.map(i => state.scores[i]?.[h] ?? 99));
    const winningGross = result > 0 ? wolfGross : result < 0 ? fieldGross : null;
    const diff = winningGross != null ? winningGross - state.pars[h] : 0;
    const scoreMultiplier = diff <= -2 ? 3 : diff === -1 ? 2 : 1;

    const multiplier = baseMultiplier * hammerMultiplier * scoreMultiplier;

    // 5+ players: smaller team pays 2× base, larger team pays 1× base per person
    // This keeps total money balanced across uneven teams
    const wolfSize = wolfPack.length, fieldSize = field.length;
    const unevenTeams = n >= 5 && wolfSize !== fieldSize && !isLone;

    if (isLone) {
      // Lone wolf: standard multiplier vs each opponent
      wolfPack.forEach(w => {
        field.forEach(f => {
          money[w] += result * o.wolfVal * multiplier;
          money[f] -= result * o.wolfVal * multiplier;
        });
      });
    } else if (unevenTeams) {
      // Smaller team members bet 2× base, larger team members bet 1× base
      const smallTeam = wolfSize < fieldSize ? wolfPack : field;
      const bigTeam = wolfSize < fieldSize ? field : wolfPack;
      const wolfWins = result > 0 ? 1 : result < 0 ? -1 : 0;
      // Total pot per side must balance: smallSize * 2x = bigSize * 1x ... not always equal
      // Rule: each small-team member's stake = 2 * base * multiplier
      //        each big-team member's stake = 1 * base * multiplier
      const smallStake = o.wolfVal * 2 * hammerMultiplier * scoreMultiplier;
      const bigStake = o.wolfVal * hammerMultiplier * scoreMultiplier;
      const smallIsWolf = wolfSize < fieldSize;
      const winSign = smallIsWolf ? wolfWins : -wolfWins;
      // Small team wins/loses smallStake each, big team wins/loses bigStake each
      // Total from small team = smallSize * smallStake, total from big = bigSize * bigStake
      // Distribute winnings proportionally
      const smallTotal = smallTeam.length * smallStake;
      const bigTotal = bigTeam.length * bigStake;
      if (winSign > 0) {
        // Small team wins: each small member gets bigTotal/smallSize, each big member loses bigStake
        smallTeam.forEach(p => { money[p] += bigTotal / smallTeam.length; });
        bigTeam.forEach(p => { money[p] -= bigStake; });
      } else if (winSign < 0) {
        // Big team wins: each big member gets smallTotal/bigSize, each small member loses smallStake
        bigTeam.forEach(p => { money[p] += smallTotal / bigTeam.length; });
        smallTeam.forEach(p => { money[p] -= smallStake; });
      }
    } else {
      // Even teams or <5 players: standard per-matchup
      wolfPack.forEach(w => {
        field.forEach(f => {
          money[w] += result * o.wolfVal * multiplier;
          money[f] -= result * o.wolfVal * multiplier;
        });
      });
    }
  }
  return money;
}

function renderWolfDetail() {
  const n = state.players.length, h = state.currentHole;
  let html = '<div class="game-detail">';

  const wolfIdx = getWolfForHole(h);
  html += `<div class="detail-bet"><span class="detail-label">Wolf Rotation</span><span class="detail-status">${state.players.map((p, i) => i === wolfIdx ? `<strong>→${p.name}</strong>` : p.name).join(' · ')}</span></div>`;

  let wins = Array(n).fill(0), loneWins = 0, loneAttempts = 0, totalHammers = 0, biggestStake = 0;
  for (let hole = 0; hole < maxHole(); hole++) {
    const nets = state.players.map((_, i) => getNetScore(i, hole));
    if (nets.some(v => v == null)) continue;
    const wd = state.wolfHoles[hole];
    if (!wd || wd.partners === undefined) continue;

    const { wolfPack, field, isLone } = getWolfTeams(wd);
    const hams = wd.hammers || 0;
    totalHammers += hams;
    const baseM = wd.blind ? 3 : (isLone && state.gameOpts.lone2x) ? 2 : 1;
    const hamM = hams > 0 ? Math.pow(2, hams) : 1;
    const stake = baseM * hamM * state.gameOpts.wolfVal;
    if (stake > biggestStake) biggestStake = stake;

    const wolfBest = Math.min(...wolfPack.map(i => nets[i]));
    const fieldBest = Math.min(...field.map(i => nets[i]));
    if (wolfBest < fieldBest) {
      wolfPack.forEach(i => wins[i]++);
      if (isLone) loneWins++;
    }
    if (isLone) loneAttempts++;
  }

  state.players.forEach((p, i) => {
    html += `<div class="detail-bet"><span class="detail-label">${p.name}</span><span class="detail-status">${wins[i]} hole wins</span></div>`;
  });
  if (loneAttempts > 0) {
    html += `<div class="detail-bet"><span class="detail-label">🐺 Lone Wolf</span><span class="detail-status">${loneWins}/${loneAttempts} successful</span></div>`;
  }
  if (totalHammers > 0) {
    html += `<div class="detail-bet"><span class="detail-label">🔨 Hammers</span><span class="detail-status">${totalHammers} total · Max: $${biggestStake}/pt</span></div>`;
  }
  html += '</div>';
  return html;
}

// §10.7 Shared Calculations
function calcSkins() {
  const n = state.players.length;
  const skins = Array(n).fill(0);
  let carry = 0;
  for (let h = 0; h < maxHole(); h++) {
    const nets = state.players.map((_, i) => getNetScore(i, h));
    if (nets.some(v => v == null)) { carry += 1; continue; }
    const best = Math.min(...nets);
    const winners = nets.filter(v => v === best);
    if (winners.length === 1) {
      skins[nets.indexOf(best)] += 1 + (state.gameOpts.carry ? carry : 0);
      carry = 0;
    } else {
      carry += state.gameOpts.carry ? 1 : 0;
    }
  }
  return skins;
}

function calcStableford() {
  return state.players.map((_, i) => {
    let pts = 0;
    for (let h = 0; h < maxHole(); h++) {
      const net = getNetScore(i, h);
      if (net == null) continue;
      const diff = net - state.pars[h];
      if (diff <= -3) pts += 8;
      else if (diff === -2) pts += 5;
      else if (diff === -1) pts += 2;
      else if (diff === 0) pts += 0;
      else if (diff === 1) pts -= 1;
      else pts -= 3;
    }
    return pts;
  });
}

// ═══════════════════════════════════════
// §12 SCORECARD & STANDINGS
// ═══════════════════════════════════════
function showScorecard() {
  const modal = document.getElementById('scorecard-modal');
  const wrap = document.getElementById('scorecard-table-wrap');
  const hdcps = getPlayingHandicaps();

  let html = '<table class="scorecard-tbl"><thead><tr><th></th>';
  const front = Math.min(9, maxHole());
  const hasBack = maxHole() > 9;
  for (let h = 0; h < front; h++) html += `<th>${h+1}</th>`;
  html += '<th class="total-col">OUT</th>';
  if (hasBack) {
    for (let h = 9; h < maxHole(); h++) html += `<th>${h+1}</th>`;
    html += '<th class="total-col">IN</th>';
  }
  html += '<th class="total-col">TOT</th><th class="total-col">NET</th></tr></thead><tbody>';

  // Par row
  html += '<tr class="par-row"><td>Par</td>';
  let fPar = 0, bPar = 0;
  for (let h = 0; h < front; h++) { html += `<td>${state.pars[h]}</td>`; fPar += state.pars[h]; }
  html += `<td class="total-col">${fPar}</td>`;
  if (hasBack) {
    for (let h = 9; h < maxHole(); h++) { html += `<td>${state.pars[h]}</td>`; bPar += state.pars[h]; }
    html += `<td class="total-col">${bPar}</td>`;
  }
  html += `<td class="total-col">${fPar+bPar}</td><td></td></tr>`;

  // Player rows
  state.players.forEach((p, i) => {
    html += `<tr><td style="white-space:nowrap">${p.name} (${hdcps[i]})</td>`;
    let fTot = 0, bTot = 0, netTot = 0;
    for (let h = 0; h < front; h++) {
      const s = state.scores[i][h]; const cls = cellClass(s, state.pars[h]);
      html += `<td class="${cls}">${s ?? '-'}</td>`;
      if (s != null) fTot += s;
    }
    html += `<td class="total-col">${fTot || '-'}</td>`;
    if (hasBack) {
      for (let h = 9; h < maxHole(); h++) {
        const s = state.scores[i][h]; const cls = cellClass(s, state.pars[h]);
        html += `<td class="${cls}">${s ?? '-'}</td>`;
        if (s != null) bTot += s;
      }
      html += `<td class="total-col">${bTot || '-'}</td>`;
    }
    for (let h = 0; h < maxHole(); h++) { const n = getNetScore(i, h); if (n != null) netTot += n; }
    html += `<td class="total-col">${(fTot+bTot) || '-'}</td><td class="total-col">${netTot || '-'}</td></tr>`;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
  modal.classList.remove('hidden');
}

function cellClass(score, par) {
  if (score == null) return '';
  const d = score - par;
  if (d <= -2) return 'eagle-cell';
  if (d === -1) return 'birdie-cell';
  if (d === 1) return 'bogey-cell';
  if (d >= 2) return 'double-cell';
  return '';
}

// §12.1 Standings & Payouts
function showStandings() {
  const modal = document.getElementById('standings-modal');
  const el = document.getElementById('standings-content');
  const money = calcMoney();
  const n = state.players.length;

  // Settlement matrix: who owes whom
  let html = '<h3 style="margin-bottom:8px">Final Settlement</h3>';
  html += payoutTable(money);

  // Head-to-head settlement
  html += '<h3 style="margin:16px 0 8px">Who Pays Whom</h3>';
  const debts = [];
  const bal = [...money];
  // Simplify debts
  while (true) {
    const maxCreditor = bal.indexOf(Math.max(...bal));
    const maxDebtor = bal.indexOf(Math.min(...bal));
    if (bal[maxCreditor] < 0.01 || bal[maxDebtor] > -0.01) break;
    const amt = Math.min(bal[maxCreditor], -bal[maxDebtor]);
    debts.push({ from: maxDebtor, to: maxCreditor, amt });
    bal[maxCreditor] -= amt;
    bal[maxDebtor] += amt;
  }
  if (debts.length === 0) {
    html += '<div class="hint">All square — no payments needed!</div>';
  } else {
    html += '<div class="settlement-list">';
    debts.forEach(d => {
      html += `<div class="settlement-row">
        <span class="settlement-from">${state.players[d.from].name}</span>
        <span class="settlement-arrow">pays →</span>
        <span class="settlement-to">${state.players[d.to].name}</span>
        <span class="settlement-amt">$${d.amt.toFixed(2)}</span>
      </div>`;
    });
    html += '</div>';
  }

  el.innerHTML = html;
  modal.classList.remove('hidden');
}

function payoutTable(payouts) {
  let html = '<table class="payout-table"><thead><tr><th>Player</th><th>Net</th></tr></thead><tbody>';
  const sorted = state.players.map((p, i) => ({ name: p.name, payout: payouts[i], color: p.color })).sort((a, b) => b.payout - a.payout);
  sorted.forEach(s => {
    const cls = s.payout > 0.01 ? 'positive' : s.payout < -0.01 ? 'negative' : '';
    html += `<tr><td><span class="dot" style="background:${s.color};width:8px;height:8px;display:inline-block;border-radius:50%;margin-right:6px"></span>${s.name}</td><td class="${cls}">${s.payout >= 0 ? '+' : ''}$${s.payout.toFixed(2)}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}

// ═══════════════════════════════════════
// §13 FINISH ROUND
// ═══════════════════════════════════════
function finishRound(viewOnly) {
  // Confirm any unscored holes as par
  for (let h = 0; h < maxHole(); h++) {
    state.players.forEach((_, i) => {
      if (state.scores[i][h] == null) state.scores[i][h] = state.pars[h];
    });
  }

  const money = calcMoney();
  const hdcps = getPlayingHandicaps();
  const totalPar = state.pars.slice(0, maxHole()).reduce((a, b) => a + b, 0);
  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  // Build results HTML
  let html = `<div class="results-header">
    <div class="results-course">${state.course}</div>
    <div class="results-date">${date} · Par ${totalPar} · ${state.gameType.charAt(0).toUpperCase() + state.gameType.slice(1)}</div>
  </div>`;

  // Scorecard summary
  html += '<div class="results-scores">';
  state.players.forEach((p, i) => {
    let gross = 0, net = 0;
    for (let h = 0; h < maxHole(); h++) {
      gross += state.scores[i][h] || 0;
      net += getNetScore(i, h) || 0;
    }
    const toPar = gross - totalPar;
    const toParStr = toPar === 0 ? 'E' : (toPar > 0 ? '+' : '') + toPar;
    html += `<div class="results-player-row">
      <span class="dot" style="background:${p.color}"></span>
      <span class="results-pname">${p.name}</span>
      <span class="results-phdcp">(${hdcps[i]} strokes)</span>
      <span class="results-pgross">${gross} (${toParStr})</span>
      <span class="results-pnet">Net ${net}</span>
    </div>`;
  });
  html += '</div>';

  // Round stats — birdies, eagles, pars, etc.
  html += '<div class="results-money-title">📊 Round Stats</div>';

  // Group totals
  const groupCounts = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, other: 0 };
  state.players.forEach((_, pi) => {
    for (let h = 0; h < maxHole(); h++) {
      const s = state.scores[pi]?.[h];
      if (s == null) continue;
      const diff = s - state.pars[h];
      if (diff <= -2) groupCounts.eagle++;
      else if (diff === -1) groupCounts.birdie++;
      else if (diff === 0) groupCounts.par++;
      else if (diff === 1) groupCounts.bogey++;
      else if (diff === 2) groupCounts.double++;
      else groupCounts.other++;
    }
  });
  html += `<div class="group-stats-bar">
    ${groupCounts.eagle ? `<div class="gs-item eagle"><div class="gs-val">${groupCounts.eagle}</div><div class="gs-label">Eagles</div></div>` : ''}
    <div class="gs-item birdie"><div class="gs-val">${groupCounts.birdie}</div><div class="gs-label">Birdies</div></div>
    <div class="gs-item par"><div class="gs-val">${groupCounts.par}</div><div class="gs-label">Pars</div></div>
    <div class="gs-item bogey"><div class="gs-val">${groupCounts.bogey}</div><div class="gs-label">Bogeys</div></div>
    <div class="gs-item double"><div class="gs-val">${groupCounts.double + groupCounts.other}</div><div class="gs-label">Double+</div></div>
  </div>`;

  // Match play per-match breakdown
  if (state.gameType === 'match' && state._matchPresses && state._matchPresses.length > 0) {
    const n = state.players.length;
    const matches = state._matchPresses;
    html += `<div class="results-money-title">📊 Match Breakdown (${matches.length} bet${matches.length > 1 ? 's' : ''})</div>`;

    matches.forEach((m, mi) => {
      const mMoney = Array(n).fill(0);
      const wins = Array(n).fill(0);
      const cum = Array(n).fill(0);
      let played = 0;
      for (let h = m.start; h <= m.end; h++) {
        const nets = state.players.map((_, i) => getNetScore(i, h));
        if (nets.some(v => v == null)) continue;
        played++;
        const best = Math.min(...nets);
        const w = nets.filter(v => v === best);
        if (w.length === 1) {
          const wi = nets.indexOf(best);
          wins[wi]++;
          for (let i = 0; i < n; i++) {
            if (i === wi) { cum[i]++; mMoney[wi] += m.val; }
            else { cum[i]--; mMoney[i] -= m.val; }
          }
        }
      }

      const isPress = mi > 0;
      html += `<div class="results-match-block ${isPress ? 'press' : ''}">
        <div class="rmb-header">${m.label}</div>
        <div class="rmb-meta">$${m.val}/hole · H${m.start+1}–${m.end+1} · ${played} holes played</div>
        <div class="rmb-players">`;
      state.players.map((p, i) => ({ name: p.name, color: p.color, wins: wins[i], cum: cum[i], money: mMoney[i] }))
        .sort((a, b) => b.cum - a.cum)
        .forEach(s => {
          const status = s.cum > 0 ? `${s.cum} UP` : s.cum < 0 ? `${Math.abs(s.cum)} DN` : 'AS';
          const cls = s.cum > 0 ? 'match-up' : s.cum < 0 ? 'match-dn' : 'match-as';
          const mCls = s.money > 0.01 ? 'match-up' : s.money < -0.01 ? 'match-dn' : '';
          html += `<div class="rmb-row">
            <span class="dot" style="background:${s.color};width:8px;height:8px;display:inline-block;border-radius:50%"></span>
            <span class="rmb-name">${s.name}</span>
            <span class="rmb-wins">${s.wins}W</span>
            <span class="rmb-status ${cls}">${status}</span>
            <span class="rmb-money ${mCls}">${s.money >= 0 ? '+' : ''}$${s.money.toFixed(0)}</span>
          </div>`;
        });
      html += '</div></div>';
    });
  }

  // Total Money
  html += '<div class="results-money-title">💰 Total Money (All Bets Combined)</div>';
  html += payoutTable(money);

  // Settlement
  const bal = [...money];
  const debts = [];
  while (true) {
    const cr = bal.indexOf(Math.max(...bal));
    const db = bal.indexOf(Math.min(...bal));
    if (bal[cr] < 0.01 || bal[db] > -0.01) break;
    const amt = Math.min(bal[cr], -bal[db]);
    debts.push({ from: db, to: cr, amt });
    bal[cr] -= amt; bal[db] += amt;
  }
  if (debts.length) {
    html += `<div class="results-money-title">💸 Settlement — ${debts.length} transaction${debts.length > 1 ? 's' : ''}</div>`;
    html += `<div class="settlement-note">Minimum payments to settle all bets</div>`;
    html += '<div class="settlement-list">';
    let txNum = 0;
    debts.forEach(d => {
      txNum++;
      html += `<div class="settlement-row">
        <span class="settlement-num">${txNum}</span>
        <span class="settlement-from">${state.players[d.from].name}</span>
        <span class="settlement-arrow">pays →</span>
        <span class="settlement-to">${state.players[d.to].name}</span>
        <span class="settlement-amt">$${d.amt.toFixed(2)}</span>
      </div>`;
    });
    html += '</div>';
  } else {
    html += '<div class="results-money-title">💸 Settlement</div>';
    html += '<div class="settlement-note">🤝 All square — no payments needed!</div>';
  }

  // Hammer stats (wolf game)
  if (state.gameType === 'wolf' && state.wolfHoles) {
    let totalHammers = 0, wolfHammers = 0, sheepHammers = 0, maxOnHole = 0, hammeredHoles = 0;
    for (let h = 0; h < maxHole(); h++) {
      const wd = state.wolfHoles[h];
      if (!wd || !wd.hammers) continue;
      totalHammers += wd.hammers;
      hammeredHoles++;
      if (wd.hammers > maxOnHole) maxOnHole = wd.hammers;
      (wd.hammerLog || []).forEach(t => { if (t === 'wolf') wolfHammers++; else sheepHammers++; });
    }
    if (totalHammers > 0) {
      const maxMult = Math.pow(2, maxOnHole);
      html += `<div class="results-money-title">🔨 Hammer Stats</div>
        <div class="hammer-stats-grid">
          <div class="hammer-stat"><div class="hammer-stat-val">${totalHammers}</div><div class="hammer-stat-label">Total Hammers</div></div>
          <div class="hammer-stat"><div class="hammer-stat-val">${hammeredHoles}</div><div class="hammer-stat-label">Holes Hammered</div></div>
          <div class="hammer-stat"><div class="hammer-stat-val">${wolfHammers}</div><div class="hammer-stat-label">🐺 Wolf Hammers</div></div>
          <div class="hammer-stat"><div class="hammer-stat-val">${sheepHammers}</div><div class="hammer-stat-label">🐑 Field Hammers</div></div>
          <div class="hammer-stat"><div class="hammer-stat-val">${maxMult}×</div><div class="hammer-stat-label">Max Multiplier</div></div>
          <div class="hammer-stat"><div class="hammer-stat-val">${maxOnHole}</div><div class="hammer-stat-label">Most on 1 Hole</div></div>
        </div>`;
    }
  }

  // Store for sharing
  window._resultsText = buildShareText(money, debts, totalPar, date);
  if (!viewOnly) saveFinishedRound(money, debts);

  document.getElementById('results-content').innerHTML = html;
  document.getElementById('results-modal').classList.remove('hidden');
}

function closeFinishRound() {
  document.getElementById('results-modal').classList.add('hidden');
  state.started = false;
  state.roundId = null;
  hideAllScreens();
  document.getElementById('home-btn').classList.add('hidden');
  document.getElementById('nav-bar').classList.remove('hidden');
  const lb = document.getElementById('sticky-leaderboard'); if (lb) lb.classList.add('hidden');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.screen === 'history'));
  document.getElementById('history-screen').classList.remove('hidden');
  renderHistory();
  updateNavCounts();
}

function viewFinishedRound(roundId) {
  const rounds = JSON.parse(localStorage.getItem('golfRounds') || '{}');
  const r = rounds[roundId];
  if (!r) return;

  // Load state so calcMoney/getNetScore work
  state.roundId = r.id; state.course = r.course; state.gameType = r.gameType;
  state.gameOpts = r.gameOpts; state.players = r.players; state.pars = r.pars;
  state.hdcps = r.hdcps; state.scores = r.scores; state.bonusPoints = r.bonusPoints || {};
  state.wolfHoles = r.wolfHoles || {}; state.pairings = r.pairings;
  state.pairingsLocked = r.pairingsLocked || false;
  state.matchPresses = r.matchPresses || []; state.handicapMode = r.handicapMode;
  state.holeCount = r.holeCount || 18; state.started = false;

  const hdcpSelect = document.getElementById('handicap-mode');
  if (hdcpSelect) hdcpSelect.value = state.handicapMode || 'full';
  invalidateHdcpCache();
  invalidateMoneyCache();

  // Trigger the finish round summary (view only, don't re-save)
  finishRound(true);
}

function buildShareText(money, debts, totalPar, date) {
  const hdcps = getPlayingHandicaps();
  let txt = `⛳ ${state.course} — ${date}\n`;
  txt += `Par ${totalPar} · ${state.gameType.charAt(0).toUpperCase() + state.gameType.slice(1)}\n\n`;

  // Scores
  txt += `SCORES\n`;
  txt += `${'Player'.padEnd(14)} ${'Gross'.padEnd(7)} ${'Net'.padEnd(7)} Strokes\n`;
  txt += `${'─'.repeat(40)}\n`;
  state.players.forEach((p, i) => {
    let gross = 0, net = 0;
    for (let h = 0; h < maxHole(); h++) {
      gross += state.scores[i][h] || 0;
      net += getNetScore(i, h) || 0;
    }
    const toPar = gross - totalPar;
    const toParStr = toPar === 0 ? 'E' : (toPar > 0 ? '+' : '') + toPar;
    txt += `${p.name.padEnd(14)} ${(gross + ' (' + toParStr + ')').padEnd(7)} ${('Net ' + net).padEnd(7)} ${hdcps[i]}\n`;
  });

  // Match breakdown
  if (state.gameType === 'match' && state._matchPresses && state._matchPresses.length > 0) {
    const n = state.players.length;
    txt += `\n📊 MATCH BREAKDOWN (${state._matchPresses.length} bets)\n`;
    state._matchPresses.forEach(m => {
      const mMoney = Array(n).fill(0);
      const cum = Array(n).fill(0);
      for (let h = m.start; h <= m.end; h++) {
        const nets = state.players.map((_, i) => getNetScore(i, h));
        if (nets.some(v => v == null)) continue;
        const best = Math.min(...nets);
        const w = nets.filter(v => v === best);
        if (w.length === 1) {
          const wi = nets.indexOf(best);
          for (let i = 0; i < n; i++) { if (i === wi) { cum[i]++; mMoney[i] += m.val; } else { cum[i]--; mMoney[i] -= m.val; } }
        }
      }
      txt += `\n${m.label} ($${m.val}/hole, H${m.start+1}-${m.end+1})\n`;
      state.players.map((p, i) => ({ name: p.name, cum: cum[i], money: mMoney[i] }))
        .sort((a, b) => b.cum - a.cum)
        .forEach(s => {
          const status = s.cum > 0 ? `${s.cum} UP` : s.cum < 0 ? `${Math.abs(s.cum)} DN` : 'AS';
          txt += `  ${s.name.padEnd(12)} ${status.padEnd(5)} ${s.money >= 0 ? '+' : ''}$${s.money.toFixed(0)}\n`;
        });
    });
  }

  // Total Money
  txt += `\n💰 TOTAL MONEY\n`;
  const sorted = state.players.map((p, i) => ({ name: p.name, m: money[i] })).sort((a, b) => b.m - a.m);
  sorted.forEach(s => {
    txt += `${s.name.padEnd(14)} ${s.m >= 0 ? '+' : ''}$${s.m.toFixed(2)}\n`;
  });

  // Settlement
  if (debts.length) {
    txt += `\n💸 SETTLEMENT (${debts.length} transaction${debts.length > 1 ? 's' : ''})\n`;
    debts.forEach(d => {
      txt += `${state.players[d.from].name} pays ${state.players[d.to].name} → $${d.amt.toFixed(2)}\n`;
    });
  }

  // Hammer stats
  if (state.gameType === 'wolf' && state.wolfHoles) {
    let totalH = 0, wolfH = 0, sheepH = 0;
    for (let h = 0; h < maxHole(); h++) {
      const wd = state.wolfHoles[h];
      if (!wd || !wd.hammers) continue;
      totalH += wd.hammers;
      (wd.hammerLog || []).forEach(t => { if (t === 'wolf') wolfH++; else sheepH++; });
    }
    if (totalH > 0) {
      txt += `\n🔨 HAMMERS: ${totalH} total (🐺 ${wolfH} / 🐑 ${sheepH})\n`;
    }
  }

  return txt;
}

function downloadResultsImage() {
  const content = document.getElementById('results-content');
  if (!content) return;
  const btn = document.querySelector('.results-actions');
  btn.style.display = 'none';

  const money = calcMoney();
  const sorted = state.players.map((p, i) => ({ name: p.name, color: p.color, m: money[i] })).sort((a, b) => b.m - a.m);
  const totalPar = state.pars.slice(0, maxHole()).reduce((a, b) => a + b, 0);
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Build branded card
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'padding:28px;background:linear-gradient(160deg,#0f4d2e 0%,#1a7f4b 100%);border-radius:20px;max-width:420px;font-family:Inter,-apple-system,sans-serif;color:#fff;';
  wrapper.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:28px;font-weight:900;letter-spacing:-1px">⛳ Greenside</div>
      <div style="font-size:13px;opacity:0.7;margin-top:2px">${state.course} · ${date}</div>
      <div style="font-size:11px;opacity:0.5">${state.gameType.charAt(0).toUpperCase() + state.gameType.slice(1)} · Par ${totalPar} · ${maxHole()} holes</div>
    </div>
    <div style="background:rgba(255,255,255,0.1);border-radius:14px;padding:16px;margin-bottom:16px">
      ${sorted.map((s, i) => {
        const icon = i === 0 ? '🏆 ' : '';
        const mStr = (s.m >= 0 ? '+' : '') + '$' + s.m.toFixed(0);
        const mColor = s.m > 0 ? '#4ade80' : s.m < 0 ? '#f87171' : '#94a3b8';
        return `<div style="display:flex;align-items:center;padding:6px 0;${i < sorted.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.1)' : ''}">
          <span style="width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:8px"></span>
          <span style="flex:1;font-weight:700;font-size:14px">${icon}${s.name}</span>
          <span style="font-weight:900;font-size:16px;color:${mColor};font-family:monospace">${mStr}</span>
        </div>`;
      }).join('')}
    </div>
    <div style="text-align:center;font-size:10px;opacity:0.4">greenside.app</div>
  `;
  document.body.appendChild(wrapper);

  html2canvas(wrapper, { scale: 2, backgroundColor: null, useCORS: true }).then(canvas => {
    document.body.removeChild(wrapper);
    btn.style.display = '';
    // Try native share first (mobile), fallback to download
    canvas.toBlob(blob => {
      const file = new File([blob], `greenside-${state.course.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: 'Greenside Results' }).catch(() => downloadBlob(blob));
      } else {
        downloadBlob(blob);
      }
    });
  }).catch(() => {
    document.body.removeChild(wrapper);
    btn.style.display = '';
    alert('Image capture failed. Try Copy Text instead.');
  });
}

function downloadBlob(blob) {
  const link = document.createElement('a');
  link.download = `greenside-${state.course.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.png`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

function shareResults() {
  const txt = window._resultsText || '';
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.querySelector('.results-actions .btn.primary');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📤 Copy to Clipboard'; }, 2000);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    const btn = document.querySelector('.results-actions .btn.primary');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📤 Copy to Clipboard'; }, 2000);
  });
}

// ═══════════════════════════════════════
// §14 PERSISTENCE
// ═══════════════════════════════════════
function generateRoundId() { return 'round_' + Date.now(); }

function saveCurrentRound() {
  if (!state.roundId) state.roundId = generateRoundId();
  const round = {
    id: state.roundId, course: state.course, gameType: state.gameType,
    gameOpts: state.gameOpts, players: state.players, pars: state.pars,
    hdcps: state.hdcps, scores: state.scores, bonusPoints: state.bonusPoints,
    wolfHoles: state.wolfHoles, pairings: state.pairings, pairingsLocked: state.pairingsLocked,
    matchPresses: state.matchPresses, handicapMode: state.handicapMode,
    currentHole: state.currentHole, started: state.started,
    holeCount: state.holeCount,
    date: state.roundDate || new Date().toISOString(), finished: false
  };
  const rounds = JSON.parse(localStorage.getItem('golfRounds') || '{}');
  rounds[state.roundId] = round;
  localStorage.setItem('golfRounds', JSON.stringify(rounds));
}

function saveFinishedRound(money, debts) {
  if (!state.roundId) state.roundId = generateRoundId();
  // Ensure round exists in storage first
  saveCurrentRound();
  const rounds = JSON.parse(localStorage.getItem('golfRounds') || '{}');
  if (rounds[state.roundId]) {
    rounds[state.roundId].finished = true;
    rounds[state.roundId].money = money;
    rounds[state.roundId].debts = debts;
    rounds[state.roundId].finishedDate = new Date().toISOString();
    localStorage.setItem('golfRounds', JSON.stringify(rounds));
  }
  state.started = false;
}

function loadRound(roundId) {
  const rounds = JSON.parse(localStorage.getItem('golfRounds') || '{}');
  const r = rounds[roundId];
  if (!r) return;
  state.roundId = r.id; state.course = r.course; state.gameType = r.gameType;
  state.gameOpts = r.gameOpts; state.players = r.players; state.pars = r.pars;
  state.hdcps = r.hdcps; state.scores = r.scores; state.bonusPoints = r.bonusPoints || {};
  state.wolfHoles = r.wolfHoles || {}; state.pairings = r.pairings;
  state.pairingsLocked = r.pairingsLocked || false;
  state.matchPresses = r.matchPresses || []; state.handicapMode = r.handicapMode;
  state.currentHole = r.currentHole || 0; state.started = r.started;
  state.holeCount = r.holeCount || 18;
  state.roundDate = r.date;

  // Restore DOM state
  const hdcpSelect = document.getElementById('handicap-mode');
  if (hdcpSelect) hdcpSelect.value = state.handicapMode || 'full';
  invalidateHdcpCache();

  // Show scoring screen
  hideAllScreens();
  document.getElementById('scoring-screen').classList.remove('hidden');
  document.getElementById('home-btn').classList.remove('hidden');
  document.getElementById('nav-bar').classList.add('hidden');
  renderStrokeSummary();
  invalidateMoneyCache();
  renderHole();
}

function deleteRound(roundId) {
  if (!confirm('Delete this round?')) return;
  const rounds = JSON.parse(localStorage.getItem('golfRounds') || '{}');
  delete rounds[roundId];
  localStorage.setItem('golfRounds', JSON.stringify(rounds));
  showScreen(document.querySelector('.nav-tab.active')?.dataset.screen || 'setup');
}

function getAllRounds() {
  return Object.values(JSON.parse(localStorage.getItem('golfRounds') || '{}'));
}

function exportAllData() {
  const data = {
    profiles: getSavedProfiles(),
    courses: getSavedCourses(),
    rounds: JSON.parse(localStorage.getItem('golfRounds') || '{}'),
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = 'greenside-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  link.href = URL.createObjectURL(blob);
  link.click();
}

// ═══════════════════════════════════════
// §15 SCREEN MANAGEMENT
// ═══════════════════════════════════════
function hideAllScreens() {
  ['setup-screen','scoring-screen','live-screen','history-screen'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

function showScreen(screen) {
  hideAllScreens();
  document.getElementById('home-btn').classList.add('hidden');
  document.getElementById('nav-bar').classList.remove('hidden');
  const lb = document.getElementById('sticky-leaderboard'); if (lb) lb.classList.add('hidden');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.screen === screen));

  if (screen === 'setup') {
    document.getElementById('setup-screen').classList.remove('hidden');
    renderResumeCard();
  } else if (screen === 'live') {
    document.getElementById('live-screen').classList.remove('hidden');
    renderLiveGames();
  } else if (screen === 'history') {
    document.getElementById('history-screen').classList.remove('hidden');
    renderHistory();
  }
}

function renderResumeCard() {
  const el = document.getElementById('resume-card');
  const live = getAllRounds().filter(r => !r.finished && r.started).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!live.length) { el.classList.add('hidden'); return; }
  const r = live[0]; // most recent
  const d = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const holesPlayed = Object.keys(r.scores?.[0] || {}).length;
  const names = (r.players || []).map(p => p.name).join(', ');
  el.classList.remove('hidden');
  el.innerHTML = `<div class="resume-card-inner" onclick="loadRound('${r.id}')">
    <div class="resume-label">🔴 Resume Live Round</div>
    <div class="resume-course">${r.course || 'Round'}</div>
    <div class="resume-meta">${d} · ${r.gameType} · ${holesPlayed}/${r.holeCount || 18} holes · ${names}</div>
  </div>`;
}

function renderLiveGames() {
  const rounds = getAllRounds().filter(r => !r.finished && r.started).sort((a, b) => new Date(b.date) - new Date(a.date));
  const el = document.getElementById('live-list');
  const empty = document.getElementById('live-empty');
  const count = document.getElementById('live-count');
  count.textContent = rounds.length || '';
  if (!rounds.length) { el.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  el.innerHTML = rounds.map(r => {
    const d = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const holesPlayed = Object.keys(r.scores?.[0] || {}).length;
    const names = (r.players || []).map(p => p.name).join(', ');
    return `<div class="round-card" onclick="loadRound('${r.id}')">
      <div class="round-card-top">
        <span class="round-card-course">${r.course || 'Round'}</span>
        <span class="round-card-date">${d}</span>
      </div>
      <div class="round-card-meta">${r.gameType} · ${holesPlayed}/18 holes · ${names}</div>
      <div class="round-card-actions">
        <span class="round-card-live">🔴 Live</span>
        <button class="round-card-del" onclick="event.stopPropagation();deleteRound('${r.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function renderHistory() {
  const rounds = getAllRounds().filter(r => r.finished).sort((a, b) => new Date(b.finishedDate || b.date) - new Date(a.finishedDate || a.date));
  const el = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const count = document.getElementById('history-count');
  count.textContent = rounds.length || '';
  if (!rounds.length) { el.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  el.innerHTML = rounds.map(r => {
    const d = new Date(r.finishedDate || r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const names = (r.players || []).map(p => p.name).join(', ');
    const money = r.money || [];
    const topWinner = r.players && money.length ? r.players[money.indexOf(Math.max(...money))]?.name : '';
    const topAmt = money.length ? Math.max(...money) : 0;
    return `<div class="round-card history" onclick="viewFinishedRound('${r.id}')">
      <div class="round-card-top">
        <span class="round-card-course">${r.course || 'Round'}</span>
        <span class="round-card-date">${d}</span>
      </div>
      <div class="round-card-meta">${r.gameType} · ${names}</div>
      ${topAmt > 0 ? `<div class="round-card-winner">🏆 ${topWinner} +$${topAmt.toFixed(0)}</div>` : ''}
      <div class="round-card-actions">
        <span class="round-card-finished">✅ Finished</span>
        <button class="round-card-del" onclick="event.stopPropagation();deleteRound('${r.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function updateNavCounts() {
  const all = getAllRounds();
  const live = all.filter(r => !r.finished && r.started).length;
  const hist = all.filter(r => r.finished).length;
  document.getElementById('live-count').textContent = live || '';
  document.getElementById('history-count').textContent = hist || '';
}

// ═══════════════════════════════════════
// §16 COURSE SEARCH & DATABASE
// ═══════════════════════════════════════
let searchTimeout = null;
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('course-search');
  const results = document.getElementById('course-results');

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.classList.add('hidden'); return; }
    searchTimeout = setTimeout(() => searchCourses(q), 150);
  });
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) searchCourses(input.value.trim().toLowerCase());
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.course-search-wrap')) results.classList.add('hidden');
  });
});

// §16.1 Saved Courses
function getSavedCourses() {
  return JSON.parse(localStorage.getItem('golfCourses') || '[]');
}

function saveCourse() {
  const name = document.getElementById('course-name').value?.trim();
  if (!name) { alert('Enter a course name first.'); return; }
  const course = {
    name, city: '', state: 'Custom', saved: true,
    pars: [...state.pars],
    hdcps: [...state.hdcps],
    tees: []
  };
  const courses = getSavedCourses();
  const existing = courses.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing >= 0) {
    courses[existing] = course;
  } else {
    courses.push(course);
  }
  localStorage.setItem('golfCourses', JSON.stringify(courses));
  alert(`✅ "${name}" saved! It will appear in search next time.`);
}

function deleteSavedCourse(name) {
  const courses = getSavedCourses().filter(c => c.name !== name);
  localStorage.setItem('golfCourses', JSON.stringify(courses));
  // Re-trigger search if open
  const input = document.getElementById('course-search');
  if (input.value.trim().length >= 2) searchCourses(input.value.trim().toLowerCase());
}

function searchCourses(query) {
  const results = document.getElementById('course-results');
  const saved = getSavedCourses();
  const all = [...saved, ...COURSE_DB];
  const matches = all.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.city.toLowerCase().includes(query) ||
    c.state.toLowerCase().includes(query)
  ).slice(0, 10);

  if (!matches.length) {
    results.innerHTML = '<div class="course-item loading">No courses found. Enter manually below.</div>';
    results.classList.remove('hidden');
    return;
  }
  window._courseResults = matches;
  const totalPar = c => c.pars.slice(0, state.holeCount).reduce((a,b) => a+b, 0);
  results.innerHTML = matches.map((c, i) => {
    const isSaved = c.saved;
    const loc = c.city ? `📍 ${c.city}, ${c.state}` : '📍 Custom';
    const teeInfo = c.tees?.length ? ` · ${c.tees.length} tees` : '';
    return `<div class="course-item" onclick="selectCourse(${i})">
      <div class="course-item-name">${isSaved ? '⭐ ' : ''}${c.name}</div>
      <div class="course-item-loc">${loc} · Par ${totalPar(c)}${teeInfo}${isSaved ? ' <button class="course-del-btn" onclick="event.stopPropagation();deleteSavedCourse(\''+c.name.replace(/'/g,"\\'")+'\')">🗑️</button>' : ''}</div>
    </div>`;
  }).join('');
  results.classList.remove('hidden');
}

function selectCourse(idx) {
  const c = window._courseResults[idx];
  if (!c) return;
  window._selectedCourse = c;

  document.getElementById('course-name').value = c.name;
  document.getElementById('course-search').value = '';
  document.getElementById('course-results').classList.add('hidden');

  const totalPar = c.pars.reduce((a,b) => a+b, 0);
  const sel = document.getElementById('selected-course');
  sel.classList.remove('hidden');
  sel.innerHTML = `<div class="selected-course-info">
    <div class="selected-course-name">✅ ${c.name}</div>
    <div class="selected-course-loc">📍 ${c.city}, ${c.state} · Par ${totalPar}</div>
  </div>
  <div class="tee-selector">
    <label>Select Tees</label>
    <div class="tee-options" id="tee-options">
      ${c.tees.map((t, ti) => `
        <div class="tee-option ${ti === 0 ? 'active' : ''}" onclick="selectTee(${ti})" data-tee="${ti}">
          <div class="tee-color-bar" style="background:${teeColor(t.name)}"></div>
          <div class="tee-details">
            <div class="tee-name">${t.name}</div>
            <div class="tee-stats">${t.yds.toLocaleString()} yds · ${t.rating}/${t.slope}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  <button class="btn small secondary" onclick="clearCourse()" style="margin-top:8px;width:100%">✕ Clear Selection</button>
  <div class="verify-note">⚠️ Verify yardage & ratings against your scorecard. Pars & handicaps are editable below.</div>`;

  // Load default (first) tee
  state.pars = [...c.pars];
  state.hdcps = [...c.hdcps];
  buildParGrid();
}

function teeColor(name) {
  const n = name.toLowerCase();
  if (n.includes('black') || n.includes('championship')) return '#1a1a2e';
  if (n.includes('blue')) return '#1565c0';
  if (n.includes('white')) return '#bdbdbd';
  if (n.includes('gold') || n.includes('yellow')) return '#f9a825';
  if (n.includes('green')) return '#2e7d32';
  if (n.includes('red')) return '#c62828';
  return '#78909c';
}

function selectTee(teeIdx) {
  const c = window._selectedCourse;
  if (!c) return;
  document.querySelectorAll('.tee-option').forEach((el, i) => {
    el.classList.toggle('active', i === teeIdx);
  });
  // Pars and hdcps are the same for all tees on a course — tees differ by yardage/rating/slope
  // The playing handicap adjusts via course rating/slope
  state.pars = [...c.pars];
  state.hdcps = [...c.hdcps];
  buildParGrid();
}

function clearCourse() {
  document.getElementById('selected-course').classList.add('hidden');
  document.getElementById('course-name').value = '';
  state.pars = [...STANDARD_PARS];
  state.hdcps = [...STANDARD_HDCP];
  buildParGrid();
}
