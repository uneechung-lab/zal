import { useState } from "react";
// ZAL Admin v1.0

const C = {
  primary: "#1D9E75", primaryLight: "#E1F5EE",
  danger: "#E24B4A", dangerLight: "#FCEBEB",
  warning: "#EF9F27", warningLight: "#FAEEDA",
  info: "#378ADD", infoLight: "#E6F1FB",
  gray: "#888780", grayLight: "#F1EFE8",
  border: "rgba(0,0,0,0.12)",
};

const DEMO = [
  { id: 1, name: "김민준", dept: "개발팀", date: "2026-04-03", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 2, name: "이서연", dept: "마케팅팀", date: "2026-04-03", time: "09:30", amount: "8000", category: "카페", storeName: "스타벅스", status: "예외요청", issues: ["사용 가능 시간(10:00~14:00) 외 사용입니다."], exceptionReason: "[조기출근/야근] 오전 6시 긴급 장애 대응 후 식사", rejectReason: "" },
  { id: 3, name: "박지호", dept: "디자인팀", date: "2026-04-04", time: "13:00", amount: "12000", category: "일식", storeName: "스시로", status: "승인완료", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 4, name: "최유나", dept: "개발팀", date: "2026-04-05", time: "15:30", amount: "7500", category: "분식", storeName: "엽기떡볶이", status: "반려", issues: ["사용 가능 시간(10:00~14:00) 외 사용입니다."], exceptionReason: "", rejectReason: "시간 외 사용으로 지급 불가" },
  { id: 5, name: "정수빈", dept: "기획팀", date: "2026-04-07", time: "12:00", amount: "11000", category: "한식", storeName: "한솥도시락", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 6, name: "이서연", dept: "마케팅팀", date: "2026-04-07", time: "12:45", amount: "9000", category: "양식", storeName: "쉐이크쉑", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 7, name: "김민준", dept: "개발팀", date: "2026-04-08", time: "13:10", amount: "10500", category: "중식", storeName: "홍콩반점", status: "승인완료", issues: [], exceptionReason: "", rejectReason: "" },
];

function Badge({ status }) {
  const map = {
    "승인대기": { bg: C.infoLight, color: C.info, label: "승인 대기" },
    "승인완료": { bg: C.primaryLight, color: C.primary, label: "승인 완료" },
    "예외요청": { bg: C.warningLight, color: "#BA7517", label: "예외 요청" },
    "반려": { bg: C.dangerLight, color: C.danger, label: "반려" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>{sub}</p>}
    </div>
  );
}

