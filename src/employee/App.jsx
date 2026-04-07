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
  { id: 1, date: "2026-04-03", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 2, date: "2026-04-02", time: "13:00", amount: "12000", category: "일식", storeName: "스시로", status: "승인완료", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 3, date: "2026-04-01", time: "09:30", amount: "8000", category: "카페", storeName: "스타벅스", status: "반려", issues: [], exceptionReason: "", rejectReason: "시간 외 사용으로 지급 불가" },
];

const C = { bg: "#F7F6F3", card: "#FFFFFF", primary: "#C8622A", primaryLight: "#F5E6DC", text: "#1A1A1A", muted: "#888", border: "#EBEBEB", accent: "#3B3B98" };

function Badge({ status }) {
  const map = { "승인대기": { bg: "#EEF2FF", color: "#3B3B98", label: "승인 대기" }, "승인완료": { bg: "#E2F5EC", color: "#1E8A4A", label: "승인 완료" }, "예외요청": { bg: "#FEF3E2", color: "#B87020", label: "예외 요청" }, "반려": { bg: "#FDECEA", color: "#C0392B", label: "반려" } };
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
    setSubs(p => [{ id: Date.now(), date: ocr.date, time: ocr.time, amount: ocr.amount, category: ocr.category, storeName: ocr.storeName || ocr.category, status: isException ? "예외요청" : "승인대기", issues, exceptionReason: isException ? `[${excType}] ${excText}` : "", rejectReason: "" }, ...p]);
    setStep("done");
  };

  // ── 앱 화면들 ──────────────────────────────────────────

  const AppHome = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><p style={{ margin: "0 0 2px", fontSize: 13, color: C.muted }}>안녕하세요 👋</p><p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>김민준님</p></div>
        <button onClick={() => setStep("list")} style={{ fontSize: 12, color: C.accent, background: "#EEF2FF", border: "none", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 600 }}>내역 보기</button>
      </div>
      <div style={{ margin: "16px 20px 0", background: C.accent, borderRadius: 20, padding: "18px" }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>이번 달 정산 현황</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[["제출", subs.length+"건"], ["승인", subs.filter(s=>s.status==="승인완료").length+"건"], ["지급예정", "₩"+subs.filter(s=>s.status==="승인완료").reduce((a,s)=>a+parseInt(s.amount),0).toLocaleString()]].map(([k,v]) => (
            <div key={k}><p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{k}</p><p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>{v}</p></div>
          ))}
        </div>
      </div>
      <div style={{ margin: "16px 20px 0" }}>
        <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: C.text }}>영수증 등록</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {!preview
          ? <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #DDD", borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: C.bg }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: C.text }}>영수증 사진 올리기</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>카드 매출전표 · JPG · PNG</p>
            </div>
          : <div style={{ borderRadius: 14, overflow: "hidden", position: "relative" }}>
              <img src={preview} style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} alt="" />
              <button onClick={() => { setFile(null); setPreview(null); }} style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
        }
      </div>
      <button onClick={runOCR} disabled={!file} style={{ margin: "12px 20px 0", padding: 14, borderRadius: 12, border: "none", background: file ? C.primary : "#DDD", color: "#fff", fontWeight: 800, fontSize: 14, cursor: file ? "pointer" : "default" }}>
        {file ? "정산 가능 여부 확인하기 →" : "영수증을 먼저 올려주세요"}
      </button>
      <div style={{ margin: "14px 20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[["🤖","AI 자동 인식","날짜·시간·금액·업종 자동 추출"],["✅","규정 즉시 검증","시간·업종 규정 즉시 확인"],["📅","월말 자동 정산","매월 22일 계좌 자동 입금"]].map(([icon,title,desc]) => (
          <div key={title} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 10 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div><p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{title}</p><p style={{ margin: 0, fontSize: 11, color: C.muted }}>{desc}</p></div>
          </div>
        ))}
      </div>
    </div>
  );

  const AppList = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "hidden" }}>
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>정산 내역</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
        {subs.map(s => (
          <div key={s.id} onClick={() => setDetail(s)} style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{s.storeName}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: C.muted }}>{s.date} · {s.category}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>₩{parseInt(s.amount).toLocaleString()}</span>
            </div>
            {s.status === "반려" && s.rejectReason && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#C0392B", background: "#FDECEA", padding: "4px 8px", borderRadius: 6 }}>반려: {s.rejectReason}</p>}
          </div>
        ))}
      </div>
      {detail && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 22, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{detail.storeName}</span>
              <Badge status={detail.status} />
            </div>
            <table style={{ width: "100%", fontSize: 13 }}>
              {[["날짜",detail.date],["시간",detail.time],["금액","₩"+parseInt(detail.amount).toLocaleString()],["업종",detail.category]].map(([k,v]) => (
                <tr key={k}><td style={{ color: C.muted, padding: "4px 0", width: 52 }}>{k}</td><td style={{ fontWeight: 700 }}>{v}</td></tr>
              ))}
            </table>
            {detail.rejectReason && <p style={{ fontSize: 12, color: "#C0392B", background: "#FDECEA", padding: "8px", borderRadius: 8, marginTop: 10 }}>반려: {detail.rejectReason}</p>}
            <button onClick={() => setDetail(null)} style={{ width: "100%", marginTop: 14, padding: 11, borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );

  const AppResult = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "hidden" }}>
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>검증 결과</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <p style={{ fontWeight: 800, fontSize: 15, color: C.text, margin: "0 0 6px" }}>AI가 분석 중입니다</p>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>잠시만 기다려 주세요...</p>
          </div>
        ) : (
          <>
            {preview && <img src={preview} style={{ width: "100%", borderRadius: 12, maxHeight: 160, objectFit: "cover", marginBottom: 12 }} alt="" />}
            {ocr && (
              <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: C.muted, fontWeight: 700 }}>AI 인식 결과</p>
                <table style={{ width: "100%", fontSize: 12 }}>
                  {[["가게명",ocr.storeName],["날짜",ocr.date],["시간",ocr.time],["금액","₩"+parseInt(ocr.amount||0).toLocaleString()],["업종",ocr.category]].filter(([,v])=>v).map(([k,v]) => (
                    <tr key={k}><td style={{ color: C.muted, padding: "3px 0", width: 52 }}>{k}</td><td style={{ fontWeight: 700, color: C.text }}>{v}</td></tr>
                  ))}
                </table>
              </div>
            )}
            {issues.length === 0
              ? <div style={{ background: "#E8F7EE", borderRadius: 12, padding: "18px", textAlign: "center", marginBottom: 12, border: "1px solid #B7DFC7" }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
                  <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#1E6B3A", fontSize: 15 }}>정산 가능합니다!</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#3A8A56" }}>모든 규정을 충족합니다</p>
                </div>
              : <div style={{ background: "#FDECEA", borderRadius: 12, padding: "12px 14px", marginBottom: 12, border: "1px solid #F5B7B1" }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 800, color: "#C0392B", fontSize: 13 }}>⚠️ 규정 위반</p>
                  {issues.map((iss,i) => <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#C0392B" }}>• {iss}</p>)}
                </div>
            }
            {issues.length === 0
              ? <button onClick={() => submit(false)} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.accent, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>제출하기 →</button>
              : <button onClick={() => setStep("exception")} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>예외 요청하기 →</button>
            }
          </>
        )}
      </div>
    </div>
  );

  const AppException = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "hidden" }}>
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>예외 요청</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 24px" }}>
        <div style={{ background: "#FEF3E2", borderRadius: 10, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: "#B87020", border: "1px solid #F5CBA7" }}>관리자 검토 후 승인 여부가 결정됩니다.</div>
        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6, color: C.text }}>사유 유형 *</label>
        <select value={excType} onChange={e => setExcType(e.target.value)} style={{ width: "100%", marginBottom: 14, padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, background: C.bg, color: C.text }}>
          <option value="">선택하세요</option>
          <option value="조기출근/야근">조기출근 / 야근</option>
          <option value="외부 미팅">외부 미팅</option>
          <option value="업무 연장">업무 연장</option>
          <option value="기타">기타</option>
        </select>
        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6, color: C.text }}>상세 사유 *</label>
        <textarea value={excText} onChange={e => setExcText(e.target.value)} placeholder="예외 사유를 상세히 작성해 주세요" style={{ width: "100%", minHeight: 100, padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: C.bg, color: C.text, fontFamily: "inherit" }} />
        <button onClick={() => submit(true)} disabled={!excType || !excText.trim()} style={{ width: "100%", marginTop: 14, padding: 14, borderRadius: 12, border: "none", background: excType && excText.trim() ? C.accent : "#DDD", color: "#fff", fontWeight: 800, fontSize: 14, cursor: excType && excText.trim() ? "pointer" : "default" }}>예외 요청 제출 →</button>
      </div>
    </div>
  );

  const AppDone = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px", color: C.text }}>제출 완료!</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 28px", lineHeight: 1.7 }}>관리자 검토 후<br />매월 22일 개인 계좌로 입금됩니다</p>
      <button onClick={reset} style={{ padding: "12px 32px", borderRadius: 24, border: "none", background: C.accent, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>홈으로 →</button>
    </div>
  );

  const screens = { home: AppHome, list: AppList, result: AppResult, exception: AppException, done: AppDone };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>

      {/* 좌측 브랜딩 */}
      <div style={{ width: 600, flexShrink: 0, height: "100%", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 52px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", top: 28, left: 36, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>잘</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: C.text }}>ZAL : 잘</span>
          <span style={{ fontSize: 12, color: C.muted }}>먹겠습니다!</span>
        </div>
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: C.primary, fontWeight: 700, letterSpacing: 1 }}>식대 정산 자동화 시스템</p>
          <h1 style={{ margin: "0 0 18px", fontSize: 46, fontWeight: 900, color: C.text, lineHeight: 1.15, letterSpacing: -1.5 }}>점심 한 끼,<br /><span style={{ color: C.primary }}>10초</span>에 정산!</h1>
          <p style={{ margin: "0 0 36px", fontSize: 15, color: C.muted, lineHeight: 1.8 }}>영수증 사진 한 장이면 충분합니다.<br />AI가 자동으로 규정을 확인하고<br />매월 22일 자동 입금까지!</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 48 }}>
            {["AI 자동 인식","규정 즉시 검증","실물 영수증 불필요","매월 22일 자동 입금"].map(t => (
              <span key={t} style={{ background: C.primaryLight, color: C.primary, fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20 }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 36 }}>
            {[["10초","정산 완료"],["0장","실물 영수증"],["22일","매월 자동 입금"]].map(([num,label]) => (
              <div key={label}><p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, color: C.primary }}>{num}</p><p style={{ margin: 0, fontSize: 11, color: C.muted }}>{label}</p></div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 36, left: 52 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#ccc" }}>© 2026 다음정보시스템즈. All rights reserved.</p>
        </div>
      </div>

      {/* 우측 앱 영역 */}
      <div style={{ width: 480, height: "100vh", background: C.card, boxShadow: "12px 0 48px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {screens[step] || AppHome}
      </div>

    </div>
  );
}
