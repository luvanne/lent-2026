import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  increment, 
  getDoc 
} from 'firebase/firestore';

// ==============================================================================
// [배포 전용 최종 수정 버전 - Vercel Functions 프록시 적용] 
// Gemini API 호출은 /api/gemini로 전송 (키는 서버에만 보관)
// ==============================================================================

// 1. Firebase 설정값
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBzBMFGGSMbbKJHE1KypFtnCjv7ea4m0eA",
  authDomain: "lent-2026.firebaseapp.com",
  projectId: "lent-2026",
  storageBucket: "lent-2026.firebasestorage.app",
  messagingSenderId: "299793602291",
  appId: "1:299793602291:web:27c7c3d0c5cac505260986",
  measurementId: "G-4SCP59GKZ7"
};

// --- 환경 설정 ---
const firebaseConfig = YOUR_FIREBASE_CONFIG;
const appId = 'lent-2026-flight-v1'; 

// Firebase 초기화
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase 초기화 에러:", e);
}

// --- 아이콘 컴포넌트 ---
const Icons = {
  Plane: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  ),
  PlaneTakeoff: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 22h20"></path>
      <path d="M6.3 12.3l11-8a1 1 0 0 1 1.4 1.4l-8 11-2.4 1.2a1 1 0 0 1-1.3-1.3l1.2-2.4Z"></path>
      <path d="M5.2 6.2 11 12"></path>
    </svg>
  ),
  Passport: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <path d="M12 4v16"></path>
      <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"></path>
    </svg>
  ),
  Stamp: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <path d="M8 11l3 3 5-5"></path>
    </svg>
  ),
  Ticket: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2"></rect>
      <path d="M6 12h.01M18 12h.01"></path>
      <path d="M10 6v12"></path>
    </svg>
  ),
  Headset: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11v3a8 8 0 0 0 16 0v-3"></path>
      <path d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4"></path>
      <line x1="12" y1="6" x2="12" y2="6.01"></line>
      <path d="M12 6a5.5 5.5 0 0 0 0 11"></path>
    </svg>
  ),
  Printer: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
  ),
  X: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Lock: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
  AlertCircle: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  ),
  Loader2: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}>
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
  ),
  Globe: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  ),
  Users: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  Cloud: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5C17.4 7 14.6 5 11.5 5 8.7 5 6.4 6.7 5.4 9.1 3 9.6 1 11.6 1 14.2c0 2.7 2.2 4.8 4.8 4.8h11.7"></path>
    </svg>
  ),
  Info: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  ),
  Wifi: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </svg>
  ),
  KoreaEmblem: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      <path d="M12 3C14 5 15 5.5 16 5C17.5 4 19 5 19 6.5C19 7.5 18.5 8.5 19.5 9.5C21 11 21 13 19.5 14.5C18.5 15.5 19 16.5 19 17.5C19 19 17.5 20 16 19C15 18.5 14 19 12 21C10 19 9 18.5 8 19C6.5 20 5 19 5 17.5C5 16.5 5.5 15.5 4.5 14.5C3 13 3 11 4.5 9.5C5.5 8.5 5 7.5 5 6.5C5 5 6.5 4 8 5C9 5.5 10 5 12 3Z" opacity="0.6"/>
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill="currentColor" fillOpacity="0.2"/>
      <path d="M12 8c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z" clipRule="evenodd" />
      <path d="M12 8c0 0 2 0 2 2s-2 2-2 2-2-2-2-2 2-2 2-2z" fill="currentColor"/>
    </svg>
  ),
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchGemini = async (prompt, systemPrompt = "") => {
  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "API request failed");
      return data.text || "";
    } catch (err) {
      if (i === 4) throw err;
      await wait(delay);
      delay *= 2;
    }
  }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [completedDays, setCompletedDays] = useState({});
  const [revealedDays, setRevealedDays] = useState({});
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [alertMessage, setAlertMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  
  const [globalStats, setGlobalStats] = useState({ totalPilgrims: 0, todayStickers: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [result, setResult] = useState(null); 
  const [question, setQuestion] = useState("");

  const calendarData = [
    { date: "2/22", text: "준비 주일", verse: "", type: "sun", fullVerse: "사순절 여정을 시작하며 마음을 준비하는 주일입니다. 2026년 사순절, 예수님과 함께 걷기를 시작해볼까요?" },
    { date: "2/23", text: "예수님은 몸과 마음이 자라나셨어요", verse: "눅 2:52", type: "normal", fullVerse: "예수는 지혜와 키가 자라가며 하나님과 사람에게 더욱 사랑스러워 가시더라 (누가복음 2:52)" },
    { date: "2/24", text: "예수님은 사랑을 받으셨어요", verse: "눅 2:52", type: "normal", fullVerse: "예수는 지혜와 키가 자라가며 하나님과 사람에게 더욱 사랑스러워 가시더라 (누가복음 2:52)" },
    { date: "2/25", text: "예수님은 기도로 대화하셨어요", verse: "막 1:35", type: "normal", fullVerse: "새벽 아직도 밝기 전에 예수께서 일어나 나가 한적한 곳으로 가사 거기서 기도하시더니 (마가복음 1:35)" },
    { date: "2/26", text: "예수님은 유혹을 이기셨어요", verse: "히 4:15", type: "normal", fullVerse: "우리에게 있는 대제사장은 우리의 연약함을 동정하지 못하실 이가 아니요 모든 일에 우리와 똑같이 시험을 받으신 이로되 죄는 없으시니라 (히브리서 4:15)" },
    { date: "2/27", text: "예수님은 말씀을 소중히 여겼어요", verse: "마 4:4", type: "normal", fullVerse: "예수께서 대답하여 이르시되 기록되었으되 사람이 떡으로만 살 것이 아니요 하나님의 입으로부터 나오는 모든 말씀으로 살 것이라 하였느니라 하시니 (마태복음 4:4)" },
    { date: "2/28", text: "예수님은 거룩한 아들이세요", verse: "막 1:24", type: "normal", fullVerse: "나사렛 예수여 우리가 당신과 무슨 상관이 있나이까 우리를 멸하러 왔나이까 나는 당신이 누구인 줄 아노니 하나님의 거룩한 자니이다 (마가복음 1:24)" },
    { date: "3/1", text: "예수님은 죄가 없으신 분", verse: "히 7:26", type: "sun", fullVerse: "이러한 대제사장은 우리에게 합당하니 거룩하고 악이 없고 더러움이 없고 죄인에게서 떠나 계시고 하늘보다 높이 되신 이 라 (히브리서 7:26)" },
    { date: "3/2", text: "예수님은 진짜만 말씀하세요", verse: "요 14:6", type: "normal", fullVerse: "예수께서 이르시되 내가 곧 길이요 진리요 생명이니 나로 말미암지 않고는 아버지께로 올 자가 없느니라 (요한복음 14:6)" },
    { date: "3/3", text: "예수님은 마음을 밝혀 주세요", verse: "요 8:12", type: "normal", fullVerse: "예수께서 또 말씀하여 이르시되 나는 세상의 빛이니 나를 따르는 자는 어둠에 다니지 아니하고 생명의 빛을 얻으리라 (요한복음 8:12)" },
    { date: "3/4", text: "예수님은 우리를 지켜주세요", verse: "요 10:11", type: "normal", fullVerse: "나는 선한 목자라 선한 목자는 양들을 위하여 목숨을 버리거니와 (요한복음 10:11)" },
    { date: "3/5", text: "예수님은 특별하게 가르치셨어요", verse: "마 7:29", type: "normal", fullVerse: "이는 그 가르치시는 것이 권위 있는 자와 같고 그들의 서기관들과 같지 아니함일러라 (마태복음 7:29)" },
    { date: "3/6", text: "예수님은 하늘땅의 왕이세요", verse: "마 28:18", type: "normal", fullVerse: "예수께서 나아와 말씀하여 이르시되 하늘과 땅의 모든 권세를 내게 주셨으니 (마태복음 28:18)" },
    { date: "3/7", text: "예수님은 끝까지 사랑하세요", verse: "요 13:1", type: "normal", fullVerse: "유월절 전에 예수께서 자기가 세상을 떠나 아버지께로 돌아가실 때가 이른 줄 아시고 세상에 있는 자기 사람들을 사랑하시되 끝까지 사랑하시니라 (요한복음 13:1)" },
    { date: "3/8", text: "예수님은 아픔을 슬퍼하셨어요", verse: "마 14:14", type: "sun", fullVerse: "예수께서 나오사 큰 무리를 보시고 불쌍히 여기사 그 중에 있는 병자를 고쳐 주시니라 (마태복음 14:14)" },
    { date: "3/9", text: "예수님은 마음이 겸손하세요", verse: "마 11:29", type: "normal", fullVerse: "나는 마음이 온유하고 겸손하니 나의 멍에를 메고 내게 배우라 그리하면 너희 마음이 쉼을 얻으리니 (마태복음 11:29)" },
    { date: "3/10", text: "예수님은 겸손한 왕이세요", verse: "마 21:5", type: "normal", fullVerse: "시온 딸에게 이르기를 네 왕이 네게 임하나니 그는 겸손하여 나귀, 곧 멍에 메는 짐승의 새끼를 탔도다 하라 하였느니라 (마태복음 21:5)" },
    { date: "3/11", text: "예수님은 마음 중심을 보세요", verse: "마 9:13", type: "normal", fullVerse: "너희는 가서 내가 긍휼을 원하고 제사를 원하지 아니하노라 하신 뜻이 무엇인지 배우라 나는 의인을 부르러 온 것이 아니요 죄인을 부르러 왔노라 하시니라 (마태복음 9:13)" },
    { date: "3/12", text: "예수님은 억울해도 참으셨어요", verse: "벧전 2:23", type: "normal", fullVerse: "욕을 당하시되 맞대어 욕하지 아니하시고 고난을 당하시되 위협하지 아니하시고 오직 공의로 심판하시는 이에게 부탁하시는 이 라 (베드로전서 2:23)" },
    { date: "3/13", text: "예수님은 진실을 말씀하셨어요", verse: "요 8:45", type: "normal", fullVerse: "내가 진리를 말하므로 너희가 나를 믿지 아니하는도다 (요한복음 8:45)" },
    { date: "3/14", text: "예수님은 발을 씻겨 주셨어요", verse: "요 13:4-5", type: "normal", fullVerse: "저녁 잡수시던 자리에서 일어나 겉옷을 벗고 수건을 가져다가 허리에 두르시고 이에 대야에 물을 떠서 제자들의 발을 씻으시고 그 두르신 수건으로 닦기를 시작하여 (요한복음 13:4-5)" },
    { date: "3/15", text: "예수님은 생명을 주셨어요", verse: "요 15:13", type: "sun", fullVerse: "사람이 친구를 위하여 자기 목숨을 버리면 이보다 더 큰 사랑이 없나니 (요한복음 15:13)" },
    { date: "3/16", text: "예수님은 참된 쉼을 주세요", verse: "마 11:28", type: "normal", fullVerse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라 (마태복음 11:28)" },
    { date: "3/17", text: "예수님은 정의를 기뻐하세요", verse: "마 12:18", type: "normal", fullVerse: "보라 내가 택한 종 곧 내 마음에 기뻐하는 바 내가 사랑하는 자로다 내가 내 영을 그에게 줄 터이니 그가 심판을 이방에 알게 하리라 (마태복음 12:18)" },
    { date: "3/18", text: "예수님은 우리를 찾아오셨어요", verse: "눅 19:10", type: "normal", fullVerse: "인자가 온 것은 잃어버린 자를 찾아 구원하려 함이니라 (누가복음 19:10)" },
    { date: "3/19", text: "예수님은 함께 울어주세요", verse: "요 11:35", type: "normal", fullVerse: "예수께서 눈물을 흘리시더라 (요한복음 11:35)" },
    { date: "3/20", text: "예수님은 내 이름을 부르세요", verse: "눅 19:5", type: "normal", fullVerse: "예수께서 그 곳에 이르사 쳐다 보시고 이르시되 삭개오야 속히 내려오라 내가 오늘 네 집에 유하여야 하겠다 하시니 (누가복음 19:5)" },
    { date: "3/21", text: "예수님은 내 생각도 다 아세요", verse: "마 12:25", type: "normal", fullVerse: "예수께서 그들의 생각을 아시고 이르시되 스스로 분쟁하는 나라마다 황폐하여질 것이요 스스로 분쟁하는 동네나 집마다 서지 못하리라 (마태복음 12:25)" },
    { date: "3/22", text: "예수님은 멈추지 않으셨어요", verse: "눅 9:51", type: "sun", fullVerse: "예수께서 승천하실 기약이 차가매 예루살렘을 향하여 올라가기로 굳게 결심하시고 (누가복음 9:51)" },
    { date: "3/23", text: "예수님은 겉과 속이 같으세요", verse: "마 23:27", type: "normal", fullVerse: "화 있을진저 외식하는 서기관들과 바리새인들이여 회칠한 무덤 같으니 겉으로는 아름답게 보이나 그 안에는 죽은 사람의 뼈와 모든 더러운 것이 가득하도다 (마태복음 23:27)" },
    { date: "3/24", text: "예수님은 생명을 주세요", verse: "요 11:25", type: "normal", fullVerse: "예수께서 이르시되 나는 부활이요 생명이니 나를 믿는 자는 죽어도 살겠고 (요한복음 11:25)" },
    { date: "3/25", text: "예수님은 풍성함을 주세요", verse: "요 10:10", type: "normal", fullVerse: "도둑이 오는 것은 도둑질하고 죽이고 멸망시키려는 것뿐이요 내가 온 것은 양으로 생명을 얻게 하고 더 풍성히 얻게 하려는 것이라 (요한복음 10:10)" },
    { date: "3/26", text: "예수님은 아픈 곳을 고쳐주셨어요", verse: "막 5:34", type: "normal", fullVerse: "예수께서 이르시되 딸아 네 믿음이 너를 구원하였으니 평안히 가라 네 병에서 놓여 건강할지어다 (마가복음 5:34)" },
    { date: "3/27", text: "예수님은 하나 되게 하셨어요", verse: "엡 2:14", type: "normal", fullVerse: "그는 우리의 화평이신지라 둘로 하나를 만드사 원수 된 것 곧 중간에 막힌 담을 자기 육체로 허시고 (에베소서 2:14)" },
    { date: "3/28", text: "예수님은 끝까지 순종하셨어요", verse: "빌 2:8", type: "normal", fullVerse: "사람의 모양으로 나타나사 자기를 낮추시고 죽기까지 복종하셨으니 곧 십자가에 죽으심이라 (빌립보서 2:8)" },
    { date: "3/29", text: "예수님은 왕으로 오셨어요", verse: "마 21:9", type: "holy", fullVerse: "앞에서 가고 뒤에서 따르는 무리가 소리 높여 이르되 호산나 다윗의 자손이여 찬송하리로다 주의 이름으로 오시는 이여 가장 높은 곳에서 호산나 하더라 (마태복음 21:9)" },
    { date: "3/30", text: "예수님은 성전을 바꾸셨어요", verse: "막 11:17", type: "holy", fullVerse: "이에 가르쳐 이르시되 기록된 바 내 집은 만민이 기도하는 집이라 칭함을 받으리라고 하지 아니하였느냐 너희는 강도의 소굴을 만들었도다 하시매 (마가복음 11:17)" },
    { date: "3/31", text: "예수님은 사랑을 가르치셨어요", verse: "마 22:37", type: "holy", fullVerse: "예수께서 이르시되 네 마음을 다하고 목숨을 다하고 뜻을 다하여 주 너의 하나님을 사랑하라 하셨으니 (마태복음 22:37)" },
    { date: "4/1", text: "예수님은 죽음을 준비하셨어요", verse: "막 14:8", type: "holy", fullVerse: "그는 힘을 다하여 내 몸에 향유를 부어 내 장례를 미리 준비하였느니라 (마가복음 14:8)" },
    { date: "4/2", text: "예수님은 몸과 피를 주셨어요", verse: "눅 22:19", type: "holy", fullVerse: "또 떡을 가져 감사 기도 하시고 떼어 그들에게 주시며 이르시되 이것은 너희를 위하여 주는 내 몸이라 너희가 이를 행하여 나를 기념하라 하시고 (누가복음 22:19)" },
    { date: "4/3", text: "예수님은 구원을 다 이루셨어요", verse: "요 19:30", type: "holy", fullVerse: "예수께서 신 포도주를 받으신 후에 이르시되 다 이루었다 하시고 머리를 숙이니 영혼이 떠나가시니라 (요한복음 19:30)" },
    { date: "4/4", text: "예수님은 부활을 기다리셨어요", verse: "마 27:60", type: "holy", fullVerse: "바위 속에 판 자기 새 무덤에 넣어 두고 큰 돌을 굴려 무덤 문에 놓고 가니 (마태복음 27:60)" },
  ];

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) { console.error("인증 오류:", err); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && db) {
        try {
          const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'community', 'totals');
          const userInitRef = doc(db, 'artifacts', appId, 'users', u.uid, 'settings', 'initial');
          const snap = await getDoc(userInitRef);
          if (!snap.exists()) {
            await setDoc(userInitRef, { joined: true, timestamp: new Date() });
            await setDoc(statsRef, { totalPilgrims: increment(1) }, { merge: true });
          }
        } catch (err) { console.error("초기화 오류:", err); }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const progressRef = doc(db, 'artifacts', appId, 'users', user.uid, 'progress', 'current');
    const unsubPrivate = onSnapshot(progressRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setRevealedDays(d.revealedDays || {});
        setCompletedDays(d.completedDays || {});
      }
    }, (err) => console.error("데이터 동기화 오류:", err));

    const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'community', 'totals');
    const unsubPublic = onSnapshot(statsRef, (snap) => {
      if (snap.exists()) setGlobalStats(snap.data());
    }, (err) => console.error("통계 동기화 오류:", err));

    return () => { unsubPrivate(); unsubPublic(); };
  }, [user]);

  const saveToCloud = async (newRev, newComp, isNewComplete) => {
    if (!user || !db) return;
    setSyncing(true);
    try {
      const progressRef = doc(db, 'artifacts', appId, 'users', user.uid, 'progress', 'current');
      await setDoc(progressRef, {
        revealedDays: newRev,
        completedDays: newComp,
        updatedAt: new Date()
      }, { merge: true });

      if (isNewComplete) {
        const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'community', 'totals');
        await setDoc(statsRef, { todayStickers: increment(1) }, { merge: true });
      }
    } catch (err) { console.error(err); } 
    finally { setTimeout(() => setSyncing(false), 500); }
  };

  const handleDayClick = (index) => {
    if (index > 0 && !completedDays[index - 1]) {
      setAlertMessage(`[탑승 불가] ${calendarData[index-1].date}의 여정을 먼저 마쳐주세요!`);
      setTimeout(() => setAlertMessage(""), 3000);
      return;
    }

    let nRev = { ...revealedDays };
    let nComp = { ...completedDays };
    let isNew = false;

    if (!revealedDays[index]) {
      nRev[index] = true;
      setRevealedDays(nRev);
    } else {
      isNew = !completedDays[index];
      nComp[index] = isNew;
      setCompletedDays(nComp);
    }
    saveToCloud(nRev, nComp, isNew);
  };

  const openVersePopup = (e, item) => {
    e.stopPropagation();
    setSelectedVerse(item);
  };

  const generatePrayer = async (item) => {
    setLoadingText("기내 방송실에서 기도문을 작성 중입니다...");
    setLoading(true);
    setResult(null);
    try {
      const sys = "당신은 따뜻하고 친절한 주일학교 선생님이자 비행기 기장입니다. 어린이 눈높이로 자연스럽고 부드럽게 4~6문장으로 기도문을 써주세요. 중간에 위로의 한 문장을 포함하고, 마지막은 '예수님 이름으로 기도합니다, 아멘.'으로 마쳐주세요.";
      const res = await fetchGemini(`주제: ${item.text}, 구절: ${item.fullVerse}`, sys);
      setResult({ type: 'prayer', content: res || "예수님 사랑해요!", title: '✈️ 오늘의 기내 기도' });
    } catch (err) { 
        console.error(err);
        setAlertMessage(`AI 오류: ${err.message}`); 
    } finally { setLoading(false); }
  };

  const askQuestion = async (item) => {
    if (!question.trim()) return;
    setLoadingText("관제탑(AI)에 질문을 전송하고 있습니다...");
    setLoading(true);
    try {
      const sys = "당신은 지혜로운 주일학교 선생님입니다. 성경 말씀에 충실하게, 어린이에게 이야기하듯 4~6문장으로 자연스럽게 설명해주세요. 너무 짧게 끝내지 말고, 예시나 비유를 1개 넣어주세요. 마지막에 아이를 격려하는 한 문장을 덧붙여 주세요.";
      const res = await fetchGemini(`질문: ${question} (묵상 주제: ${item.text})`, sys);
      setResult({ type: 'qa', content: res || "조금 더 고민하고 알려줄게요!", title: '💁‍♀️ 안내 데스크 답변' });
      setQuestion("");
    } catch (err) { 
        console.error(err);
        setAlertMessage(`AI 오류: ${err.message}`); 
    } finally { setLoading(false); }
  };

  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / calendarData.length) * 100);

  return (
    <div className="min-h-screen bg-sky-50 font-sans p-4 md:p-8 pb-32 overflow-x-hidden text-slate-800 selection:bg-sky-200">
      {alertMessage && (
        <div className="fixed top-6 md:top-10 left-1/2 -translate-x-1/2 z-[200] bg-orange-600 text-white px-4 md:px-6 py-3 rounded-md shadow-2xl flex items-center gap-3 font-bold animate-in fade-in slide-in-from-top-4 duration-300 text-sm md:text-base w-[90%] md:w-auto border-2 border-orange-400">
          <Icons.AlertCircle size={20} className="shrink-0" /> {String(alertMessage)}
        </div>
      )}

      {/* 이하 UI 코드 동일 */}
    </div>
  );
};

export default App;
