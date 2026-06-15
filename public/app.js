import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- Firebase init ----
// firebaseConfig is defined in firebase-config.js (loaded before this module)
const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

let order = [];
let idx = 0;
let stage = 1; // 1, 2, 3
const SESSION_SIZE = scenes.length;

const els = {
  card: document.getElementById('sceneCard'),
  controls: document.getElementById('controls'),
  roundCounter: document.getElementById('roundCounter'),
  step1: document.getElementById('step1'),
  step2: document.getElementById('step2'),
  step3: document.getElementById('step3'),
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speakKorean(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = 0.95;
  const btn = document.getElementById('speakBtn');
  if (btn) {
    btn.classList.add('speaking');
    utter.onend = () => btn.classList.remove('speaking');
    utter.onerror = () => btn.classList.remove('speaking');
  }
  window.speechSynthesis.speak(utter);
}

function updateSteps() {
  [els.step1, els.step2, els.step3].forEach((el, i) => {
    el.classList.remove('active', 'done');
    const n = i + 1;
    if (n < stage) el.classList.add('done');
    else if (n === stage) el.classList.add('active');
  });
}

function renderStage1(scene) {
  els.card.innerHTML = `
    <div class="emoji">${scene.emoji}</div>
    <div class="kr-text">${scene.kr}</div>
    <button class="speak-btn" id="speakBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      다시 듣기
    </button>
  `;
  document.getElementById('speakBtn').onclick = () => speakKorean(scene.kr);
  speakKorean(scene.kr);

  const prevDisabled = idx === 0 ? 'disabled' : '';
  els.controls.innerHTML = `
    <button class="btn secondary" id="prevSceneBtn" ${prevDisabled}>← 이전 상황</button>
    <button class="btn" id="nextBtn">핵심 단어 보기 →</button>
  `;
  document.getElementById('nextBtn').onclick = () => goToStage2(scene);
  document.getElementById('prevSceneBtn').onclick = () => {
    if (idx === 0) return;
    idx--;
    loadScene();
  };
}

function fallbackData(scene) {
  const keywords = scene.choices.slice(0, 4).map(c => ({ en: c, kr: '' }));
  return {
    keywords,
    sentences: [scene.sentence, scene.sentence, scene.sentence],
  };
}

function goToStage2(scene) {
  stage = 2;
  updateSteps();

  const data = precomputed[String(order[idx])] || fallbackData(scene);
  renderStage2(scene, data);
}

function renderStage2(scene, data) {
  const items = data.keywords.map(k => `
    <div class="keyword-chip">
      <span class="en">${k.en}</span>
      <span class="kr">${k.kr}</span>
    </div>
  `).join('');

  els.card.innerHTML = `
    <div class="stage-label">Step 2 · 이 장면에 필요한 핵심 단어</div>
    <div class="recap-kr">${scene.emoji} ${scene.kr}</div>
    <div class="keyword-list">${items}</div>
  `;

  els.controls.innerHTML = `
    <button class="btn secondary" id="backToStage1">← 상황 다시 보기</button>
    <button class="btn" id="toStage3">예문 3개 보기 →</button>
  `;
  document.getElementById('toStage3').onclick = () => goToStage3(scene, data);
  document.getElementById('backToStage1').onclick = () => {
    stage = 1;
    updateSteps();
    renderStage1(scene);
  };
}

function goToStage3(scene, data) {
  stage = 3;
  updateSteps();

  const cards = data.sentences.map((s, i) => `
    <div class="sentence-card">
      <span class="tag">예문 ${i + 1}</span><br>
      ${s}
    </div>
  `).join('');

  els.card.innerHTML = `
    <div class="stage-label">Step 3 · 이 장면을 영어로 말하는 3가지 방법</div>
    <div class="recap-kr">${scene.emoji} ${scene.kr}</div>
    <div class="sentence-list">${cards}</div>
  `;

  const isLast = idx >= order.length - 1;
  const nextLabel = isLast ? '결과 끝 · 다시 시작' : '다음 상황 →';

  els.controls.innerHTML = `
    <button class="btn secondary" id="backToStage2">← 단어 다시 보기</button>
    <button class="btn" id="nextSceneBtn">${nextLabel}</button>
  `;

  document.getElementById('backToStage2').onclick = () => {
    stage = 2;
    updateSteps();
    renderStage2(scene, data);
  };

  document.getElementById('nextSceneBtn').onclick = () => {
    if (isLast) {
      order = shuffle(scenes.map((_, i) => i)).slice(0, SESSION_SIZE);
      idx = 0;
    } else {
      idx++;
    }
    loadScene();
  };
}

function loadScene() {
  stage = 1;
  updateSteps();
  els.roundCounter.textContent = `${idx + 1} / ${order.length}`;
  const scene = scenes[order[idx]];
  renderStage1(scene);
}

// ---- Memo notepad — persisted in Firestore (per-user via anonymous auth) ----
const memoBox = document.getElementById('memoBox');
const memoStatus = document.getElementById('memoStatus');
let memoSaveTimer = null;
let memoDocRef = null;

function showMemoStatus(text) {
  memoStatus.textContent = text;
  memoStatus.classList.add('show');
  clearTimeout(memoStatus._hideTimer);
  memoStatus._hideTimer = setTimeout(() => memoStatus.classList.remove('show'), 1500);
}

function autoGrowMemo() {
  memoBox.style.height = 'auto';
  memoBox.style.height = memoBox.scrollHeight + 'px';
}

memoBox.addEventListener('input', () => {
  autoGrowMemo();
  clearTimeout(memoSaveTimer);
  showMemoStatus('저장 중…');
  memoSaveTimer = setTimeout(async () => {
    if (!memoDocRef) return; // not signed in yet
    try {
      await setDoc(memoDocRef, { text: memoBox.value, updatedAt: Date.now() });
      showMemoStatus('저장됨 ✓');
    } catch (err) {
      console.error('memo save failed', err);
      showMemoStatus('저장 실패');
    }
  }, 600);
});

async function loadMemo(uid) {
  memoDocRef = doc(db, 'memos', uid);
  try {
    const snap = await getDoc(memoDocRef);
    if (snap.exists() && typeof snap.data().text === 'string') {
      memoBox.value = snap.data().text;
      autoGrowMemo();
    }
  } catch (err) {
    console.error('memo load failed', err);
  }
}

// Sign in anonymously so each device/browser gets its own persistent memo.
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadMemo(user.uid);
  }
});
signInAnonymously(auth).catch((err) => {
  console.error('anonymous sign-in failed', err);
  showMemoStatus('로그인 실패 — 메모가 저장되지 않아요');
});

// init
order = shuffle(scenes.map((_, i) => i)).slice(0, SESSION_SIZE);
loadScene();
