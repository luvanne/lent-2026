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
// - Gemini 호출: /api/gemini
// - 보라색 테마 + 귀여운 폰트
// - 쿨다운 타이머
// - 전체 리셋 버튼
// - "오늘의 기도" -> "아멘" 버튼 누르면 스티커 찍힘
// - AI 사용 제한: 질문 3회, 오늘의 기도 1회 (매일 리셋)
// - 하루 새 여권 3개까지만 열림
// ==============================================================================

// 1. Firebase 설정값
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBzBMFGGSMbbKJHE1KypFtnCjv7ea4m0eA",
  authDomain: "lent-2026.firebaseapp.com",
  projectId: "lent-2026",
  storageBucket: "lent-2026.firebaseapp.com",
  messagingSenderId: "299793602291",
  appId: "1:299793602291:web:27c7c3d0c5cac505260986",
  measurementId: "G-4SCP59GKZ7"
};

// --- 환경 설정 ---
const firebaseConfig = YOUR_FIREBASE_CONFIG;
const appId = 'lent-2026-flight-v1'; 

const getTodayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

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
  const [pendingCompleteIndex, setPendingCompleteIndex] = useState(null);

  const [globalStats, setGlobalStats] = useState({ totalPilgrims: 0, todayStickers: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [result, setResult] = useState(null); 
  const [question, setQuestion] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [aiCounts, setAiCounts] = useState({ prayer: 0, question: 0, lastResetDate: getTodayKey() });
  const maxPrayer = 1;
  const maxQuestion = 3;
  const remainingPrayer = Math.max(0, maxPrayer - aiCounts.prayer);
  const remainingQuestion = Math.max(0, maxQuestion - aiCounts.question);

  const [revealCounts, setRevealCounts] = useState({ count: 0, lastResetDate: getTodayKey() });
  const maxDailyReveals = 3;

  const calendarData = [
    { date: "2/22", text: "예수님은 우리를 부르시는 분이십니다.", verse: "마 4:19", type: "sun", fullVerse: "나를 따라오라 내가 너희를 사람을 낚는 어부가 되게 하리라" },
    { date: "2/23", text: "예수님은 쉬게 하시는 분이십니다.", verse: "마 11:28", type: "normal", fullVerse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라" },
    { date: "2/24", text: "예수님은 두려워하지 말라 하시는 분이십니다.", verse: "마 14:27", type: "normal", fullVerse: "안심하라 내니 두려워하지 말라" },
    { date: "2/25", text: "예수님은 어린이를 환영하시는 분이십니다.", verse: "막 10:14", type: "normal", fullVerse: "어린 아이들이 내게 오는 것을 용납하고 금하지 말라" },
    { date: "2/26", text: "예수님은 사랑하라 말씀하시는 분이십니다.", verse: "요 13:34", type: "normal", fullVerse: "서로 사랑하라 내가 너희를 사랑한 것 같이 너희도 서로 사랑하라" },
    { date: "2/27", text: "예수님은 생명의 떡이십니다.", verse: "요 6:35", type: "normal", fullVerse: "나는 생명의 떡이니 내게 오는 자는 결코 주리지 아니할 터이요" },
    { date: "2/28", text: "예수님은 세상의 빛이십니다.", verse: "요 8:12", type: "normal", fullVerse: "나는 세상의 빛이니 나를 따르는 자는 생명의 빛을 얻으리라" },
    { date: "3/1", text: "예수님은 양의 문이십니다.", verse: "요 10:7", type: "sun", fullVerse: "내가 진실로 진실로 너희에게 말하노니 내가 곧 양의 문이라" },
    { date: "3/2", text: "예수님은 선한 목자이십니다.", verse: "요 10:11", type: "normal", fullVerse: "나는 선한 목자라 선한 목자는 양들을 위하여 목숨을 버리거니와" },
    { date: "3/3", text: "예수님은 부활이요 생명이십니다.", verse: "요 11:25", type: "normal", fullVerse: "나는 부활이요 생명이니 나를 믿는 자는 죽어도 살겠고" },
    { date: "3/4", text: "예수님은 길이요 진리요 생명이십니다.", verse: "요 14:6", type: "normal", fullVerse: "내가 곧 길이요 진리요 생명이니 나로 말미암지 않고는 아버지께로 올 자가 없느니라" },
    { date: "3/5", text: "예수님은 참 포도나무이십니다.", verse: "요 15:1", type: "normal", fullVerse: "나는 참 포도나무요 내 아버지는 농부라" },
    { date: "3/6", text: "예수님은 우리를 빛으로 부르시는 분이십니다.", verse: "마 5:14", type: "normal", fullVerse: "너희는 세상의 빛이라" },
    { date: "3/7", text: "예수님은 용서하라 하시는 분이십니다.", verse: "마 18:22", type: "normal", fullVerse: "일곱 번뿐 아니라 일흔 번씩 일곱 번이라도 할지니라" },
    { date: "3/8", text: "예수님은 아픈 사람을 도우러 오신 분이십니다.", verse: "막 2:17", type: "sun", fullVerse: "내가 의인을 부르러 온 것이 아니요 죄인을 부르러 왔노라" },
    { date: "3/9", text: "예수님은 섬김이 크다 하시는 분이십니다.", verse: "마 23:11", type: "normal", fullVerse: "너희 중에 큰 자는 너희를 섬기는 자가 되어야 하리라" },
    { date: "3/10", text: "예수님은 작은 사람을 소중히 여기시는 분이십니다.", verse: "마 18:10", type: "normal", fullVerse: "이 작은 자 중의 하나라도 업신여기지 말라" },
    { date: "3/11", text: "예수님은 잃은 자를 찾으시는 분이십니다.", verse: "눅 19:10", type: "normal", fullVerse: "인자가 온 것은 잃어버린 자를 찾아 구원하려 함이니라" },
    { date: "3/12", text: "예수님은 함께 우시는 분이십니다.", verse: "요 11:35", type: "normal", fullVerse: "예수께서 눈물을 흘리시더라" },
    { date: "3/13", text: "예수님은 마음 아파하시는 분이십니다.", verse: "마 14:14", type: "normal", fullVerse: "무리를 보시고 불쌍히 여기시니라" },
    { date: "3/14", text: "예수님은 온유하고 겸손하신 분이십니다.", verse: "마 11:29", type: "normal", fullVerse: "나는 마음이 온유하고 겸손하니" },
    { date: "3/15", text: "예수님은 평안을 주시는 분이십니다.", verse: "요 20:19", type: "sun", fullVerse: "너희에게 평강이 있을지어다" },
    { date: "3/16", text: "예수님은 우리와 함께하시는 분이십니다.", verse: "마 28:20", type: "normal", fullVerse: "내가 세상 끝날까지 너희와 항상 함께 있으리라" },
    { date: "3/17", text: "예수님은 우리에게 질문하시는 분이십니다.", verse: "마 16:15", type: "normal", fullVerse: "너희는 나를 누구라 하느냐" },
    { date: "3/18", text: "예수님은 그리스도이십니다.", verse: "마 16:16", type: "normal", fullVerse: "주는 그리스도시요 살아 계신 하나님의 아들이시니이다" },
    { date: "3/19", text: "예수님은 기다리라 하시는 분이십니다.", verse: "행 1:4", type: "normal", fullVerse: "아버지께서 약속하신 것을 기다리라" },
    { date: "3/20", text: "예수님은 성령을 주시는 분이십니다.", verse: "요 20:22", type: "normal", fullVerse: "성령을 받으라" },
    { date: "3/21", text: "예수님은 모든 권세를 가지신 분이십니다.", verse: "마 28:18", type: "normal", fullVerse: "하늘과 땅의 모든 권세를 내게 주셨으니" },
    { date: "3/22", text: "예수님은 생명을 주시는 분이십니다.", verse: "요 10:10", type: "sun", fullVerse: "내가 온 것은 양으로 생명을 얻게 하고 더 풍성히 얻게 하려는 것이라" },
    { date: "3/23", text: "예수님은 우리의 왕이십니다.", verse: "요 18:37", type: "normal", fullVerse: "내가 왕인 것을 네 말이 옳도다" },
    { date: "3/24", text: "예수님은 우리를 보내시는 분이십니다.", verse: "마 28:19", type: "normal", fullVerse: "너희는 가서 모든 민족을 제자로 삼으라" },
    { date: "3/25", text: "예수님은 우리를 도우시는 분이십니다.", verse: "히 4:16", type: "normal", fullVerse: "은혜의 보좌 앞에 담대히 나아갈 것이니라" },
    { date: "3/26", text: "예수님은 다시 오실 분이십니다.", verse: "요 14:3", type: "normal", fullVerse: "다시 와서 너희를 내게로 영접하여" },
    { date: "3/27", text: "예수님은 겸손한 왕이십니다.", verse: "마 21:5", type: "holy", fullVerse: "보라 네 왕이 네게 임하시나니 그는 겸손하여 나귀를 타시나니" },
    { date: "3/28", text: "예수님은 하나님 집을 소중히 여기시는 분이십니다.", verse: "마 21:13", type: "holy", fullVerse: "내 집은 기도하는 집이라 일컬음을 받을 것이라" },
    { date: "3/29", text: "예수님은 가장 큰 사랑을 가르치시는 분이십니다.", verse: "마 22:37-39", type: "holy", fullVerse: "네 마음을 다하고 목숨을 다하고 뜻을 다하여 주 너의 하나님을 사랑하라" },
    { date: "3/30", text: "예수님은 섬기러 오신 분이십니다.", verse: "막 10:45", type: "holy", fullVerse: "섬기려 하고 자기 목숨을 많은 사람의 대속물로 주려 함이니라" },
    { date: "3/31", text: "예수님은 끝까지 사랑하시는 분이십니다.", verse: "요 13:1", type: "holy", fullVerse: "자기 사람들을 사랑하시되 끝까지 사랑하시니라" },
    { date: "4/1", text: "예수님은 우리를 용서하시는 분이십니다.", verse: "눅 23:34", type: "holy", fullVerse: "아버지여 저들을 사하여 주옵소서" },
    { date: "4/2", text: "예수님은 다시 살아나신 분이십니다.", verse: "마 28:6", type: "holy", fullVerse: "그가 여기 계시지 않고 살아나셨느니라" }
  ];

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

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

        const today = getTodayKey();

        const incoming = d.aiCounts || {};
        let nextCounts = {
          prayer: incoming.prayer || 0,
          question: incoming.question || 0,
          lastResetDate: incoming.lastResetDate || today
        };
        if (nextCounts.lastResetDate !== today) {
          nextCounts = { prayer: 0, question: 0, lastResetDate: today };
          setAiCounts(nextCounts);
          saveAiCounts(nextCounts);
        } else {
          setAiCounts(nextCounts);
        }

        const incomingReveal = d.revealCounts || {};
        let nextReveal = {
          count: incomingReveal.count || 0,
          lastResetDate: incomingReveal.lastResetDate || today
        };
        if (nextReveal.lastResetDate !== today) {
          nextReveal = { count: 0, lastResetDate: today };
          setRevealCounts(nextReveal);
          saveRevealCounts(nextReveal);
        } else {
          setRevealCounts(nextReveal);
        }
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

  const saveAiCounts = async (newCounts) => {
    if (!user || !db) return;
    try {
      const progressRef = doc(db, 'artifacts', appId, 'users', user.uid, 'progress', 'current');
      await setDoc(progressRef, {
        aiCounts: newCounts,
        updatedAt: new Date()
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const saveRevealCounts = async (newCounts) => {
    if (!user || !db) return;
    try {
      const progressRef = doc(db, 'artifacts', appId, 'users', user.uid, 'progress', 'current');
      await setDoc(progressRef, {
        revealCounts: newCounts,
        updatedAt: new Date()
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const ensureDailyReset = async () => {
    const today = getTodayKey();
    if (aiCounts.lastResetDate !== today) {
      const reset = { prayer: 0, question: 0, lastResetDate: today };
      setAiCounts(reset);
      await saveAiCounts(reset);
      return reset;
    }
    return aiCounts;
  };

  const resetAllProgress = async () => {
    if (!window.confirm("전체 진행을 초기화할까요?")) return;
    const empty = {};
    const resetCounts = { prayer: 0, question: 0, lastResetDate: getTodayKey() };
    const resetReveal = { count: 0, lastResetDate: getTodayKey() };
    setRevealedDays(empty);
    setCompletedDays(empty);
    setSelectedVerse(null);
    setResult(null);
    setPendingCompleteIndex(null);
    setAiCounts(resetCounts);
    setRevealCounts(resetReveal);
    await saveToCloud(empty, empty, false);
    await saveAiCounts(resetCounts);
    await saveRevealCounts(resetReveal);
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
      const today = getTodayKey();
      let nextReveal = { ...revealCounts };

      if (nextReveal.lastResetDate !== today) {
        nextReveal = { count: 0, lastResetDate: today };
      }

      if (nextReveal.count >= maxDailyReveals) {
        setAlertMessage("하루에 3개까지만 열 수 있어요.");
        setTimeout(() => setAlertMessage(""), 3000);
        return;
      }

      nextReveal.count += 1;
      setRevealCounts(nextReveal);
      saveRevealCounts(nextReveal);

      nRev[index] = true;
      setRevealedDays(nRev);
    } else {
      isNew = !completedDays[index];
      nComp[index] = isNew;
      setCompletedDays(nComp);
    }
    saveToCloud(nRev, nComp, isNew);
  };

  const markCompleted = (index) => {
    if (index === null || index === undefined) return;

    if (index > 0 && !completedDays[index - 1]) {
      setAlertMessage(`[탑승 불가] ${calendarData[index-1].date}의 여정을 먼저 마쳐주세요!`);
      setTimeout(() => setAlertMessage(""), 3000);
      return;
    }

    if (completedDays[index]) return;

    const nRev = { ...revealedDays, [index]: true };
    const nComp = { ...completedDays, [index]: true };

    setRevealedDays(nRev);
    setCompletedDays(nComp);
    saveToCloud(nRev, nComp, true);
  };

  const openVersePopup = (e, item) => {
    e.stopPropagation();
    setSelectedVerse(item);
  };

  const handleAiError = (err) => {
    const msg = err?.message || String(err);
    const match = msg.match(/retry in ([\\d.]+)s/i);
    if (match) {
      const sec = Math.ceil(parseFloat(match[1]));
      if (!Number.isNaN(sec)) setCooldownSeconds(sec);
    }
    setAlertMessage(`AI 오류: ${msg}`);
    setTimeout(() => setAlertMessage(""), 4000);
  };

  const generatePrayer = async (item, index) => {
    const counts = await ensureDailyReset();
    if (counts.prayer >= maxPrayer) {
      setAlertMessage("오늘의 기도는 하루에 1번만 사용할 수 있어요.");
      setTimeout(() => setAlertMessage(""), 3000);
      return;
    }
    if (cooldownSeconds > 0) {
      setAlertMessage(`AI 대기 ${cooldownSeconds}초 후에 다시 시도해주세요.`);
      setTimeout(() => setAlertMessage(""), 2000);
      return;
    }
    setPendingCompleteIndex(index);
    setLoadingText("기내 방송실에서 작성 중입니다...");
    setLoading(true);
    setResult(null);
    try {
      const sys = "당신은 주일학교 선생님이자 비행기 기장입니다. 어린이의 눈높이에서 따뜻한 기도문을 3~5문장 이내로 써주세요. '사랑하는 예수님'으로 시작하고 마지막은 '예수님 이름으로 기도합니다. 아멘'으로 끝내주세요.";
      const res = await fetchGemini(`주제: ${item.text}, 구절: ${item.fullVerse}`, sys);
      const newCounts = { ...counts, prayer: counts.prayer + 1 };
      setAiCounts(newCounts);
      saveAiCounts(newCounts);
      setResult({ type: 'prayer', content: res || "예수님 사랑해요!", title: '✈️ 오늘의 기도' });
    } catch (err) { 
      console.error(err);
      handleAiError(err);
    } finally { setLoading(false); }
  };

  const askQuestion = async (item) => {
    if (!question.trim()) return;
    const counts = await ensureDailyReset();
    if (counts.question >= maxQuestion) {
      setAlertMessage("질문은 하루에 3번까지만 가능해요.");
      setTimeout(() => setAlertMessage(""), 3000);
      return;
    }
    if (cooldownSeconds > 0) {
      setAlertMessage(`AI 대기 ${cooldownSeconds}초 후에 다시 시도해주세요.`);
      setTimeout(() => setAlertMessage(""), 2000);
      return;
    }
    setLoadingText("관제탑(AI)에 질문을 전송하고 있습니다...");
    setLoading(true);
    try {
      const sys = "당신은 지혜로운 주일학교 선생님입니다. 성경 말씀에 충실하게, 어린이의 눈높이에서 친절하고 이해하기 쉽게 4문장 이내로 답해주세요.";
      const res = await fetchGemini(`질문: ${question} (묵상 주제: ${item.text})`, sys);
      const newCounts = { ...counts, question: counts.question + 1 };
      setAiCounts(newCounts);
      saveAiCounts(newCounts);
      setResult({ type: 'qa', content: res || "조금 더 고민하고 알려줄게요!", title: '💁‍♀️ 안내 데스크 답변' });
      setQuestion("");
    } catch (err) { 
      console.error(err);
      handleAiError(err);
    } finally { setLoading(false); }
  };

  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / calendarData.length) * 100);
  const aiLocked = loading || cooldownSeconds > 0;

  return (
    <div className="min-h-screen bg-purple-50 font-sans p-4 md:p-8 pb-32 overflow-x-hidden text-slate-800 selection:bg-purple-200">
      {alertMessage && (
        <div className="fixed top-6 md:top-10 left-1/2 -translate-x-1/2 z-[200] bg-purple-700 text-white px-4 md:px-6 py-3 rounded-md shadow-2xl flex items-center gap-3 font-bold animate-in fade-in slide-in-from-top-4 duration-300 text-sm md:text-base w-[90%] md:w-auto border-2 border-purple-400">
          <Icons.AlertCircle size={20} className="shrink-0" /> {String(alertMessage)}
        </div>
      )}

      <header className="max-w-6xl mx-auto text-center mb-6 md:mb-10 pt-2">
        <div className="inline-flex items-center justify-center gap-3 bg-purple-900 text-white px-6 py-2 rounded-full mb-4 shadow-lg">
          <Icons.PlaneTakeoff size={24} className="text-purple-200" />
          <span className="font-black tracking-widest uppercase">Flight 2026</span>
        </div>
        <h1 className="text-3xl md:text-6xl font-black text-purple-900 mb-3 md:mb-4 drop-shadow-sm tracking-tighter leading-tight">
          사순절 40일 묵상 비행 플랜
        </h1>
        <div className="flex items-center justify-center gap-2 mb-4 text-purple-700">
          <Icons.Passport size={20} />
          <p className="text-base md:text-2xl font-bold italic">
            "예수님은 어떤 분이실까?"
          </p>
        </div>

        <div className="text-xs md:text-sm font-bold text-purple-700 mb-6">
          안내: 오늘의 기도 1회, 질문 3회. 매일 자정 리셋 (남은 횟수: 기도 {remainingPrayer}회 / 질문 {remainingQuestion}회)
        </div>
        
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-xl inline-block w-full max-w-2xl border-b-8 border-purple-900 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 md:mb-4 px-2 md:px-4">
            <span className="text-purple-900 font-extrabold flex items-center gap-2 text-sm md:text-lg">
              <Icons.Plane size={20} className="text-purple-600 md:w-6 md:h-6" /> 비행 진행률
            </span>
            <span className="text-purple-900 font-black text-lg md:text-2xl font-mono">{progressPercent}%</span>
          </div>
          
          <div className="w-full bg-gray-200 h-4 md:h-6 rounded-full overflow-visible border-2 border-gray-300 relative mb-8 mt-4">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[2px] border-t-2 border-dashed border-gray-400/50"></div>
            </div>
            <div className="h-full bg-purple-500 rounded-l-full transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
              <div className="absolute -right-3 -top-3 md:-top-4 text-purple-700 drop-shadow-xl transform translate-x-1/2 z-10">
                <Icons.Plane size={36} className="text-purple-700 transform rotate-90 md:w-12 md:h-12" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 md:gap-2 text-gray-500 font-bold text-[10px] md:text-xs mb-1 uppercase">
                <Icons.Users size={12} /> 총 탑승객
              </div>
              <div className="text-lg md:text-xl font-black text-purple-900 font-mono">
                {Number(globalStats.totalPilgrims || 1).toLocaleString()}
              </div>
            </div>
            <div className="flex flex-col items-center border-l-2 border-dashed border-gray-300">
              <div className="flex items-center gap-1 md:gap-2 text-gray-500 font-bold text-[10px] md:text-xs mb-1 uppercase">
                <Icons.Stamp size={12} /> 금일 입국심사
              </div>
              <div className="text-lg md:text-xl font-black text-purple-900 font-mono">
                {Number(globalStats.todayStickers || 0).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="absolute top-2 right-4 flex items-center gap-1 text-[9px] font-bold text-green-600">
            {syncing ? <><Icons.Loader2 size={10} className="animate-spin" /> 저장 중...</> : <><Icons.Wifi size={10} /> Online</>}
          </div>

          {cooldownSeconds > 0 && (
            <div className="absolute top-2 left-4 text-[9px] font-bold text-purple-700">
              AI 대기 {cooldownSeconds}s
            </div>
          )}
        </div>
      </header>

      {/* Grid Layout */}
      <main className="max-w-7xl mx-auto px-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-6">
          {calendarData.map((item, index) => {
            const isRev = revealedDays[index];
            const isComp = completedDays[index];
            const isClickable = index === 0 || completedDays[index - 1];
            
            if (!isRev) {
              return (
                <div 
                  key={index}
                  onClick={() => handleDayClick(index)}
                  className={`
                    relative cursor-pointer transition-all duration-300 ease-out transform
                    ${!isClickable ? 'opacity-60 grayscale' : 'hover:-translate-y-1 hover:shadow-2xl active:scale-95'}
                    rounded-lg md:rounded-xl p-0 min-h-[160px] md:min-h-[220px] flex flex-col shadow-lg overflow-hidden
                    bg-[#2c1a4d] border-r-4 border-b-4 border-[#1c1033]
                  `}
                >
                  <div className="flex flex-col items-center justify-between h-full py-4 px-2 text-[#e3c4ff] text-center relative">
                    <div className="absolute top-2 right-2 bg-[#e3c4ff] text-[#2c1a4d] text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded">
                      {item.date}
                    </div>
                    <div className="mt-2">
                        <p className="text-[10px] md:text-xs font-serif font-bold tracking-widest">대한민국</p>
                        <p className="text-[6px] md:text-[8px] font-serif tracking-tighter opacity-80 mt-0.5">REPUBLIC OF KOREA</p>
                    </div>
                    <div className="my-2 opacity-90">
                        <Icons.KoreaEmblem size={48} className="md:w-[60px] md:h-[60px] text-[#e3c4ff]" />
                    </div>
                    <div className="mb-2">
                        <p className="text-[10px] md:text-xs font-serif font-bold tracking-widest">여권</p>
                        <p className="text-[6px] md:text-[8px] font-serif tracking-wider opacity-80 mt-0.5">PASSPORT</p>
                    </div>
                    {!isClickable && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Icons.Lock size={24} className="text-white/70" />
                        </div>
                    )}
                  </div>
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#140b24] opacity-50"></div>
                </div>
              );
            }

            return (
              <div 
                key={index}
                onClick={() => handleDayClick(index)}
                className={`
                  relative cursor-pointer transition-all duration-300 ease-out
                  rounded-xl md:rounded-2xl p-0 min-h-[160px] md:min-h-[220px] flex flex-col shadow-lg md:shadow-xl overflow-hidden
                  bg-[#fdfbf7] border border-gray-200
                `}
              >
                <div className={`
                    h-8 md:h-10 w-full flex items-center justify-between px-3 text-white font-bold text-xs md:text-sm uppercase tracking-widest border-b-2 border-dashed border-white/30
                    ${item.type === 'sun' ? 'bg-purple-500' : 
                      item.type === 'holy' ? 'bg-purple-800' : 
                      'bg-purple-700'}
                `}>
                    <span>VISA</span>
                    <span>{item.date}</span>
                </div>

                <div className="flex-grow p-3 md:p-4 flex flex-col items-center justify-between relative bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
                      <Icons.KoreaEmblem size={120} />
                  </div>
                  <div className="z-10 text-center w-full mt-1">
                        <p className="text-xs md:text-base font-black text-slate-800 break-keep leading-tight mb-3 font-serif">
                            {item.text}
                        </p>
                        <div className="w-full h-[1px] bg-gray-300 mb-3 border-t border-gray-200 border-dotted"></div>
                        <div className="flex flex-col gap-1.5 w-full">
                            {item.verse && (
                                <button 
                                onClick={(e) => openVersePopup(e, item)}
                                className="w-full bg-white/80 border border-purple-200 text-purple-900 text-[10px] md:text-xs py-1.5 rounded shadow-sm hover:bg-purple-50 font-bold flex items-center justify-center gap-1 backdrop-blur-sm"
                                >
                                <Icons.Ticket size={12} /> 탑승권({item.verse})
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); generatePrayer(item, index); }}
                                disabled={aiLocked}
                                className="w-full bg-purple-50/80 border border-purple-200 text-purple-900 text-[10px] md:text-xs py-1.5 rounded shadow-sm hover:bg-purple-100 font-bold flex items-center justify-center gap-1 backdrop-blur-sm disabled:opacity-60"
                            >
                                <Icons.Headset size={12} /> 오늘의 기도
                            </button>
                        </div>
                    </div>

                  {isComp && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] border-4 border-double border-purple-600/70 rounded-full px-2 py-2 text-purple-600/70 font-black text-xs md:text-sm uppercase tracking-widest z-20 pointer-events-none animate-in zoom-in duration-300 bg-white/10 backdrop-blur-[1px] w-20 h-20 flex items-center justify-center shadow-sm">
                        <div className="text-center leading-none">
                            DEPARTED<br/>
                            <span className="text-[8px]">{item.date}</span>
                        </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bible Modal */}
      {selectedVerse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#fdfbf7] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border-[10px] border-purple-900 relative">
            <div className="bg-purple-900 p-4 flex justify-between items-center text-white border-b-4 border-purple-300">
              <div className="flex items-center gap-3">
                <Icons.Ticket size={24} className="text-purple-300" />
                <div>
                    <h3 className="text-sm font-light text-purple-200 uppercase tracking-widest">Boarding Pass</h3>
                    <h2 className="text-xl font-black">오늘의 말씀</h2>
                </div>
              </div>
              <button onClick={() => setSelectedVerse(null)} className="p-1 hover:rotate-90 transition-transform"><Icons.X size={28} /></button>
            </div>

            <div className="p-6 md:p-10 text-center relative">
              <p className="text-lg md:text-2xl font-black text-slate-800 leading-snug mb-6 break-keep px-4 font-serif italic">
                "{String(selectedVerse.fullVerse).split(' (')[0]}"
              </p>
              <div className="inline-block px-6 py-2 bg-purple-100 text-purple-900 rounded-full font-black text-sm md:text-lg border border-purple-200 mb-8">
                GATE: {selectedVerse.verse}
              </div>
              
              <div className="mt-2 p-4 bg-gray-100 rounded-xl border border-gray-200 text-left">
                <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2 uppercase tracking-wide">
                  <Icons.Info size={14} /> Information Desk
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="말씀에 대해 궁금한 점을 물어보세요"
                    className="flex-grow p-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-purple-500"
                  />
                  <button 
                    onClick={() => askQuestion(selectedVerse)}
                    disabled={aiLocked}
                    className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold"
                  >
                    {loading ? <Icons.Loader2 className="animate-spin" size={20} /> : "전송"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-purple-600 font-bold">
                  남은 질문 횟수: {remainingQuestion}회
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border-8 border-purple-900 transform animate-in zoom-in duration-300">
            <div className="bg-purple-900 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-300 animate-pulse"></div>
                <h3 className="text-lg font-bold tracking-widest uppercase">{String(result.title)}</h3>
              </div>
              <button onClick={() => { setResult(null); setPendingCompleteIndex(null); }} className="text-purple-200 hover:text-white"><Icons.X size={24} /></button>
            </div>
            <div className="p-8 bg-purple-50 text-center">
              <div className="bg-white p-6 rounded-xl border border-purple-100 shadow-sm mb-6 max-h-[300px] overflow-y-auto">
                <p className="text-base md:text-xl font-medium text-slate-700 leading-relaxed break-keep whitespace-pre-wrap font-serif">
                  {String(result.content)}
                </p>
              </div>
              <button 
                onClick={() => {
                  if (result.type === 'prayer') {
                    markCompleted(pendingCompleteIndex);
                    setPendingCompleteIndex(null);
                  }
                  setResult(null);
                }}
                className="w-full bg-purple-600 text-white py-4 rounded-xl text-lg font-black shadow-lg hover:bg-purple-700 transition-all active:scale-95"
              >
                {result.type === 'prayer' ? "아멘" : "확인 완료"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {loading && !result && (
        <div className="fixed inset-0 z-[200] bg-purple-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <div className="relative">
            <div className="absolute inset-0 border-4 border-dashed border-white/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                <Icons.Loader2 size={40} className="text-purple-500 animate-spin" />
            </div>
          </div>
          <p className="mt-8 text-xl font-black text-white drop-shadow-md text-center">
            {String(loadingText)}
          </p>
        </div>
      )}

      {/* Intro Overlay */}
      {showIntro && (
        <div className="fixed inset-0 z-[110] bg-purple-900/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="bg-purple-600 p-8 text-center text-white relative overflow-hidden">
                <Icons.PlaneTakeoff size={48} className="mx-auto mb-4 relative z-10" />
                <h2 className="text-2xl font-black relative z-10">환영합니다, 승객 여러분!</h2>
            </div>
            <div className="p-8 pt-2 bg-white text-center">
              <p className="text-gray-600 mb-6 font-bold leading-relaxed">
                예수님과 함께하는 <span className="text-purple-600">40일간의 말씀 여행</span>을<br/>시작할 준비가 되셨나요?
              </p>
              <button 
                onClick={() => setShowIntro(false)}
                className="w-full bg-purple-900 text-white py-4 rounded-xl text-xl font-black shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Icons.Ticket size={24} /> 탑승 수속 완료
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-gray-200 p-2 flex items-center justify-between px-6 z-50 no-print">
        <button onClick={() => window.print()} className="flex flex-col items-center text-gray-500 hover:text-purple-600">
          <Icons.Printer size={18} />
          <span className="text-[9px] font-bold mt-0.5">티켓 출력</span>
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
             <Icons.Stamp size={14} className="text-purple-500" />
             <span className="text-lg font-black text-purple-900">{completedCount}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase">Stamps Collected</span>
        </div>

        <button onClick={resetAllProgress} className="flex flex-col items-center text-gray-500 hover:text-purple-600">
          <Icons.Info size={18} />
          <span className="text-[9px] font-bold mt-0.5">전체 리셋</span>
        </button>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap');
        body { font-family: 'Gaegu', sans-serif; -webkit-tap-highlight-color: transparent; }
        .break-keep { word-break: keep-all; }
        @media print {
          .fixed, footer, .no-print, .absolute { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .grid { grid-template-cols: repeat(4, 1fr) !important; gap: 10px !important; }
        }
      `}} />
    </div>
  );
};

export default App;
