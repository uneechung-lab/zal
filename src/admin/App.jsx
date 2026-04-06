import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const sbFetch = (path, options = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...options,
  headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation", ...(options.headers || {}) }
});

const DEMO = [
  { id: 1, name: "김민준", dept: "개발팀", date: "2026-04-03", time: "12:15", amount: "9500", category: "한식", storeName: "김밥나라", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 2, name: "이서연", dept: "마케팅팀", date: "2026-04-03", time: "09:30", amount: "8000", category: "카페", storeName: "스타벅스", status: "예외요청", issues: ["사용 가능 시간(10:00~14:00) 외 사용입니다."], exceptionReason: "[조기출근/야근] 오전 6시 긴급 장애 대응 후 식사", rejectReason: "" },
  { id: 3, name: "박지호", dept: "디자인팀", date: "2026-04-04", time: "13:00", amount: "12000", category: "일식", storeName: "스시로", status: "승인완료", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 4, name: "최유나", dept: "개발팀", date: "2026-04-05", time: "15:30", amount: "7500", category: "분식", storeName: "엽기떡볶이", status: "반려", issues: ["사용 가능 시간(10:00~14:00) 외 사용입니다."], exceptionReason: "", rejectReason: "시간 외 사용으로 지급 불가" },
  { id: 5, name: "정수빈", dept: "기획팀", date: "2026-04-07", time: "12:00", amount: "11000", category: "한식", storeName: "한솥도시락", status: "승인대기", issues: [], exceptionReason: "", rejectReason: "" },
];

