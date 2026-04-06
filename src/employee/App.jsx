import { useState, useRef } from "react";

const ALLOWED = ["음식점","한식","중식","일식","양식","분식","카페","커피전문점","제과점","베이커리","편의점","슈퍼마켓","백화점","푸드코트"];

function validate(d) {
  const issues = [];
  const [h, m] = (d.time || "0:0").split(":").map(Number);
  const tot = h * 60 + m;
  if (tot < 600 || tot > 840) issues.push("사용 가능 시간(10:00~14:00) 외 사용입니다.");
  const dow = new Date(d.date).getDay();
  if (dow === 0 || dow === 6) issues.push("주말/공휴일 사용은 지원되지 않습니다.");
  if (!ALLOWED.some(t => (d.category || "").includes(t))) issues.push("지원 업종이 아닙니다. (업종: " + (d.category || "미확인") + ")");
  if (!d.amount || parseInt(d.amount) <= 0) issues.push("금액 정보를 확인할 수 없습니다.");
  return issues;
}

const DEMO = [
  { id: 1, date: "2026-04-03", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 2, date: "2026-04-02", time: "13:00", amount: "12000", category: "일식", storeName: "스시로", status: "승인완료", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 3, date: "2026-04-01", time: "09:30", amount: "8000", category: "카페", storeName: "스타벅스", status: "반려", issues: [], exceptionReason: "", rejectReason: "시간 외 사용으로 지급 불가" },
];

