# 장면 → 단어 → 문장 (First Word Builder)

한국어 상황 설명을 보고(① 상황), 필요한 핵심 단어를 익히고(② 핵심 단어),
영어로 표현할 수 있는 문장 3개를 확인하는(③ 예문) 영어 학습 앱입니다.

- **완전 무료** — Firebase Spark(무료) 요금제로 충분합니다. Cloud Functions, 결제, API 키가 필요 없습니다.
- 핵심 단어/예문은 **미리 생성되어** `precomputed.js`에 포함되어 있습니다 (1000개 시나리오 전체).
- 메모는 **Firebase Firestore**에 저장됩니다 (기기/브라우저별로 익명 로그인되어 영구 저장).

---

## 1. 사전 준비

- [Node.js](https://nodejs.org/) 20 이상 설치
- Firebase CLI 설치:
  ```bash
  npm install -g firebase-tools
  ```

---

## 2. Firebase 프로젝트 생성 (무료 Spark 요금제)

1. https://console.firebase.google.com 에서 새 프로젝트 생성 (요금제는 기본 Spark/무료 그대로 둡니다)
2. **Build > Authentication** 메뉴 → "시작하기" → **Sign-in method**에서 **Anonymous(익명)** 로그인 활성화
3. **Build > Firestore Database** 메뉴 → 데이터베이스 만들기 (프로덕션 모드, 원하는 리전 선택)
4. **프로젝트 설정(⚙) > 일반** 탭 → "내 앱"에서 웹 앱 추가(`</>` 아이콘) → 표시되는
   `firebaseConfig` 객체 값을 복사

5. `public/firebase-config.js` 파일을 열어 복사한 값으로 교체:
   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

6. `.firebaserc` 파일의 `YOUR_FIREBASE_PROJECT_ID`를 실제 프로젝트 ID로 교체

---

## 3. 로그인 & 프로젝트 연결

```bash
firebase login
firebase use --add
# 방금 만든 프로젝트 선택, alias는 "default"로
```

---

## 4. 배포

```bash
firebase deploy
```

배포가 끝나면 터미널에 표시되는 **Hosting URL**(예: `https://YOUR_PROJECT_ID.web.app`)로 접속하면 앱이 보입니다.

부분 배포만 하고 싶다면:

```bash
firebase deploy --only hosting     # 화면(정적 파일)만
firebase deploy --only firestore   # 보안 규칙만
```

---

## 5. GitHub에 올리기

```bash
git init
git add .
git commit -m "Initial commit: First Word Builder"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

> ℹ️ `firebase-config.js`의 값들은 공개되어도 괜찮은 클라이언트 설정값입니다
> (Firebase는 보안 규칙(`firestore.rules`)으로 접근을 제어합니다). API 키를 별도로 관리할 필요가 없습니다.

---

## 무료 한도 안에서 쓰는 법 (참고)

Spark(무료) 요금제 기준 Firestore 한도는 1일 약 **읽기 5만 회 / 쓰기 2만 회 / 저장 1GiB**입니다.
이 앱은 사용자 1명당 메모 문서 1개만 읽고/쓰므로, 혼자 쓰는 경우 한도에 거의 도달하지 않습니다.

---

## 폴더 구조

```
firebase-project/
├── public/                 # Firebase Hosting에 배포되는 정적 파일
│   ├── index.html
│   ├── style.css
│   ├── app.js               # 앱 로직 (Firebase Auth/Firestore 연동)
│   ├── firebase-config.js   # 본인 프로젝트의 Firebase 설정값
│   ├── scenes.js             # 1000개 학습 시나리오 데이터
│   └── precomputed.js        # 1000개 시나리오의 핵심 단어 4개 + 예문 3개 (미리 생성됨)
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── .firebaserc
```

---

## 동작 방식 요약

1. 사용자가 접속하면 익명 로그인되어 고유 `uid`가 발급됩니다.
2. 메모는 Firestore의 `memos/{uid}` 문서에 저장/로드됩니다 (본인만 읽기/쓰기 가능).
3. "핵심 단어 보기"를 누르면 `precomputed.js`에서 해당 시나리오의 핵심 단어 4개와
   예문 3개를 즉시 불러옵니다 (네트워크 호출 없음).
4. 예문 3개는 (1) 기본 문장, (2~3) 같은 문장을 다른 대화 도입구(Look, By the way,
   Excuse me, Sorry 등)로 시작한 자연스러운 변형으로 구성됩니다.
