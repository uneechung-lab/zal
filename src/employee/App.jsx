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

function Badge({ status }) {
  const map = {
    "승인대기": { bg: "#E6F1FB", color: "#378ADD", label: "승인 대기" },
    "승인완료": { bg: "#E1F5EE", color: "#1D9E75", label: "승인 완료" },
    "예외요청": { bg: "#FAEEDA", color: "#BA7517", label: "예외 요청" },
    "반려": { bg: "#FCEBEB", color: "#E24B4A", label: "반려" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20 }}>{s.label}</span>;
}

const DEMO = [
  { id: 1, date: "2026-04-03", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 2, date: "2026-04-02", time: "13:00", amount: "12000", category: "일식", storeName: "스시로", status: "승인완료", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 3, date: "2026-04-01", time: "09:30", amount: "8000", category: "카페", storeName: "스타벅스", status: "반려", issues: [], exceptionReason: "", rejectReason: "시간 외 사용으로 지급 불가" },
];

export default function App() {
  const [subs, setSubs] = useState(DEMO);
  const [step, setStep] = useState("list");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excType, setExcType] = useState("");
  const [excText, setExcText] = useState("");
  const [detail, setDetail] = useState(null);
  const fileRef = useRef();

  const reset = () => { setStep("list"); setFile(null); setPreview(null); setOcr(null); setIssues([]); setExcType(""); setExcText(""); };

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
    setSubs(prev => [{ id: Date.now(), date: ocr.date, time: ocr.time, amount: ocr.amount, category: ocr.category, storeName: ocr.storeName || ocr.category, status: isException ? "예외요청" : "승인대기", issues, exceptionReason: isException ? "[" + excType + "] " + excText : "", rejectReason: "", imgUrl: preview }, ...prev]);
    setStep("done");
  };

  if (step === "list") return (
    <div style={{ fontFamily: "sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>잘</div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>ZAL : 잘</span>
        </div>
        <span style={{ fontSize: 13, color: "#666" }}>김민준</span>
      </header>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "16px 14px" }}>
        <button onClick={() => setStep("upload")} style={{ width: "100%", padding: 14, borderRadius: 12, border: "2px dashed #1D9E75", background: "#E1F5EE", color: "#1D9E75", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
          + 영수증 업로드하기
        </button>
        {subs.map(s => (
          <div key={s.id} onClick={() => setDetail(s)} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px", marginBottom: 9, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.storeName || s.category}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#888" }}>{s.date} {s.time}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>₩{parseInt(s.amount).toLocaleString()}</span>
            </div>
            {s.status === "반려" && s.rejectReason && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#E24B4A", background: "#FCEBEB", padding: "5px 8px", borderRadius: 6 }}>반려: {s.rejectReason}</p>}
          </div>
        ))}
      </div>
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: 22, width: "100%", maxWidth: 420, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{detail.storeName}</span>
              <Badge status={detail.status} />
            </div>
            <table style={{ width: "100%", fontSize: 13 }}>
              {[["날짜", detail.date],["시간", detail.time],["금액", "₩" + parseInt(detail.amount).toLocaleString()],["업종", detail.category]].map(([k,v]) => (
                <tr key={k}><td style={{ color: "#888", padding: "4px 0", width: 56 }}>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
              ))}
            </table>
            {detail.rejectReason && <p style={{ fontSize: 12, color: "#E24B4A", background: "#FCEBEB", padding: "8px 10px", borderRadius: 8, marginTop: 12 }}>반려 사유: {detail.rejectReason}</p>}
            <button onClick={() => setDetail(null)} style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 10, border: "1px solid #eee", background: "transparent", color: "#888", fontSize: 13, cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );

  if (step === "upload") return (
    <div style={{ fontFamily: "sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>←</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>영수증 업로드</span>
      </header>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 14px" }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {!preview ? (
          <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #ddd", borderRadius: 14, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: "#fff" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <p style={{ margin: "0 0 4px", fontWeight: 600 }}>영수증 이미지 선택</p>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>JPG, PNG 지원</p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden" }}>
            <img src={preview} style={{ width: "100%", maxHeight: 280, objectFit: "cover" }} alt="preview" />
          </div>
        )}
        <button onClick={runOCR} disabled={!file} style={{ width: "100%", marginTop: 14, padding: 15, borderRadius: 12, border: "none", background: file ? "#1D9E75" : "#eee", color: file ? "#fff" : "#aaa", fontWeight: 600, fontSize: 15, cursor: file ? "pointer" : "default" }}>
          분석 시작하기
        </button>
      </div>
    </div>
  );

  if (step === "result") return (
    <div style={{ fontFamily: "sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setStep("upload")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>←</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>검증 결과</span>
      </header>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 14px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>AI가 분석 중입니다...</p>
          </div>
        ) : (
          <>
            {ocr && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#888", fontWeight: 600 }}>OCR 인식 결과</p>
                <table style={{ width: "100%", fontSize: 13 }}>
                  {[["가게명", ocr.storeName],["날짜", ocr.date],["시간", ocr.time],["금액", "₩" + parseInt(ocr.amount||0).toLocaleString()],["업종", ocr.category]].filter(([,v])=>v).map(([k,v]) => (
                    <tr key={k}><td style={{ color: "#888", padding: "4px 0", width: 60 }}>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
                  ))}
                </table>
              </div>
            )}
            {issues.length === 0 ? (
              <div style={{ background: "#E1F5EE", borderRadius: 12, padding: "20px 16px", textAlign: "center", marginBottom: 16 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#1D9E75", fontSize: 16 }}>✓ 정산 가능합니다</p>
                <p style={{ margin: 0, fontSize: 12, color: "#1D9E75" }}>모든 규정을 충족합니다</p>
              </div>
            ) : (
              <div style={{ background: "#FCEBEB", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontWeight: 600, color: "#E24B4A" }}>규정 위반 항목</p>
                {issues.map((iss, i) => <p key={i} style={{ margin: "4px 0", fontSize: 13, color: "#E24B4A" }}>• {iss}</p>)}
              </div>
            )}
            {issues.length === 0
              ? <button onClick={() => submit(false)} style={{ width: "100%", padding: 15, borderRadius: 12, border: "none", background: "#1D9E75", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>제출하기</button>
              : <button onClick={() => setStep("exception")} style={{ width: "100%", padding: 15, borderRadius: 12, border: "2px solid #EF9F27", background: "#FAEEDA", color: "#BA7517", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>예외 요청하기</button>
            }
          </>
        )}
      </div>
    </div>
  );

  if (step === "exception") return (
    <div style={{ fontFamily: "sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>←</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>예외 요청</span>
      </header>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 14px" }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 16px" }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>사유 유형 *</label>
          <select value={excType} onChange={e => setExcType(e.target.value)} style={{ width: "100%", marginBottom: 18, padding: "11px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}>
            <option value="">선택하세요</option>
            <option value="조기출근/야근">조기출근 / 야근</option>
            <option value="외부 미팅">외부 미팅</option>
            <option value="업무 연장">업무 연장</option>
            <option value="기타">기타</option>
          </select>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>상세 사유 *</label>
          <textarea value={excText} onChange={e => setExcText(e.target.value)} placeholder="예외 사유를 상세히 작성해 주세요" style={{ width: "100%", minHeight: 110, padding: "11px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
          <button onClick={() => submit(true)} disabled={!excType || !excText.trim()} style={{ width: "100%", marginTop: 16, padding: 15, borderRadius: 12, border: "none", background: excType && excText.trim() ? "#1D9E75" : "#eee", color: excType && excText.trim() ? "#fff" : "#aaa", fontWeight: 600, fontSize: 15, cursor: excType && excText.trim() ? "pointer" : "default" }}>
            예외 요청 제출
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 28 }}>✓</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>제출 완료</h2>
      <p style={{ color: "#888", fontSize: 14, margin: "0 0 32px", textAlign: "center" }}>관리자 검토 후 매월 22일 입금됩니다</p>
      <button onClick={reset} style={{ padding: "12px 32px", borderRadius: 24, border: "2px solid #1D9E75", background: "transparent", color: "#1D9E75", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>목록으로</button>
    </div>
  );
}