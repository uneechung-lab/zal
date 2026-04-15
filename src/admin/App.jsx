import { useState, useMemo, useEffect, useRef } from "react";
import "./Admin.css";

// Utils for generating data
const NAMES = ["정해인", "박은빈", "손석구", "김태리", "남주혁", "수지", "송중기", "한소희", "유재석", "강호동", "신동엽", "박보검", "아이유", "지드래곤", "임영웅", "조인성", "공효진", "김혜수", "이정재", "정우성", "한지민", "공유", "이보영", "지성", "김수현", "서현진", "강동원", "유아인", "천우희", "박서준", "김지원", "이민호", "박민영", "이종석", "한효주", "김우빈", "신민아", "이성경", "안효섭", "김세정", "박형식", "임윤아", "서인국", "정소민", "이제훈"];
const DEPTS = ["기획팀", "디자인팀", "개발팀", "마케팅팀", "영업팀", "인사팀", "법무팀"];

const generateData = (month) => {
  const monthSeed = parseInt(month.split('.')[1]);
  return NAMES.map((name, index) => {
    const id = index + 1;
    // Vary results based on index and month
    const totalSpent = (150000 + (index * 12345) + (monthSeed * 50000)) % 1000000;
    const count = (5 + (index % 10) + (monthSeed % 5)) % 30;
    const pendingCount = (index + monthSeed) % 7 === 0 ? (index % 3) + 1 : 0;
    const department = DEPTS[index % DEPTS.length];

    return {
      id,
      name,
      totalSpent,
      count: count || 1,
      avg: Math.floor(totalSpent / (count || 1)),
      pendingCount,
      department,
      history: [
        { date: `${month.replace('.', '-')}-14 12:30`, amount: 15000, desc: "스타벅스 성수점", violation: false },
        ...(pendingCount > 0 ? [{ date: `${month.replace('.', '-')}-13 19:20`, amount: 45000, desc: "중앙해장 (업무외 시간 사용)", violation: true, violationLog: "허용 시간 외 사용됨" }] : [])
      ],
      rejectionHistory: []
    };
  });
};
export default function App() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("승인 요청");
  const [expandedUsers, setExpandedUsers] = useState({});

  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewAction, setReviewAction] = useState("approve");
  const [actionLog, setActionLog] = useState(null);

  const pagerRef = useRef(null);

  useEffect(() => {
    if (isReviewPanelOpen && pagerRef.current) {
      const activeChip = pagerRef.current.children[reviewIndex];
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
    // Clear logs on panel change
    setActionLog(null);
    const input = document.getElementById('reviewMsgInput');
    if (input) input.value = '';
  }, [reviewIndex, isReviewPanelOpen]);

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpandedUsers(prev => ({ ...prev, [id]: !prev[id] }));
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

  const monthlyUsers = useMemo(() => generateData(selectedMonth), [selectedMonth]);

  const allPendingRequests = useMemo(() => {
    const requests = [];
    monthlyUsers.forEach(user => {
      user.history.forEach((item, idx) => {
        if (item.violation || user.pendingCount > 0) { // Simplified logic for mock
          // In real app, we'd filter strictly by pending status
          if (requests.length < 12) { // Match the 12 count for UI consistency
            requests.push({ user, item });
          }
        }
      });
    });
    return requests;
  }, [monthlyUsers]);

  const totals = useMemo(() => {
    const total = monthlyUsers.reduce((acc, curr) => acc + curr.totalSpent, 0);
    const pendingTotal = 12; // Forced as per UI request
    const pendingPeople = monthlyUsers.filter(u => u.pendingCount > 0).length;
    return { total, pendingTotal, pendingPeople };
  }, [monthlyUsers]);

  const filteredUsers = useMemo(() => {
    let list = [...monthlyUsers].sort((a, b) => b.totalSpent - a.totalSpent);
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
            <button className="logout-icon-btn" title="로그아웃">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Summary Strip (Non-card) */}
      <section className="summary-strip">
        <div className="summary-grid">
          <div className="summary-label l1">오늘 ({selectedMonth}.15) 기준</div>
          <div className="summary-label l2">{selectedMonth.split('.')[1]}월 총 사용액</div>
          
          <div className="summary-greeting v1" onClick={() => setIsReviewPanelOpen(true)}>
            <span className="mobile-hide">관리자님, </span>
            <span className="underline" style={{ color: totals.pendingTotal > 0 ? '#ef4444' : 'inherit' }}>{totals.pendingTotal}건의 </span>
            <span className="greeting-sub">승인 요청이 있습니다.</span>
          </div>
          <div className="summary-amount v2">
            <span className="accent-line">₩{totals.total.toLocaleString()}</span>
          </div>
        </div>
      </section>

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
                      <span>보류 사유: 결제 시간(15:00) 미준수</span>
                      <button className="btn-receipt-view">영수증 보기</button>
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

                    {actionLog && (
                      <div className="bubble-wrap admin" style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div className={`chat-bubble admin ${actionLog.type === 'approve' ? 'bg-green' : 'bg-red'}`} style={{ padding: '0.85rem 1.15rem', whiteSpace: 'nowrap' }}>
                            {actionLog.text}
                          </div>
                          <button className="btn-msg-del" onClick={() => setActionLog(null)} title="삭제" style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={actionLog.type === 'approve' ? "#16a34a" : "#e04a4a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                          </button>
                        </div>
                        <div className="chat-meta">관리자 · 방금 전</div>
                      </div>
                    )}
                  </div>

                  {/* Sticky Footer */}
                  <div className="panel-footer-fixed">
                    <div className="message-pill-container">
                      <input
                        type="text"
                        id="reviewMsgInput"
                        className="message-pill-input"
                        placeholder="반려 또는 승인 사유를 입력하세요."
                        disabled={!!actionLog}
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
                        disabled={!!actionLog}
                        onClick={() => {
                          const msg = document.getElementById('reviewMsgInput').value;
                          setActionLog({ text: msg ? `[${msg}] 반려되었습니다.` : '반려되었습니다.', type: 'reject' });
                          document.getElementById('reviewMsgInput').value = '';
                        }}
                      >
                        반려
                      </button>

                      <button
                        className="btn-cta approve"
                        disabled={!!actionLog}
                        onClick={() => {
                          const msg = document.getElementById('reviewMsgInput').value;
                          setActionLog({ text: msg ? `[${msg}] 승인되었습니다.` : '승인되었습니다.', type: 'approve' });
                          document.getElementById('reviewMsgInput').value = '';
                        }}
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
                승인 요청 ({totals.pendingPeople})
              </button>
              <button
                className={`filter-tab ${activeTab === '전체보기' ? 'active' : ''}`}
                onClick={() => setActiveTab('전체보기')}
              >
                전체보기 ({monthlyUsers.length})
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
                  <button
                    className={`status-badge ${user.pendingCount > 0 ? 'pending' : ''}`}
                    onClick={(e) => {
                      if (user.pendingCount > 0) {
                        e.stopPropagation();
                        setIsReviewPanelOpen(true);
                      }
                    }}
                  >
                    {user.pendingCount > 0 ? `승인 요청(${user.pendingCount})` : '승인 완료'}
                  </button>
                </div>

                <div className="card-body">
                  <div className="info-hero">
                    <div className="info-label">{selectedMonth.split('.')[1]}월 총 사용 금액</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="info-amount">₩{user.totalSpent.toLocaleString()}</div>
                      <button className={`more-link ${expandedUsers[user.id] ? 'open' : ''}`} onClick={(e) => toggleExpand(e, user.id)}>
                        더보기
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className={`expandable-content ${expandedUsers[user.id] ? 'open' : ''}`}>
                    <div className="grid-2">
                      <div>
                        <div className="info-label">사용 횟수</div>
                        <div style={{ fontWeight: 700 }}>{user.count}회</div>
                      </div>
                      <div>
                        <div className="info-label">평균 사용액</div>
                        <div style={{ fontWeight: 700 }}>₩{user.avg.toLocaleString()}</div>
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
        <div className="side-panel-overlay" onClick={() => setSelectedUser(null)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <div>
                <div className="panel-title">{selectedUser.name}</div>
                <div className="dept-label" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                  {selectedUser.department} • {selectedUser.pendingCount > 0 ? '승인 대기 중' : '정산 완료'}
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
            </div>

            <div className="panel-content">
              <h3 className="section-title">최근 거래 로그</h3>
              {selectedUser.history.map((log, i) => (
                <div key={i} className={`log-item ${log.violation ? 'violation' : ''}`}>
                  <div className="log-header">
                    <span className="info-label">{log.date}</span>
                    <span className="log-amount">₩{log.amount.toLocaleString()}</span>
                  </div>
                  <div className="log-desc">{log.desc}</div>
                  {log.violation && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 800, marginTop: '8px' }}>
                      ⚠️ {log.violationLog}
                    </div>
                  )}
                </div>
              ))}
              {selectedUser.history.length === 0 && (
                <div style={{ color: '#ccc', textAlign: 'center', padding: '3rem' }}>내역이 없습니다.</div>
              )}

              <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                <button style={{ flex: 1, padding: '1.25rem', borderRadius: '20px', border: '1.5px solid #000', background: '#000', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>메시지 전송</button>
                <button style={{ flex: 1, padding: '1.25rem', borderRadius: '20px', border: '1.5px solid #eee', background: '#f9f9f9', color: '#666', fontWeight: 800, cursor: 'pointer' }}>일괄 승인</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}