import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./Admin.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Data transformation helper
const transformData = (settlements, profiles, month) => {
  const filtered = settlements.filter(s => s.date && s.date.startsWith(month.replace('.', '-')));
  
  // Initialize map with ALL registered profiles
  const usersMap = {};
  
  // Fill with all users first (amount = 0)
  profiles.forEach(p => {
    const userName = p.full_name || p.name || "미지정";
    usersMap[userName] = {
      id: userName,
      name: userName,
      department: p.department || "기타",
      totalSpent: 0,
      pendingSpent: 0,
      rejectedSpent: 0,
      count: 0,
      pendingCount: 0,
      uniqueDates: new Set(),
      history: [],
      rejectionHistory: []
    };
  });

  // Merge settlements into the map
  filtered.forEach(s => {
    const userName = s.user_name || "미지정";
    if (!usersMap[userName]) {
      usersMap[userName] = {
        id: userName,
        name: userName,
        department: s.department || "기타",
        totalSum: 0,       // All (Approved + Pending + Rejected)
        approvedSpent: 0,  // Only Approved
        pendingSpent: 0,
        rejectedSpent: 0,
        count: 0,
        pendingCount: 0,
        uniqueDates: new Set(),
        history: [],
        rejectionHistory: []
      };
    }
    
    const amt = parseInt(s.amount || 0);
    if (s.date) usersMap[userName].uniqueDates.add(s.date);
    const isPending = s.status === "예외요청" || s.status === "보류";
    const isRejected = s.status === "반려";

    usersMap[userName].totalSum += amt;
    usersMap[userName].count += 1;

    if (isPending) {
      usersMap[userName].pendingSpent += amt;
      usersMap[userName].pendingCount += 1;
    } else if (isRejected) {
      usersMap[userName].rejectedSpent += amt;
    } else {
      // Strictly Approved (승인완료/승인대기 등)
      usersMap[userName].approvedSpent += amt;
    }
    
    usersMap[userName].history.push({
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

  return Object.values(usersMap).map(u => ({
    ...u,
    workingDays: u.uniqueDates.size,
    avg: u.count > 0 ? Math.floor(u.totalSum / u.count) : 0
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
  const chatEndRef = useRef(null);

  const pagerRef = useRef(null);

  useEffect(() => {
    if (isReviewPanelOpen && pagerRef.current) {
      const activeChip = pagerRef.current.children[reviewIndex];
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
    // Clear logs on panel change
    setActionLogs([]);
    const input = document.getElementById('reviewMsgInput');
    if (input) input.value = '';
  }, [reviewIndex, isReviewPanelOpen]);

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
    setActionLogs(prev => [...prev, { text: msg ? `[${msg}] 승인되었습니다.` : '승인되었습니다.', type: 'approve', isDeleted: false }]);
    updateSettlementStatus(id, '승인완료', msg);
    document.getElementById('reviewMsgInput').value = '';
  };

  const handleReject = (id) => {
    const msg = document.getElementById('reviewMsgInput').value;
    if (!msg) {
      alert("반려 사유를 입력해주세요.");
      return;
    }
    setActionLogs(prev => [...prev, { text: `[${msg}] 반려되었습니다.`, type: 'reject', isDeleted: false }]);
    updateSettlementStatus(id, '반려', msg);
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

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch settlements
    const { data: sData, error: sError } = await supabase
      .from('settlements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!sError) setRawSettlements(sData || []);

    // Try to fetch all user profiles
    const { data: pData, error: pError } = await supabase
      .from('profiles')
      .select('*');
    
    if (!pError) {
      setAllProfiles(pData || []);
    } else {
      console.warn("Profiles table not found or inaccessible. Showing submitted users only.");
    }
    
    if (!sError) {
      // 승인 요청 건이 없으면 전체보기 디폴트 선택
      const hasPending = sData?.some(s => s.status === "예외요청" || s.status === "보류");
      if (!hasPending) {
        setActiveTab("전체보기");
      }
    }
    setLoading(false);
  };

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

  const monthlyUsers = useMemo(() => transformData(rawSettlements, allProfiles, selectedMonth), [rawSettlements, allProfiles, selectedMonth]);

  const allPendingRequests = useMemo(() => {
    const requests = [];
    rawSettlements.forEach(s => {
      if (s.status === "예외요청" || s.status === "보류") {
        requests.push({ 
          user: { name: s.user_name || "미지정", department: s.department || "기타" }, 
          item: {
            id: s.id,
            date: s.date + " " + (s.time || ""),
            amount: parseInt(s.amount || 0),
            desc: s.store_name || s.storeName || "상호명 없음",
            violation: true,
            violationLog: s.exc_text || s.excText,
            status: s.status,
            image_url: s.image_url
          }
        });
      }
    });
    return requests;
  }, [rawSettlements]);

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

    const pendingTotal = allPendingRequests.length;
    const pendingPeople = monthlyUsers.filter(u => u.pendingCount > 0).length;
    
    return { total, pendingSpentTotal, pendingTotal, pendingPeople };
  }, [rawSettlements, selectedMonth, allPendingRequests, monthlyUsers]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const filteredUsers = useMemo(() => {
    let list = [...monthlyUsers].sort((a, b) => b.totalSum - a.totalSum);
    if (activeTab === "승인 요청") {
      list = list.filter(u => u.pendingCount > 0);
    }
    return list;
  }, [monthlyUsers, activeTab]);

  const currentReview = allPendingRequests[reviewIndex] || null;

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
          
          <div className="summary-greeting v1" onClick={() => setIsReviewPanelOpen(true)}>
            <span className="mobile-hide">관리자님, </span>
            <span className="underline" style={{ color: totals.pendingTotal > 0 ? '#ef4444' : '#15803d' }}><span className="num-spacing summary-num">{totals.pendingTotal}</span>건의 </span>
            <span className="greeting-sub">승인요청이 있습니다.</span>
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
            <div className="panel-header">
              <button className="close-btn" style={{ fontSize: '1.8rem', opacity: 1, display: 'flex', alignItems: 'center' }} onClick={() => setIsReviewPanelOpen(false)}>×</button>
              <div className="user-name" style={{ fontSize: '1.15rem', fontWeight: 850 }}>승인 요청</div>
            </div>

            <div className="panel-content">
              {/* Pagination */}
              <div className="pager-container" ref={pagerRef} style={{ borderBottom: 'none', marginBottom: '1.5rem' }}>
                {allPendingRequests.map((_, idx) => (
                  <div
                    key={idx}
                    className={`num-chip ${reviewIndex === idx ? 'active' : ''}`}
                    onClick={() => setReviewIndex(idx)}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>

              {currentReview && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <div className="user-name" style={{ fontSize: '0.95rem', fontWeight: 900 }}>{currentReview.user.name}</div>
                    <div className="dept-label" style={{ fontSize: '0.75rem', color: '#999', fontWeight: 600 }}>{currentReview.user.department}</div>
                  </div>

                  {/* Receipt Card (Employee App Style) */}
                  <div className="receipt-card" style={{ padding: '1.25rem' }}>
                    <div className="receipt-header">
                      <span className="receipt-date">{currentReview.item.date.split(' ')[0]}</span>
                      <span className="receipt-status-chip">보류</span>
                    </div>
                    <div className="receipt-title">
                      휴게음식점 · {currentReview.item.desc}
                    </div>
                    {/* Always show violation in UI demo */}
                    <div className="receipt-violation">
                      <span>보류 사유: {currentReview.item.violationLog || "결제 시간 미준수"}</span>
                      {currentReview.item.image_url && (
                        <button className="btn-receipt-view" onClick={() => window.open(currentReview.item.image_url, '_blank')}>영수증 보기</button>
                      )}
                    </div>
                    <div className="receipt-footer">
                      <div className="receipt-amount" style={{ fontSize: '1.5rem', fontWeight: 950 }}>₩{currentReview.item.amount.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Chat Container */}
                  <div className="chat-container">
                    <div className="bubble-wrap user">
                      <div className="chat-bubble user" style={{ padding: '0.85rem 1.15rem' }}>
                        업무 미팅 지연으로 정산 요청드립니다.
                      </div>
                      <div className="chat-meta">4월 15일 오전 11:07</div>
                    </div>

                    <div className="bubble-wrap admin">
                      <div className="chat-bubble admin" style={{ padding: '0.85rem 1.15rem', background: '#fff' }}>
                        검토 중입니다.<br />
                        추가 문의 사항이 있으시면 댓글을 남겨주세요.
                      </div>
                      <div className="chat-meta">관리자 · 4월 15일 오전 11:12</div>
                    </div>

                    {actionLogs.map((log, logIdx) => (
                      <div key={logIdx} className={`bubble-wrap admin ${log.isDeleted ? 'is-deleted' : ''}`} style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div className={`chat-bubble admin ${log.type === 'approve' ? 'bg-green' : 'bg-red'} ${log.isDeleted ? 'deleted-style' : ''}`} style={{ padding: '0.85rem 1.15rem', whiteSpace: 'nowrap' }}>
                            {log.text}
                          </div>
                          {!log.isDeleted && (
                            <button 
                              className="btn-msg-del" 
                              onClick={() => {
                                setActionLogs(prev => prev.map((item, i) => i === logIdx ? { ...item, isDeleted: true } : item));
                              }} 
                              title="삭제" style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={log.type === 'approve' ? "#16a34a" : "#e04a4a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            </button>
                          )}
                        </div>
                        <div className="chat-meta">
                          관리자 · 방금 전 {log.isDeleted && <span className="deleted-label">· 삭제됨</span>}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Sticky Footer */}
                  <div className="panel-footer-fixed">
                    {/* Disable if the last message is NOT deleted */}
                    <div className={`message-pill-container ${(actionLogs.length > 0 && !actionLogs[actionLogs.length - 1].isDeleted) ? 'disabled' : ''}`}>
                      <input
                        type="text"
                        id="reviewMsgInput"
                        className="message-pill-input"
                        placeholder="반려 또는 승인 사유를 입력하세요."
                        disabled={actionLogs.length > 0 && !actionLogs[actionLogs.length - 1].isDeleted}
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
                        disabled={actionLogs.length > 0 && !actionLogs[actionLogs.length - 1].isDeleted}
                        onClick={() => handleReject(currentReview.item.id)}
                      >
                        반려
                      </button>

                      <button
                        className="btn-cta approve"
                        disabled={actionLogs.length > 0 && !actionLogs[actionLogs.length - 1].isDeleted}
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
                </>
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
                  </div>
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
                </div>

                <div className="card-body">
                  <div className="info-hero">
                    <div className="info-label">{selectedMonth.split('.')[1]}월 총 사용 금액</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="info-amount">₩{user.totalSum.toLocaleString()}</div>
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
                        <div style={{ fontWeight: 700 }}>₩{user.rejectedSpent.toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="info-label" style={{ margin: 0, color: user.pendingSpent > 0 ? '#ef4444' : '#B87020' }}>보류 금액</div>
                        <div 
                          style={{ 
                            fontWeight: 700, 
                            color: user.pendingSpent > 0 ? '#ef4444' : '#B87020', 
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
                          ₩{Math.min(user.approvedSpent, user.workingDays * 10000).toLocaleString()}
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

                      <div className="chat-bubble admin">
                        {selectedHistoryItem.violation ? (
                          <>보류 사유 안내드립니다.<br/>{selectedHistoryItem.violationLog || "정산 기준 미준수 건입니다."}</>
                        ) : (
                          <>승인 완료!<br/>익월 22일에 입금 됩니다.</>
                        )}
                      </div>
                      <div className="chat-meta left">관리자 · 4월 13일 오후 5:30</div>

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