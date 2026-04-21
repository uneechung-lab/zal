import { useState, useRef, useEffect, useMemo } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    if (tot < 600 || tot > 840) issues.push(`결제 시간(${d.time})이 정산 허용 시간(10:00~14:00)을 지났습니다.`);
  }

  if (!d.date) {
    issues.push("날짜 정보를 확인할 수 없습니다.");
  } else {
    const dow = new Date(d.date).getDay();
    if (dow === 0 || dow === 6) issues.push("주말/공휴일 사용은 지원되지 않습니다.");
  }

  const catMatch = allowed.some(t => {
    const cStr = (d.category || "").split(/[\/,·\s]/);
    return cStr.some(c => c.trim() && (c.trim().includes(t) || t.includes(c.trim())));
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

function getWeeksInMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let current = new Date(firstDay);
  // Find Monday of the week containing the first day
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() - 1);
  }
  
  while (current <= lastDay) {
    const week = [];
    let hasDayInMonth = false;
    for (let i = 0; i < 5; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        week.push(d);
        hasDayInMonth = true;
      } else {
        week.push(null);
      }
    }
    if (hasDayInMonth) weeks.push(week);
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getWeekDates(year, month, week) {
  return getWeeksInMonth(year, month)[week - 1] || [];
}

function getWeekCount(year, month) {
  return getWeeksInMonth(year, month).length;
}

