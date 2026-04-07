// firebase-sync.js — Firebase Auth + Firestore sync for Greenside
let currentUser = null;

// ── Auth ──
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => {
    console.error('Sign-in error:', e);
    alert('Sign-in failed. You can still use the app locally.');
  });
}

function signOutUser() {
  auth.signOut();
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  const signedOut = document.getElementById('auth-signed-out');
  const signedIn = document.getElementById('auth-signed-in');
  if (user) {
    signedOut.classList.add('hidden');
    signedIn.classList.remove('hidden');
    document.getElementById('auth-avatar').src = user.photoURL || '';
    document.getElementById('auth-name').textContent = user.displayName || user.email;
    // Sync from Firestore on sign-in
    syncFromFirestore();
    requestNotificationPermission();
  } else {
    signedOut.classList.remove('hidden');
    signedIn.classList.add('hidden');
  }
});

// ── Firestore Sync ──
function userDoc() {
  if (!currentUser) return null;
  return db.collection('users').doc(currentUser.uid);
}

// Sync player profiles to/from Firestore
async function syncProfilesToFirestore() {
  const doc = userDoc();
  if (!doc) return;
  const profiles = getSavedProfiles();
  await doc.set({ profiles }, { merge: true });
}

async function syncCoursesToFirestore() {
  const doc = userDoc();
  if (!doc) return;
  const courses = getSavedCourses();
  await doc.set({ courses }, { merge: true });
}

async function syncRoundsToFirestore() {
  const doc = userDoc();
  if (!doc) return;
  const rounds = JSON.parse(localStorage.getItem('golfRounds') || '{}');
  await doc.set({ rounds }, { merge: true });
}

async function syncFromFirestore() {
  const doc = userDoc();
  if (!doc) return;
  try {
    const snap = await doc.get();
    if (!snap.exists) {
      // First time — push local data up
      safeFirebaseSync(syncProfilesToFirestore);
      safeFirebaseSync(syncCoursesToFirestore);
      safeFirebaseSync(syncRoundsToFirestore);
      return;
    }
    const data = snap.data();

    // Merge profiles: Firestore wins for conflicts, keep unique locals
    if (data.profiles) {
      const local = getSavedProfiles();
      const merged = [...data.profiles];
      local.forEach(lp => {
        if (!merged.find(fp => fp.name.toLowerCase() === lp.name.toLowerCase())) {
          merged.push(lp);
        }
      });
      localStorage.setItem('golfProfiles', JSON.stringify(merged));
    }

    // Merge courses
    if (data.courses) {
      const local = getSavedCourses();
      const merged = [...data.courses];
      local.forEach(lc => {
        if (!merged.find(fc => fc.name.toLowerCase() === lc.name.toLowerCase())) {
          merged.push(lc);
        }
      });
      localStorage.setItem('golfCourses', JSON.stringify(merged));
    }

    // Merge rounds: keep all unique by ID
    if (data.rounds) {
      const local = JSON.parse(localStorage.getItem('golfRounds') || '{}');
      const merged = { ...data.rounds, ...local }; // local wins for same ID
      localStorage.setItem('golfRounds', JSON.stringify(merged));
    }

    // Re-render
    if (typeof renderPlayers === 'function') renderPlayers();
    if (typeof updateNavCounts === 'function') updateNavCounts();
    if (typeof renderResumeCard === 'function') renderResumeCard();

    console.log('✅ Synced from Firestore');
  } catch (e) {
    console.error('Firestore sync error:', e);
  }
}

// Auto-sync after key actions — wrap existing save functions
// All Firebase calls are wrapped in try/catch to prevent app crashes when offline

function safeFirebaseSync(fn) {
  try { if (typeof db !== 'undefined' && currentUser) fn(); } catch(e) { console.warn('Firebase sync skipped:', e.message); }
}

if (typeof saveProfiles === 'function') {
  const _base = saveProfiles;
  window.saveProfiles = function() {
    _base();
    safeFirebaseSync(syncProfilesToFirestore);
  };
}

