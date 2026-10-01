// src/holidays.js
// Nager.Date API를 활용한 공휴일 자동 동기화 모듈 (키 불필요, CORS 허용)

const FALLBACK_2026 = [
  { date: "2026-01-01", name: "신정" },
  { date: "2026-02-16", name: "설날 연휴" },
  { date: "2026-02-17", name: "설날" },
  { date: "2026-02-18", name: "설날 연휴" },
  { date: "2026-03-02", name: "삼일절 대체공휴일" },
  { date: "2026-05-01", name: "근로자의 날" },
  { date: "2026-05-05", name: "어린이날" },
  { date: "2026-05-25", name: "부처님오신날 대체공휴일" },
  { date: "2026-06-03", name: "지방선거일" },
  { date: "2026-06-06", name: "현충일" },
  { date: "2026-07-17", name: "제헌절" },
  { date: "2026-08-17", name: "광복절 대체공휴일" },
  { date: "2026-09-24", name: "추석 연휴" },
  { date: "2026-09-25", name: "추석" },
  { date: "2026-09-26", name: "추석 연휴" },
  { date: "2026-10-03", name: "개천절" },
  { date: "2026-10-05", name: "개천절 대체공휴일" },
  { date: "2026-10-09", name: "한글날" },
  { date: "2026-12-25", name: "성탄절" }
];

// 메모리 캐시
const memoryCache = {
  holidays: new Set(FALLBACK_2026.map(h => h.date)),
  holidayNames: FALLBACK_2026.reduce((acc, h) => {
    acc[h.date] = h.name;
    return acc;
  }, {})
};

const CACHE_PREFIX = "zal_holidays_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일

// 초기화: localStorage에 저장된 캐시가 있다면 즉시 메모리에 병합
function loadInitialCache() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.items)) {
            parsed.items.forEach(item => {
              memoryCache.holidays.add(item.date);
              if (item.name) memoryCache.holidayNames[item.date] = item.name;
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("[holidays] Failed to load local cache:", e);
  }
}

loadInitialCache();

/**
 * 특정 연도의 공휴일을 비동기로 불러와 캐시 및 메모리에 반영
 */
export async function fetchHolidays(year = new Date().getFullYear()) {
  const cacheKey = `${CACHE_PREFIX}${year}`;

  // 1. 브라우저 localStorage 캐시 확인
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp, items } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL && Array.isArray(items)) {
          applyToMemory(items);
          return {
            holidays: Array.from(memoryCache.holidays),
            holidayNames: { ...memoryCache.holidayNames }
          };
        }
      }
    } catch {
      // 캐시 파싱 에러 무시
    }
  }

  // 2. 오픈 API (Nager.Date) 호출 - 키 불필요
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    const items = data.map(item => ({
      date: item.date,
      name: item.localName || item.name
    }));

    // 캐시 저장
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          items
        }));
      } catch (e) {
        console.warn("[holidays] Failed to save localStorage:", e);
      }
    }

    applyToMemory(items);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zal-holidays-updated", { detail: { year } }));
    }

    return {
      holidays: Array.from(memoryCache.holidays),
      holidayNames: { ...memoryCache.holidayNames }
    };
  } catch (err) {
    console.warn(`[holidays] Failed to fetch holidays for ${year}, using fallback:`, err);
    return {
      holidays: Array.from(memoryCache.holidays),
      holidayNames: { ...memoryCache.holidayNames }
    };
  }
}

function applyToMemory(items) {
  items.forEach(item => {
    memoryCache.holidays.add(item.date);
    if (item.name) {
      memoryCache.holidayNames[item.date] = item.name;
    }
  });
}

/**
 * 동기 함수들: 컴포넌트 렌더링이나 validate 등에서 즉시 사용
 */
export function isHoliday(dateStr) {
  return memoryCache.holidays.has(dateStr);
}

export function getHolidayName(dateStr) {
  return memoryCache.holidayNames[dateStr] || null;
}

export function getAllHolidays() {
  return Array.from(memoryCache.holidays);
}

export function getHolidayNamesMap() {
  return { ...memoryCache.holidayNames };
}

/**
 * 특정 연월의 주말 및 공휴일을 제외한 실제 근무일 수 계산
 * @param {number|string} yearOrMonthStr - 연도 숫자 또는 "2026.10" 형태의 문자열
 * @param {number} [month] - 월 (1~12, yearOrMonthStr이 연도 숫자일 때 필수)
 */
export function getMonthWeekdays(yearOrMonthStr, month) {
  let y, m;
  if (typeof yearOrMonthStr === "string" && yearOrMonthStr.includes(".")) {
    const parts = yearOrMonthStr.split(".").map(Number);
    y = parts[0];
    m = parts[1];
  } else {
    y = Number(yearOrMonthStr);
    m = Number(month);
  }

  if (!y || !m || isNaN(y) || isNaN(m)) return 0;

  const date = new Date(y, m - 1, 1);
  let count = 0;
  while (date.getMonth() === m - 1) {
    const day = date.getDay();
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    // 주말(토:6, 일:0) 아니고 공휴일 목록에 없으면 근무일
    if (day !== 0 && day !== 6 && !memoryCache.holidays.has(dateStr)) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count;
}

/**
 * 특정 연월에 속한 평일 공휴일 목록 반환
 */
export function getMonthHolidays(year, month) {
  const y = Number(year);
  const m = Number(month);
  return Array.from(memoryCache.holidays).filter(h => {
    const p = h.split("-");
    if (parseInt(p[0]) !== y || parseInt(p[1]) !== m) return false;
    const d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    const day = d.getDay();
    return day !== 0 && day !== 6;
  }).sort();
}
