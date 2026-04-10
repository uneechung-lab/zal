import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const sbFetch = (path, options = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...options,
  headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation", ...(options.headers || {}) }
});

const DEMO = [
  { id: 1, name: "김민준", dept: "개발팀", date: "2026-04-03", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 2, name: "이서연", dept: "마케팅팀", date: "2026-04-03", time: "09:30", amount: "8000", category: "카페", storeName: "스타벅스", status: "예외요청", issues: ["사용 가능 시간(10:00~14:00) 외 사용"], exceptionReason: "조기출근 긴급 장애 대응", rejectReason: "" },
  { id: 3, name: "박지호", dept: "디자인팀", date: "2026-04-04", time: "13:00", amount: "12000", category: "일식", storeName: "스시로", status: "승인완료", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 4, name: "최유나", dept: "개발팀", date: "2026-04-05", time: "15:30", amount: "7500", category: "분식", storeName: "엽기떡볶이", status: "반려", issues: ["시간 외 사용"], exceptionReason: "", rejectReason: "시간 외 사용으로 지급 불가" },
];

function Badge({ status }) {
  const map = {
    "승인대기": { bg: "#E6F1FB", color: "#378ADD", label: "승인 대기" },
    "승인완료": { bg: "#E1F5EE", color: "#1D9E75", label: "승인 완료" },
    "예외요청": { bg: "#FAEEDA", color: "#BA7517", label: "예외 요청" },
    "반려": { bg: "#FCEBEB", color: "#E24B4A", label: "반려" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>{s.label}</span>;
}

export default function App() {
  const [subs, setSubs] = useState(DEMO);
  const [tab, setTab] = useState("list");
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [rejectText, setRejectText] = useState("");
  const [reply, setReply] = useState("");
  const [chatLogs, setChatLogs] = useState({});

  const filtered = subs.filter(s => {
    const mf = filter === "전체" || s.status === filter;
    const ms = !search || s.name.includes(search) || s.storeName.includes(search);
    return mf && ms;
  });

  const approve = (id) => { setSubs(p => p.map(s => s.id === id ? { ...s, status: "승인완료" } : s)); setDetail(null); };
  const reject = (id, reason) => { setSubs(p => p.map(s => s.id === id ? { ...s, status: "반려", rejectReason: reason } : s)); setDetail(null); };

  return (
    <div style={{ background: "#f8f9fa", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>ZAL 관리자 콘솔</h1>
          <div style={{ display: "flex", gap: 12 }}>
             {["전체", "승인대기", "예외요청", "승인완료", "반려"].map(f => (
               <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: filter === f ? "#000" : "#fff", color: filter === f ? "#fff" : "#888", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{f}</button>
             ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
             <thead>
               <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                 {["이름", "날짜/시간", "가맹점", "금액", "상태", "액션"].map(h => <th key={h} style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, color: "#888" }}>{h}</th>)}
               </tr>
             </thead>
             <tbody>
               {filtered.map(s => (
                 <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                   <td style={{ padding: "20px", fontWeight: 700 }}>{s.name}<br/><span style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{s.dept}</span></td>
                   <td style={{ padding: "20px", fontSize: 13 }}>{s.date}<br/>{s.time}</td>
                   <td style={{ padding: "20px", fontSize: 13 }}>{s.storeName}</td>
                   <td style={{ padding: "20px", fontWeight: 700 }}>{parseInt(s.amount).toLocaleString()}원</td>
                   <td style={{ padding: "20px" }}><Badge status={s.status} /></td>
                   <td style={{ padding: "20px" }}>
                      <button onClick={() => setDetail(s)} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #eee", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>상세보기</button>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, borderRadius: 32, padding: 32, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
               <h2 style={{ fontSize: 20, fontWeight: 900 }}>정산 상세 정보</h2>
               <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>직원명</span><span style={{ fontWeight: 700 }}>{detail.name} ({detail.dept})</span></div>
               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>가맹점</span><span style={{ fontWeight: 700 }}>{detail.storeName} ({detail.category})</span></div>
               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>금액</span><span style={{ fontWeight: 700 }}>{parseInt(detail.amount).toLocaleString()}원</span></div>
            </div>

            {detail.issues.length > 0 && (
              <div style={{ background: "#FDF2F2", padding: 16, borderRadius: 16, border: "1px solid #FEE2E2", marginBottom: 24 }}>
                <p style={{ color: "#E24B4A", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>규정 위반 항목</p>
                {detail.issues.map((iss, i) => <p key={i} style={{ color: "#E24B4A", fontSize: 13 }}>• {iss}</p>)}
              </div>
            )}

            {detail.exceptionReason && (
              <div style={{ background: "#FEF3E2", padding: 16, borderRadius: 16, marginBottom: 24 }}>
                <p style={{ color: "#BA7517", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>직원 예외 신청 사유</p>
                <p style={{ fontSize: 13, color: "#BA7517" }}>{detail.exceptionReason}</p>
              </div>
            )}

            {/* Chat History Section */}
            <div style={{ borderTop: "1px solid #eee", paddingTop: 24, marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#888", marginBottom: 16 }}>직원과의 메시지</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                 {(chatLogs[detail.id] || []).map((c, i) => (
                   <div key={i} style={{ alignSelf: c.sender === "admin" ? "flex-end" : "flex-start", background: c.sender === "admin" ? "#000" : "#f5f5f5", color: c.sender === "admin" ? "#fff" : "#111", padding: "10px 14px", borderRadius: 16, fontSize: 13 }}>{c.text}</div>
                 ))}
                 {(chatLogs[detail.id] || []).length === 0 && <p style={{ color: "#ccc", fontSize: 13, textAlign: "center" }}>주고받은 메시지가 없습니다.</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="직원에게 메시지 보내기" style={{ flex: 1, padding: "10px 16px", borderRadius: 12, border: "1.5 solid #eee", fontSize: 13 }} />
                <button onClick={() => { if(reply.trim()) { setChatLogs(p => ({ ...p, [detail.id]: [...(p[detail.id] || []), { sender: "admin", text: reply }] })); setReply(""); } }} style={{ padding: "10px 20px", background: "#000", color: "#fff", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>전송</button>
              </div>
            </div>

            {(detail.status === "승인대기" || detail.status === "예외요청") && (
              <div style={{ borderTop: "1px solid #eee", paddingTop: 24 }}>
                <textarea 
                  value={rejectText} 
                  onChange={e => setRejectText(e.target.value)} 
                  placeholder="반려 사유를 입력하세요 (반려 시 필수)" 
                  style={{ width: "100%", padding: 12, borderRadius: 12, border: "1.5px solid #eee", fontSize: 13, minHeight: 80, marginBottom: 16 }}
                />
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => approve(detail.id)} style={{ flex: 1, padding: 16, background: "#1D9E75", color: "#fff", borderRadius: 16, border: "none", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>승인 완료</button>
                  <button 
                    onClick={() => { 
                      if(!rejectText.trim()) return alert("반려 사유를 입력해 주세요.");
                      reject(detail.id, rejectText); 
                    }} 
                    style={{ flex: 1, padding: 16, background: "#FCEBEB", color: "#E24B4A", borderRadius: 16, border: "1px solid #FEE2E2", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
                  >반려 처리</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}