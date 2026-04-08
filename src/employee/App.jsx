import { useState, useRef, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchCategories() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/allowed_categories?select=name&order=name`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    return data.map(d => d.name);
  } catch {
    return ["음식점","한식","중식","일식","양식","분식","카페","커피전문점","제과점","베이커리","편의점","슈퍼마켓","백화점","푸드코트"];
  }
}

function validate(d, allowed) {
  const issues = [];
  if (!d.time || !d.time.includes(":")) {
    issues.push("시간 정보를 확인할 수 없습니다.");
  } else {
    const [h, m] = d.time.split(":").map(Number);
    const tot = h * 60 + m;
    if (tot < 600 || tot > 840) issues.push("사용 가능 시간(10:00~14:00) 외 사용입니다.");
  }

  if (!d.date) {
    issues.push("날짜 정보를 확인할 수 없습니다.");
  } else {
    const dow = new Date(d.date).getDay();
    if (dow === 0 || dow === 6) issues.push("주말/공휴일 사용은 지원되지 않습니다.");
  }

  const catMatch = allowed.some(t => (d.category || "").split(/[\/,·\s]/).some(c => c.trim().includes(t) || t.includes(c.trim())));
  if (!catMatch) issues.push("지원 업종이 아닙니다. (업종: " + (d.category || "미확인") + ")");
  
  const cleanAmt = String(d.amount || "").replace(/[^\d]/g, "");
  if (!cleanAmt || parseInt(cleanAmt) <= 0) issues.push("금액 정보를 확인할 수 없습니다.");
  
  return issues;
}

const DEMO = [
  { id: 1, date: "2026-04-07", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인완료" },
  { id: 2, date: "2026-04-08", time: "13:00", amount: "10500", category: "일식", storeName: "스시로", status: "승인완료" },
];

const C = {
  bg: "#FFFBF0", // 채도가 낮고 더 밝은 크림색 배경
  card: "#FFFFFF",
  primary: "#000000",
  brand: "#FEC601", // 다음정보시스템즈 Golden Yellow
  brandLight: "#FFEAB2",
  text: "#1A1A1A",
  muted: "#666",
  border: "#F2E8CF",
};

const FOOD_EMOJIS = ["🍱", "🍜", "🍣", "🥗", "🍛", "🥘", "🍲", "🍔"];
const DAYS = ["월", "화", "수", "목", "금"];

function getWeekDates(year, month, week) {
  const dates = [];
  const firstDay = new Date(year, month - 1, 1);
  const day = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
  // 매월 1일이 속한 주의 '월요일'을 첫 번째 주로 기준 잡음
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() + diffToMonday);
  firstMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  
  for (let i = 0; i < 5; i++) {
    const d = new Date(firstMonday);
    d.setDate(firstMonday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// 해당 월의 주 수 계산
function getWeekCount(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0); // last day of the month
  const day = firstDay.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() + diffToMonday);
  
  let count = 0;
  let cur = new Date(firstMonday);
  while (cur <= lastDay) { 
    count++; 
    cur.setDate(cur.getDate() + 7); 
  }
  return count;
}

function Badge({ status }) {
  const map = {
    "승인대기": { bg: "#E8F0FD", color: "#3B6FD4", label: "승인 대기" },
    "승인완료": { bg: "#E2F5EC", color: "#1E8A4A", label: "승인 완료" },
    "예외요청": { bg: "#FEF3E2", color: "#B87020", label: "예외 요청" },
    "반려": { bg: "#FDECEA", color: "#C0392B", label: "반려" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
}

// 바텀시트 Date Picker
function BottomSheetPicker({ isOpen, onClose, year, month, week, onConfirm }) {
  const [tempY, setTempY] = useState(year);
  const [tempM, setTempM] = useState(month);
  const [tempW, setTempW] = useState(week);

  useEffect(() => {
    if (isOpen) { setTempY(year); setTempM(month); setTempW(week); }
  }, [isOpen, year, month, week]);

  const wCnt = getWeekCount(tempY, tempM);
  useEffect(() => { if (isOpen && tempW > wCnt) setTempW(1); }, [tempM, tempY, wCnt, tempW, isOpen]);

  if (!isOpen) return null;

  const Col = ({ options, selected, onSelect }) => (
    <div style={{ flex: 1, height: 180, overflowY: "auto", scrollBehavior: "smooth", display: "flex", flexDirection: "column", padding: "70px 0" }}>
      {options.map(opt => (
        <div key={opt.val} onClick={() => onSelect(opt.val)} style={{ minHeight: 40, lineHeight: "40px", textAlign: "center", fontSize: selected === opt.val ? 20 : 16, fontWeight: selected === opt.val ? 800 : 500, color: selected === opt.val ? "#111" : "#bbb", cursor: "pointer", transition: "0.2s" }}>
          {opt.label}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", animation: "fadeIn 0.2s" }} />
      <div style={{ position: "relative", background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "24px 24px 32px", animation: "slideUp 0.3s ease-out" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>날짜 선택</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#111", padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ position: "relative", display: "flex", gap: 16 }}>
          {/* 가운데 하이라이트 줄 */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 40, marginTop: -20, borderTop: "1px solid #eee", borderBottom: "1px solid #eee", pointerEvents: "none" }} />
          <Col options={[2024,2025,2026,2027].map(y => ({val:y, label:`${String(y).slice(2)}년`}))} selected={tempY} onSelect={setTempY} />
          <Col options={Array.from({length:12},(_,i)=>({val:i+1, label:`${i+1}월`}))} selected={tempM} onSelect={setTempM} />
          <Col options={Array.from({length:wCnt},(_,i)=>({val:i+1, label:`${i+1}주`}))} selected={tempW} onSelect={setTempW} />
        </div>

        <button onClick={() => { onConfirm(tempY, tempM, tempW); onClose(); }} style={{ width: "100%", padding: 18, background: "#0A84FF", color: "#fff", fontWeight: 600, fontSize: 16, border: "none", borderRadius: 12, cursor: "pointer", marginTop: 24 }}>
          확인
        </button>
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function App() {
  const [subs, setSubs] = useState(DEMO);
  const [step, setStep] = useState("home");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excType, setExcType] = useState("");
  const [excText, setExcText] = useState("");
  const [detail, setDetail] = useState(null);
  const [allowed, setAllowed] = useState([]);
  const [rawOcr, setRawOcr] = useState(""); // 디버깅용 원문 저장
  const [selYear, setSelYear] = useState(2026);
  const [selMonth, setSelMonth] = useState(4);
  const [selWeek, setSelWeek] = useState(2);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchCategories().then(setAllowed); }, []);

  const reset = () => { 
    setStep("home"); setFile(null); setPreview(null); setOcr(null); 
    setIssues([]); setExcType(""); setExcText(""); setRawOcr("");
  };

  // ✅ 파일 선택 즉시 OCR 자동 실행
  const handleFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target.result);
    r.readAsDataURL(f);

    // 즉시 OCR 시작
    setLoading(true);
    setStep("result");
    try {
      const b64 = await new Promise((res, rej) => {
        const rd = new FileReader();
        rd.onload = () => res(rd.result.split(",")[1]);
        rd.onerror = rej;
        rd.readAsDataURL(f);
      });
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 1000, messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: f.type === "image/png" ? "image/png" : "image/jpeg", data: b64 } },
          { type: "text", text: "이 이미지는 모바일 카드 앱의 결제 상세 내역 스크린샷입니다. 다음 정보를 정확히 찾아 JSON으로만 답변하세요:\n\n1. storeName: '가맹점명' 항목 옆의 이름\n2. date: '이용일시'에 적힌 날짜 (YYYY-MM-DD 형식으로 변환)\n3. time: '이용일시'에 적힌 시간 (HH:MM 형식)\n4. amount: '합계' 또는 '이용금액' (숫자만 추출)\n5. category: '업종' 항목 옆의 텍스트\n\n결과는 반드시 { \"storeName\": \"...\", \"date\": \"...\", \"time\": \"...\", \"amount\": \"...\", \"category\": \"...\" } 형식의 JSON이어야 하며, 다른 설명은 절대 하지 마세요." }
        ]}] })
      });
      const data = await resp.json();
      const txt = data.content?.find(c => c.type === "text")?.text || "{}";
      setRawOcr(txt); // 원문 저장
      const cleaned = txt.replace(/```json|```/g, "").trim();
      let parsed = JSON.parse(cleaned);

      // AI가 다른 키 이름을 사용할 경우를 대비한 매핑
      const result = {
        storeName: parsed.storeName || parsed.store || parsed.merchant || "",
        date: parsed.date || parsed.usageDate || "",
        time: parsed.time || parsed.usageTime || "",
        amount: parsed.amount || parsed.totalAmount || parsed.total || "",
        category: parsed.category || parsed.businessType || ""
      };

      // 데이터 정제
      if (result.amount) result.amount = String(result.amount).replace(/[^\d]/g, "");
      if (result.date) {
        result.date = result.date.replace(/\./g, "-");
        if (result.date.startsWith("26")) result.date = "20" + result.date; // 26.04.02 처리
      }
      
      setOcr(result); 
      setIssues(validate(result, allowed));
    } catch (err) {
      console.error("OCR Error:", err);
      const mock = { date: new Date().toISOString().slice(0,10), time: "12:30", amount: "9800", category: "한식", storeName: "인식 실패 (이미지 재촬영 필요)" };
      setOcr(mock); setIssues(validate(mock, allowed));
    }
    setLoading(false);
  };

  // ✅ 제출 시 규정 합치이면 홈으로 돌아가며 아이콘 자동 변경
  const submit = (isException = false) => {
    setSubs(p => [{ id: Date.now(), date: ocr.date, time: ocr.time, amount: ocr.amount, category: ocr.category, storeName: ocr.storeName || ocr.category, status: isException ? "예외요청" : "승인대기" }, ...p]);
    setStep("done");
  };

  const approvedTotal = subs.filter(s => s.status === "승인완료").reduce((a, s) => a + parseInt(s.amount || 0), 0);
  const weekDates = getWeekDates(selYear, selMonth, selWeek);
  const weekCount = getWeekCount(selYear, selMonth);

  // ✅ 익월 22일 입금 예정
  const payMonth = selMonth === 12 ? 1 : selMonth + 1;
  const payYear = selMonth === 12 ? selYear + 1 : selYear;
  const payDateStr = `${String(payYear).slice(2)}.${String(payMonth).padStart(2,"0")}.22`;

  // 드롭다운 옵션
  const yearOptions = [2024,2025,2026,2027].map(y => ({ value: y, label: `${String(y).slice(2)}년` }));
  const monthOptions = Array.from({length:12},(_,i)=>({ value:i+1, label:`${i+1}월` }));
  const weekOptions = Array.from({length:weekCount},(_,i)=>({ value:i+1, label:`${i+1}주` }));

  // HOME
  const AppHome = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      {/* 헤더 */}
      <div style={{ padding: "30px var(--side-pad) 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 500, fontSize: 18, color: "#000" }}>ZAL:잘먹</span>
        <button onClick={() => setStep("list")} style={{ fontSize: 14, color: "#000", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>내역보기</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: "var(--center-gap)" }}>
      {/* 인사 + 금액 */}
      <div style={{ padding: "40px var(--side-pad) var(--item-gap)" }}>
        <p style={{ margin: "0 0 32px", fontSize: 22, color: "#777", fontWeight: 500, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 800, color: "#000" }}>정다음</span>님, 맛있는 하루를<br/>다음정보시스템즈가 지원합니다!
        </p>
        <div style={{ marginTop: 24 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#333", fontWeight: 500 }}>{payDateStr} 입금 예정</p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#000", letterSpacing: -0.5 }}>{approvedTotal.toLocaleString()}원</p>
        </div>
      </div>

      {/* 바텀시트 여는 트리거 버튼 */}
      <div style={{ padding: "20px var(--side-pad) 30px" }}>
        <button onClick={() => setIsPickerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 }}>
          <span style={{ color: "#444", fontSize: 16, fontWeight: 600 }}>{String(selYear).slice(2)}년 {selMonth}월 {selWeek}주</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="#444">
            <path d="M0 0L5 6L10 0H0Z" />
          </svg>
        </button>
      </div>

      {/* 주간 캘린더 — 카드 배경 없음, 옆에 일자 표기 */}
      <div style={{ padding: "0 var(--side-pad) 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: 0 }}>
          {weekDates.map((date, i) => {
            const dateStr = date.toISOString().slice(0, 10);
            const daySub = subs.find(s => s.date === dateStr && s.status === "승인완료");
            // 영수증이 있는 날은 1~3번 음식 이미지를 일자/요일 기반으로 랜덤하게, 없는 날은 00번(빈그릇)
            const foodImages = ["/food_01.webp", "/food_02.webp", "/food_03.webp"];
            const selectedFood = foodImages[(i + date.getDate()) % 3];

            const content = daySub ? (
              <img src={selectedFood} alt="음식" style={{ width: 72, height: 72, objectFit: "contain" }} />
            ) : (
              <img src="/food_00.png" alt="빈 그릇" style={{ width: 56, height: 56, objectFit: "contain", opacity: 0.9 }} />
            );
            
            return (
              <div key={i} style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {content}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#000" }}>
                  {DAYS[i]} <span style={{ fontSize: 12, color: "#666", fontWeight: 600, marginLeft: 2 }}>{date.getDate()}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 버튼들 */}
      <div style={{ padding: "0 var(--side-pad)", display: "flex", flexDirection: "column", gap: 12, marginTop: "var(--btn-top)", marginBottom: "var(--btn-bot)" }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#888", textAlign: "center", fontWeight: 500 }}>영수증이 업로드 되면 음식이 채워집니다.</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "18px", borderRadius: 12, border: "none", background: "#000000", color: "#ffffff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
          영수증 올리기
        </button>
        <button onClick={() => {}} style={{ width: "100%", padding: "18px", borderRadius: 12, border: `2px solid #000000`, background: "transparent", color: "#000000", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
          오늘 뭐 먹지?
        </button>
      </div>
      </div>

      {/* 푸터 */}
      <div style={{ paddingBottom: 32, textAlign: "center", color: "#B3B3B3", fontSize: 13, fontWeight: 500 }}>
        다음정보시스템
      </div>
    </div>
  );

  // LIST
  const AppList = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 500, fontSize: 17, color: C.text }}>정산 내역</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
        {subs.map(s => (
          <div key={s.id} onClick={() => setDetail(s)} style={{ background: "rgba(255,255,255,0.8)", borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{s.storeName}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.muted }}>{s.date} · {s.category}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.primary }}>₩{parseInt(s.amount).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ✅ RESULT — 로딩 중 "확인 중입니다" 단계별 메시지
  const AppResult = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 500, fontSize: 17, color: C.text }}>검증 결과</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
            <p style={{ fontWeight: 500, fontSize: 17, color: C.text, margin: "0 0 8px" }}>확인 중입니다...</p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 2 }}>
              영수증 판독 중<br />
              규정 검토 중
            </p>
          </div>
        ) : (
          <>
            {preview && <img src={preview} style={{ width: "100%", borderRadius: 14, marginBottom: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} alt="영수증 원본" />}
            {ocr && (
              <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>AI 인식 결과</p>
                <table style={{ width: "100%", fontSize: 13 }}>
                  {[["가게명",ocr.storeName],["날짜",ocr.date],["시간",ocr.time],["금액","₩"+parseInt(ocr.amount||0).toLocaleString()],["업종",ocr.category]].map(([k,v]) => (
                    <tr key={k}><td style={{ color: C.muted, padding: "3px 0", width: 56 }}>{k}</td><td style={{ fontWeight: 600, color: C.text }}>{v || <span style={{color:'#ccc'}}>인식불가</span>}</td></tr>
                  ))}
                </table>
              </div>
            )}
            {rawOcr && (
              <div style={{ padding: 10, background: "#f0f0f0", borderRadius: 8, fontSize: 10, color: "#999", marginBottom: 14, wordBreak: "break-all", maxHeight: 100, overflow: "auto" }}>
                [Debug Raw Info]: {rawOcr}
              </div>
            )}
            {issues.length === 0
              ? <div style={{ background: "#E8F7EE", borderRadius: 14, padding: "20px", textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#1E6B3A", fontSize: 16 }}>정산 가능합니다!</p>
                </div>
              : <div style={{ background: "#FDECEA", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 500, color: "#C0392B" }}>⚠️ 규정 위반</p>
                  {issues.map((iss,i) => <p key={i} style={{ margin: "3px 0", fontSize: 12, color: "#C0392B" }}>• {iss}</p>)}
                </div>
            }
            {issues.length === 0
              ? <button onClick={() => submit(false)} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: C.primary, color: "#fff", fontWeight: 500, fontSize: 16, cursor: "pointer" }}>제출하기 →</button>
              : <button onClick={() => setStep("exception")} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: "#E24B4A", color: "#fff", fontWeight: 500, fontSize: 16, cursor: "pointer" }}>예외 요청하기 →</button>
            }
          </>
        )}
      </div>
    </div>
  );

  // EXCEPTION
  const AppException = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 500, fontSize: 17, color: C.text }}>예외 요청</span>
      </div>
      <div style={{ flex: 1, padding: "0 24px 24px" }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, color: C.text }}>사유 유형 *</label>
        <select value={excType} onChange={e => setExcType(e.target.value)} style={{ width: "100%", marginBottom: 16, padding: "13px 14px", borderRadius: 12, border: "none", fontSize: 13, background: "rgba(255,255,255,0.8)", color: C.text }}>
          <option value="">선택하세요</option>
          <option value="조기출근/야근">조기출근 / 야근</option>
          <option value="외부 미팅">외부 미팅</option>
          <option value="업무 연장">업무 연장</option>
          <option value="기타">기타</option>
        </select>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, color: C.text }}>상세 사유 *</label>
        <textarea value={excText} onChange={e => setExcText(e.target.value)} placeholder="예외 사유를 상세히 작성해 주세요" style={{ width: "100%", minHeight: 110, padding: "13px 14px", borderRadius: 12, border: "none", fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "rgba(255,255,255,0.8)", color: C.text, fontFamily: "inherit" }} />
        <button onClick={() => submit(true)} disabled={!excType || !excText.trim()} style={{ width: "100%", marginTop: 16, padding: 16, borderRadius: 14, border: "none", background: excType && excText.trim() ? C.primary : "#aaa", color: "#fff", fontWeight: 500, fontSize: 16, cursor: excType && excText.trim() ? "pointer" : "default" }}>
          예외 요청 제출 →
        </button>
      </div>
    </div>
  );

  // DONE
  const AppDone = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center", background: C.bg }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px", color: C.text }}>제출 완료!</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 32px", lineHeight: 1.7 }}>관리자 검토 후<br />매월 22일 입금됩니다</p>
      <button onClick={reset} style={{ padding: "14px 36px", borderRadius: 28, border: "none", background: C.primary, color: "#fff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>홈으로 →</button>
    </div>
  );

  const screens = { home: AppHome, list: AppList, result: AppResult, exception: AppException, done: AppDone };

  const bgStyle = { flex: 1, display: "flex", flexDirection: "column", background: C.bg };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(180deg, #FFB100 0%, #FFD688 50%, #FFF5D6 100%)", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <style>{`
        :root {
          --side-pad: 48px;
          --center-gap: 120px;
          --item-gap: 60px;
          --btn-top: 40px;
          --btn-bot: 80px;
        }
        @media (max-width: 1060px) {
          .desktop-panel { display: none !important; }
          .app-container { width: 100% !important; border-left: none !important; }
          :root {
            --side-pad: 24px;
            --center-gap: 30px;
            --item-gap: 30px;
            --btn-top: 20px;
            --btn-bot: 40px;
          }
        }
      `}</style>

      {/* 좌측 브랜딩 */}
      <div className="desktop-panel" style={{ width: 600, flexShrink: 0, height: "100%", background: "transparent", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px" }}>
        <div style={{ position: "fixed", top: 28, left: 36, display: "flex", alignItems: "center", gap: 8, zIndex: 100 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>잘</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#000" }}>ZAL : 잘</span>
          <span style={{ fontSize: 12, color: "#888" }}>먹겠습니다!</span>
        </div>
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#000", fontWeight: 800, letterSpacing: 1 }}>식대 정산 자동화 시스템</p>
          <h1 style={{ margin: "0 0 18px", fontSize: 48, fontWeight: 800, color: "#000", lineHeight: 1.1, letterSpacing: -2 }}>점심 한 끼,<br /><span>10초</span>에 정산!</h1>
          <p style={{ margin: "0 0 36px", fontSize: 15, color: "rgba(0,0,0,0.6)", lineHeight: 1.8, fontWeight: 500 }}>영수증 사진 한 장이면 충분합니다.<br />AI가 자동으로 규정을 확인하고<br />매월 22일 자동 입금까지!</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 48 }}>
            {["AI 자동 인식","규정 즉시 검증","실물 영수증 불필요","매월 22일 자동 입금"].map(t => (
              <span key={t} style={{ background: "rgba(0,0,0,0.05)", color: "#000", fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(0,0,0,0.1)" }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 36 }}>
            {[["10초","정산 완료"],["0장","실물 영수증"],["22일","매월 자동 입금"]].map(([num,label]) => (
              <div key={label}><p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#000" }}>{num}</p><p style={{ margin: 0, fontSize: 11, color: "rgba(0,0,0,0.5)" }}>{label}</p></div>
            ))}
          </div>
        </div>
        <p style={{ position: "absolute", bottom: 36, left: 64, margin: 0, fontSize: 11, color: "rgba(0,0,0,0.3)" }}>© 2026 다음정보시스템즈. All rights reserved.</p>
      </div>

      {/* 우측 앱 영역 */}
      <div className="app-container" style={{ width: 460, flexShrink: 0, height: "100%", boxShadow: "30px 30px 60px -15px rgba(0,0,0,0.12)", borderLeft: "1px solid #ddd", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {screens[step] || AppHome}
        {/* 바텀시트 컴포넌트 렌더링 */}
        <BottomSheetPicker 
          isOpen={isPickerOpen} 
          onClose={() => setIsPickerOpen(false)} 
          year={selYear} month={selMonth} week={selWeek} 
          onConfirm={(y, m, w) => { setSelYear(y); setSelMonth(m); setSelWeek(w); }} 
        />
      </div>

    </div>
  );
}