// Patch saveCurrentRound — single consolidated patch for Firestore + live sync
const _patchSaveRound = setInterval(() => {
  if (typeof saveCurrentRound === 'function' && !saveCurrentRound._patched) {
    const _base = saveCurrentRound;
    window.saveCurrentRound = function() {
      _base();
      safeFirebaseSync(() => {
        if (state.liveId) {
          db.collection('liveRounds').doc(state.liveId).update({
            scores: state.scores, wolfHoles: state.wolfHoles || {},
            bonusPoints: state.bonusPoints || {}, matchPresses: state.matchPresses || [],
            currentHole: state.currentHole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(() => {});
        }
        clearTimeout(window._roundSyncTimer);
        window._roundSyncTimer = setTimeout(() => safeFirebaseSync(syncRoundsToFirestore), 3000);
      });
    };
    window.saveCurrentRound._patched = true;
    clearInterval(_patchSaveRound);
  }
}, 100);

// Patch saveCourse
const _patchSaveCourse = setInterval(() => {
  if (typeof saveCourse === 'function' && !saveCourse._patched) {
    const _base = saveCourse;
    window.saveCourse = function() {
      _base();
      safeFirebaseSync(syncCoursesToFirestore);
    };
    window.saveCourse._patched = true;
    clearInterval(_patchSaveCourse);
  }
}, 100);

// Patch saveEditedProfiles
const _patchSaveEdited = setInterval(() => {
  if (typeof saveEditedProfiles === 'function' && !saveEditedProfiles._patched) {
    const _base = saveEditedProfiles;
    window.saveEditedProfiles = function() {
      _base();
      safeFirebaseSync(syncProfilesToFirestore);
    };
    window.saveEditedProfiles._patched = true;
    clearInterval(_patchSaveEdited);
  }
}, 100);

// Patch addNewProfile
const _patchAddNew = setInterval(() => {
  if (typeof addNewProfile === 'function' && !addNewProfile._patched) {
    const _base = addNewProfile;
    window.addNewProfile = function() {
      _base();
      safeFirebaseSync(syncProfilesToFirestore);
    };
    window.addNewProfile._patched = true;
    clearInterval(_patchAddNew);
  }
}, 100);

// Patch deleteProfile
const _patchDeleteProfile = setInterval(() => {
  if (typeof deleteProfile === 'function' && !deleteProfile._patched) {
    const _base = deleteProfile;
    window.deleteProfile = function(idx) {
      _base(idx);
      safeFirebaseSync(syncProfilesToFirestore);
    };
    window.deleteProfile._patched = true;
    clearInterval(_patchDeleteProfile);
  }
}, 100);

// Sync finished rounds immediately
const _patchFinish = setInterval(() => {
  if (typeof saveFinishedRound === 'function' && !saveFinishedRound._patched) {
    const _base = saveFinishedRound;
    window.saveFinishedRound = function(money, debts) {
      _base(money, debts);
      safeFirebaseSync(syncRoundsToFirestore);
    };
    window.saveFinishedRound._patched = true;
    clearInterval(_patchFinish);
  }
}, 100);

// ── Live Group Scoring ──
let liveUnsubscribe = null;

function shareRoundLive() {
  if (!currentUser || !state.roundId) { alert('Sign in and start a round first.'); return; }
  const liveId = state.roundId.replace('round_', '');
  const liveRef = db.collection('liveRounds').doc(liveId);

  // Push current state
  liveRef.set({
    course: state.course, gameType: state.gameType, gameOpts: state.gameOpts,
    players: state.players, pars: state.pars, hdcps: state.hdcps,
    scores: state.scores, wolfHoles: state.wolfHoles || {},
    bonusPoints: state.bonusPoints || {}, matchPresses: state.matchPresses || [],
    holeCount: state.holeCount, handicapMode: state.handicapMode,
    currentHole: state.currentHole, owner: currentUser.uid,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Show share code
  const code = liveId.slice(-6).toUpperCase();
  state.liveCode = code;
  state.liveId = liveId;
  alert('📡 Live round shared!\n\nShare code: ' + code + '\n\nOthers can join with this code to see live scores.');
  renderHole(); // re-render to show live indicator
}

function joinLiveRound() {
  if (!currentUser) { alert('Sign in first to join a live round.'); return; }
  const code = prompt('Enter 6-character share code:');
  if (!code || code.length < 4) return;

  // Find the live round by searching recent docs
  db.collection('liveRounds').where('updatedAt', '>', new Date(Date.now() - 86400000))
    .get().then(snap => {
      let found = null;
      snap.forEach(doc => {
        if (doc.id.slice(-6).toUpperCase() === code.toUpperCase()) found = doc;
      });
      if (!found) { alert('Round not found. Check the code and try again.'); return; }

      const data = found.data();
      state.liveId = found.id;
      state.liveCode = code.toUpperCase();

      // Load the round state
      state.course = data.course; state.gameType = data.gameType;
      state.gameOpts = data.gameOpts; state.players = data.players;
      state.pars = data.pars; state.hdcps = data.hdcps;
      state.scores = data.scores; state.wolfHoles = data.wolfHoles || {};
      state.bonusPoints = data.bonusPoints || {}; state.matchPresses = data.matchPresses || [];
      state.holeCount = data.holeCount || 18; state.handicapMode = data.handicapMode;
      state.currentHole = data.currentHole || 0; state.started = true;
      state.roundId = 'round_' + found.id;

      // Subscribe to live updates
      subscribeLiveUpdates(found.id);

      hideAllScreens();
      document.getElementById('scoring-screen').classList.remove('hidden');
      document.getElementById('home-btn').classList.remove('hidden');
      document.getElementById('nav-bar').classList.add('hidden');
      invalidateHdcpCache();
      invalidateMoneyCache();
      renderStrokeSummary();
      renderHole();
    }).catch(e => { console.error(e); alert('Error joining round.'); });
}

function subscribeLiveUpdates(liveId) {
  if (liveUnsubscribe) liveUnsubscribe();
  liveUnsubscribe = db.collection('liveRounds').doc(liveId).onSnapshot(snap => {
    if (!snap.exists) return;
    const data = snap.data();
    // Only update if we're not the one who just wrote
    if (data.owner === currentUser?.uid) return;
    state.scores = data.scores || {};
    state.wolfHoles = data.wolfHoles || {};
    state.bonusPoints = data.bonusPoints || {};
    state.matchPresses = data.matchPresses || [];
    state.currentHole = data.currentHole || 0;
    invalidateMoneyCache();
    renderHole();
  });
}

// (Live sync is handled in the consolidated saveCurrentRound patch above)

// ── Notifications ──
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'logo-192.png', badge: 'logo-64.png' });
  }
  // Also vibrate if available
  if (navigator.vibrate) navigator.vibrate(200);
}