function Badge({ status }) {
  const map = {
    "승인완료": { bg: "#E2F5EC", color: "#16a34a", label: "승인" },
    "예외요청": { bg: "#FEF3E2", color: "#B87020", label: "보류" },
    "보류": { bg: "#FEF3E2", color: "#B87020", label: "보류" },
    "반려": { bg: "#FDECEA", color: "#C0392B", label: "반려" },
    "승인대기": { bg: "#f5f5f5", color: "#999", label: "대기" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
}

const Icon = {
  Back: ({ color = "#111", size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  ChevronLeft: ({ color = "#111", size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: ({ color = "#111", size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  ChevronDown: ({ color = "#111", size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  Send: ({ color = "#fff", size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Close: ({ color = "#999", size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Trash: ({ color = "#666", size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill={color}/>
    </svg>
  ),
  Alert: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#E24B4A"/>
      <path d="M12 7V13" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1.5" fill="white"/>
    </svg>
  )
};

function BottomSheetPicker({ isOpen, onClose, year, month, week, onConfirm }) {
  const [tempY, setTempY] = useState(year);
  const [tempM, setTempM] = useState(month);
  const [tempW, setTempW] = useState(week);

  useEffect(() => { 
    if (isOpen) { 
      setTempY(year); setTempM(month); setTempW(week); 
    } 
  }, [isOpen, year, month, week]);

  const now = new Date();
  const limitDate = new Date();
  limitDate.setMonth(now.getMonth() - 3);

  const years = [2024, 2025, 2026, 2027].filter(y => y >= limitDate.getFullYear() && y <= now.getFullYear());
  const months = Array.from({length: 12}, (_, i) => i + 1).filter(m => {
    const firstDay = new Date(tempY, m - 1, 1);
    const lastDay = new Date(tempY, m, 0);
    return lastDay >= limitDate && firstDay <= now;
  });
  const wCnt = getWeekCount(tempY, tempM);
  const weeks = Array.from({length: wCnt}, (_, i) => i + 1).filter(w => {
    const dates = getWeekDates(tempY, tempM, w);
    return dates.some(d => d >= limitDate && d <= now);
  });

  useEffect(() => { if (isOpen && !months.includes(tempM)) setTempM(months[months.length - 1] || 1); }, [tempY, isOpen, months, tempM]);
  useEffect(() => { if (isOpen && !weeks.includes(tempW)) setTempW(weeks[weeks.length - 1] || 1); }, [tempM, tempY, isOpen, weeks, tempW]);

  if (!isOpen) return null;

  const Col = ({ options, selected, onSelect }) => {
    const listRef = useRef();

    useEffect(() => {
      if (isOpen && listRef.current) {
        const idx = options.findIndex(o => o.val === selected);
        if (idx !== -1) listRef.current.scrollTop = idx * 40;
      }
    }, [isOpen]);

    const handleScroll = (e) => {
      const idx = Math.round(e.target.scrollTop / 40);
      const val = options[idx]?.val;
      if (val !== undefined && val !== selected) onSelect(val);
    };

    return (
      <div 
        ref={listRef}
        onScroll={handleScroll}
        className="no-scrollbar" 
        style={{ flex: 1, height: 210, overflowY: "auto", display: "flex", flexDirection: "column", padding: "85px 0", scrollSnapType: "y mandatory" }}
      >
        {options.map(opt => (
          <div 
            key={opt.val} 
            onClick={() => {
              onSelect(opt.val);
              listRef.current.scrollTo({ top: options.findIndex(o => o.val === opt.val) * 40, behavior: 'smooth' });
            }}
            style={{ minHeight: 40, height: 40, lineHeight: "40px", textAlign: "center", fontSize: selected === opt.val ? 24 : 19, fontWeight: selected === opt.val ? 800 : 500, color: selected === opt.val ? "#000" : "#ccc", cursor: "pointer", transition: "0.2s", scrollSnapAlign: "center" }}
          >
            {opt.label}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "#fff", borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: "40px 28px 48px", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ fontSize: 24, fontWeight: 900, color: "#111", margin: 0 }}>날짜 선택</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Close /></button>
        </div>
        <p style={{ fontSize: 13, color: "#aaa", margin: "4px 0 32px", fontWeight: 600 }}>최근 3개월간의 내역만 확인이 가능합니다.</p>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 48, marginTop: -24, borderTop: "1.5px solid #f5f5f5", borderBottom: "1.5px solid #f5f5f5", pointerEvents: "none" }} />
          <Col options={years.map(y => ({val:y, label:`${y}년`}))} selected={tempY} onSelect={setTempY} isOpen={isOpen} />
          <div style={{ width: 1.5, height: 160, background: "#f5f5f5" }} />
          <Col options={months.map(m => ({val:m, label:`${m}월`}))} selected={tempM} onSelect={setTempM} isOpen={isOpen} />
          <div style={{ width: 1.5, height: 160, background: "#f5f5f5" }} />
          <Col options={weeks.map(w => ({val:w, label:`${w}주`}))} selected={tempW} onSelect={setTempW} isOpen={isOpen} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "#fff", color: "#000", fontWeight: 800, fontSize: 17, border: "1.5px solid #000", borderRadius: 20, cursor: "pointer" }}>취소</button>
          <button onClick={() => { onConfirm(tempY, tempM, tempW); onClose(); }} style={{ flex: 1.6, padding: "18px", background: "#000", color: "#fff", fontWeight: 800, fontSize: 17, border: "none", borderRadius: 20, cursor: "pointer" }}>확인</button>
        </div>
      </div>
    </div>
  );
}

function AppDetailView({ sub, onBack, onShowImg, chats, onSendChat, replyTxt, setReplyTxt, onMarkRead, allowed, allSubs }) {
  if (!sub) return null;
  let parsedLogs = [];
  try {
     const reason = sub.reject_reason || sub.rejectReason;
     if (reason && reason.startsWith('[')) {
        parsedLogs = JSON.parse(reason);
     } else if (reason) {
        const type = (sub.status === "승인완료" || sub.status === "승인") ? "approve" : "reject";
        parsedLogs = [{ text: `[${reason}] ${type === 'approve' ? '승인' : '반려'}되었습니다.`, type, isDeleted: false, sender: 'ai', time: sub.created_at }];
     } else if (sub.status === "반려" || sub.status === "승인완료" || sub.status === "승인") {
        const type = sub.status === "반려" ? "reject" : "approve";
        const msg = sub.status === "반려" ? `[${sub.exc_text || sub.excText || "영수증 정산 요청"}] 건은 반려되었습니다.` : "승인 완료!";
        parsedLogs = [{ text: msg, type, isDeleted: false, sender: 'ai', time: sub.created_at }];
     }
  } catch (e) {}

  const getImageUrl = (data) => {
    if (!data) return null;
    return data.image_url || data.imageUrl || data.image_path || data.receipt_url || data.img || data.image || 
           Object.values(data).find(v => typeof v === "string" && (v.startsWith("http") || v.startsWith("data:image")));
  };
  const finalImage = getImageUrl(sub);
  const scrollRef = useRef(null);
  const [showShadow, setShowShadow] = useState(false);

  // 스크롤 발생 감지 (그림자 동적 노출)
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    setShowShadow(scrollTop > 5);
  };

  useEffect(() => {
    if (sub && parsedLogs.length > 0) {
      const lastMsg = parsedLogs[parsedLogs.length - 1];
      if (lastMsg && lastMsg.time) {
        onMarkRead(sub.id, lastMsg.time);
      }
    }
  }, [sub?.id, JSON.stringify(parsedLogs)]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        // 초기 렌더링 시 스크롤 필요 여부 체크 (요약 정보 영역 그림자 목적)
        setShowShadow(scrollRef.current.scrollTop > 5);
    }
  }, [sub?.id, sub?.status, parsedLogs.length]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", background: C.bg, overflow: "hidden" }}>
      <div style={{ zIndex: 10, background: C.bg, flexShrink: 0, position: "relative", boxShadow: showShadow ? "0 10px 20px -10px rgba(0,0,0,0.12)" : "none", borderBottom: showShadow ? "1px solid rgba(0,0,0,0.05)" : "none", transition: "0.2s" }}>
        <div style={{ padding: "24px 28px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>요청 상세</span>
        </div>

        <div style={{ padding: "0 28px" }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: "24px", marginBottom: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#999", fontWeight: 700 }}>{sub.date}</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#555" }}>{sub.category} · {sub.store_name || sub.storeName}</p>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                {(sub.status === "보류" || sub.status === "예외요청" || sub.status === "반려" || sub.status === "승인완료") && (
                  <div style={{ width: "100%", marginTop: 4 }}>
                    {(() => {
                      const detectedIssues = validate(sub, allowed || [], allSubs || [])
                        .filter(iss => !iss.includes("이미 제출된 내역"));
                      if (detectedIssues.length === 0) return null;
                      return detectedIssues.map((issue, idx) => {
                        const isApproved = sub.status === "승인완료";
                        return (
                          <div key={idx} style={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: 6, 
                            color: isApproved ? "rgba(226, 75, 74, 0.4)" : "#e24b4a", 
                            fontSize: 13, 
                            fontWeight: 700, 
                            lineHeight: 1.4, 
                            marginBottom: 4 
                          }}>
                            <span style={{ flexShrink: 0, marginTop: 2, opacity: isApproved ? 0.4 : 1 }}><Icon.Alert size={16} color={isApproved ? "rgba(226, 75, 74, 0.6)" : "#e24b4a"} /></span>
                            <span style={{ textDecoration: isApproved ? "line-through" : "none" }}>{issue}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    if(finalImage) onShowImg(finalImage);
                    else window.alert("영수증 데이터가 없습니다.");
                  }}
                  style={{ background: "#fff", border: "1.5px solid #000", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "8px 16px", borderRadius: 20, pointerEvents: "auto", marginTop: 8 }}
                >
                  영수증 보기
                </button>
              </div>
              {!finalImage && (
                <div style={{ background: "#FEE2E2", color: "#E24B4A", padding: "16px", borderRadius: "12px", fontSize: "12px", marginTop: "16px", fontWeight: "600", width: "100%", wordBreak: "break-all", lineHeight: 1.5 }}>
                  <span style={{ fontSize: 14 }}>⚠️ 이미지 저장 오류</span><br/>
                  DB에 넘겨준 사진 데이터가 누락되었습니다. <b>Supabase 테이블 내 컬럼명</b>을 확인해야 합니다.<br/>
                  <div style={{ background: "rgba(255,255,255,0.5)", padding: "8px", borderRadius: "6px", marginTop: "6px" }}>
                    <span style={{ color: "#333" }}>현재 DB에 존재하는 항목들:</span><br/>
                    <span style={{ color: "#000", fontWeight: 900 }}>{Object.keys(sub).join(", ")}</span>
                  </div>
                </div>
              )}
            </div>
            <Badge status={sub.status} />
          </div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, textAlign: "right" }}>₩{parseInt(sub.amount || 0).toLocaleString()}</p>
        </div>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: "200px", WebkitOverflowScrolling: "touch" }}>
        <div style={{ padding: "0 28px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ background: "#000", color: "#fff", padding: "14px 18px", borderRadius: "18px 2px 18px 18px", maxWidth: "85%", fontSize: 15, lineHeight: 1.5, fontWeight: 500 }}>
              {(() => {
                const reason = sub.exc_text || sub.excText;
                if (!reason) return "영수증 정산 요청드립니다.";
                
                // 미리 정의된 기본 칩 모음
                const PRESETS = ["업무 미팅 지연", "야근 후 늦은 점심", "식당 결제 시스템 오류", "외부 미팅 연장"];
                const isPreset = PRESETS.includes(reason);
                
                return isPreset ? `${reason}으로 정산 요청드립니다.` : reason;
              })()}
            </div>
            <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
              {(() => {
                const d = sub.created_at ? new Date(sub.created_at) : new Date();
                return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
              })()}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
            {parsedLogs.map((log, idx) => {
              const isUser = log.sender === 'user';
              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", opacity: log.isDeleted ? 0.4 : 1 }}>
                  <div style={{ 
                    background: isUser ? "#000" : (log.type === 'reject' ? "#e04a4a" : (log.type === 'approve' ? "#16a34a" : "#fff")), 
                    color: isUser ? "#fff" : ((log.type === 'reject' || log.type === 'approve') ? "#fff" : "#333"), 
                    padding: "14px 18px", 
                    borderRadius: isUser ? "18px 2px 18px 18px" : "2px 18px 18px 18px", 
                    maxWidth: "85%", 
                    fontSize: 15, 
                    lineHeight: 1.5, 
                    fontWeight: (log.type === 'reject' || log.type === 'approve' || isUser) ? 600 : 500, 
                    border: (log.type === 'reject' || log.type === 'approve' || isUser) ? "none" : "1.5px solid #eee", 
                    whiteSpace: "pre-wrap",
                    textDecoration: log.isDeleted ? "line-through" : "none"
                  }}>
                    {log.text}
                  </div>
                  <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
                    {(() => {
                      let label = isUser ? "" : "관리자 · ";
                      if (log.sender === 'ai' || log.text === "승인 완료!") label = "AI 잘먹이 · ";
                      
                      const rawTime = log.time || sub.created_at;
                      const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }) : "방금 전";
                      
                      return `${label}${log.isDeleted ? "삭제됨 · " : ""}${timeStr}`;
                    })()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 28px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ background: "#fff", borderRadius: 32, border: "1.5px solid #eee", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.06)", pointerEvents: "auto" }}>
          <input value={replyTxt} onChange={e => setReplyTxt(e.target.value)} onKeyDown={e => { if(e.key === "Enter" && replyTxt.trim()) onSendChat(); }} placeholder="메시지를 입력하세요." style={{ flex: 1, border: "none", outline: "none", padding: "10px 0", fontSize: 15, fontWeight: 500 }} />
          <button onClick={onSendChat} disabled={!replyTxt.trim()} style={{ background: replyTxt.trim() ? "#000" : "#f5f5f5", color: "#fff", border: "none", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }}><Icon.Send /></button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [subs, setSubs] = useState([]);
  const [step, setStep] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("step") || "home";
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [issues, setIssues] = useState([]);
  const [modal, setModal] = useState(null);
  const [invalidMonth, setInvalidMonth] = useState(null);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [duplicateId, setDuplicateId] = useState(null);
  const [excType, setExcType] = useState("");
  const [excText, setExcText] = useState("");
  const [allowed, setAllowed] = useState([]);
  
  const getInitialWeek = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const todayStr = `${y}-${String(m).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const weeks = getWeeksInMonth(y, m);
    let targetW = 1;
    for (let i = 0; i < weeks.length; i++) {
      const dStrs = weeks[i].filter(d => d !== null).map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      if (dStrs.includes(todayStr)) {
        targetW = i + 1;
        break;
      }
    }
    return { y, m, w: targetW };
  };

  const initialWeek = getInitialWeek();
  const [selYear, setSelYear] = useState(initialWeek.y);
  const [selMonth, setSelMonth] = useState(initialWeek.m);
  const [selWeek, setSelWeek] = useState(initialWeek.w);
  const [myYear, setMyYear] = useState(initialWeek.y);
  const [myMonth, setMyMonth] = useState(initialWeek.m);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [replyText, setReplyText] = useState("");
  const [localChats, setLocalChats] = useState({});
  const [isImgModal, setIsImgModal] = useState(false);
  const [pick, setPick] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [user, setUser] = useState(null);
  const fileRef = useRef();

  const [lastSeen, setLastSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lastSeenFeedbacks') || '{}');
    } catch(e) { return {}; }
  });

  const markAsRead = async (id, time) => {
    if (!id || !time) return;
    const newLastSeen = { ...lastSeen, [id]: time };
    setLastSeen(newLastSeen);
    localStorage.setItem('lastSeenFeedbacks', JSON.stringify(newLastSeen));
    
    // Try cross-browser sync via profiles table (custom field or metadata)
    if (user?.email) {
      try {
        await supabase.from('profiles').update({ 
          notification_metadata: JSON.stringify(newLastSeen) 
        }).eq('email', user.email);
      } catch(e) {
        // notification_metadata column might not exist, ignore
      }
    }
  };

  useEffect(() => {
    if (user?.email) {
       loadRemoteSeen();
    }
  }, [user]);

  const loadRemoteSeen = async () => {
    try {
      const { data } = await supabase.from('profiles').select('notification_metadata').eq('email', user.email).single();
      if (data?.notification_metadata) {
        const remote = JSON.parse(data.notification_metadata);
        setLastSeen(prev => ({ ...prev, ...remote }));
      }
    } catch(e) {}
  };

  useEffect(() => { 
    checkUser();
    fetchCategories().then(setAllowed); 
  }, []);

  useEffect(() => {
    if (user?.full_name) {
      fetchSubs();
    } else {
      setSubs([]); 
    }
  }, [user]);

  useEffect(() => {
    const setVh = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from('profiles').select('department').eq('email', session.user.email).single();
      setUser({
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        department: prof?.department || "소속 없음"
      });
    } else {
      // 세션 없으면 로그인 화면으로 (index.html)
      window.location.href = '/';
    }
  };

  const fetchSubs = async () => {
    if (!user?.full_name) return;
    setSubs([]); // Clear previous user data before fetching new ones
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/settlements?user_name=eq.${encodeURIComponent(user.full_name)}&order=created_at.desc`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      setSubs(data);
    } catch (e) { console.error(e); }
  };

  const uploadToStorage = async (file) => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || SUPABASE_KEY;

      const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/receipts/${fileName}`, {
        method: "POST",
        headers: { 
          "apikey": SUPABASE_KEY, 
          "Authorization": `Bearer ${token}`, 
          "Content-Type": file.type 
        },
        body: file
      });
      
      if(!resp.ok) {
        const errorData = await resp.json();
        console.error("Storage 업로드 실패 상세:", errorData);
        throw new Error("업로드 실패");
      }
      return `${SUPABASE_URL}/storage/v1/object/public/receipts/${fileName}`;
    } catch (e) { 
      console.error("Storage Error:", e);
      return null; 
    }
  };

  const reset = () => { 
    setStep("home"); setFile(null); setPreview(null); setOcr(null); setIssues([]); setExcType(""); setExcText(""); setModal(null); setDeleteId(null);
    fetchSubs();
  };

  const submit = async (isEx = false, data = ocr) => {
    // 중복 교체 건이 있으면 먼저 확실히 삭제
    if (duplicateId) {
      try {
        const { error } = await supabase
          .from('settlements')
          .delete()
          .eq('id', duplicateId);
        
        if (error) {
          console.error("Duplicate Delete Error:", error);
          alert("이전 영수증 삭제 중 오류가 발생했습니다.");
          return; // 삭제 실패 시 중단
        }
        setDuplicateId(null);
      } catch (e) {
        console.error("Duplicate Delete Error:", e);
        return;
      }
    }

    const finalStatus = isEx ? "예외요청" : "승인완료";
    const payload = {
      store_name: data.storeName || data.store_name,
      date: data.date,
      time: data.time,
      amount: data.amount,
      category: data.category,
      status: finalStatus,
      exc_text: isEx ? excText : null,
      image_url: data.image_url || preview,
      user_name: user?.full_name || "익명"
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/settlements`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (data.date) {
        // Try to handle dot-notation dates like "26.04.07" or "2026.04.07" to "2026-04-07"
        let safeDateStr = data.date;
        if (/^\d{2}\.\d{2}\.\d{2}/.test(safeDateStr)) safeDateStr = "20" + safeDateStr; // Prepend 20
        safeDateStr = safeDateStr.replace(/\./g, "-").trim();
        
        const d = new Date(safeDateStr);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const maxW = getWeekCount(y, m);
          let targetWeek = selWeek;
          for (let w = 1; w <= maxW; w++) {
            const wds = getWeekDates(y, m, w).filter(d => d !== null).map(dateObj => {
              const yr = dateObj.getFullYear();
              const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
              const da = String(dateObj.getDate()).padStart(2, '0');
              return `${yr}-${mo}-${da}`;
            });
            if (wds.includes(safeDateStr.split(" ")[0])) {
              targetWeek = w;
              break;
            }
          }
          setSelYear(y);
          setSelMonth(m);
          setSelWeek(targetWeek);
        }
      }

      setModal(isEx ? "done_ex" : "done_normal");
    } catch (e) { 
      alert("연동 실패"); 
      setModal(null);
    }
  };

  const processFile = async (f) => {
    if (!f) return;
    setModal("checking");
    
    // 업로드 확인 및 fallback (Staleness 방지)
    let finalImgUrl = await uploadToStorage(f);
    if (!finalImgUrl) {
      finalImgUrl = await new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.readAsDataURL(f);
      });
    }
    setPreview(finalImgUrl);

    try {
      const b64 = await new Promise((res, rej) => {
        const rd = new FileReader();
        rd.onload = () => res(rd.result.split(",")[1]);
        rd.onerror = rej;
        rd.readAsDataURL(f);
      });
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
      if (!apiKey) {
        alert("API 키가 설정되지 않았습니다. Vercel 대시보드의 환경 변수를 확인해주세요.");
        setModal(null);
        return;
      }

      const payload = {
        contents: [{
          parts: [
            { text: "이 이미지는 결제 영수증 또는 승인 내역 스크린샷입니다. 이미지에서 글씨를 인식하여 다음 정보를 추출하고 반드시 JSON 형태로 반환하세요:\n1. storeName: 결제 가맹점, 음식점이나 가게의 정확한 상호명\n2. date: 결제 날짜 (반드시 YYYY-MM-DD 형식으로 변환)\n3. time: 결제 시간 (HH:MM 형식으로 변환)\n4. amount: 최종 승인 금액 숫자 (단위나 콤마 제외, 숫자만 입력)\n5. category: 가맹점 업종 정보 (예: 한식, 일식, 카페 등). 영수증에 업종이 명시되어 있지 않더라도, 상호명이 유명한 음식점/카페/브랜드라면 해당 지식을 바탕으로 업종을 기입하세요. 정말 알 수 없는 경우에만 빈 문자열(\"\")을 반환하세요.\n\n다른 형태 없이 오직 { \"storeName\": \"\", \"date\": \"\", \"time\": \"\", \"amount\": \"\", \"category\": \"\" } 형태의 순수 JSON만 반환하세요." },
            { inlineData: { mimeType: f.type || "image/jpeg", data: b64 } }
          ]
        }]
      };

      let resp;
      let retries = 3;
      while (retries > 0) {
        resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (resp.status !== 503) break;
        retries--;
        if (retries > 0) await new Promise(res => setTimeout(res, 800)); 
      }
      
      if (resp.status === 429) {
        setModal("quota_error");
        return;
      }

      if (resp.status === 503) {
        setModal("server_busy");
        return;
      }
      
      if (!resp.ok) throw new Error(`API Error: ${resp.status}`);
      const data = await resp.json();
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const cleaned = txt.replace(/```json|```/g, "").trim();
      let parsed = JSON.parse(cleaned);
      console.log("AI 인식 결과:", parsed);
      
      let rawDate = parsed.date || parsed.usageDate || "";
      if (/^\d{2}\.\d{2}\.\d{2}/.test(rawDate)) rawDate = "20" + rawDate;
      const safeDate = rawDate.replace(/\./g, "-").trim().split(" ")[0] || "";

      const result = {
        storeName: parsed.storeName || parsed.store || parsed.merchant || "",
        date: safeDate,
        time: parsed.time || parsed.usageTime || "",
        amount: String(parsed.amount || parsed.totalAmount || "").replace(/[^\d]/g, ""),
        category: parsed.category || parsed.businessType || "",
        image_url: finalImgUrl
      };

      // Validation: Strict current month check + up to 10th of next month
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      
      const [rY, rM] = result.date.split("-").map(n => parseInt(n));
      let prevMonth = curMonth - 1;
      let prevMonthYear = curYear;
      if (prevMonth === 0) { prevMonth = 12; prevMonthYear = curYear - 1; }

      const isCurrentMonth = rY === curYear && rM === curMonth;
      const isPrevMonthValid = rY === prevMonthYear && rM === prevMonth && now.getDate() <= 10;
      
      if (!isCurrentMonth && !isPrevMonthValid) {
        setInvalidMonth(rM);
        setModal("invalid_month");
        return;
      }

      setOcr(result); 
      const currentIssues = validate(result, allowed, subs);
      setIssues(currentIssues);

      const holidayIssue = currentIssues.find(iss => iss.includes("주말") || iss.includes("공휴일"));
      if (holidayIssue) {
        setModal("holiday_error");
        return;
      }

      // 중복 체크 (현재 교체하려는 대상은 제외)
      const duplicateEntry = subs.find(s => s.date === result.date && (s.status === "승인완료" || s.status === "예외요청" || s.status === "승인") && s.id !== duplicateId);
      if (duplicateEntry) {
        setDuplicateDate(result.date);
        setDuplicateId(duplicateEntry.id);
        setModal("duplicate");
        return;
      }

      if (currentIssues.length === 0) {
        // 적합한 영수증이면 즉시 제출
        await submit(false, result);
      } else {
        // 문제가 있으면 결과 화면에서 확인 유도
        setModal(null);
        setStep("result");
      }
    } catch (e) { 
      console.error(e);
      alert("영수증 이미지 분석에 실패했습니다. 텍스트가 잘 보이는지 확인 후 다시 시도해주세요."); 
      setModal(null);
    }
  };

  const handleFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    processFile(f);
  };
  const handleReplace = async () => {
    if (!duplicateId) return;
    try {
      // 1. 현재 판독된 영수증(ocr)의 위반 사항 검사 (중복 항목은 이미 확인했으므로 제외)
      const currentIssues = validate(ocr, allowed, subs).filter(iss => !iss.includes("이미 제출된 내역"));
      setIssues(currentIssues);

      if (currentIssues.length > 0) {
        // 중복 외에 다른 위반 사항(시간, 업종 등)이 있으면 결과 안내 페이지로 이동
        setModal(null);
        setStep("result");
      } else {
        // 중복 외에 다른 문제가 없으면 바로 등록 프로세스 진행
        // submit 함수 내부에서 duplicateId가 있으면 삭제 처리를 수행하므로 여기서 중복 삭제하지 않음
        setModal("checking");
        await submit(false, ocr);
      }
    } catch (e) {
      console.error(e);
      alert("교체 처리 중 오류가 발생했습니다.");
      setModal(null);
    }
  };

  const MENUS = [
    { name: "제육볶음", emoji: "🥩", cat: "한식" },
    { name: "돈까스", emoji: "🍱", cat: "일식" },
    { name: "짜장면", emoji: "🍜", cat: "중식" },
    { name: "국밥", emoji: "🍲", cat: "한식" },
    { name: "햄버거", emoji: "🍔", cat: "양식" },
    { name: "김치찌개", emoji: "🥘", cat: "한식" },
    { name: "초밥", emoji: "🍣", cat: "일식" },
    { name: "마라탕", emoji: "🍲", cat: "중식" },
    { name: "샐러드", emoji: "🥗", cat: "건강식" }
  ];
  const doPick = () => setPick(MENUS[Math.floor(Math.random() * MENUS.length)]);

  const AppHome = () => {
    const [tX, setTX] = useState(0);
    const [tY, setTY] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [pullY, setPullY] = useState(0);

    const shiftWeek = (dir) => {
      let nw = selWeek + dir;
      let nm = selMonth;
      let ny = selYear;
      if (nw > getWeekCount(ny, nm)) { nw = 1; nm++; if (nm > 12) { nm = 1; ny++; } }
      else if (nw < 1) { nm--; if (nm < 1) { nm = 12; ny--; } nw = getWeekCount(ny, nm); }
      
      const target = getWeekDates(ny, nm, nw)[0];
      const now = new Date();
      const min = new Date(); min.setMonth(min.getMonth() - 3);
      if (target >= min && target <= now) { setSelYear(ny); setSelMonth(nm); setSelWeek(nw); }
    };


    const monthFilter = (s) => {
      if (!s.date) return false;
      const p = s.date.split("-");
      return parseInt(p[0]) === selYear && parseInt(p[1]) === selMonth;
    };
    const monthFiltered = subs.filter(s => monthFilter(s));
    
    // Smart aggregation: 1 record per day per user
    const totals = useMemo(() => {
      const daily = {};
      monthFiltered.forEach(s => {
        if (!daily[s.date]) daily[s.date] = [];
        daily[s.date].push(s);
      });
      
      let approvedSum = 0;
      let pendingSum = 0;
      let rejectedSum = 0;
      
      Object.values(daily).forEach(dayList => {
        dayList.forEach(s => {
          if (s.status === "승인완료" || s.status === "승인대기") {
            approvedSum += parseInt(s.amount || 0);
          } else if (s.status === "예외요청" || s.status === "보류") {
            pendingSum += parseInt(s.amount || 0);
          } else if (s.status === "반려") {
            rejectedSum += parseInt(s.amount || 0);
          }
        });
      });
      return { approved: approvedSum, pending: pendingSum, rejected: rejectedSum };
    }, [monthFiltered]);

    const approvedTotal = totals.approved;
    const pendingTotal = totals.pending;
    const rejectedTotal = totals.rejected;
    const weekDates = getWeekDates(selYear, selMonth, selWeek);
    const payMonth = selMonth === 12 ? 1 : selMonth + 1;
    const payYear = selMonth === 12 ? selYear + 1 : selYear;
    const payDateStr = `${String(payYear).slice(2)}.${String(payMonth).padStart(2,"0")}.22`;

    const unreadSubs = useMemo(() => {
      return subs.filter(s => {
        const rr = s.reject_reason || s.rejectReason;
        if (rr && rr.startsWith('[')) {
          try {
            const logs = JSON.parse(rr);
            if (logs.length > 0) {
              const lastLog = logs[logs.length - 1];
              if (lastLog.sender === 'admin' || lastLog.sender === 'ai') {
                const seenTime = lastSeen[s.id];
                return !seenTime || new Date(lastLog.time) > new Date(seenTime);
              }
            }
          } catch(e) {}
        }
        return false;
      });
    }, [subs, lastSeen]);

    return (
      <div 
        style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto", overflowX: "hidden" }}
        onTouchStart={e => {
          setTX(e.touches[0].clientX);
          setTY(e.touches[0].clientY);
        }}
        onTouchMove={e => { 
          if (tX) setDragX(e.touches[0].clientX - tX); 
          if (tY && e.currentTarget.scrollTop <= 0) {
            const dy = e.touches[0].clientY - tY;
            if (dy > 0 && dy < 200) setPullY(dy);
          }
        }}
        onTouchEnd={e => {
          if (tX) {
            const diff = tX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50 && pullY < 50) shiftWeek(diff > 0 ? 1 : -1);
          }
          if (pullY > 80) {
            window.location.href = window.location.pathname + "?step=" + step;
          }
          setTX(0);
          setTY(0);
          setDragX(0);
          setPullY(0);
        }}
      >
        {pullY > 10 && (
          <div style={{ height: pullY, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, fontWeight: 700, pointerEvents: "none", opacity: Math.min(1, pullY / 80) }}>
            {pullY > 80 ? "새로고침을 위해 손을 놓으세요 🔄" : "당겨서 새로고침 ↓"}
          </div>
        )}
        <div style={{ padding: "30px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/bi_zaleat.png" style={{ width: 48, height: 48, objectFit: "contain" }} alt="logo" />
            <div style={{ fontWeight: 900, fontSize: 23, letterSpacing: "-0.5px", display: "flex", alignItems: "center" }}>
              <span>ZAL</span><span style={{ margin: "0 6px" }}>:</span><span>잘먹</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <button 
              onClick={() => {
                if (unreadSubs.length > 0) {
                  setSelectedSub(unreadSubs[0]);
                  setStep("detail");
                  return;
                }
                setStep("list");
              }} 
              style={{ background: "none", border: "none", cursor: "pointer", padding: 6, position: "relative" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              {unreadSubs.length > 0 && (
                <div style={{ position: "absolute", top: -2, right: -2, width: 22, height: 22, background: "#E24B4A", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, border: "2px solid #FFFBF0", boxShadow: "0 2px 6px rgba(226,75,74,0.3)" }}>
                  {unreadSubs.length}
                </div>
              )}
            </button>
            <button onClick={() => setStep("my")} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: "40px" }}>
          <div style={{ padding: "0 28px 32px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 27, fontWeight: 900, lineHeight: 1.4, letterSpacing: "-1.5px" }}>
              {user?.full_name}님의 <span style={{ opacity: 0.55, fontWeight: 500 }}>맛있는 하루를<br/>다음정보시스템즈가 지원합니다!</span>
            </p>
            <div style={{ marginTop: 40, display: "inline-block", position: "relative" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#666", fontWeight: 700 }}>{payDateStr} 입금 예정</p>
              <div style={{ position: "relative", display: "inline-block" }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "#000", letterSpacing: "-1px", position: "relative", zIndex: 2 }}>{approvedTotal.toLocaleString()}원</span>
                <div style={{ position: "absolute", bottom: 4, left: -4, right: -4, height: 16, background: "#FEC601", opacity: 0.8, zIndex: 1 }} />
              </div>
              {pendingTotal > 0 && <span style={{ fontSize: 15, color: "#999", fontWeight: 700, marginLeft: 10 }}>(+{pendingTotal.toLocaleString()} 보류)</span>}
              {rejectedTotal > 0 && <span style={{ fontSize: 15, color: "#E24B4A", fontWeight: 700, marginLeft: 6 }}>(+{rejectedTotal.toLocaleString()} 반려)</span>}
            </div>
          </div>
          <div style={{ padding: "20px 28px 16px" }}>
            <button onClick={() => setIsPickerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#333", fontSize: 16, fontWeight: 800 }}>{String(selYear).slice(2)}년 {selMonth}월 {selWeek}주</span>
              <Icon.ChevronDown color="#333" />
            </button>
          </div>
          <div style={{ padding: "0 14px 48px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 0, transform: `translateX(${dragX * 0.7}px)`, transition: dragX === 0 ? "transform 0.3s ease-out" : "none" }}>
              {(() => {
                // 이번 주 등록된 영수증 개수 계산
                const weekSubCount = weekDates.filter(date => {
                  if (!date) return false;
                  const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  return subs.some(s => s.date === dStr && (s.status === "승인완료" || s.status === "예외요청" || s.status === "보류" || s.status === "반려"));
                }).length;
                
                // 개수에 따른 아이콘 크기 결정 (3개부터 점진적 축소)
                const iconSize = weekSubCount >= 5 ? 74 : weekSubCount === 4 ? 80 : weekSubCount === 3 ? 84 : 88;

                return weekDates.map((date, i) => {
                  let daySub = null;
                  if (date) {
                    const localY = date.getFullYear();
                    const localM = String(date.getMonth() + 1).padStart(2, '0');
                    const localD = String(date.getDate()).padStart(2, '0');
                    const dateKey = `${localY}-${localM}-${localD}`;
                    daySub = subs.find(s => s.date === dateKey && (s.status === "승인완료" || s.status === "예외요청" || s.status === "보류" || s.status === "반려"));
                  }
                  
                  const FOOD_IMGS = [
                    "/food_01.webp", "/food_02.webp", "/food_03.webp", 
                    "/food_04.png", "/food_05.png", "/food_06.png"
                  ];
                  const foodImg = FOOD_IMGS[i % FOOD_IMGS.length];

                  return (
                    <div key={i} onClick={() => { if(daySub){setSelectedSub(daySub); setStep("detail");} }} style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, cursor: daySub ? "pointer" : "default", flex: 1, position: "relative" }}>
                      <div style={{ height: 88, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        {!date ? (
                           <img src="/food_00.png" style={{ width: 52, height: 52, opacity: 0.4 }} alt="empty" />
                        ) : daySub ? (
                          <div style={{ position: "relative" }}>
                            <img 
                              src={foodImg} 
                              style={{ 
                                width: iconSize, 
                                height: iconSize, 
                                objectFit: "contain", 
                                filter: daySub.status === "반려" ? "grayscale(100%) opacity(0.5)" : "none",
                                transform: (foodImg.includes("food_04") || foodImg.includes("food_05")) ? "scale(0.85)" : "none"
                              }} 
                              alt="food" 
                            />
                            {(daySub.status === "예외요청" || daySub.status === "보류") && (
                              <div style={{ position: "absolute", top: 2, right: 0, background: "#E24B4A", color: "#fff", fontSize: 11, fontWeight: 900, padding: "3px 6px", borderRadius: 8, border: "2.5px solid #FFFBF0" }}>보류</div>
                            )}
                            {daySub.status === "반려" && (
                              <div style={{ position: "absolute", top: 2, right: 0, background: "#999", color: "#fff", fontSize: 11, fontWeight: 900, padding: "3px 6px", borderRadius: 8, border: "2.5px solid #FFFBF0" }}>반려</div>
                            )}
                          </div>
                        ) : (
                          <img src="/food_00.png" style={{ width: 52, height: 52, opacity: 0.6 }} alt="empty" />
                        )}
                        
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: daySub ? "#111" : "#bbb" }}>
                        {["월","화","수","목","금"][i]} {date ? date.getDate() : ""}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <div style={{ padding: "0 28px", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ textAlign: "center", fontSize: 12, color: "#999", fontWeight: 700, margin: "0 0 4px" }}>영수증을 올리면 음식이 채워집니다</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "24px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 18 }}>영수증 올리기</button>
            <button onClick={() => { doPick(); setStep("menu"); }} style={{ width: "100%", padding: "20px", borderRadius: 16, border: "1px solid #000", background: "transparent", color: "#000", fontWeight: 700, fontSize: 17 }}>오늘 뭐 먹지?</button>
          </div>
        </div>
      </div>
    );
  };

  const statusMapForFilter = {
    "승인": "승인완료",
    "보류": "예외요청",
    "반려": "반려"
  };

  const AppList = () => {
    const [sortType, setSortType] = useState("upload");

    const filteredSubs = subs.filter(s => {
      if (filter === "전체") return true;
      if (filter === "보류") return s.status === "예외요청" || s.status === "보류";
      return s.status === statusMapForFilter[filter];
    });

    const sortedSubs = [...filteredSubs].sort((a, b) => {
      if (sortType === "date") return new Date(a.date) - new Date(b.date);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>정산 내역</span>
        </div>

        <div style={{ padding: "0 28px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["전체", "승인", "보류", "반려"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#000" : "#fff", color: filter === f ? "#fff" : "#999", border: "none", borderRadius: 30, padding: "8px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "0.2s" }}>{f}</button>
            ))}
          </div>
          <div style={{ display: "flex" }}>
            <button 
              onClick={() => setSortType(prev => prev === "date" ? "upload" : "date")} 
              style={{ background: "none", border: "none", fontSize: 13, color: "#111", fontWeight: 800, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>{sortType === "date" ? "날짜순" : "업로드순"}</span>
              <div style={{ display: "flex", flexDirection: "column", fontSize: 8, color: "#bbb", lineHeight: 1, gap: 2 }}>
                <span>▲</span>
                <span>▼</span>
              </div>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 28px 100px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sortedSubs.map((s, i) => (
              <div key={i} onClick={() => { setSelectedSub(s); setStep("detail"); }} style={{ background: "#fff", borderRadius: 28, padding: "24px", position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#bbb", fontWeight: 700 }}>{s.date} · {s.category}</p>
                    <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#111", letterSpacing: "-0.5px" }}>{s.store_name || s.storeName}</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(() => {
                      const logs = s.reject_reason || s.rejectReason;
                      if (logs && logs.startsWith('[')) {
                        try {
                          const parsed = JSON.parse(logs);
                          const lastMsg = parsed[parsed.length - 1];
                          const lastT = lastMsg?.time || s.created_at;
                          const seenT = lastSeen[s.id] || "";
                          if (lastT > seenT && lastMsg?.sender !== 'user') {
                            return <div style={{ width: 8, height: 8, background: "#E24B4A", borderRadius: "50%", boxShadow: "0 0 10px rgba(226,75,74,0.4)" }} />;
                          }
                        } catch(e){}
                      }
                      return null;
                    })()}
                    <Badge status={s.status} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#000" }}>₩{parseInt(s.amount || 0).toLocaleString()}</span>
                  <div 
                    onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                    style={{ width: 40, height: 40, background: "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #eee", cursor: "pointer", transition: "0.2s" }}
                  >
                    <Icon.Trash size={20} color="#999" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };


  async function handleSendChat() {
    if (!replyText.trim() || !selectedSub) return;
    const msg = replyText;
    const currentId = selectedSub.id;
    
    const newLog = { 
       sender: 'user', 
       type: 'message', 
       text: msg, 
       time: new Date().toISOString(), 
       isDeleted: false 
    };
    
    let logs = [];
    const reason = selectedSub.reject_reason || selectedSub.rejectReason;
    if (reason && reason.startsWith('[')) {
       try { logs = JSON.parse(reason); } catch(e){}
    } else if (reason) {
       const type = (selectedSub.status === "승인완료" || selectedSub.status === "승인") ? "approve" : "reject";
       logs = [{ text: `[${reason}] ${type === 'approve' ? '승인' : '반려'}되었습니다.`, type, sender: 'ai', isDeleted: false, time: selectedSub.created_at }];
    } else if (selectedSub.status === "반려" || selectedSub.status === "승인완료" || selectedSub.status === "승인") {
       const type = selectedSub.status === "반려" ? "reject" : "approve";
       const hardMsg = selectedSub.status === "반려" ? `[${selectedSub.exc_text || selectedSub.excText || "영수증 정산 요청"}] 건은 반려되었습니다.` : "승인 완료!";
       logs = [{ text: hardMsg, type, sender: 'ai', isDeleted: false, time: selectedSub.created_at }];
    }
    
    logs.push(newLog);
    const newLogsStr = JSON.stringify(logs);
    
    const newSubs = subs.map(s => s.id === currentId ? { ...s, reject_reason: newLogsStr, rejectReason: newLogsStr } : s);
    setSubs(newSubs);
    setSelectedSub({ ...selectedSub, reject_reason: newLogsStr, rejectReason: newLogsStr });
    setReplyText("");

    await supabase.from('settlements').update({ reject_reason: newLogsStr }).eq('id', currentId);
  }

  const AppResult = () => {
    const hasIssues = issues.length > 0;
    
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px 240px", minHeight: 0 }}>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            {hasIssues ? (
              <>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEE2E2", color: "#E24B4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px", fontWeight: 800 }}>!</div>
                <p style={{ fontSize: 22, color: "#111", fontWeight: 900, marginBottom: 16 }}>정산 기준에 맞지 않는 영수증이에요</p>
                {issues.map((iss, i) => (
                  <p key={i} style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "2px 0", fontWeight: 500 }}>{iss}</p>
                ))}
              </>
            ) : (
              <>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E2F5EC", color: "#1E8A4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px", fontWeight: 800 }}>✓</div>
                <p style={{ fontSize: 22, color: "#111", fontWeight: 900, marginBottom: 16 }}>영수증 정보를 확인해주세요</p>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "2px 0", fontWeight: 500 }}>모든 정보가 정산 기준에 부합합니다.</p>
              </>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", marginBottom: 20 }}>
            <div style={{ padding: "24px" }}>
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["가게명", ocr?.storeName, false],
                    ["날짜", ocr?.date, issues.some(iss => iss.includes("날짜") || iss.includes("주말"))],
                    ["시간", ocr?.time, issues.some(iss => iss.includes("시간"))],
                    ["금액", "₩" + parseInt(ocr?.amount || 0).toLocaleString(), issues.some(iss => iss.includes("금액"))],
                    ["업종", ocr?.category, issues.some(iss => iss.includes("업종"))]
                  ].map(([k, v, isBad]) => (
                    <tr key={k}>
                      <td style={{ color: "#888", padding: "10px 0", width: 70, fontWeight: 500 }}>{k}</td>
                      <td style={{ fontWeight: isBad ? 900 : 800, padding: "10px 0", textAlign: "right", color: isBad ? "#E24B4A" : "#333", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                        {isBad && (
                          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#E24B4A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, marginRight: 6 }}>!</div>
                        )}
                        {v}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setIsImgModal(true)} style={{ width: "100%", marginTop: 16, padding: "14px", borderRadius: 12, border: "1.5px solid #eee", background: "#fafafa", color: "#666", fontWeight: 700, fontSize: 14 }}>영수증 보기</button>
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 28px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", display: "flex", gap: 12, zIndex: 9999 }}>
          <button onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 100); }} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #E5E7EB", background: "#fff", color: "#333", fontWeight: 800, fontSize: 16 }}>다시 제출</button>
          {hasIssues ? (
            <button onClick={() => {
              if (issues.some(i => i.includes("시간"))) setExcType("업무 연장");
              else if (issues.some(i => i.includes("업종"))) setExcType("기타");
              setExcText("업무 미팅 지연");
              setStep("exception");
            }} style={{ flex: 2, padding: "18px", borderRadius: 16, border: "none", background: "#E24B4A", color: "#fff", fontWeight: 800, fontSize: 16 }}>예외 요청하기</button>
          ) : (
            <button onClick={() => { submit(false); }} style={{ flex: 2, padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16 }}>정산 요청하기</button>
          )}
        </div>
      </div>
    );
  };

function AppException({ issues, ocr, setStep, excText, setExcText, submit }) {
  const mainIssue = issues[0] || "";
  let summary = "예외 정산 신청 건";
  if (mainIssue.includes("시간")) summary = `[시간 외 사용] ${ocr?.time} 결제 건`;
  else if (mainIssue.includes("날짜") || mainIssue.includes("주말")) summary = `[사용 일자] ${ocr?.date} 결제 건`;
  else if (mainIssue.includes("업종")) summary = `[지원 외 업종] ${ocr?.category} 결제 건`;

  const CHIPS = ["업무 미팅 지연", "야근 후 늦은 점심", "식당 결제 시스템 오류", "외부 미팅 연장", "직접 작성"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px 240px", minHeight: 0 }}>
        <img src="/pencil.webp" style={{ width: 52, height: 52, marginBottom: 32, marginLeft: 5 }} alt="pencil" />
        <div style={{ padding: "0 0 48px", textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1.4, letterSpacing: "-0.5px" }}>{summary}의<br/>상세 사유를 작성해주세요.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: 8, marginBottom: 24 }}>
          {CHIPS.map(c => {
            const isSelected = c === "직접 작성" ? !["업무 미팅 지연", "야근 후 늦은 점심", "식당 결제 시스템 오류", "외부 미팅 연장"].includes(excText) : excText === c;
            return (
              <button key={c} onClick={() => setExcText(c === "직접 작성" ? "" : c)} style={{ padding: "10px 16px", borderRadius: 20, border: "1.5px solid #eee", background: isSelected ? "#000" : "#fff", color: isSelected ? "#fff" : "#666", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "0.2s" }}>{c}</button>
            );
          })}
        </div>
        <div style={{ position: "relative" }}>
          <textarea 
            value={excText} 
            onChange={e => setExcText(e.target.value.slice(0, 200))} 
            placeholder="예: 프로젝트 마감으로 인해 점심 식사가 늦어졌습니다." 
            style={{ width: "100%", minHeight: 195, padding: "20px", borderRadius: 24, border: "none", background: "#fff", fontSize: 16, lineHeight: 1.6, resize: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }} 
          />
          <span style={{ position: "absolute", bottom: 12, right: 16, fontSize: 12, color: "#bbb", fontWeight: 600 }}>({excText.length}/200)</span>
        </div>

      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 28px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", zIndex: 9999 }}>
        <button 
          onClick={() => { submit(true); }} 
          disabled={!excText.trim()} 
          style={{ 
            width: "100%", padding: "20px", borderRadius: 16, border: "none", 
            background: !excText.trim() ? "#E5E7EB" : "#000", 
            color: !excText.trim() ? "#9CA3AF" : "#fff", 
            fontWeight: 800, fontSize: 17, 
            boxShadow: "none",
            transition: "0.2s"
          }}
        >
          예외 신청하기
        </button>
      </div>
    </div>
  );
}

  const AppMenu = () => {
    const [tY, setTY] = useState(0);
    const [pullY, setPullY] = useState(0);

    return (
      <div 
        style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}
        onTouchStart={e => setTY(e.touches[0].clientY)}
        onTouchMove={e => {
          if (tY) {
            const dy = e.touches[0].clientY - tY;
            if (dy > 0 && dy < 200) setPullY(dy);
          }
        }}
        onTouchEnd={e => {
          if (pullY > 80) {
            window.location.href = window.location.pathname + "?step=" + step;
          }
          setTY(0);
          setPullY(0);
        }}
      >
        {pullY > 10 && (
          <div style={{ height: pullY, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, fontWeight: 700, pointerEvents: "none", opacity: Math.min(1, pullY / 80) }}>
            {pullY > 80 ? "새로고침을 위해 손을 놓으세요 🔄" : "당겨서 새로고침 ↓"}
          </div>
        )}
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => { setStep("home"); window.history.replaceState({}, '', window.location.pathname); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>오늘 뭐 먹지?</span>
        </div>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "min(20vh, 100px)", marginBottom: 24 }}>{pick?.emoji || "🤔"}</div>
          <p style={{ fontSize: 16, color: "#888", marginBottom: 8, fontWeight: 600 }}>{pick?.cat}</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: "-1px" }}>{pick?.name} 어떠세요?</h2>
        </div>

        <div style={{ padding: "16px 28px 32px", display: "flex", gap: 12, zIndex: 10, flexShrink: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 16px)" }}>
          <button 
            onClick={() => {
              if(pick?.name) window.open(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent("내 주변 " + pick.name)}`, '_blank');
            }}
            disabled={!pick}
            style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #E5E7EB", background: "#fff", color: "#333", fontWeight: 800, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {pick?.name || "메뉴"} 찾기
          </button>
          <button 
            onClick={doPick} 
            style={{ flex: 2, padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            다른 메뉴 추천
          </button>
        </div>
      </div>
    );
  };

  const AppMyPage = () => {
    const shiftMyMonth = (dir) => {
      let nm = myMonth + dir;
      let ny = myYear;
      if (nm > 12) { nm = 1; ny++; }
      else if (nm < 1) { nm = 12; ny--; }
      
      const target = new Date(ny, nm - 1, 1);
      const now = new Date();
      
      const maxLimit = new Date(now.getFullYear(), now.getMonth(), 1);
      const minLimit = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      
      if (target >= minLimit && target <= maxLimit) {
        setMyYear(ny);
        setMyMonth(nm);
      }
    };

    const monthSubs = subs.filter(s => {
      if (!s.date) return false;
      const p = s.date.split("-");
      return parseInt(p[0]) === myYear && parseInt(p[1]) === myMonth && (s.status === "승인완료" || s.status === "예외요청" || s.status === "보류");
    });
    const monthTotal = monthSubs.reduce((a, s) => a + parseInt(s.amount || 0), 0);

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setStep("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>마이페이지</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 100px" }}>
          <div style={{ background: "#fff", borderRadius: 36, padding: "40px 24px", textAlign: "center", marginBottom: 28, boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#f5f5f5", margin: "0 auto 20px", overflow: "hidden" }}>
              <img src="/profile.png" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="profile" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#111" }}>{user?.full_name}</h2>
            <p style={{ fontSize: 13, color: "#999", fontWeight: 700 }}>{user?.department || "기타"} · {user?.email}</p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => shiftMyMonth(-1)} 
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", opacity: (new Date(myYear, myMonth - 1, 1) <= new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)) ? 0.3 : 1 }}
              >
                <Icon.ChevronLeft size={20} color="#ccc" />
              </button>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-0.5px" }}>{myYear}년 {String(myMonth).padStart(2, "0")}월</span>
              <button 
                onClick={() => shiftMyMonth(1)} 
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", opacity: (new Date(myYear, myMonth - 1, 1) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) ? 0.3 : 1 }}
              >
                <Icon.ChevronRight size={20} color="#ccc" />
              </button>
            </div>
            <button onClick={() => setStep("list")} style={{ background: "none", border: "none", fontSize: 13, color: "#aaa", fontWeight: 700, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 2 }}>
                내역보기 
                {(() => {
                  const hasAnyUnread = subs.some(s => {
                    const logs = s.reject_reason || s.rejectReason;
                    if (logs && logs.startsWith('[')) {
                      try {
                        const parsed = JSON.parse(logs);
                        const lastMsg = parsed[parsed.length - 1];
                        const lastT = lastMsg?.time || s.created_at;
                        const seenT = lastSeen[s.id] || "";
                        return (lastT > seenT && lastMsg?.sender !== 'user');
                      } catch(e){ return false; }
                    }
                    return false;
                  });
                  if (hasAnyUnread) return <div style={{ width: 6, height: 6, background: "#E24B4A", borderRadius: "50%", position: "absolute", top: -2, right: -4 }} />;
                  return null;
                })()}
              </div>
              <Icon.ChevronRight size={14} color="#ccc" />
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 28, padding: "24px", marginBottom: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E2F5EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📊</div>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#333" }}>정산 현황</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#000" }}>₩{monthTotal.toLocaleString()}</span>
            </div>
            <div style={{ height: 8, background: "#f2f2f2", borderRadius: 10, position: "relative", marginBottom: 14 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (monthTotal/220000)*100)}%`, background: "#FEC601", borderRadius: 10 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#bbb", fontWeight: 700 }}>
              <span>현재지출</span>
              <span>총 한도 ₩220,000</span>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 28, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E8F0FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💳</div>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#333" }}>입금계좌</span>
            </div>
            <span style={{ fontSize: 14, color: "#666", fontWeight: 700 }}>급여계좌</span>
          </div>

          <div 
            onClick={() => setStep("policy")}
            style={{ background: "#fff", borderRadius: 28, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 10px 40px rgba(0,0,0,0.03)", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FFF0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#333" }}>식대 지원 정책</span>
            </div>
            <Icon.ChevronRight size={18} color="#ccc" />
          </div>

          <button 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              style={{ width: "100%", padding: "20px", borderRadius: 16, border: "none", background: "none", color: "#ccc", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 40 }}
          >
              로그아웃
          </button>
        </div>
      </div>
    );
  };

  const AppPolicy = () => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setStep("my")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>식대 지원 정책</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 120px" }}>
            {/* Hero Section */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0 48px" }}>
                <div style={{ width: 130, flexShrink: 0, marginLeft: -12 }}>
                    <img src="/zaleat.png" alt="ZAL Character" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
                <div style={{ padding: "0 4px", marginBottom: 12, flex: 1, marginTop: 10 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 950, margin: "0 0 8px", color: "#000", letterSpacing: "-1px" }}>안녕? 난 잘먹이야!</h1>
                    <p style={{ fontSize: 16, color: "#666", fontWeight: 700, lineHeight: 1.5, letterSpacing: "-0.5px" }}>회사 생활의 즐거움인 식대 지원,<br/>내가 자세히 알려줄게!</p>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* 섹션: 사용 조건 */}
                <section>
                    <div style={{ background: "#fff", borderRadius: 32, padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.03)", border: "1.5px solid #FDF5E6" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            {[
                                { icon: "📅", t: "지원 일정", d: "평일 근무일 기준 (1일 1회)" },
                                { icon: "⏰", t: "정산 시간", d: "오전 10:00 ~ 오후 2:00" }
                            ].map((item, i) => (
                                <div key={i} style={{ display: "flex", gap: 20, alignItems: "center" }}>
                                    <div style={{ fontSize: 28 }}>{item.icon}</div>
                                    <div>
                                        <p style={{ fontSize: 17, fontWeight: 900, margin: "0 0 4px", color: "#111" }}>{item.t}</p>
                                        <p style={{ fontSize: 15, color: "#666", fontWeight: 600 }}>{item.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ marginTop: 32, paddingTop: 32, borderTop: "1.5px solid #F8F4EA" }}>
                            <p style={{ fontSize: 17, fontWeight: 900, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 20 }}>📍</span> 사용 가능 장소
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {[
                                    { icon: "🥣", text: "일반 식당 (전 업종)" },
                                    { icon: "☕", text: "카페 및 베이커리" },
                                    { icon: "🏪", text: "백화점/마트 푸드코트/편의점" }
                                ].map((loc, idx) => (
                                    <div key={idx} style={{ background: "#F9F9F9", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                                        <span style={{ fontSize: 18 }}>{loc.icon}</span>
                                        <span style={{ fontSize: 15, color: "#444", fontWeight: 700 }}>{loc.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 섹션: 정산 및 지급 */}
                <section>
                    <div style={{ background: "#fff", borderRadius: 32, padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
                        <h2 style={{ fontSize: 17, fontWeight: 900, color: "#111", marginBottom: 24 }}>정산 및 지급 절차</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {[
                                { label: "지원금", val: "근무일수 x 10,000원" },
                                { label: "대상 기간", val: "해당 월 전체" },
                                { label: "제출 마감", val: "익월 10일까지" },
                                { label: "지급일", val: "매월 22일", accent: true }
                            ].map((row, idx) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 16, color: "#999", fontWeight: 700 }}>{row.label}</span>
                                    <span style={{ 
                                        fontSize: 16, 
                                        fontWeight: 900, 
                                        color: row.accent ? "#E24B4A" : "#111",
                                        textAlign: "right"
                                    }}>
                                        {row.val}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 섹션: 지급 불가 */}
                <section style={{ paddingBottom: 40 }}>
                    <div style={{ background: "#fff", borderRadius: 32, padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
                        <h2 style={{ fontSize: 17, fontWeight: 900, color: "#111", marginBottom: 24 }}>지급 불가 사유</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[
                            { icon: "🕒", t: "시간 외" },
                            { icon: "🚩", t: "공휴일" },
                            { icon: "🏖️", t: "휴가 중" },
                            { icon: "📄", t: "영수증 미비" },
                            { icon: "🚫", t: "중복 사용" }
                        ].map((item, i) => (
                            <div key={i} style={{ 
                                background: "#F9F9F9", 
                                padding: "20px 16px", 
                                borderRadius: 24, 
                                display: "flex", 
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 8,
                                border: "none"
                            }}>
                                <span style={{ fontSize: 24 }}>{item.icon}</span>
                                <span style={{ fontSize: 15, fontWeight: 800, color: "#555" }}>{item.t}</span>
                            </div>
                        ))}
                    </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
  );

  const screens = { 
    home: <AppHome 
      user={user} 
      selYear={selYear} 
      selMonth={selMonth} 
      selWeek={selWeek} 
      setIsPickerOpen={setIsPickerOpen} 
      subs={subs} 
      setSelYear={setSelYear}
      setSelMonth={setSelMonth}
      setSelWeek={setSelWeek}
      setSelectedSub={setSelectedSub}
      setStep={setStep}
      fileRef={fileRef}
      handleFile={handleFile}
      doPick={doPick}
      step={step}
    />, 
    my: <AppMyPage 
      myMonth={myMonth} 
      myYear={myYear} 
      setMyMonth={setMyMonth} 
      setMyYear={setMyYear} 
      subs={subs} 
      user={user} 
      setStep={setStep} 
    />, 
    list: <AppList 
      reset={reset} 
      filter={filter} 
      setFilter={setFilter} 
      subs={subs} 
      statusMapForFilter={statusMapForFilter} 
      setSelectedSub={setSelectedSub} 
      setStep={setStep} 
      setDeleteId={setDeleteId} 
    />, 
    result: <AppResult 
      reset={reset} 
      issues={issues} 
      ocr={ocr} 
      setIsImgModal={setIsImgModal} 
      setExcType={setExcType} 
      setExcText={setExcText} 
      setStep={setStep} 
      submit={submit} 
      fileRef={fileRef} 
    />, 
    exception: AppException({
      issues: issues, 
      ocr: ocr, 
      setStep: setStep, 
      excText: excText, 
      setExcText: setExcText, 
      submit: submit 
    }), 
    menu: <AppMenu 
      step={step} 
      pick={pick} 
      doPick={doPick} 
      setStep={setStep} 
    />, 
    policy: <AppPolicy 
      setStep={setStep} 
    />,
    detail: <AppDetailView 
      sub={selectedSub} 
      onBack={() => { if(step==="detail") setStep("home"); }} 
      onShowImg={(img) => { setPreview(img); setIsImgModal(true); }} 
      chats={selectedSub ? localChats[selectedSub.id] : []} 
      onSendChat={handleSendChat} 
      replyTxt={replyText} 
      setReplyTxt={setReplyText} 
      onMarkRead={markAsRead}
      allowed={allowed}
      allSubs={subs}
    /> 
  };

  const StatusModal = ({ type, onClose }) => (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: "#fff", width: "100%", maxWidth: 320, borderRadius: 36, padding: "48px 24px 24px", textAlign: "center", boxShadow: "0 30px 60px rgba(0,0,0,0.3)" }}>
        {type === "checking" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>🤖</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>확인 중입니다...</h3>
            <p style={{ fontSize: 15, color: "#666", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>AI가 영수증 정보를<br/>꼼꼼하게 분석하고 있습니다.</p>
          </>
        ) : type === "holiday_error" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>🚫</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>등록 불가</h3>
            <p style={{ fontSize: 15, color: "#666", margin: "0 0 40px", lineHeight: 1.6, fontWeight: 500 }}>공휴일의 영수증은<br/>등록이 불가능 합니다.</p>
            <button onClick={onClose} style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", background: "#1A1C30", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>확인</button>
          </>
        ) : type === "quota_error" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>💸</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>처리 불가</h3>
            <p style={{ fontSize: 16, color: "#e74c3c", margin: "0 0 40px", lineHeight: 1.6, fontWeight: 800 }}>상무님, 크레딧이 없어서<br/>분석을 못해요.ㅠㅠ</p>
            <button onClick={onClose} style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", background: "#1A1C30", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>확인</button>
          </>
        ) : type === "duplicate" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>📅</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>이미 제출된 내역이 있습니다.</h3>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 32px", lineHeight: 1.6, fontWeight: 500 }}>해당 날짜({duplicateDate})에 이미 제출된<br/>영수증 내역이 존재합니다.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button 
                onClick={handleReplace} 
                style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
              >
                영수증 교체하기
              </button>
              <button onClick={() => { setDuplicateId(null); setModal(null); }} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "1.5px solid #eee", background: "#fff", color: "#999", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>취소</button>
            </div>
          </>
        ) : type === "invalid_month" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>📆</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>등록 불가</h3>
            <p style={{ fontSize: 15, color: "#666", margin: "0 0 32px", lineHeight: 1.6, fontWeight: 500 }}>
              {invalidMonth ? (
                <>{invalidMonth}월 영수증은<br/>{invalidMonth === 12 ? 1 : invalidMonth + 1}월 10일까지만 등록이 가능합니다.</>
              ) : (
                <>이번달 영수증만<br/>업로드가 가능합니다.</>
              )}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button 
                onClick={() => {
                  setModal(null);
                  setTimeout(() => fileRef.current.click(), 100);
                }} 
                style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
              >
                다른 영수증 선택
              </button>
              <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "1.5px solid #eee", background: "#fff", color: "#999", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>취소</button>
            </div>
          </>
        ) : type === "server_busy" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>⚙️</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>서버 지연</h3>
            <p style={{ fontSize: 15, color: "#666", margin: "0 0 32px", lineHeight: 1.6, fontWeight: 500 }}>AI가 너무 바빠서<br/>지금 당장은 대답을 못 하겠다네요.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button 
                onClick={() => processFile(file)} 
                style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
              >
                다시 시도
              </button>
              <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "1.5px solid #eee", background: "#fff", color: "#999", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>취소</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E2F5EC", color: "#1E8A4A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 24, fontWeight: 900 }}>✓</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>제출이 완료되었습니다.</h3>
            <p style={{ fontSize: 13, color: "#999", fontWeight: 600, margin: "0 0 40px", lineHeight: 1.5 }}>
              {type === "done_ex" ? (
                <>승인 여부는 담당자 확인 후<br/>결정됩니다.</>
              ) : (
                "매월 22일에 입금됩니다."
              )}
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", background: "#1A1C30", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>확인</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#f2f2eb", fontFamily: "'Outfit', 'Pretendard', sans-serif", letterSpacing: "-0.5px" }}>
      <style>{`
        @media (max-width: 1540px) { 
          .main-ci { display: none !important; } 
        }
        @media (max-width: 1300px) { 
          .admin-btn { display: none !important; } 
        }
        @media (max-width: 1060px) { 
          .desktop-panel { display: none !important; } 
          .app-container { width: 100% !important; border-left: none !important; } 
        }
        .desktop-panel, .brand-title-wrap, .feature-list-wrap, .visual-img-wrap, .main-ci {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (max-height: 860px) {
          .desktop-panel { padding-top: 60px !important; }
          .brand-title-wrap { margin-top: 0 !important; }
          .feature-list-wrap { margin-top: 24px !important; }
          .visual-img-wrap { margin-top: 40px !important; }
          .main-ci { top: 30px !important; height: 50px !important; }
        }
        @media (max-height: 720px) {
          .desktop-panel { padding-top: 30px !important; }
          .feature-list-wrap { margin-top: 16px !important; }
          .visual-img-wrap { margin-top: 20px !important; }
        }
        @media (max-height: 820px) { .footer-copy { display: none !important; } }
        :root { --side-pad: 32px; --item-gap: 64px; --btn-bot: 60px; }
        @media (max-width: 480px) { :root { --side-pad: 28px; --item-gap: 40px; --btn-bot: 40px; } }
      `}</style>
      <img src="/ci.png" className="main-ci" style={{ position: "fixed", top: 40, left: 40, height: 64, width: "auto", objectFit: "contain", zIndex: 100, pointerEvents: "none" }} alt="Company CI" />

      <div className="desktop-panel" style={{ width: 840, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 320, paddingLeft: 60, paddingTop: 220, position: "relative", zIndex: 10 }}>
        <div className="brand-title-wrap" style={{ marginTop: 0 }}>
          <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-2px", color: "#000" }}>
            점심 한 끼,<br />
            <span style={{ position: "relative", display: "inline-block" }}>
              10초에
              <div style={{ position: "absolute", bottom: 2, left: -4, right: -4, height: 20, background: "#FEC601", opacity: 0.8, zIndex: -1 }} />
            </span> 정산!
          </h1>
          <p style={{ fontSize: 18, color: "rgba(0,0,0,0.6)", marginTop: 24, fontWeight: 600 }}>영수증 업로드 한 번이면 충분합니다.</p>

          <div className="feature-list-wrap" style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "✨", t: "AI OCR 영수증 자동 분석", d: "번거로운 입력 없이 업로드 한번으로 끝" },
              { icon: "📊", t: "실시간 정산 현황 확인", d: "내 승인 내역과 이번 달 한도를 한눈에" },
              { icon: "🚀", t: "종이 영수증 없는 간편 신청", d: "복잡한 절차 없이 10초면 신청 완료" }
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 8px 20px rgba(0,0,0,0.04)" }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{f.t}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="visual-img-wrap" style={{ position: "relative", width: "100%", maxWidth: 440, marginTop: 80 }}>
            <img src="/zaleat_cc.png" style={{ width: "100%", objectFit: "contain", display: "block", position: "relative", zIndex: 2 }} alt="zaleat_visual" />
            <div style={{ 
              position: "absolute", 
              bottom: "40px", 
              left: "50%", 
              transform: "translateX(calc(-50% + 10px))", 
              width: "95%", 
              height: "32px", 
              background: "rgba(0,0,0,0.3)", 
              borderRadius: "50%", 
              filter: "blur(10px)",
              zIndex: 1
            }} />
          </div>
        </div>
      </div>
      <div className="app-container" style={{ width: 460, flexShrink: 0, height: "100%", boxShadow: "30px 30px 60px -15px rgba(0,0,0,0.12)", borderLeft: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#FFFBF0", zIndex: 10 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", height: "100%", overflow: "hidden" }}>
          {screens[step] || <AppHome />}
        </div>
        {modal && <StatusModal type={modal} onClose={reset} />}
        {deleteId && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)", zIndex: 11000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "#fff", borderRadius: 32, padding: "40px 24px 24px", textAlign: "center", width: "100%", maxWidth: 320 }}>
              <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 32 }}>정말 삭제하시겠습니까?</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #eee", background: "#fff", color: "#666", fontWeight: 700, cursor: "pointer" }}>아니오</button>
                <button onClick={async () => { 
                  try {
                    await fetch(`${SUPABASE_URL}/rest/v1/settlements?id=eq.${deleteId}`, {
                      method: "DELETE",
                      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
                    });
                    setSubs(p => p.filter(it => it.id !== deleteId)); 
                    setDeleteId(null); 
                    if(selectedSub?.id === deleteId) setStep("list");
                  } catch(e) { console.error(e); }
                }} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, cursor: "pointer" }}>네</button>
              </div>
            </div>
          </div>
        )}
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
      <a 
        href="/admin.html" 
        target="_blank"
        rel="noopener noreferrer"
        className="admin-btn"
        style={{ 
          position: "fixed", 
          bottom: 24, 
          right: 24, 
          background: "#000", 
          color: "#fff", 
          padding: "10px 20px", 
          borderRadius: "12px", 
          fontSize: "12px", 
          fontWeight: 800, 
          textDecoration: "none", 
          zIndex: 100,
          transition: "0.2s"
        }}
        onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
        onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        ADMIN
      </a>
    </div>
  );
}