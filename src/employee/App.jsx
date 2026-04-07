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
  const [h, m] = (d.time || "0:0").split(":").map(Number);
  const tot = h * 60 + m;
  if (tot < 600 || tot > 840) issues.push("사용 가능 시간(10:00~14:00) 외 사용입니다.");
  const dow = new Date(d.date).getDay();
  if (dow === 0 || dow === 6) issues.push("주말/공휴일 사용은 지원되지 않습니다.");
  const catMatch = allowed.some(t => (d.category || "").split(/[\/,·\s]/).some(c => c.trim().includes(t) || t.includes(c.trim())));
  if (!catMatch) issues.push("지원 업종이 아닙니다. (업종: " + (d.category || "미확인") + ")");
  if (!d.amount || parseInt(d.amount) <= 0) issues.push("금액 정보를 확인할 수 없습니다.");
  return issues;
}

const DEMO = [
  { id: 1, date: "2026-04-07", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인완료" },
  { id: 2, date: "2026-04-08", time: "13:00", amount: "10500", category: "일식", storeName: "스시로", status: "승인완료" },
];

const C = {
  bg: "#D6EEFF",
  card: "#FFFFFF",
  primary: "#1A8CFF",
  text: "#1A1A1A",
  muted: "#666",
  border: "#C5DFF5",
};

const FOOD_EMOJIS = ["🍱", "🍜", "🍣", "🥗", "🍛", "🥘", "🍲", "🍔"];
const DAYS = ["월", "화", "수", "목", "금"];

function getWeekDates(year, month, week) {
  const dates = [];
  const firstDay = new Date(year, month - 1, 1);
  const firstMonday = new Date(firstDay);
  const day = firstDay.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  firstMonday.setDate(firstDay.getDate() + diff);
  firstMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  for (let i = 0; i < 5; i++) {
    const d = new Date(firstMonday);
    d.setDate(firstMonday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function Badge({ status }) {
  const map = {
    "승인대기": { bg: "#E8F0FD", color: "#3B6FD4", label: "승인 대기" },
    "승인완료": { bg: "#E2F5EC", color: "#1E8A4A", label: "승인 완료" },
    "예외요청": { bg: "#FEF3E2", color: "#B87020", label: "예외 요청" },
    "반려": { bg: "#FDECEA", color: "#C0392B", label: "반려" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
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
  const [selYear, setSelYear] = useState(2026);
  const [selMonth, setSelMonth] = useState(4);
  const [selWeek, setSelWeek] = useState(2);
  const fileRef = useRef();

  useEffect(() => { fetchCategories().then(setAllowed); }, []);

  const reset = () => { setStep("home"); setFile(null); setPreview(null); setOcr(null); setIssues([]); setExcType(""); setExcText(""); };

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    const r = new FileReader(); r.onload = ev => setPreview(ev.target.result); r.readAsDataURL(f);
  };

  const runOCR = async () => {
    if (!file) return;
    setLoading(true); setStep("result");
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: file.type === "image/png" ? "image/png" : "image/jpeg", data: b64 } },
          { type: "text", text: "카드 매출전표입니다. JSON만 반환하세요.\n{\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"amount\":\"숫자만\",\"category\":\"업종명\",\"storeName\":\"가맹점명\"}\n규칙: amount는 금액 숫자만(8,000원이면 8000). date는 이용일시 기준(26.04.06이면 2026-04-06)." }
        ]}] })
      });
      const data = await resp.json();
      const txt = data.content?.find(c => c.type === "text")?.text || "{}";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setOcr(parsed); setIssues(validate(parsed, allowed));
    } catch {
      const mock = { date: new Date().toISOString().slice(0,10), time: "12:30", amount: "9800", category: "한식", storeName: "테스트 식당" };
      setOcr(mock); setIssues(validate(mock, allowed));
    }
    setLoading(false);
  };

  const submit = (isException = false) => {
    setSubs(p => [{ id: Date.now(), date: ocr.date, time: ocr.time, amount: ocr.amount, category: ocr.category, storeName: ocr.storeName || ocr.category, status: isException ? "예외요청" : "승인대기" }, ...p]);
    setStep("done");
  };

  const approvedTotal = subs.filter(s => s.status === "승인완료").reduce((a, s) => a + parseInt(s.amount || 0), 0);
  const weekDates = getWeekDates(selYear, selMonth, selWeek);

  // HOME
  const AppHome = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      {/* 헤더 */}
      <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: C.text }}>ZAL:잘먹</span>
        <button onClick={() => setStep("list")} style={{ fontSize: 13, color: C.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>내역보기</button>
      </div>

      {/* 인사 + 금액 */}
      <div style={{ padding: "24px 24px 20px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 16, color: C.text, fontWeight: 600 }}>정다음 님, 맛있는 하루 :-)</p>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: C.muted }}>{selYear.toString().slice(2)}.{String(selMonth).padStart(2,"0")}.22 입금 예정</p>
        <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: C.text }}>{approvedTotal.toLocaleString()}원</p>
      </div>

      {/* 주 선택 */}
      <div style={{ padding: "0 24px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        {[
          { val: selYear, set: setSelYear, label: `${selYear}년` },
          { val: selMonth, set: setSelMonth, label: `${selMonth}월` },
          { val: selWeek, set: setSelWeek, label: `${selWeek}주` },
        ].map(({ val, set, label }) => (
          <button key={label} onClick={() => {}} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: C.text, padding: 0 }}>
            {label} ▼
          </button>
        ))}
      </div>

      {/* 주간 캘린더 */}
      <div style={{ padding: "0 24px 24px" }}>
        <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 20, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().slice(0, 10);
              const daySub = subs.find(s => s.date === dateStr && s.status === "승인완료");
              const emoji = daySub ? FOOD_EMOJIS[i % FOOD_EMOJIS.length] : null;
              return (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: daySub ? "#fff" : "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, fontSize: daySub ? 28 : 22, border: daySub ? "none" : "2px solid rgba(255,255,255,0.5)" }}>
                    {daySub ? emoji : "🫙"}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{DAYS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 버튼들 */}
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>
          영수증 올리기
        </button>
        {file && (
          <button onClick={runOCR} style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#0066CC", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>
            정산 확인하기 →
          </button>
        )}
        <button onClick={() => {}} style={{ width: "100%", padding: "18px", borderRadius: 16, border: `2px solid ${C.primary}`, background: "transparent", color: C.primary, fontWeight: 800, fontSize: 17, cursor: "pointer" }}>
          오늘 뭐 먹지?
        </button>
      </div>

      {/* 최근 내역 */}
      {subs.length > 0 && (
        <div style={{ padding: "0 24px 32px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.text }}>최근 정산 내역</p>
          {subs.slice(0, 3).map(s => (
            <div key={s.id} onClick={() => setDetail(s)} style={{ background: "rgba(255,255,255,0.8)", borderRadius: 14, padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: C.text }}>{s.storeName}</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{s.date} · {s.category}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 14, color: C.primary }}>₩{parseInt(s.amount).toLocaleString()}</p>
                <Badge status={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // LIST
  const AppList = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>정산 내역</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
        {subs.map(s => (
          <div key={s.id} onClick={() => setDetail(s)} style={{ background: "rgba(255,255,255,0.8)", borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{s.storeName}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.muted }}>{s.date} · {s.category}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>₩{parseInt(s.amount).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // RESULT
  const AppResult = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>검증 결과</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <p style={{ fontWeight: 800, fontSize: 16, color: C.text }}>AI가 분석 중입니다</p>
          </div>
        ) : (
          <>
            {preview && <img src={preview} style={{ width: "100%", borderRadius: 14, maxHeight: 180, objectFit: "cover", marginBottom: 14 }} alt="" />}
            {ocr && (
              <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: C.muted, fontWeight: 700 }}>AI 인식 결과</p>
                <table style={{ width: "100%", fontSize: 13 }}>
                  {[["가게명",ocr.storeName],["날짜",ocr.date],["시간",ocr.time],["금액","₩"+parseInt(ocr.amount||0).toLocaleString()],["업종",ocr.category]].filter(([,v])=>v).map(([k,v]) => (
                    <tr key={k}><td style={{ color: C.muted, padding: "3px 0", width: 56 }}>{k}</td><td style={{ fontWeight: 700, color: C.text }}>{v}</td></tr>
                  ))}
                </table>
              </div>
            )}
            {issues.length === 0
              ? <div style={{ background: "#E8F7EE", borderRadius: 14, padding: "20px", textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#1E6B3A", fontSize: 16 }}>정산 가능합니다!</p>
                </div>
              : <div style={{ background: "#FDECEA", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 800, color: "#C0392B" }}>⚠️ 규정 위반</p>
                  {issues.map((iss,i) => <p key={i} style={{ margin: "3px 0", fontSize: 12, color: "#C0392B" }}>• {iss}</p>)}
                </div>
            }
            {issues.length === 0
              ? <button onClick={() => submit(false)} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>제출하기 →</button>
              : <button onClick={() => setStep("exception")} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: "#E24B4A", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>예외 요청하기 →</button>
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
        <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>예외 요청</span>
      </div>
      <div style={{ flex: 1, padding: "0 24px 24px" }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: C.text }}>사유 유형 *</label>
        <select value={excType} onChange={e => setExcType(e.target.value)} style={{ width: "100%", marginBottom: 16, padding: "13px 14px", borderRadius: 12, border: "none", fontSize: 13, background: "rgba(255,255,255,0.8)", color: C.text }}>
          <option value="">선택하세요</option>
          <option value="조기출근/야근">조기출근 / 야근</option>
          <option value="외부 미팅">외부 미팅</option>
          <option value="업무 연장">업무 연장</option>
          <option value="기타">기타</option>
        </select>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: C.text }}>상세 사유 *</label>
        <textarea value={excText} onChange={e => setExcText(e.target.value)} placeholder="예외 사유를 상세히 작성해 주세요" style={{ width: "100%", minHeight: 110, padding: "13px 14px", borderRadius: 12, border: "none", fontSize: 13, resize: "vertical", boxSizing: "border-box", background: "rgba(255,255,255,0.8)", color: C.text, fontFamily: "inherit" }} />
        <button onClick={() => submit(true)} disabled={!excType || !excText.trim()} style={{ width: "100%", marginTop: 16, padding: 16, borderRadius: 14, border: "none", background: excType && excText.trim() ? C.primary : "#aaa", color: "#fff", fontWeight: 800, fontSize: 16, cursor: excType && excText.trim() ? "pointer" : "default" }}>
          예외 요청 제출 →
        </button>
      </div>
    </div>
  );

  // DONE
  const AppDone = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center", background: C.bg }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px", color: C.text }}>제출 완료!</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 32px", lineHeight: 1.7 }}>관리자 검토 후<br />매월 22일 입금됩니다</p>
      <button onClick={reset} style={{ padding: "14px 36px", borderRadius: 28, border: "none", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>홈으로 →</button>
    </div>
  );

  const screens = { home: AppHome, list: AppList, result: AppResult, exception: AppException, done: AppDone };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#F7F6F3", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>

      {/* 좌측 브랜딩 */}
      <div style={{ width: 600, flexShrink: 0, height: "100%", background: "#F7F6F3", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px" }}>
        <div style={{ position: "fixed", top: 28, left: 36, display: "flex", alignItems: "center", gap: 8, zIndex: 100 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#C8622A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>잘</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#1A1A1A" }}>ZAL : 잘</span>
          <span style={{ fontSize: 12, color: "#888" }}>먹겠습니다!</span>
        </div>
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#C8622A", fontWeight: 700, letterSpacing: 1 }}>식대 정산 자동화 시스템</p>
          <h1 style={{ margin: "0 0 18px", fontSize: 46, fontWeight: 900, color: "#1A1A1A", lineHeight: 1.15, letterSpacing: -1.5 }}>점심 한 끼,<br /><span style={{ color: "#C8622A" }}>10초</span>에 정산!</h1>
          <p style={{ margin: "0 0 36px", fontSize: 15, color: "#888", lineHeight: 1.8 }}>영수증 사진 한 장이면 충분합니다.<br />AI가 자동으로 규정을 확인하고<br />매월 22일 자동 입금까지!</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 48 }}>
            {["AI 자동 인식","규정 즉시 검증","실물 영수증 불필요","매월 22일 자동 입금"].map(t => (
              <span key={t} style={{ background: "#F5E6DC", color: "#C8622A", fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20 }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 36 }}>
            {[["10초","정산 완료"],["0장","실물 영수증"],["22일","매월 자동 입금"]].map(([num,label]) => (
              <div key={label}><p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, color: "#C8622A" }}>{num}</p><p style={{ margin: 0, fontSize: 11, color: "#888" }}>{label}</p></div>
            ))}
          </div>
        </div>
        <p style={{ position: "absolute", bottom: 36, left: 64, margin: 0, fontSize: 11, color: "#ccc" }}>© 2026 다음정보시스템즈. All rights reserved.</p>
      </div>

      {/* 우측 앱 영역 */}
      <div style={{ width: 390, flexShrink: 0, height: "100%", boxShadow: "12px 0 48px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {screens[step] || AppHome}
      </div>

    </div>
  );
}