function Badge({ status }) {
  const map = {
    "승인대기": { bg: "#E6F1FB", color: "#378ADD", label: "승인 대기" },
    "승인완료": { bg: "#E1F5EE", color: "#1D9E75", label: "승인 완료" },
    "예외요청": { bg: "#FAEEDA", color: "#BA7517", label: "예외 요청" },
    "반려": { bg: "#FCEBEB", color: "#E24B4A", label: "반려" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{s.label}</span>;
}

export default function App() {
  const [subs, setSubs] = useState(DEMO);
  const [tab, setTab] = useState("list");
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState([]);
  const [detail, setDetail] = useState(null);
  const [rejectText, setRejectText] = useState("");

  // 업종 관리
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [catMsg, setCatMsg] = useState("");

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    const res = await sbFetch("allowed_categories?select=id,name&order=name");
    const data = await res.json();
    setCategories(data);
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    setCatLoading(true);
    const res = await sbFetch("allowed_categories", { method: "POST", body: JSON.stringify({ name: newCat.trim() }) });
    if (res.ok) { setCatMsg("✅ 추가 완료!"); setNewCat(""); await loadCategories(); }
    else { const err = await res.json(); setCatMsg("❌ " + (err.message || "오류 발생")); }
    setCatLoading(false);
    setTimeout(() => setCatMsg(""), 3000);
  };

  const deleteCategory = async (id, name) => {
    if (!window.confirm(`"${name}" 업종을 삭제할까요?`)) return;
    await sbFetch(`allowed_categories?id=eq.${id}`, { method: "DELETE" });
    await loadCategories();
  };

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
    <div style={{ fontFamily: "sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>잘</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>ZAL : 잘 관리자</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {cnt("예외요청") > 0 && <span style={{ background: "#FAEEDA", color: "#BA7517", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>예외 {cnt("예외요청")}건</span>}
          <span style={{ background: "#E6F1FB", color: "#378ADD", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>대기 {cnt("승인대기")}건</span>
        </div>
      </header>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 16px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {[["list","내역 관리"],["stats","통계"],["payout","지급 예정"],["categories","업종 관리"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontSize: 13, padding: "8px 16px", borderRadius: 20, border: "1px solid " + (tab === t ? "#1D9E75" : "#ddd"), background: tab === t ? "#E1F5EE" : "transparent", color: tab === t ? "#1D9E75" : "#888", cursor: "pointer", fontWeight: tab === t ? 600 : 400 }}>{label}</button>
          ))}
        </div>

        {/* 업종 관리 탭 */}
        {tab === "categories" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 14 }}>새 업종 추가</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} placeholder="예: 분식, 아이스크림, 도시락" style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }} />
                <button onClick={addCategory} disabled={catLoading || !newCat.trim()} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: newCat.trim() ? "#1D9E75" : "#ddd", color: "#fff", fontWeight: 600, fontSize: 13, cursor: newCat.trim() ? "pointer" : "default" }}>
                  {catLoading ? "추가 중..." : "추가"}
                </button>
              </div>
              {catMsg && <p style={{ margin: "8px 0 0", fontSize: 13, color: catMsg.startsWith("✅") ? "#1D9E75" : "#E24B4A" }}>{catMsg}</p>}
            </div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>허용 업종 목록</p>
                <span style={{ fontSize: 12, color: "#888" }}>총 {categories.length}개</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 16 }}>
                {categories.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#E1F5EE", borderRadius: 20, padding: "6px 12px" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1D9E75" }}>{c.name}</span>
                    <button onClick={() => deleteCategory(c.id, c.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16, padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}>×</button>
                  </div>
                ))}
                {categories.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>업종이 없습니다.</p>}
              </div>
            </div>
          </div>
        )}

        {/* 통계 탭 */}
        {tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
              {[["전체 제출", subs.length, "#378ADD"],["승인 완료", cnt("승인완료"), "#1D9E75"],["예외 요청", cnt("예외요청"), "#EF9F27"],["반려", cnt("반려"), "#E24B4A"]].map(([label, value, color]) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "#888" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 14 }}>부서별 현황</p>
              {[...new Set(subs.map(s => s.dept))].map(dept => {
                const items = subs.filter(s => s.dept === dept);
                const approved = items.filter(s => s.status === "승인완료");
                return (
                  <div key={dept} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{dept}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{items.length}건 제출 · {approved.length}건 승인</p>
                    </div>
                    <span style={{ fontWeight: 600, color: "#1D9E75" }}>₩{approved.reduce((a,s)=>a+parseInt(s.amount),0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 지급 예정 탭 */}
        {tab === "payout" && (
          <div>
            <div style={{ background: "#E1F5EE", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#1D9E75" }}>2026년 4월 지급 예정 총액</p>
              <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color: "#1D9E75" }}>₩{approvedTotal.toLocaleString()}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#1D9E75" }}>지급일: 2026년 4월 22일</p>
            </div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9f9f9" }}>
                    {["직원명","부서","승인 건수","지급 예정액"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "#888" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(name => {
                    const empSubs = subs.filter(s => s.name === name);
                    const approved = empSubs.filter(s => s.status === "승인완료");
                    const total = approved.reduce((a,s)=>a+parseInt(s.amount),0);
                    return (
                      <tr key={name} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{name}</td>
                        <td style={{ padding: "12px 16px", color: "#888" }}>{empSubs[0]?.dept}</td>
                        <td style={{ padding: "12px 16px" }}>{approved.length}건</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: total > 0 ? "#1D9E75" : "#aaa" }}>₩{total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 내역 관리 탭 */}
        {tab === "list" && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 날짜, 업종, 부서 검색" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, marginBottom: 12, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {statuses.map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20, border: "1px solid " + (filter === s ? "#1D9E75" : "#ddd"), background: filter === s ? "#E1F5EE" : "transparent", color: filter === s ? "#1D9E75" : "#888", cursor: "pointer" }}>
                  {s} ({s === "전체" ? subs.length : cnt(s)})
                </button>
              ))}
            </div>
            {checked.length > 0 && (
              <div style={{ background: "#E6F1FB", borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#378ADD" }}>{checked.length}건 선택됨</span>
                <button onClick={batchApprove} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: 600 }}>일괄 승인</button>
              </div>
            )}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              {filtered.length === 0
                ? <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "40px 0" }}>해당 내역이 없습니다.</p>
                : filtered.map((s, i) => (
                  <div key={s.id} style={{ borderTop: i === 0 ? "none" : "1px solid #eee", padding: "14px 16px", background: s.status === "예외요청" ? "#FFFDF5" : "#fff" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <input type="checkbox" checked={checked.includes(s.id)} onChange={e => setChecked(p => e.target.checked ? [...p, s.id] : p.filter(id => id !== s.id))} style={{ marginTop: 4 }} />
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setDetail(s); setRejectText(""); }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                            <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{s.dept}</span>
                          </div>
                          <Badge status={s.status} />
                        </div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{s.date} {s.time} · {s.storeName} · {s.category}</div>
                        <span style={{ fontWeight: 600 }}>₩{parseInt(s.amount).toLocaleString()}</span>
                        {s.exceptionReason && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#BA7517", background: "#FAEEDA", padding: "5px 8px", borderRadius: 6 }}>{s.exceptionReason}</p>}
                      </div>
                      {(s.status === "승인대기" || s.status === "예외요청") && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => approve(s.id)} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: 600 }}>승인</button>
                          <button onClick={() => { setDetail(s); setRejectText(""); }} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "1px solid #E24B4A", background: "#FCEBEB", color: "#E24B4A", cursor: "pointer", fontWeight: 600 }}>반려</button>
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
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 16 }}>{detail.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{detail.dept}</p>
              </div>
              <Badge status={detail.status} />
            </div>
            <table style={{ width: "100%", fontSize: 13, marginBottom: 14 }}>
              {[["가게명", detail.storeName],["날짜", detail.date],["시간", detail.time],["금액", "₩" + parseInt(detail.amount).toLocaleString()],["업종", detail.category]].map(([k,v]) => (
                <tr key={k}><td style={{ color: "#888", padding: "5px 0", width: 64 }}>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
              ))}
            </table>
            {detail.issues?.length > 0 && (
              <div style={{ background: "#FCEBEB", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#E24B4A", fontSize: 13 }}>규정 위반</p>
                {detail.issues.map((iss,i) => <p key={i} style={{ margin: "3px 0", fontSize: 13, color: "#E24B4A" }}>• {iss}</p>)}
              </div>
            )}
            {detail.exceptionReason && <div style={{ background: "#FAEEDA", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "#BA7517" }}>예외 사유: {detail.exceptionReason}</div>}
            {detail.rejectReason && <div style={{ background: "#FCEBEB", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "#E24B4A" }}>반려 사유: {detail.rejectReason}</div>}
            {(detail.status === "승인대기" || detail.status === "예외요청") && (
              <>
                <textarea value={rejectText} onChange={e => setRejectText(e.target.value)} placeholder="반려 사유 입력 (반려 시 필수)" style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, minHeight: 80, boxSizing: "border-box", resize: "vertical", marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => approve(detail.id)} style={{ flex: 1, padding: 13, borderRadius: 10, border: "none", background: "#1D9E75", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>승인</button>
                  <button onClick={() => { if (!rejectText.trim()) { alert("반려 사유를 입력해 주세요"); return; } reject(detail.id, rejectText); }} style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid #E24B4A", background: "#FCEBEB", color: "#E24B4A", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>반려</button>
                </div>
              </>
            )}
            {detail.status !== "승인대기" && detail.status !== "예외요청" && (
              <button onClick={() => setDetail(null)} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd", background: "transparent", color: "#888", fontSize: 13, cursor: "pointer" }}>닫기</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}