const BG = "#F5F0E8";
const CARD = "#FFFDF7";
const PRIMARY = "#C8622A";
const PRIMARY_LIGHT = "#F5E6DC";
const TEXT = "#2C1A0E";
const MUTED = "#8B6F5E";

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
  const fileRef = useRef();

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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: file.type, data: b64 } },
          { type: "text", text: "영수증 이미지에서 정보 추출. JSON만 반환:\n{\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"amount\":\"숫자만\",\"category\":\"업종명\",\"storeName\":\"가게명\"}" }
        ]}] })
      });
      const data = await resp.json();
      const txt = data.content?.find(c => c.type === "text")?.text || "{}";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setOcr(parsed); setIssues(validate(parsed));
    } catch {
      const mock = { date: new Date().toISOString().slice(0,10), time: "12:30", amount: "9800", category: "한식", storeName: "테스트 식당" };
      setOcr(mock); setIssues(validate(mock));
    }
    setLoading(false);
  };

  const submit = (isException = false) => {
    setSubs(prev => [{ id: Date.now(), date: ocr.date, time: ocr.time, amount: ocr.amount, category: ocr.category, storeName: ocr.storeName || ocr.category, status: isException ? "예외요청" : "승인대기", issues, exceptionReason: isException ? "[" + excType + "] " + excText : "", rejectReason: "" }, ...prev]);
    setStep("done");
  };

  // HOME
  if (step === "home") return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      {/* 배경 패턴 */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, #C8622A18 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

      {/* 헤더 */}
      <header style={{ position: "relative", zIndex: 10, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>잘</div>
          <span style={{ fontWeight: 800, fontSize: 17, color: TEXT }}>ZAL : 잘</span>
        </div>
        <button onClick={() => setStep("list")} style={{ fontSize: 13, color: MUTED, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>내 내역 →</button>
      </header>

      {/* 히어로 섹션 */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: PRIMARY, fontWeight: 700, letterSpacing: 1 }}>식대 정산 자동화</p>
          <h1 style={{ margin: "0 0 12px", fontSize: 38, fontWeight: 900, color: TEXT, lineHeight: 1.2 }}>점심 한 끼,<br /><span style={{ color: PRIMARY }}>10초에 정산!</span></h1>
          <p style={{ margin: 0, fontSize: 15, color: MUTED, lineHeight: 1.6 }}>영수증 사진 한 장이면 충분합니다.<br />AI가 자동으로 규정을 확인해 드려요.</p>
        </div>

        {/* 기능 뱃지 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap", justifyContent: "center" }}>
          {["AI 자동 인식", "규정 즉시 확인", "실물 영수증 불필요"].map(t => (
            <span key={t} style={{ background: PRIMARY_LIGHT, color: PRIMARY, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 20 }}>{t}</span>
          ))}
        </div>

        {/* 메인 카드 */}
        <div style={{ width: "100%", maxWidth: 400, background: CARD, borderRadius: 24, padding: 24, boxShadow: "0 8px 40px rgba(200,98,42,0.12)", border: "1px solid #EDD9C8" }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

          {!preview ? (
            <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #D4B8A8", borderRadius: 16, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: BG, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: PRIMARY_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 28 }}>🧾</div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: TEXT }}>영수증 사진 올리기</p>
              <p style={{ margin: 0, fontSize: 12, color: MUTED }}>카드 매출전표 · JPG · PNG</p>
            </div>
          ) : (
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16, position: "relative" }}>
              <img src={preview} style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} alt="preview" />
              <button onClick={() => { setFile(null); setPreview(null); }} style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          )}

          <button onClick={runOCR} disabled={!file} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: file ? PRIMARY : "#D4B8A8", color: "#fff", fontWeight: 800, fontSize: 16, cursor: file ? "pointer" : "default", letterSpacing: 0.5 }}>
            {file ? "정산 가능 여부 확인하기 →" : "영수증을 먼저 올려주세요"}
          </button>
        </div>

        {/* 기능 설명 */}
        <div style={{ width: "100%", maxWidth: 400, marginTop: 20, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 40 }}>
          {[
            { icon: "🤖", title: "AI 자동 인식", desc: "날짜·시간·금액·업종을 자동으로 읽어냅니다" },
            { icon: "✅", title: "규정 즉시 검증", desc: "시간·업종·횟수 규정을 즉시 확인합니다" },
            { icon: "📅", title: "월말 자동 정산", desc: "매월 22일 개인 계좌로 자동 입금됩니다" },
          ].map(f => (
            <div key={f.title} style={{ background: CARD, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #EDD9C8" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: PRIMARY_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: TEXT }}>{f.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // LIST
  if (step === "list") return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, #C8622A18 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
      <header style={{ position: "relative", zIndex: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => setStep("home")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: TEXT }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 17, color: TEXT }}>내 정산 내역</span>
      </header>
      <div style={{ position: "relative", zIndex: 10, maxWidth: 440, margin: "0 auto", padding: "0 16px 40px" }}>
        <div style={{ background: CARD, borderRadius: 20, padding: "18px", marginBottom: 16, display: "flex", justifyContent: "space-around", border: "1px solid #EDD9C8" }}>
          {[["제출", subs.length + "건"], ["승인", subs.filter(s=>s.status==="승인완료").length + "건"], ["지급예정", "₩" + subs.filter(s=>s.status==="승인완료").reduce((a,s)=>a+parseInt(s.amount),0).toLocaleString()]].map(([k,v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: MUTED, fontWeight: 600 }}>{k}</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: PRIMARY }}>{v}</p>
            </div>
          ))}
        </div>
        {subs.map(s => (
          <div key={s.id} onClick={() => setDetail(s)} style={{ background: CARD, border: "1px solid #EDD9C8", borderRadius: 18, padding: "16px 18px", marginBottom: 10, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{s.storeName}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: MUTED }}>{s.date} {s.time} · {s.category}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: PRIMARY }}>₩{parseInt(s.amount).toLocaleString()}</span>
            </div>
            {s.status === "반려" && s.rejectReason && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#C0392B", background: "#FDECEA", padding: "5px 10px", borderRadius: 8 }}>반려: {s.rejectReason}</p>}
          </div>
        ))}
      </div>
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,26,14,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 440, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{detail.storeName}</span>
              <Badge status={detail.status} />
            </div>
            <table style={{ width: "100%", fontSize: 13 }}>
              {[["날짜", detail.date],["시간", detail.time],["금액", "₩" + parseInt(detail.amount).toLocaleString()],["업종", detail.category]].map(([k,v]) => (
                <tr key={k}><td style={{ color: MUTED, padding: "5px 0", width: 56 }}>{k}</td><td style={{ fontWeight: 700, color: TEXT }}>{v}</td></tr>
              ))}
            </table>
            {detail.rejectReason && <p style={{ fontSize: 12, color: "#C0392B", background: "#FDECEA", padding: "10px 12px", borderRadius: 10, marginTop: 14 }}>반려 사유: {detail.rejectReason}</p>}
            <button onClick={() => setDetail(null)} style={{ width: "100%", marginTop: 18, padding: 13, borderRadius: 12, border: "2px solid #EDD9C8", background: "transparent", color: MUTED, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );

  // RESULT
  if (step === "result") return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, #C8622A18 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
      <header style={{ position: "relative", zIndex: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => setStep("home")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: TEXT }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 17, color: TEXT }}>검증 결과</span>
      </header>
      <div style={{ position: "relative", zIndex: 10, maxWidth: 440, margin: "0 auto", padding: "0 16px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <p style={{ fontWeight: 800, fontSize: 18, color: TEXT, margin: "0 0 8px" }}>AI가 분석 중입니다</p>
            <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>영수증 정보를 읽고 있어요...</p>
          </div>
        ) : (
          <>
            {preview && <img src={preview} style={{ width: "100%", borderRadius: 18, maxHeight: 200, objectFit: "cover", marginBottom: 16 }} alt="" />}
            {ocr && (
              <div style={{ background: CARD, borderRadius: 18, padding: "18px", marginBottom: 16, border: "1px solid #EDD9C8" }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: 0.5 }}>AI 인식 결과</p>
                <table style={{ width: "100%", fontSize: 14 }}>
                  {[["가게명", ocr.storeName],["날짜", ocr.date],["시간", ocr.time],["금액", "₩" + parseInt(ocr.amount||0).toLocaleString()],["업종", ocr.category]].filter(([,v])=>v).map(([k,v]) => (
                    <tr key={k}><td style={{ color: MUTED, padding: "4px 0", width: 64 }}>{k}</td><td style={{ fontWeight: 700, color: TEXT }}>{v}</td></tr>
                  ))}
                </table>
              </div>
            )}
            {issues.length === 0 ? (
              <div style={{ background: "#E8F7EE", borderRadius: 18, padding: "24px 20px", textAlign: "center", marginBottom: 16, border: "1px solid #B7DFC7" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#1E6B3A", fontSize: 18 }}>정산 가능합니다!</p>
                <p style={{ margin: 0, fontSize: 13, color: "#3A8A56" }}>모든 규정을 충족하는 영수증입니다</p>
              </div>
            ) : (
              <div style={{ background: "#FDECEA", borderRadius: 18, padding: "18px", marginBottom: 16, border: "1px solid #F5B7B1" }}>
                <p style={{ margin: "0 0 10px", fontWeight: 800, color: "#C0392B", fontSize: 15 }}>⚠️ 규정 위반 항목</p>
                {issues.map((iss, i) => <p key={i} style={{ margin: "4px 0", fontSize: 13, color: "#C0392B" }}>• {iss}</p>)}
              </div>
            )}
            {issues.length === 0
              ? <button onClick={() => submit(false)} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: PRIMARY, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>제출하기 →</button>
              : <button onClick={() => setStep("exception")} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: "#B87020", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>예외 요청하기 →</button>
            }
          </>
        )}
      </div>
    </div>
  );

  // EXCEPTION
  if (step === "exception") return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, #C8622A18 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
      <header style={{ position: "relative", zIndex: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: TEXT }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 17, color: TEXT }}>예외 요청</span>
      </header>
      <div style={{ position: "relative", zIndex: 10, maxWidth: 440, margin: "0 auto", padding: "0 16px 40px" }}>
        <div style={{ background: "#FEF3E2", borderRadius: 16, padding: "14px 16px", marginBottom: 20, border: "1px solid #F5CBA7", fontSize: 13, color: "#B87020" }}>
          관리자 검토 후 승인 여부가 결정됩니다. 사유를 명확하게 작성해 주세요.
        </div>
        <div style={{ background: CARD, borderRadius: 20, padding: "22px 20px", border: "1px solid #EDD9C8" }}>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: TEXT }}>사유 유형 *</label>
          <select value={excType} onChange={e => setExcType(e.target.value)} style={{ width: "100%", marginBottom: 20, padding: "13px 14px", borderRadius: 12, border: "1.5px solid #EDD9C8", fontSize: 14, background: BG, color: TEXT, fontWeight: 600 }}>
            <option value="">선택하세요</option>
            <option value="조기출근/야근">조기출근 / 야근</option>
            <option value="외부 미팅">외부 미팅</option>
            <option value="업무 연장">업무 연장</option>
            <option value="기타">기타</option>
          </select>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: TEXT }}>상세 사유 *</label>
          <textarea value={excText} onChange={e => setExcText(e.target.value)} placeholder="예외 사유를 상세히 작성해 주세요" style={{ width: "100%", minHeight: 120, padding: "13px 14px", borderRadius: 12, border: "1.5px solid #EDD9C8", fontSize: 14, resize: "vertical", boxSizing: "border-box", background: BG, color: TEXT, fontFamily: "inherit" }} />
          <button onClick={() => submit(true)} disabled={!excType || !excText.trim()} style={{ width: "100%", marginTop: 18, padding: 16, borderRadius: 14, border: "none", background: excType && excText.trim() ? PRIMARY : "#D4B8A8", color: "#fff", fontWeight: 800, fontSize: 16, cursor: excType && excText.trim() ? "pointer" : "default" }}>
            예외 요청 제출 →
          </button>
        </div>
      </div>
    </div>
  );

  // DONE
  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, #C8622A18 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 10, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 10px", color: TEXT }}>제출 완료!</h2>
        <p style={{ color: MUTED, fontSize: 15, margin: "0 0 6px", lineHeight: 1.6 }}>관리자 검토 후 매월 22일<br />개인 계좌로 입금됩니다</p>
        <div style={{ background: CARD, borderRadius: 16, padding: "14px 20px", margin: "24px 0", border: "1px solid #EDD9C8", display: "inline-block" }}>
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>익월 10일까지 추가 제출 가능합니다</p>
        </div>
        <br />
        <button onClick={reset} style={{ padding: "14px 36px", borderRadius: 28, border: "none", background: PRIMARY, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>홈으로 돌아가기</button>
      </div>
    </div>
  );
}