export default function App() {
  const [subs, setSubs] = useState(DEMO);
  const [tab, setTab] = useState("list");
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState([]);
  const [detail, setDetail] = useState(null);
  const [rejectText, setRejectText] = useState("");

  const statuses = ["전체", "승인대기", "예외요청", "승인완료", "반려"];
  const cnt = (st) => subs.filter(s => s.status === st).length;

  const filtered = subs.filter(s => {
    const mf = filter === "전체" || s.status === filter;
    const ms = !search || s.name.includes(search) || s.date.includes(search) || s.category.includes(search) || s.dept.includes(search);
    return mf && ms;
  });

  const approve = (id) => { setSubs(p => p.map(s => s.id === id ? { ...s, status: "승인완료" } : s)); setDetail(null); };
  const reject = (id, reason) => { setSubs(p => p.map(s => s.id === id ? { ...s, status: "반려", rejectReason: reason } : s)); setDetail(null); };
  const batchApprove = () => { setSubs(p => p.map(s => checked.includes(s.id) && s.status === "승인대기" ? { ...s, status: "승인완료" } : s)); setChecked([]); };

  const approvedTotal = subs.filter(s => s.status === "승인완료").reduce((a, s) => a + parseInt(s.amount), 0);
  const employees = [...new Set(subs.map(s => s.name))];

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--color-background-tertiary)", minHeight: "100vh" }}>
      <header style={{ background: "var(--color-background-primary)", borderBottom: `0.5px solid ${C.border}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>잘</div>
          <div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 15, lineHeight: 1.2 }}>ZAL : 잘 관리자</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>식대 정산 대시보드</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {cnt("예외요청") > 0 && <span style={{ background: C.warningLight, color: "#BA7517", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 20 }}>예외 {cnt("예외요청")}건</span>}
          <span style={{ background: C.infoLight, color: C.info, fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 20 }}>대기 {cnt("승인대기")}건</span>
        </div>
      </header>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 16px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {["list", "stats", "payout"].map((t, i) => {
            const labels = ["내역 관리", "통계", "지급 예정"];
            return <button key={t} onClick={() => setTab(t)} style={{ fontSize: 13, padding: "8px 16px", borderRadius: 20, border: `1px solid ${tab === t ? C.primary : C.border}`, background: tab === t ? C.primaryLight : "transparent", color: tab === t ? C.primary : "var(--color-text-secondary)", cursor: "pointer", fontWeight: tab === t ? 500 : 400 }}>{labels[i]}</button>;
          })}
        </div>

        {tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
              <StatCard label="전체 제출" value={subs.length} color={C.info} />
              <StatCard label="승인 완료" value={cnt("승인완료")} color={C.primary} />
              <StatCard label="예외 요청" value={cnt("예외요청")} color={C.warning} />
              <StatCard label="반려" value={cnt("반려")} color={C.danger} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <StatCard label="이번 달 지급 예정" value={`₩${approvedTotal.toLocaleString()}`} color={C.primary} sub="승인 완료 기준 · 매월 22일 지급" />
              <StatCard label="승인 처리율" value={`${subs.length ? Math.round((cnt("승인완료") / subs.length) * 100) : 0}%`} color={C.primary} sub={`총 ${subs.length}건 중 ${cnt("승인완료")}건`} />
            </div>
            <div style={{ background: "var(--color-background-primary)", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 14px", fontWeight: 500, fontSize: 14 }}>부서별 현황</p>
              {[...new Set(subs.map(s => s.dept))].map(dept => {
                const items = subs.filter(s => s.dept === dept);
                const approved = items.filter(s => s.status === "승인완료");
                return (
                  <div key={dept} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${C.border}` }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{dept}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{items.length}건 제출 · {approved.length}건 승인</p>
                    </div>
                    <span style={{ fontWeight: 500, fontSize: 14, color: C.primary }}>₩{approved.reduce((a,s)=>a+parseInt(s.amount),0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "payout" && (
          <div>
            <div style={{ background: C.primaryLight, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: C.primary }}>2026년 4월 지급 예정 총액</p>
              <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 500, color: C.primary }}>₩{approvedTotal.toLocaleString()}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.primary }}>지급일: 2026년 4월 22일 (수)</p>
            </div>
            <div style={{ background: "var(--color-background-primary)", border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `0.5px solid ${C.border}` }}>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>직원별 지급 예정 내역</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)" }}>
                    {["직원명", "부서", "승인 건수", "지급 예정액", "상태"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, fontSize: 12, color: "var(--color-text-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(name => {
                    const empSubs = subs.filter(s => s.name === name);
                    const approved = empSubs.filter(s => s.status === "승인완료");
                    const total = approved.reduce((a,s)=>a+parseInt(s.amount),0);
                    const dept = empSubs[0]?.dept || "";
                    return (
                      <tr key={name} style={{ borderTop: `0.5px solid ${C.border}` }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>{name}</td>
                        <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>{dept}</td>
                        <td style={{ padding: "12px 16px" }}>{approved.length}건</td>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: total > 0 ? C.primary : "var(--color-text-secondary)" }}>₩{total.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px" }}>{total > 0 ? <span style={{ background: C.primaryLight, color: C.primary, fontSize: 11, padding: "3px 8px", borderRadius: 20 }}>지급 예정</span> : <span style={{ background: C.grayLight, color: C.gray, fontSize: 11, padding: "3px 8px", borderRadius: 20 }}>해당 없음</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "list" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 날짜, 업종, 부서 검색" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {statuses.map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20, border: `1px solid ${filter === s ? C.primary : C.border}`, background: filter === s ? C.primaryLight : "transparent", color: filter === s ? C.primary : "var(--color-text-secondary)", cursor: "pointer" }}>
                  {s} ({s === "전체" ? subs.length : cnt(s)})
                </button>
              ))}
            </div>
            {checked.length > 0 && (
              <div style={{ background: C.infoLight, borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.info }}>{checked.length}건 선택됨</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setChecked([])} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.border}`, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>선택 해제</button>
                  <button onClick={batchApprove} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, border: "none", background: C.primary, color: "#fff", cursor: "pointer", fontWeight: 500 }}>일괄 승인</button>
                </div>
              </div>
            )}
            <div style={{ background: "var(--color-background-primary)", border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              {filtered.length === 0
                ? <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13, padding: "40px 0" }}>해당 내역이 없습니다.</p>
                : filtered.map((s, i) => (
                  <div key={s.id} style={{ borderTop: i === 0 ? "none" : `0.5px solid ${C.border}`, padding: "14px 16px", background: s.status === "예외요청" ? C.warningLight + "55" : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <input type="checkbox" checked={checked.includes(s.id)} onChange={e => setChecked(p => e.target.checked ? [...p, s.id] : p.filter(id => id !== s.id))} style={{ marginTop: 4, flexShrink: 0 }} />
                      <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => { setDetail(s); setRejectText(""); }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <div>
                            <span style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</span>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8 }}>{s.dept}</span>
                          </div>
                          <Badge status={s.status} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{s.date} {s.time} · {s.storeName} · {s.category}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 500, fontSize: 14 }}>₩{parseInt(s.amount).toLocaleString()}</span>
                          {s.issues?.length > 0 && <span style={{ fontSize: 12, color: s.status === "예외요청" ? "#BA7517" : C.danger }}>{s.issues[0]}</span>}
                        </div>
                        {s.exceptionReason && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#BA7517", background: C.warningLight, padding: "5px 8px", borderRadius: 6 }}>{s.exceptionReason}</p>}
                      </div>
                      {(s.status === "승인대기" || s.status === "예외요청") && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => approve(s.id)} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "none", background: C.primary, color: "#fff", cursor: "pointer", fontWeight: 500 }}>승인</button>
                          <button onClick={() => { setDetail(s); setRejectText(""); }} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.danger}`, background: C.dangerLight, color: C.danger, cursor: "pointer", fontWeight: 500 }}>반려</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}
      </div>

      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => { setDetail(null); setRejectText(""); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 500, fontSize: 16 }}>{detail.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{detail.dept}</p>
              </div>
              <Badge status={detail.status} />
            </div>
            <table style={{ width: "100%", fontSize: 13, marginBottom: 14 }}>
              {[["가게명", detail.storeName], ["날짜", detail.date], ["시간", detail.time], ["금액", `₩${parseInt(detail.amount).toLocaleString()}`], ["업종", detail.category]].map(([k,v]) => (
                <tr key={k}><td style={{ color: "var(--color-text-secondary)", padding: "5px 0", width: 64 }}>{k}</td><td style={{ fontWeight: 500 }}>{v}</td></tr>
              ))}
            </table>
            {detail.issues?.length > 0 && (
              <div style={{ background: C.dangerLight, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 500, color: C.danger, fontSize: 13 }}>규정 위반</p>
                {detail.issues.map((iss,i) => <p key={i} style={{ margin: "3px 0", fontSize: 13, color: C.danger }}>• {iss}</p>)}
              </div>
            )}
            {detail.exceptionReason && <div style={{ background: C.warningLight, borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "#BA7517" }}>예외 사유: {detail.exceptionReason}</div>}
            {detail.rejectReason && <div style={{ background: C.dangerLight, borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 13, color: C.danger }}>반려 사유: {detail.rejectReason}</div>}
            {(detail.status === "승인대기" || detail.status === "예외요청") && (
              <>
                <textarea value={rejectText} onChange={e => setRejectText(e.target.value)} placeholder="반려 사유 입력 (반려 처리 시 필수)" style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: `0.5px solid ${C.border}`, fontSize: 13, minHeight: 80, boxSizing: "border-box", resize: "vertical", marginBottom: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => approve(detail.id)} style={{ flex: 1, padding: 13, borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>승인</button>
                  <button onClick={() => { if (!rejectText.trim()) { alert("반려 사유를 입력해 주세요"); return; } reject(detail.id, rejectText); }} style={{ flex: 1, padding: 13, borderRadius: 10, border: `1px solid ${C.danger}`, background: C.dangerLight, color: C.danger, fontWeight: 500, fontSize: 14, cursor: "pointer" }}>반려</button>
                </div>
              </>
            )}
            {detail.status !== "승인대기" && detail.status !== "예외요청" && (
              <button onClick={() => setDetail(null)} style={{ width: "100%", padding: 12, borderRadius: 10, border: `0.5px solid ${C.border}`, background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>닫기</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}