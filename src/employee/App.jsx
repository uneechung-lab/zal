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

function validate(d, allowed, existingSubs = []) {
  const issues = [];
  
  const isDup = existingSubs.some(s => s.date === d.date && s.id !== d.id);
  if (isDup) issues.push("해당 날짜( " + d.date + " )에 이미 제출된 내역이 있습니다.");

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

  const catMatch = allowed.some(t => {
    const cStr = (d.category || "").split(/[\/,·\s]/);
    return cStr.some(c => c.trim().includes(t) || t.includes(c.trim()));
  });
  if (!catMatch) issues.push("지원 업종이 아닙니다. (업종: " + (d.category || "미확인") + ")");
  
  const cleanAmt = String(d.amount || "").replace(/[^\d]/g, "");
  if (!cleanAmt || parseInt(cleanAmt) <= 0) issues.push("금액 정보를 확인할 수 없습니다.");
  
  return issues;
}

const DEMO = [];

const C = {
  bg: "#FFFBF0",
  card: "#FFFFFF",
  primary: "#000000",
  brand: "#FEC601",
  brandLight: "#FFEAB2",
  text: "#1A1A1A",
  muted: "#666",
  border: "#F2E8CF",
};

const DAYS = ["월", "화", "수", "목", "금"];

function getWeekDates(year, month, week) {
  const dates = [];
  const firstDay = new Date(year, month - 1, 1);
  const day = firstDay.getDay(); 
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

function getWeekCount(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
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

function BottomSheetPicker({ isOpen, onClose, year, month, week, onConfirm }) {
  const [tempY, setTempY] = useState(year);
  const [tempM, setTempM] = useState(month);
  const [tempW, setTempW] = useState(week);
  useEffect(() => { if (isOpen) { setTempY(year); setTempM(month); setTempW(week); } }, [isOpen, year, month, week]);
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
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 40, marginTop: -20, borderTop: "1px solid #eee", borderBottom: "1px solid #eee", pointerEvents: "none" }} />
          <Col options={[2024,2025,2026,2027].map(y => ({val:y, label:`${String(y).slice(2)}년`}))} selected={tempY} onSelect={setTempY} />
          <Col options={Array.from({length:12},(_,i)=>({val:i+1, label:`${i+1}월`}))} selected={tempM} onSelect={setTempM} />
          <Col options={Array.from({length:wCnt},(_,i)=>({val:i+1, label:`${i+1}주`}))} selected={tempW} onSelect={setTempW} />
        </div>
        <button onClick={() => { onConfirm(tempY, tempM, tempW); onClose(); }} style={{ width: "100%", padding: 18, background: "#0A84FF", color: "#fff", fontWeight: 600, fontSize: 16, border: "none", borderRadius: 12, cursor: "pointer", marginTop: 24 }}>확인</button>
      </div>
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
  const [modal, setModal] = useState(null);
  const [excType, setExcType] = useState("");
  const [excText, setExcText] = useState("");
  const [allowed, setAllowed] = useState([]);
  const [selYear, setSelYear] = useState(2026);
  const [selMonth, setSelMonth] = useState(4);
  const [selWeek, setSelWeek] = useState(2);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isImgModal, setIsImgModal] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [pick, setPick] = useState(null);
  const fileRef = useRef();

  useEffect(() => { fetchCategories().then(setAllowed); }, []);

  const reset = () => { 
    setStep("home"); setFile(null); setPreview(null); setOcr(null); setIssues([]); setExcType(""); setExcText(""); setModal(null);
  };

  const submit = (isEx = false, data = ocr) => {
    setSubs(p => [{ id: Date.now(), ...data, status: isEx ? "예외요청" : "승인대기" }, ...p]);
    setModal("done");
  };

  const handleFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target.result);
    r.readAsDataURL(f);
    setModal("checking");
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
      if (!resp.ok) throw new Error(`API Error: ${resp.status}`);
      const data = await resp.json();
      const txt = data.content?.find(c => c.type === "text")?.text || "{}";
      const cleaned = txt.replace(/```json|```/g, "").trim();
      let parsed = JSON.parse(cleaned);
      const result = {
        storeName: parsed.storeName || parsed.store || parsed.merchant || "",
        date: parsed.date || parsed.usageDate || "",
        time: parsed.time || parsed.usageTime || "",
        amount: String(parsed.amount || parsed.totalAmount || "").replace(/[^\d]/g, ""),
        category: parsed.category || parsed.businessType || ""
      };
      setOcr(result); 
      const currentIssues = validate(result, allowed, subs);
      setIssues(currentIssues);
      if (currentIssues.length === 0) {
        submit(false, result);
      } else {
        setModal(null); setStep("result");
      }
    } catch (err) {
      setTimeout(() => {
        if (!showFail) {
          // ✅ [시연 편의성] 이번 주 빈 날짜를 자동으로 찾아 제출합니다.
          const weekDates = getWeekDates(selYear, selMonth, selWeek).map(d => d.toISOString().slice(0, 10));
          const emptyDate = weekDates.find(d => !subs.some(s => s.date === d)) || new Date().toISOString().slice(0, 10);
          
          const successMock = { date: emptyDate, time: "12:30", amount: "12500", category: "한식", storeName: "디스트릭트와이" };
          setOcr(successMock); setIssues([]);
          submit(false, successMock);
        } else {
          const failMock = { date: "2026-04-08", time: "15:00", amount: "9800", category: "편의점", storeName: "GS25" };
          setOcr(failMock); setIssues(validate(failMock, allowed));
          setModal(null); setStep("result");
        }
        setShowFail(!showFail); 
      }, 1500);
    }
  };

  const MENUS = [
    { name: "매콤한 김치찌개", cat: "한식", emoji: "🥘" },
    { name: "든든한 돈까스", cat: "양식", emoji: "🐷" },
    { name: "신선한 초밥", cat: "일식", emoji: "🍣" },
    { name: "얼큰한 짬뽕", cat: "중식", emoji: "🍜" },
    { name: "아삭한 샌드위치", cat: "브런치", emoji: "🥪" },
    { name: "고소한 비빔밥", cat: "한식", emoji: "🥗" },
    { name: "바삭한 텐동", cat: "일식", emoji: "🍤" },
    { name: "뜨끈한 쌀국수", cat: "동남아", emoji: "🍜" },
  ];
  const doPick = () => setPick(MENUS[Math.floor(Math.random() * MENUS.length)]);

  const approvedTotal = subs.filter(s => s.status === "승인완료" || s.status === "승인대기").reduce((a, s) => a + parseInt(s.amount || 0), 0);
  const weekDates = getWeekDates(selYear, selMonth, selWeek);
  const payMonth = selMonth === 12 ? 1 : selMonth + 1;
  const payYear = selMonth === 12 ? selYear + 1 : selYear;
  const payDateStr = `${String(payYear).slice(2)}.${String(payMonth).padStart(2,"0")}.22`;

  const AppHome = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      <div style={{ padding: "30px var(--side-pad) 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>ZAL:잘먹</span>
        <button onClick={() => setStep("list")} style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#555" }}>내역보기</button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: "var(--btn-bot)" }}>
        <div style={{ padding: "0 var(--side-pad) var(--item-gap)" }}>
          <p style={{ margin: "0 0 32px", fontSize: 24, color: "#777", fontWeight: 500, lineHeight: 1.45, letterSpacing: "-1px" }}>
            <span style={{ fontWeight: 800, color: "#000" }}>정다음</span>님, 맛있는 하루를<br/>다음정보시스템즈가 지원합니다!
          </p>
          <div style={{ marginTop: 40 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#333", fontWeight: 600 }}>{payDateStr} 입금 예정</p>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: "#000", letterSpacing: "-1px" }}>{approvedTotal.toLocaleString()}원</p>
          </div>
        </div>
        <div style={{ padding: "0 var(--side-pad) 32px" }}>
          <button onClick={() => setIsPickerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#444", fontSize: 16, fontWeight: 700 }}>{String(selYear).slice(2)}년 {selMonth}월 {selWeek}주</span>
            <span style={{ fontSize: 10 }}>▼</span>
          </button>
        </div>
        <div style={{ padding: "0 var(--side-pad) var(--item-gap)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().slice(0, 10);
              const daySub = subs.find(s => s.date === dateStr && (s.status === "승인완료" || s.status === "승인대기"));
              const foodImages = ["/food_01.webp", "/food_02.webp", "/food_03.webp"];
              const selectedFood = foodImages[(i + date.getDate()) % 3];
              return (
                <div key={i} style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {daySub ? (
                      <img src={selectedFood} style={{ width: 80, height: 80, objectFit: "contain" }} alt="식단" />
                    ) : (
                      <img src="/food_00.png" style={{ width: 64, height: 64, opacity: 0.9 }} alt="빈함" />
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#888" }}>{DAYS[i]} {date.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: "0 var(--side-pad)", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ textAlign: "center", fontSize: 13, color: "#888", fontWeight: 700, margin: "0 0 4px" }}>영수증을 올리면 음식이 채워집니다</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "20px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 17 }}>영수증 올리기</button>
          <button onClick={() => { doPick(); setStep("menu"); }} style={{ width: "100%", padding: "20px", borderRadius: 16, border: "2px solid #000", background: "transparent", color: "#000", fontWeight: 800, fontSize: 17 }}>오늘 뭐 먹지?</button>
        </div>
      </div>
    </div>
  );

  const AppList = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>정산 내역</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 180px", minHeight: 0 }}>
        {subs.map(s => (
          <div key={s.id} style={{ background: "#fff", borderRadius: 20, padding: "20px", marginBottom: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{s.storeName}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>{s.date} · {s.category}</span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>₩{parseInt(s.amount || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AppResult = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 160px", minHeight: 0 }}>
        <div style={{ textAlign: "center", padding: "20px 0 40px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E5E7EB", color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px", fontWeight: 800 }}>!</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", color: "#111" }}>검증 실패</h2>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>입력된 영수증 정보 중 일부가<br/>회사 정산 규정에 맞지 않습니다.</p>
        </div>

        {issues.length > 0 && (
          <div style={{ background: "#F3F4F6", borderRadius: 16, padding: "20px", marginBottom: 32, textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#444", fontWeight: 700 }}>규정 위반 항목</p>
            {issues.map((iss, i) => (
              <p key={i} style={{ margin: "4px 0", fontSize: 13, color: "#E24B4A", fontWeight: 800 }}>{iss}</p>
            ))}
            <p style={{ marginTop: 12, fontSize: 12, color: "#888", fontWeight: 500 }}>정산이 필요할 경우 하단 [예외 요청]을 이용해주세요.</p>
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", marginBottom: 20 }}>
          <div style={{ padding: "24px" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <tbody>
                {[["가게명",ocr?.storeName],["날짜",ocr?.date],["시간",ocr?.time],["금액","₩"+parseInt(ocr?.amount||0).toLocaleString()],["업종",ocr?.category]].map(([k,v]) => (
                  <tr key={k}><td style={{ color: "#888", padding: "10px 0", width: 70, fontWeight: 500 }}>{k}</td><td style={{ fontWeight: 800, padding: "10px 0", textAlign: "right", color: "#333" }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setIsImgModal(true)} style={{ width: "100%", marginTop: 16, padding: "14px", borderRadius: 12, border: "1.5px solid #eee", background: "#fafafa", color: "#666", fontWeight: 700, fontSize: 14 }}>영수증 보기</button>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", display: "flex", gap: 12, zIndex: 9999 }}>
        <button onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 100); }} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #E5E7EB", background: "#fff", color: "#333", fontWeight: 800, fontSize: 16 }}>다시 제출</button>
        <button onClick={() => setStep("exception")} style={{ flex: 2, padding: "18px", borderRadius: 16, border: "none", background: "#E24B4A", color: "#fff", fontWeight: 800, fontSize: 16 }}>예외 요청하기</button>
      </div>
    </div>
  );

  const AppException = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>예외 사유 입력</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 180px", minHeight: 0 }}>
        <label style={{ fontSize: 14, fontWeight: 800, display: "block", marginBottom: 12 }}>사유 유형 *</label>
        <select value={excType} onChange={e => setExcType(e.target.value)} style={{ width: "100%", marginBottom: 20, padding: "18px", borderRadius: 16, border: "none", background: "#fff", fontSize: 15, fontWeight: 600 }}>
          <option value="">유형을 선택하세요</option>
          <option value="조기출근/야근">조기출근 / 야근</option>
          <option value="외부 미팅">외부 미팅</option>
          <option value="업무 연장">업무 연장</option>
          <option value="기타">기타</option>
        </select>
        <textarea value={excText} onChange={e => setExcText(e.target.value)} placeholder="상세 사유를 입력해주세요" style={{ width: "100%", minHeight: 150, padding: "20px", borderRadius: 16, border: "none", background: "#fff", fontSize: 15, lineHeight: 1.6 }} />
        <button onClick={() => { submit(true); }} disabled={!excType || !excText.trim()} style={{ width: "100%", marginTop: 24, padding: "20px", borderRadius: 16, border: "none", background: excType && excText.trim() ? "#000" : "#ccc", color: "#fff", fontWeight: 800, fontSize: 17 }}>예외 요청 제출 →</button>
      </div>
    </div>
  );

  const AppMenu = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>오늘의 점심 추천</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 100, marginBottom: 32 }}>{pick?.emoji || "🤔"}</div>
        <p style={{ fontSize: 16, color: "#888", marginBottom: 8, fontWeight: 600 }}>{pick?.cat}</p>
        <h2 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 48px", letterSpacing: "-1px" }}>{pick?.name} 어떠세요?</h2>
        <button onClick={doPick} style={{ padding: "18px 48px", borderRadius: 32, border: "none", background: C.brand, color: "#000", fontWeight: 900, fontSize: 17, boxShadow: "0 8px 20px rgba(254,198,1,0.4)" }}>다른 메뉴 추천받기</button>
      </div>
    </div>
  );

  const screens = { home: AppHome, list: AppList, result: AppResult, exception: AppException, menu: AppMenu };

  const StatusModal = ({ type, onClose }) => (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: "#fff", width: "100%", maxWidth: 320, borderRadius: 36, padding: "48px 24px 24px", textAlign: "center", boxShadow: "0 30px 60px rgba(0,0,0,0.3)" }}>
        {type === "checking" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>🤖</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>확인 중입니다...</h3>
            <p style={{ fontSize: 15, color: "#666", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>AI가 영수증 정보를<br/>꼼꼼하게 분석하고 있습니다.</p>
          </>
        ) : (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EEF2FF", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 24, fontWeight: 900 }}>i</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>제출이 완료되었습니다.</h3>
            <p style={{ fontSize: 14, color: "#888", fontWeight: 600, margin: "0 0 40px" }}>매월 22일에 입금됩니다.</p>
            <button onClick={onClose} style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", background: "#1A1C30", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>확인</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(180deg, #FFB100 0%, #FFD688 50%, #FFF5D6 100%)", fontFamily: "'Pretendard', sans-serif", letterSpacing: "-0.5px" }}>
      <style>{`
        @media (max-width: 1060px) { .desktop-panel { display: none !important; } .app-container { width: 100% !important; border-left: none !important; } }
        :root { --side-pad: 32px; --item-gap: 64px; --btn-bot: 60px; }
        @media (max-width: 480px) { :root { --side-pad: 24px; --item-gap: 40px; --btn-bot: 40px; } }
      `}</style>
      <div className="desktop-panel" style={{ width: 600, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px" }}>
        <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-2px", color: "#000" }}>점심 한 끼,<br /><span style={{ color: "#fff", textShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>10초</span>에 정산!</h1>
        <p style={{ fontSize: 18, color: "rgba(0,0,0,0.6)", marginTop: 24, fontWeight: 600 }}>영수증 사진 한 장이면 충분합니다.</p>
      </div>
      <div className="app-container" style={{ width: 460, flexShrink: 0, height: "100vh", boxShadow: "30px 30px 60px -15px rgba(0,0,0,0.12)", borderLeft: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#FFFBF0" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", height: "100%", overflow: "hidden" }}>
          {screens[step] || AppHome}
        </div>
        {step === "home" && (
          <div style={{ padding: "12px 0 24px", textAlign: "center", background: "#FFFBF0", fontSize: 11, color: "#999", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "-0.3px", pointerEvents: "none" }}>
            ⓒ 다음정보시스템즈
          </div>
        )}
        {modal && <StatusModal type={modal} onClose={reset} />}
        {isImgModal && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", flexDirection: "column", padding: "40px 24px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button onClick={() => setIsImgModal(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, fontWeight: 300 }}>✕</button>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src={preview} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
            </div>
          </div>
        )}
        <BottomSheetPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} year={selYear} month={selMonth} week={selWeek} onConfirm={(y, m, w) => { setSelYear(y); setSelMonth(m); setSelWeek(w); }} />
      </div>
    </div>
  );
}