// src/holidays.js
// Nager.Date API를 활용한 공휴일 자동 동기화 모듈 (키 불필요, CORS 허용)

const FIXED_HOLIDAY_ORIGINALS = {
  "3·1절": { m: 3, d: 1, name: "삼일절" },
  "삼일절": { m: 3, d: 1, name: "삼일절" },
  "어린이날": { m: 5, d: 5, name: "어린이날" },
  "현충일": { m: 6, d: 6, name: "현충일" },
  "제헌절": { m: 7, d: 17, name: "제헌절" },
  "광복절": { m: 8, d: 15, name: "광복절" },
  "개천절": { m: 10, d: 3, name: "개천절" },
  "한글날": { m: 10, d: 9, name: "한글날" },
  "크리스마스": { m: 12, d: 25, name: "성탄절" },
  "성탄절": { m: 12, d: 25, name: "성탄절" },
  "새해": { m: 1, d: 1, name: "신정" },
  "신정": { m: 1, d: 1, name: "신정" },
  "노동절": { m: 5, d: 1, name: "근로자의 날" },
  "근로자의 날": { m: 5, d: 1, name: "근로자의 날" }
};

/**
 * 공휴일 항목들을 분석하여 '대체공휴일' 및 표준 한국어 명칭으로 정규화
 */
export function normalizeHolidayItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const sorted = [...rawItems].sort((a, b) => a.date.localeCompare(b.date));

  // 설날 / 추석 그룹핑
  const groups = { 설날: [], 추석: [] };
  sorted.forEach(item => {
    const raw = (item.name || "").trim();
    if (raw.includes("설날")) groups.설날.push(item);
    else if (raw.includes("추석")) groups.추석.push(item);
  });

  const nameMap = {};
  ["설날", "추석"].forEach(key => {
    const list = groups[key];
    if (list && list.length >= 3) {
      list.forEach((item, idx) => {
        if (idx === 0) nameMap[item.date] = `${key} 연휴`;
        else if (idx === 1) nameMap[item.date] = key;
        else if (idx === 2) nameMap[item.date] = `${key} 연휴`;
        else nameMap[item.date] = `${key} 대체공휴일`;
      });
    }
  });

  sorted.forEach(item => {
    if (nameMap[item.date]) return;

    const raw = (item.name || "").trim();
    const [y, m, d] = item.date.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    // 이미 '대체공휴일'이 포함된 경우 유지
    if (raw.includes("대체")) {
      nameMap[item.date] = raw;
      return;
    }

    // 부처님오신날
    if (raw.includes("부처님")) {
      if (dayOfWeek === 1 && (item.date === "2026-05-25" || item.date === "2025-05-06")) {
        nameMap[item.date] = "부처님오신날 대체공휴일";
      } else {
        nameMap[item.date] = "부처님오신날";
      }
      return;
    }

    // 고정 국경일 체크 (삼일절, 어린이날, 광복절, 개천절, 한글날 등)
    let matched = false;
    for (const [key, info] of Object.entries(FIXED_HOLIDAY_ORIGINALS)) {
      if (raw.includes(key) || key.includes(raw)) {
        matched = true;
        if (m === info.m && d === info.d) {
          nameMap[item.date] = info.name;
        } else {
          // 본래 날짜와 다를 경우 대체공휴일로 표기 (예: 8월 17일 광복절 -> 광복절 대체공휴일)
          nameMap[item.date] = `${info.name} 대체공휴일`;
        }
        break;
      }
    }

    if (!matched) {
      nameMap[item.date] = raw;
    }
  });

  return sorted.map(item => ({
    date: item.date,
    name: nameMap[item.date] || item.name
  }));
}

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
  holidays: new Set(),
  holidayNames: {}
};

const CACHE_PREFIX = "zal_holidays_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일

function applyToMemory(items) {
  const normalized = normalizeHolidayItems(items);
  normalized.forEach(item => {
    memoryCache.holidays.add(item.date);
    if (item.name) {
      memoryCache.holidayNames[item.date] = item.name;
    }
  });
}

// 기본값 적용
applyToMemory(FALLBACK_2026);

// 초기화: localStorage에 저장된 캐시가 있다면 즉시 정규화하여 메모리에 병합
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
            applyToMemory(parsed.items);
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

    const rawItems = data.map(item => ({
      date: item.date,
      name: item.localName || item.name
    }));

    const items = normalizeHolidayItems(rawItems);

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
