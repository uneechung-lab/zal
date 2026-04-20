import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./Admin.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to count weekdays (Mon-Fri) in a given month (YYYY.MM format)
const getMonthWeekdays = (monthStr) => {
  const [y, m] = monthStr.split('.').map(Number);
  const date = new Date(y, m - 1, 1);
  let count = 0;
  while (date.getMonth() === m - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) count++;
    date.setDate(date.getDate() + 1);
  }
  return count;
};

// Data transformation helper
const Icon = {
  Alert: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#E24B4A"/>
      <path d="M12 7V13" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1.5" fill="white"/>
    </svg>
  )
};

function validate(d, allowed, existingSubs = []) {
  const issues = [];
  const isDup = existingSubs.some(s => s.date === d.date && s.id !== d.id);
  if (isDup) issues.push("해당 날짜( " + d.date + " )에 이미 제출된 내역이 있습니다.");
  // 시간 검사
  if (!d.time || !d.time.includes(":")) {
    issues.push("시간 정보를 확인할 수 없습니다.");
  } else {
    const [h, m] = d.time.split(":").map(Number);
    const tot = h * 60 + m;
    if (tot < 600 || tot > 840) issues.push(`결제 시간(${d.time})이 정산 허용 시간(10:00~14:00)을 지났습니다.`);
  }
  // 날짜 검사
  if (!d.date) {
    issues.push("날짜 정보를 확인할 수 없습니다.");
  } else {
    const dow = new Date(d.date).getDay();
    if (dow === 0 || dow === 6) issues.push("주말/공휴일 사용은 지원되지 않습니다.");
  }
  // 업종 검사
  const catMatch = allowed.some(t => {
    const cStr = (d.category || "").split(/[\/,·\s]/);
    return cStr.some(c => c.trim().includes(t) || t.includes(c.trim()));
  });
  if (!catMatch) issues.push("지원 업종이 아닙니다. (업종: " + (d.category || "미확인") + ")");
  // 금액 검사
  const cleanAmt = String(d.amount || "").replace(/[^\d]/g, "");
  if (!cleanAmt || parseInt(cleanAmt) <= 0) issues.push("금액 정보를 확인할 수 없습니다.");
  
  return issues;
}
const transformData = (settlements, profiles, month) => {
  const filtered = settlements.filter(s => s.date && s.date.startsWith(month.replace('.', '-')));
  const usersMap = {};
  
  // 1. Identify ALL users from ALL time in settlements to avoid missing anyone
  const allKnownUserNames = new Set(settlements.map(s => s.user_name || "미지정"));
  
  // 2. Add users from profiles
  profiles.forEach(p => {
    const name = p.full_name || p.name;
    if (name) allKnownUserNames.add(name);
  });

  // 3. Initialize map for ALL known users across system
  allKnownUserNames.forEach(userName => {
    const p = profiles.find(it => (it.full_name || it.name) === userName);
    usersMap[userName] = {
      id: userName,
      name: userName,
      department: p?.department || "기타",
      totalSum: 0,
      approvedSpent: 0,
      pendingSpent: 0,
      rejectedSpent: 0,
      count: 0,
      pendingCount: 0,
      uniqueDates: new Set(),
      history: [],
      rejectionHistory: []
    };
  });

  // Merge current month settlements into the map
  filtered.forEach(s => {
    const userName = s.user_name || "미지정";
    const u = usersMap[userName];
    
    const amt = parseInt(s.amount || 0);
    const isPending = s.status === "예외요청" || s.status === "보류";
    const isRejected = s.status === "반려";

    // "Replacing" logic: If there's another settlement on the same date that is NOT rejected,
    // we assume this rejected one was replaced.
    // However, we process all at once. Let's filter later or track by date.
    
    u.totalSum += amt;
    u.count += 1;
    
    // Store all per date for smarter summation in Step 4
    if (!u.dailySettlements) u.dailySettlements = {};
    if (!u.dailySettlements[s.date]) u.dailySettlements[s.date] = [];
    u.dailySettlements[s.date].push({ status: s.status, amount: amt });

    u.history.push({
      id: s.id,
      date: s.date + " " + (s.time || ""),
      amount: amt,
      desc: s.store_name || s.storeName || "상호명 없음",
      violation: isPending,
      violationLog: s.exc_text || s.excText,
      status: s.status,
      image_url: s.image_url
    });
  });

  // Step 4: Re-calculate totals based on "Final" status per date/meal
  Object.values(usersMap).forEach(u => {
    if (!u.dailySettlements) return;
    
    // Reset totals that depend on current status
    u.approvedSpent = 0;
    u.pendingSpent = 0;
    u.rejectedSpent = 0;
    u.pendingCount = 0;

    Object.keys(u.dailySettlements).forEach(date => {
      const dayList = u.dailySettlements[date];
      
      const hasActive = dayList.some(it => it.status !== "반려");
      if (hasActive) {
        // If there's an active one (Pending/Approved), only sum those.
        // Ignore the rejected ones on this day (considered "Replaced").
        dayList.forEach(it => {
          if (it.status === "예외요청" || it.status === "보류") {
            u.pendingSpent += it.amount;
            u.pendingCount += 1;
          } else if (it.status !== "반려") {
            u.approvedSpent += it.amount;
          }
        });
      } else {
        // All are rejected on this day, sum them up.
        dayList.forEach(it => {
          u.rejectedSpent += it.amount;
        });
      }
    });
  });

  const monthWeekdays = getMonthWeekdays(month);

  return Object.values(usersMap).map(u => ({
    ...u,
    monthWeekdays,
    avg: u.count > 0 ? Math.floor((u.approvedSpent + u.pendingSpent + u.rejectedSpent) / u.count) : 0
  }));
};
export default function App() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("승인 요청");
  const [expandedUsers, setExpandedUsers] = useState({});

  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewAction, setReviewAction] = useState("approve");
  const [actionLogs, setActionLogs] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("전체");
  const [historySortType, setHistorySortType] = useState("upload");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [historyInput, setHistoryInput] = useState("");
  const [historyChats, setHistoryChats] = useState({});
  const [allowedCategories, setAllowedCategories] = useState([]);
  const chatEndRef = useRef(null);

  const pagerRef = useRef(null);


  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [actionLogs, historyChats]);

  const handleSendHistoryMsg = () => {
    if (!historyInput.trim() || !selectedHistoryItem) return;
    const itemId = selectedHistoryItem.id;
    const newMsg = {
      sender: 'admin',
      text: historyInput,
      time: '관리자 · 방금 전'
    };
    setHistoryChats(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), newMsg]
    }));
    setHistoryInput("");
  };

  const updateSettlementStatus = async (id, status, rejectReason = null) => {
    const { error } = await supabase
      .from('settlements')
      .update({ status, reject_reason: rejectReason })
      .eq('id', id);

    if (error) {
      console.error("Error updating status:", error);
      alert("상태 업데이트에 실패했습니다.");
    } else {
      // Refresh data
      fetchData();
    }
  };

  const handleApprove = (id) => {
    const msg = document.getElementById('reviewMsgInput').value;
    const newLog = { text: msg ? `[${msg}] 승인되었습니다.` : '승인되었습니다.', type: 'approve', sender: 'admin', isDeleted: false, time: new Date().toISOString() };
    const newLogs = [...actionLogs, newLog];
    setActionLogs(newLogs);
    updateSettlementStatus(id, '승인완료', JSON.stringify(newLogs));
    document.getElementById('reviewMsgInput').value = '';
  };

  const handleReject = (id) => {
    const msg = document.getElementById('reviewMsgInput').value;
    const currentReview = allPendingRequests[reviewIndex] || null;
    const displayMsg = msg 
       ? `[${msg}] 반려되었습니다.` 
       : `[${currentReview?.item.violationLog || "사용자가 입력한 예외사유"}] 건은 반려되었습니다.`;
    const newLog = { text: displayMsg, type: 'reject', sender: 'admin', isDeleted: false, time: new Date().toISOString() };
    const newLogs = [...actionLogs, newLog];
    setActionLogs(newLogs);
    updateSettlementStatus(id, '반려', JSON.stringify(newLogs));
    document.getElementById('reviewMsgInput').value = '';
  };

  // Prevent background scroll
  useEffect(() => {
    if (isReviewPanelOpen || selectedUser) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isReviewPanelOpen, selectedUser]);

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpandedUsers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [rawSettlements, setRawSettlements] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const [adminLastSeen, setAdminLastSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminLastSeen') || '{}');
    } catch(e) { return {}; }
  });

  const markAsReadByAdmin = (id, time) => {
    const next = { ...adminLastSeen, [id]: time };
    setAdminLastSeen(next);
    localStorage.setItem('adminLastSeen', JSON.stringify(next));
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: sData, error: sError } = await supabase
      .from('settlements')
      .select('*')
      .order('created_at', { ascending: false });
    if (!sError) setRawSettlements(sData || []);

    const { data: pData, error: pError } = await supabase
      .from('profiles')
      .select('*');
    if (!pError) setAllProfiles(pData || []);
    
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('allowed_categories').select('name');
    if (!error) setAllowedCategories(data.map(d => d.name));
    else setAllowedCategories(["음식점","한식","중식","일식","양식","분식","카페","커피전문점","제과점","베이커리","편의점","슈퍼마켓","백화점","푸드코트"]);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const [selectedMonth, setSelectedMonth] = useState("2026.04");

  const monthOptions = ["2026.01", "2026.02", "2026.03", "2026.04"];

  const handlePrevMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(monthOptions[idx - 1]);
  };

  const handleNextMonth = () => {
    const idx = monthOptions.indexOf(selectedMonth);
    if (idx < monthOptions.length - 1) setSelectedMonth(monthOptions[idx + 1]);
  };

  useEffect(() => {
    if (rawSettlements.length > 0) {
      const monthFiltered = rawSettlements.filter(s => s.date && s.date.startsWith(selectedMonth.replace('.', '-')));
      const hasPending = monthFiltered.some(s => s.status === "예외요청" || s.status === "보류");
      setActiveTab(hasPending ? "승인 요청" : "전체보기");
    }
  }, [selectedMonth, rawSettlements]);

  const monthlyUsers = useMemo(() => transformData(rawSettlements, allProfiles, selectedMonth), [rawSettlements, allProfiles, selectedMonth]);

  const allPendingRequests = useMemo(() => {
    const requests = [];
    rawSettlements
      .filter(s => s.date && s.date.startsWith(selectedMonth.replace('.', '-'))) // ADDED: Month filter
      .forEach(s => {
      if (s.status === "예외요청" || s.status === "보류" || s.status === "반려" || (s.status === "승인완료" && (s.exc_text || s.excText))) {
        requests.push({ 
          user: { 
            name: s.user_name || "미지정", 
            department: allProfiles.find(p => (p.full_name || p.name) === s.user_name)?.department || "기타"
          }, 
          item: {
            id: s.id,
            date: s.date + " " + (s.time || ""),
            time: s.time,
            amount: parseInt(s.amount || 0),
            desc: s.store_name || s.storeName || "상호명 없음",
            category: s.category,
            violation: true,
            violationLog: s.exc_text || s.excText,
            status: s.status,
            image_url: s.image_url,
            reject_reason: s.reject_reason || s.rejectReason
          }
        });
      }
    });
    return requests;
  }, [rawSettlements, selectedMonth, allProfiles]);

  useEffect(() => {
    if (isReviewPanelOpen && pagerRef.current) {
      const activeChip = pagerRef.current.children[reviewIndex];
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
    const currentReview = allPendingRequests[reviewIndex] || null;
    if (currentReview && currentReview.item.reject_reason) {
       try {
          if (currentReview.item.reject_reason.startsWith('[')) {
             const parsed = JSON.parse(currentReview.item.reject_reason);
             setActionLogs(Array.isArray(parsed) ? parsed : []);
          } else {
             const type = currentReview.item.status === '승인완료' ? 'approve' : 'reject';
             setActionLogs([{ text: `[${currentReview.item.reject_reason}] ${type === 'approve' ? '승인' : '반려'}되었습니다.`, type, sender: 'admin', isDeleted: false }]);
          }
       } catch (e) {
          setActionLogs([]);
       }
    } else if (currentReview && (currentReview.item.status === '반려' || currentReview.item.status === '승인완료')) {
        const type = currentReview.item.status === '승인완료' ? 'approve' : 'reject';
        const msg = currentReview.item.status === '반려' && currentReview.item.violationLog 
           ? `[${currentReview.item.violationLog}] 건은 반려되었습니다.`
           : `${type === 'approve' ? '승인 완료!' + (currentReview.item.violationLog ? `\n(${currentReview.item.violationLog})` : '') : '반려되었습니다.'}`;
        setActionLogs([{ text: msg, type, sender: type === 'approve' ? 'ai' : 'admin', isDeleted: false }]);
    } else {
       setActionLogs([]);
    }

    const input = document.getElementById('reviewMsgInput');
    if (input) input.value = '';

    // Mark as read by admin
    if (currentReview && isReviewPanelOpen) {
       try {
          const rr = currentReview.item.reject_reason;
          if (rr && rr.startsWith('[')) {
             const logs = JSON.parse(rr);
             const lastUser = logs.slice().reverse().find(l => l.sender === 'user' && !l.isDeleted);
             if (lastUser && lastUser.time) {
                markAsReadByAdmin(currentReview.item.id, lastUser.time);
             }
          }
       } catch(e) {}
    }

    // Scroll active pager item into view
    setTimeout(() => {
      const activeItem = document.getElementById(`pager-item-${reviewIndex}`);
      if (activeItem && pagerRef.current) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
  }, [reviewIndex, isReviewPanelOpen, allPendingRequests]);

  const totals = useMemo(() => {
    const monthFiltered = rawSettlements.filter(s => s.date && s.date.startsWith(selectedMonth.replace('.', '-')));
    
    // 승인된 금액 합계
    const total = monthFiltered
      .filter(s => s.status !== "예외요청" && s.status !== "보류" && s.status !== "반려")
      .reduce((acc, curr) => acc + parseInt(curr.amount || 0), 0);
      
    // 보류 중인 금액 합계
    const pendingSpentTotal = monthFiltered
      .filter(s => s.status === "예외요청" || s.status === "보류")
      .reduce((acc, curr) => acc + parseInt(curr.amount || 0), 0);

    const pendingTotal = monthFiltered.filter(s => s.status === "예외요청" || s.status === "보류").length;
    const pendingPeople = monthlyUsers.filter(u => u.pendingCount > 0).length;
    
    return { total, pendingSpentTotal, pendingTotal, pendingPeople };
  }, [rawSettlements, selectedMonth, monthlyUsers]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const filteredUsers = useMemo(() => {
    let list = [...monthlyUsers].sort((a, b) => b.approvedSpent - a.approvedSpent);
    if (activeTab === "승인 요청") {
      list = list.filter(u => u.pendingCount > 0);
    }
    return list;
  }, [monthlyUsers, activeTab]);

  const currentReview = allPendingRequests[reviewIndex] || null;

  const newMsgIdx = useMemo(() => {
     return allPendingRequests.findIndex(req => {
        if (!req.item.reject_reason) return false;
        try {
           const logs = JSON.parse(req.item.reject_reason);
           if (!Array.isArray(logs) || logs.length === 0) return false;
           const last = logs[logs.length - 1];
           const isNewUser = last.sender === 'user' && !last.isDeleted;
           if (isNewUser) {
              const seen = adminLastSeen[req.item.id];
              return !seen || new Date(last.time) > new Date(seen);
           }
        } catch(e) { return false; }
        return false;
     });
  }, [allPendingRequests, adminLastSeen]);

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="header-inner">
          <div className="logo-section">
            <img src="/bi_zaleat.png" className="logo-img" alt="logo" />
            <div className="logo-text">
              <span className="brand-zal">ZAL</span><span className="sep">:</span>잘먹
            </div>
          </div>
          <div className="header-meta">
            관리자님 
            <button className="logout-icon-btn" title="로그아웃" onClick={handleLogout}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Summary Strip (Non-card) */}
      <section className="summary-strip">
        <div className="summary-grid">
          <div className="summary-label l1">오늘 ({new Date().toISOString().slice(5, 10).replace('-', '.')}) 기준</div>
          <div className="summary-label l2">{selectedMonth.split('.')[1]}월 총 사용액</div>
          
          <div className="summary-greeting v1" onClick={() => {
            if (newMsgIdx !== -1) {
              setReviewIndex(newMsgIdx);
            }
            setIsReviewPanelOpen(true);
          }} style={{ position: 'relative' }}>
            <span className="mobile-hide" style={{ marginRight: '4px' }}>관리자님, </span>
            <span className="underline" style={{ color: totals.pendingTotal > 0 ? '#ef4444' : '#15803d' }}>
              <span className="num-spacing summary-num">{totals.pendingTotal}</span>
              건의 
            </span>
            &nbsp;
            <span style={{ position: 'relative' }}>
              <span className="greeting-sub">승인요청이 있습니다.</span>
              {newMsgIdx !== -1 && (
                <div className="new-msg-bubble" style={{ position: "absolute", bottom: "115%", right: "-12px", background: "#ef4444", color: "#fff", fontSize: "0.85rem", fontWeight: 500, padding: "5px 12px", borderRadius: "12px", whiteSpace: "nowrap", zIndex: 20, cursor: "pointer", pointerEvents: "auto", opacity: 1 }}>
                  새 메시지 도착!
                  <div style={{ position: "absolute", bottom: "-5px", right: "12px", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #ef4444" }} />
                </div>
              )}
            </span>
          </div>
          <div className="summary-amount v2" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
            <span className="accent-line">₩{totals.total.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          데이터를 불러오는 중입니다...
        </div>
      )}

      {/* Global Review Panel */}
      {isReviewPanelOpen && (
        <div className="side-panel-overlay" onClick={() => setIsReviewPanelOpen(false)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="close-btn" style={{ fontSize: '1.8rem', opacity: 1, display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setIsReviewPanelOpen(false)}>×</button>
                <div className="user-name" style={{ fontSize: '1.15rem', fontWeight: 850 }}>승인 요청</div>
              </div>

              {/* Pagination moved to header */}
              <div 
                className="pager-container" 
                ref={pagerRef} 
                style={{ 
                  margin: 0, 
                  borderBottom: 'none', 
                  maxWidth: '180px', 
                  overflowX: 'auto', 
                  padding: '4px 0',
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                  display: 'flex',
                  gap: '8px'
                }}
              >
                {allPendingRequests.map((_, idx) => (
                  <div
                    key={idx}
                    id={`pager-item-${idx}`}
                    className={`num-chip ${reviewIndex === idx ? 'active' : ''}`}
                    onClick={() => setReviewIndex(idx)}
                    style={{ flex: '0 0 34px', height: '34px' }}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-content">
              {/* Pagination removed from here */}

              {currentReview ? (
                <>
                  {/* Sticky Summary Card */}
                  <div style={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 100, 
                    background: '#fff', 
                    margin: '0 -4px',
                    padding: '4px 4px 10px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                      <div className="user-name" style={{ fontSize: '0.95rem', fontWeight: 900 }}>{currentReview.user.name}</div>
                      <div className="dept-label" style={{ fontSize: '0.75rem', color: '#999', fontWeight: 600 }}>{currentReview.user.department}</div>
                    </div>

                    <div className="receipt-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                      <div className="receipt-header">
                        <span className="receipt-date">{currentReview.item.date.split(' ')[0]}</span>
                        <span className="receipt-status-chip" style={currentReview.item.status === '승인완료' ? {background: '#E2F5EC', color: '#1E8A4A'} : currentReview.item.status === '반려' ? {background: '#FEE2E2', color: '#E24B4A'} : {}}>
                          {currentReview.item.status === '승인완료' ? '승인완료' : currentReview.item.status === '반려' ? '반려' : '예외요청'}
                        </span>
                      </div>
                      <div className="receipt-title" style={{ fontWeight: 500, fontSize: '0.9rem', color: '#666', marginTop: 8, marginBottom: 12 }}>
                        {currentReview.item.category || "기타"} · {currentReview.item.desc}
                      </div>
                      {/* Violation Items */}
                      <div style={{ marginBottom: 16 }}>
                        {(() => {
                          const dObj = { 
                            id: currentReview.item.id, 
                            date: currentReview.item.date.split(' ')[0], 
                            time: currentReview.item.time,
                            category: currentReview.item.category,
                            amount: currentReview.item.amount
                          };
                          const issues = validate(dObj, allowedCategories, rawSettlements);
                          const filteredIssues = issues.filter(iss => !iss.includes("이미 제출된 내역"));
                          if (filteredIssues.length === 0) return null;
                          return filteredIssues.map((iss, idx) => {
                            const isApproved = currentReview.item.status === '승인완료';
                            return (
                              <div key={idx} style={{ 
                                display: "flex", 
                                alignItems: "flex-start", 
                                gap: 6, 
                                color: isApproved ? "rgba(226, 75, 74, 0.4)" : "#e24b4a", 
                                fontSize: '0.85rem', 
                                fontWeight: 700, 
                                lineHeight: 1.4, 
                                marginBottom: 4 
                              }}>
                                <span style={{ flexShrink: 0, marginTop: 1, opacity: isApproved ? 0.4 : 1 }}><Icon.Alert size={15} color={isApproved ? "rgba(226, 75, 74, 0.4)" : "#e24b4a"} /></span>
                                <span style={{ textDecoration: isApproved ? 'line-through' : 'none' }}>{iss}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      <div className="receipt-violation">
                        {currentReview.item.image_url && (
                          <button className="btn-receipt-view" onClick={() => window.open(currentReview.item.image_url, '_blank')}>영수증 보기</button>
                        )}
                      </div>
                      <div className="receipt-footer">
                        <div className="receipt-amount" style={{ fontSize: '1.5rem', fontWeight: 950 }}>₩{Number(currentReview.item.amount || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Container */}
                  <div className="chat-container">
                    <div className="bubble-wrap user" style={{ alignItems: 'flex-end', width: '100%' }}>
                      <div className="chat-bubble user" style={{ padding: '0.85rem 1.15rem' }}>
                        {currentReview.item.violationLog || "영수증 정산 요청드립니다."}
                      </div>
                      <div className="chat-meta" style={{ textAlign: 'right', alignSelf: 'flex-end', width: '100%', marginTop: '4px' }}>
                        {currentReview.item.date ? (() => {
                          const d = new Date(currentReview.item.date);
                          const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
                          const timeStr = currentReview.item.time ? (() => {
                            const [h, m] = currentReview.item.time.split(':').map(Number);
                            const period = h < 12 ? '오전' : '오후';
                            const hour = h % 12 || 12;
                            return `${period} ${hour}:${m.toString().padStart(2, '0')}`;
                          })() : "";
                          return `${dateStr} ${timeStr}`;
                        })() : "방금 전"}
                      </div>
                    </div>

                    {actionLogs.map((log, logIdx) => {
                      const isUser = log.sender === 'user';
                      return (
                        <div key={logIdx} className={`bubble-wrap ${isUser ? 'user' : 'admin'} ${log.isDeleted ? 'is-deleted' : ''}`} style={{ marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                            <div className={`chat-bubble ${isUser ? 'user' : 'admin'} ${log.type === 'approve' ? 'bg-green' : (log.type === 'reject' ? 'bg-red' : '')} ${log.isDeleted ? 'deleted-style' : ''}`} style={{ padding: '0.85rem 1.15rem', whiteSpace: 'nowrap' }}>
                              {log.text}
                            </div>
                            {!log.isDeleted && !isUser && (
                              <button 
                                className="btn-msg-del" 
                                onClick={async () => {
                                  const newLogs = actionLogs.map((item, i) => i === logIdx ? { ...item, isDeleted: true } : item);
                                  setActionLogs(newLogs);
                                  await updateSettlementStatus(currentReview.item.id, '보류', JSON.stringify(newLogs));
                                }} 
                                title="삭제" style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={log.type === 'approve' ? "#16a34a" : "#e04a4a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                              </button>
                            )}
                          </div>
                          <div className="chat-meta" style={{ textAlign: isUser ? 'right' : 'left', width: '100%', marginTop: '4px' }}>
                            {isUser ? currentReview.user.name : (log.sender === 'ai' ? "AI 잘먹이" : "관리자")} · {log.isDeleted ? "삭제됨 · " : ""} {log.time ? new Date(log.time).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }) : "방금 전"}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Sticky Footer */}
                  {/* Sticky Footer */}
                  {(() => {
                    const lastMsg = actionLogs.length > 0 ? actionLogs[actionLogs.length - 1] : null;
                    const isDisabled = lastMsg && (lastMsg.type === 'approve' || lastMsg.type === 'reject') && !lastMsg.isDeleted;
                    // Fallback for cases where actionLogs might be empty but status is already final
                    const isFinalStatus = actionLogs.length === 0 && (currentReview.item.status === '승인완료' || currentReview.item.status === '반려');
                    const effectiveDisabled = isDisabled || isFinalStatus;
                    
                    return (
                      <div className="panel-footer-fixed">
                        <div className={`message-pill-container ${effectiveDisabled ? 'disabled' : ''}`}>
                          <input
                            type="text"
                            id="reviewMsgInput"
                            className="message-pill-input"
                            placeholder="반려 또는 승인 사유를 입력하세요."
                            disabled={effectiveDisabled}
                          />
                        </div>
                        <div className="cta-group" style={{ alignItems: 'center' }}>
                          <button
                            className="btn-nav"
                            disabled={reviewIndex === 0}
                            onClick={() => { if (reviewIndex > 0) setReviewIndex(reviewIndex - 1); }}
                          >
                            ‹
                          </button>

                          <button
                            className="btn-cta reject"
                            disabled={effectiveDisabled}
                            onClick={() => handleReject(currentReview.item.id)}
                          >
                            반려
                          </button>

                          <button
                            className="btn-cta approve"
                            disabled={effectiveDisabled}
                            onClick={() => handleApprove(currentReview.item.id)}
                          >
                            승인
                          </button>

                          <button
                            className="btn-nav"
                            disabled={reviewIndex === allPendingRequests.length - 1}
                            onClick={() => { if (reviewIndex < allPendingRequests.length - 1) setReviewIndex(reviewIndex + 1); }}
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '5rem 0', color: '#999', fontSize: '1.05rem', fontWeight: 600 }}>
                  해당 월에 신청된 예외 정산 건이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="content-area-wrapper">
        <main className="content-area">
          <div className="filter-section">
            <div className="picker-wrapper">
              <div className="month-picker">
                <button className="picker-arrow" onClick={handlePrevMonth} disabled={selectedMonth === monthOptions[0]}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <div style={{ minWidth: '100px', textAlign: 'center' }}>{selectedMonth}</div>
                <button className="picker-arrow" onClick={handleNextMonth} disabled={selectedMonth === monthOptions[monthOptions.length - 1]}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
              <div className="notice-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                이전 3개월까지 제공됩니다.
              </div>
            </div>
            <div className="filter-group">
              <button
                className={`filter-tab ${activeTab === '승인 요청' ? 'active' : ''}`}
                onClick={() => setActiveTab('승인 요청')}
              >
                승인요청 (<span className="num-spacing">{totals.pendingPeople}</span>)
              </button>
              <button
                className={`filter-tab ${activeTab === '전체보기' ? 'active' : ''}`}
                onClick={() => setActiveTab('전체보기')}
              >
                전체보기 (<span className="num-spacing">{monthlyUsers.length}</span>)
              </button>
            </div>
          </div>

          <div className="user-grid">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className={`user-card ${user.pendingCount > 0 ? 'pending' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="card-header">
                  <div>
                    <div className="user-name">{user.name}</div>
                    <div className="dept-label">{user.department}</div>
                  </div>
                  {user.count > 0 && (
                    <button
                      className={`status-badge ${user.pendingCount > 0 ? 'pending' : ''}`}
                      onClick={(e) => {
                        if (user.pendingCount > 0) {
                          e.stopPropagation();
                          const firstIdx = allPendingRequests.findIndex(req => req.user.name === user.name);
                          if (firstIdx !== -1) setReviewIndex(firstIdx);
                          setIsReviewPanelOpen(true);
                        }
                      }}
                    >
                      {user.pendingCount > 0 ? <>승인요청(<span className="num-spacing">{user.pendingCount}</span>)</> : '승인 완료'}
                    </button>
                  )}
                </div>

                <div className="card-body">
                  <div className="info-hero">
                    <div className="info-label">{selectedMonth.split('.')[1]}월 총 사용 금액</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="info-amount">₩{user.approvedSpent.toLocaleString()}</div>
                      <button className={`more-link ${expandedUsers[user.id] ? 'open' : ''}`} onClick={(e) => toggleExpand(e, user.id)}>
                        더보기
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className={`expandable-content ${expandedUsers[user.id] ? 'open' : ''}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f5f5f5', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="info-label" style={{ margin: 0 }}>사용 횟수</div>
                        <div style={{ fontWeight: 700 }}><span className="num-spacing">{user.count}</span>회</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="info-label" style={{ margin: 0 }}>평균 사용액</div>
                        <div style={{ fontWeight: 700 }}>₩{user.avg.toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="info-label" style={{ margin: 0 }}>반려 금액</div>
                        <div style={{ fontWeight: 700, color: user.rejectedSpent > 0 ? '#ef4444' : 'inherit' }}>₩{user.rejectedSpent.toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="info-label" style={{ margin: 0 }}>보류 금액</div>
                        <div 
                          style={{ 
                            fontWeight: 700, 
                            color: user.pendingSpent > 0 ? '#ef4444' : 'inherit', 
                            textDecoration: user.pendingSpent > 0 ? 'underline' : 'none',
                            cursor: user.pendingSpent > 0 ? 'pointer' : 'default'
                          }}
                          onClick={(e) => {
                            if (user.pendingSpent > 0) {
                              e.stopPropagation();
                              const idx = allPendingRequests.findIndex(r => r.user.name === user.name);
                              if (idx !== -1) setReviewIndex(idx);
                              setIsReviewPanelOpen(true);
                            }
                          }}
                        >
                          ₩{user.pendingSpent.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="info-label" style={{ margin: 0 }}>승인 금액</div>
                        <div style={{ fontWeight: 700 }}>₩{user.approvedSpent.toLocaleString()}</div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        paddingTop: '20px', 
                        paddingBottom: '12px',
                        marginTop: '16px', 
                        borderTop: '2px solid #eee' 
                      }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#000' }}>최종 입금 금액</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 950, color: '#000' }}>
                          ₩{Math.min(user.approvedSpent, user.monthWeekdays * 10000).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Side Panel */}
      {selectedUser && (
        <div className="side-panel-overlay" onClick={() => { setSelectedUser(null); setSelectedHistoryItem(null); }}>
          <div className="side-panel shadow-side" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <button 
                className="close-btn" 
                style={{ fontSize: '1.8rem', opacity: 1, display: 'flex', alignItems: 'center' }} 
                onClick={() => {
                  if (selectedHistoryItem) setSelectedHistoryItem(null);
                  else setSelectedUser(null);
                }}
              >
                {selectedHistoryItem ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                ) : '×'}
              </button>
              <div className="user-name" style={{ fontSize: '1.15rem', fontWeight: 850 }}>
                {selectedHistoryItem ? "요청 상세" : "정산내역"}
              </div>
            </div>

            <div className="panel-content history-layout">
              {!selectedHistoryItem ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', padding: '0 4px' }}>
                    <div className="user-name" style={{ fontSize: '1rem', fontWeight: 900 }}>{selectedUser.name}</div>
                    <div className="dept-label" style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600 }}>{selectedUser.department}</div>
                  </div>

                  {/* History List Header with Filters */}
                  <div className="history-list-filter-row">
                    <div className="filter-chips">
                      {["전체", "승인", "보류", "반려"].map(f => (
                        <button 
                          key={f} 
                          className={`filter-chip ${historyFilter === f ? 'active' : ''}`}
                          onClick={() => setHistoryFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <button 
                      className="sort-toggle-btn"
                      onClick={() => setHistorySortType(prev => prev === "upload" ? "date" : "upload")}
                    >
                      <span>{historySortType === "upload" ? "업로드순" : "날짜순"}</span>
                      <div className="sort-arrows">
                         <span className="arrow">▲</span>
                         <span className="arrow">▼</span>
                      </div>
                    </button>
                  </div>

                  <div className="history-list no-scrollbar" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', paddingBottom: '2rem' }}>
                    {(selectedUser.history || [])
                      .filter(item => {
                        if (historyFilter === "전체") return true;
                        if (historyFilter === "승인") return !item.violation;
                        if (historyFilter === "보류") return item.violation;
                        return false;
                      })
                      .map((item, idx) => {
                        const isViolation = item.violation;
                        return (
                          <div key={idx} className="history-item-card" onClick={() => setSelectedHistoryItem(item)}>
                            <div className="history-card-top">
                              <span className="history-meta">{item.date} · 식당</span>
                              <span className={`history-status-badge ${isViolation ? 'pending' : 'approved'}`}>
                                {isViolation ? '보류' : '승인'}
                              </span>
                            </div>
                            <div className="history-card-title">
                              {item.store || item.desc}
                            </div>
                            <div className="history-card-footer">
                              <div className="history-amount">₩{item.amount.toLocaleString()}</div>
                              <button className="history-delete-btn" onClick={(e) => { e.stopPropagation(); alert('정산 내역을 삭제하시겠습니까?'); }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {selectedUser.history.length === 0 && (
                      <div style={{ color: '#ccc', textAlign: 'center', padding: '5rem 0' }}>정산 내역이 없습니다.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="history-detail-view no-scrollbar">
                  <div className="detail-scroll-area no-scrollbar">
                    <div className="receipt-card detailed">
                      <div className="receipt-card-header">
                        <span className="receipt-card-date">{selectedHistoryItem.date.split(' ')[0]}</span>
                        <span className={`history-status-badge ${selectedHistoryItem.violation ? 'pending' : 'approved'}`}>
                          {selectedHistoryItem.violation ? '보류' : '승인'}
                        </span>
                      </div>
                      <div className="receipt-card-title">음식점 · {selectedHistoryItem.desc}</div>
                      {selectedHistoryItem.image_url && (
                        <button className="receipt-card-btn" onClick={() => window.open(selectedHistoryItem.image_url, '_blank')}>영수증 보기</button>
                      )}
                      <div className="receipt-card-amount num-spacing">₩{selectedHistoryItem.amount.toLocaleString()}</div>
                    </div>

                    <div className="history-chat-row">
                      <div className="chat-bubble user">
                        영수증 정산 요청드립니다.
                      </div>
                      <div className="chat-meta right">4월 13일 오후 5:25</div>

                      <div className={`chat-bubble admin ${!selectedHistoryItem.violation ? 'bg-green' : ''}`}>
                        {selectedHistoryItem.violation ? (
                          <>보류 사유 안내드립니다.<br/>{selectedHistoryItem.violationLog || "정산 기준 미준수 건입니다."}</>
                        ) : (
                          <>승인 완료!{selectedHistoryItem.violationLog ? <><br/><span style={{ fontSize: '0.9em', color: '#e24b4a', opacity: 0.5, textDecoration: 'line-through' }}>({selectedHistoryItem.violationLog})</span></> : ""}</>
                        )}
                      </div>
                      <div className="chat-meta left">{selectedHistoryItem.violation ? "관리자" : "AI 잘먹이"} · 4월 13일 오후 5:30</div>

                      {/* Dynamic Chats */}
                      {historyChats[selectedHistoryItem.id]?.map((chat, ci) => (
                        <div key={ci} style={{ display: 'flex', flexDirection: 'column' }}>
                          <div className={`chat-bubble ${chat.sender}`}>
                            {chat.text}
                          </div>
                          <div className={`chat-meta ${chat.sender === 'user' ? 'right' : 'left'}`}>
                            {chat.time}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  <div className="chat-input-wrapper">
                    <div className="chat-input-box">
                      <input 
                        placeholder="메시지를 입력하세요." 
                        value={historyInput}
                        onChange={e => setHistoryInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSendHistoryMsg(); }}
                      />
                      <button className="chat-send-btn" onClick={handleSendHistoryMsg} style={{ color: historyInput.trim() ? '#000' : '#ccc' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 7-7-7-7M5 12h14"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}