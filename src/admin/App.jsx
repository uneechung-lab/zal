import { useState, useMemo, useEffect, useRef } from "react";
import FeedbackSystem, { FeedbackAdminList } from "../FeedbackSystem";
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
    return cStr.some(c => c.trim() && (c.trim().includes(t) || t.includes(c.trim())));
  });
  if (!catMatch) issues.push("지원 업종이 아닙니다. (업종: " + (d.category || "미확인") + ")");
  // 금액 검사
  const cleanAmt = String(d.amount || "").replace(/[^\d]/g, "");
  if (!cleanAmt || parseInt(cleanAmt) <= 0) issues.push("금액 정보를 확인할 수 없습니다.");
  
  return issues;
}
const transformData = (settlements, profiles, month, adminLastSeen = {}) => {
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
      rejectionHistory: [],
      unreadCount: 0
    };
  });

  // Merge current month settlements into the map
  filtered.forEach(s => {
    if (!s.id || !s.amount) return; // Skip invalid or ghost data
    
    const userName = s.user_name || "미지정";
    const u = usersMap[userName];
    if (!u) return;

    const amt = parseInt(s.amount || 0);
    const isPending = s.status === "예외요청" || s.status === "보류";
    const isRejected = s.status === "반려";

    u.totalSum += amt;
    u.count += 1;
    
    // Store all per date for smarter summation in Step 4
    if (!u.dailySettlements) u.dailySettlements = {};
    if (!u.dailySettlements[s.date]) u.dailySettlements[s.date] = [];
    u.dailySettlements[s.date].push({ id: s.id, status: s.status, amount: amt });

    u.history.push({
      id: s.id,
      date: s.date + " " + (s.time || ""),
      time: s.time,
      amount: amt,
      desc: s.store_name || s.storeName || "상호명 없음",
      category: s.category,
      violation: isPending,
      violationLog: s.exc_text || s.excText,
      status: s.status,
      image_url: s.image_url,
      actionLogs: s.reject_reason
    });

    // Unread Message Tracking for Admin
    const rr = s.reject_reason || s.rejectReason;
    if (rr && rr.startsWith('[')) {
      try {
        const logs = JSON.parse(rr);
        if (logs.length > 0) {
          const last = logs[logs.length - 1];
          // Only count as unread if the last message is from user AND not a system/deleted message
          if (last.sender === 'user' && !last.isDeleted) {
            const seen = adminLastSeen[s.id];
            if (!seen || new Date(last.time) > new Date(seen)) {
              u.unreadCount += 1;
            }
          }
        }
      } catch(e) {}
    }
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
      
      // Always sum all items strictly by their status, ignoring the "only one per day" rule for totals
      dayList.forEach(it => {
        if (it.status === "승인완료") {
          u.approvedSpent += it.amount;
        } else if (it.status === "예외요청" || it.status === "보류") {
          u.pendingSpent += it.amount;
          u.pendingCount += 1;
        } else if (it.status === "반려") {
          u.rejectedSpent += it.amount;
        }
      });
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
  const [filterType, setFilterType] = useState("pending"); // pending, all, approved
  const [expandedUsers, setExpandedUsers] = useState({});
  const [gridColumns, setGridColumns] = useState(4);
  const [userSortType, setUserSortType] = useState("name"); // name, dept, amount
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isFeedbackListOpen, setIsFeedbackListOpen] = useState(false);

  useEffect(() => {
    const closeMenus = () => {
      setIsSortMenuOpen(false);
      setIsFilterMenuOpen(false);
    };
    if (isSortMenuOpen || isFilterMenuOpen) {
      window.addEventListener('click', closeMenus);
    }
    return () => window.removeEventListener('click', closeMenus);
  }, [isSortMenuOpen, isFilterMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 720) setGridColumns(1);
      else if (w < 1060) setGridColumns(2);
      else if (w < 1400) setGridColumns(3);
      else setGridColumns(4);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [showReviewShadow, setShowReviewShadow] = useState(false);
  const [showHistoryShadow, setShowHistoryShadow] = useState(false);
  const [showHistoryDetailShadow, setShowHistoryDetailShadow] = useState(false);
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

  // Auto-switch to "Pending" if exists on month change, otherwise "All"
  useEffect(() => {
    if (rawSettlements.length > 0) {
      const monthFiltered = rawSettlements.filter(s => s.date && s.date.startsWith(selectedMonth.replace('.', '-')));
      const hasPending = monthFiltered.some(s => s.status === "예외요청" || s.status === "보류");
      setFilterType(hasPending ? "pending" : "all");
    }
  }, [selectedMonth, rawSettlements]);

  const monthlyUsers = useMemo(() => transformData(rawSettlements, allProfiles, selectedMonth, adminLastSeen), [rawSettlements, allProfiles, selectedMonth, adminLastSeen]);
  
  const pathLabel = useMemo(() => {
    if (isReviewPanelOpen) return "관리자 > 정산 신청 리뷰";
    if (selectedUser) {
      if (selectedHistoryItem) return `관리자 > 사용자 상세(${selectedUser.name}) > 채팅`;
      return `관리자 > 사용자 상세(${selectedUser.name}) > 목록`;
    }
    return "관리자 > 대시보드";
  }, [isReviewPanelOpen, selectedUser, selectedHistoryItem]);

  const allPendingRequests = useMemo(() => {
    const requests = [];
    rawSettlements
      .filter(s => s.date && s.date.startsWith(selectedMonth.replace('.', '-')))
      .forEach(s => {
      if (s.status === "예외요청" || s.status === "보류" || s.status === "반려" || (s.status === "승인완료" && (s.exc_text || s.excText))) {
        // "Replaced" logic: Is there another settlement for the same user on the same date with different ID?
        // We consider it replaced if:
        // 1. There is ANY settlement with status "승인완료" on that day.
        // 2. OR there is a NEWER settlement (higher ID) on that day.
        const sameDayRecords = rawSettlements.filter(o => 
          (o.user_name || o.userName || o.full_name) === (s.user_name || s.userName || s.full_name) && 
          o.date === s.date
        );
        
        const hasApprovedOnDay = sameDayRecords.some(o => o.status === "승인완료");
        
        let isReplaced = false;
        if (hasApprovedOnDay) {
          // If something is approved, everything NOT approved is replaced
          isReplaced = s.status !== "승인완료";
        } else {
          // If nothing approved, only the LATEST created one is NOT replaced
          const latest = [...sameDayRecords].sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            // If created_at missing, fallback to ID compare (if numeric) or array order
            if (timeA === timeB) return parseInt(b.id) - parseInt(a.id);
            return timeB - timeA;
          })[0];
          isReplaced = String(s.id) !== String(latest?.id);
        }

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
            reject_reason: s.reject_reason || s.rejectReason,
            isReplaced
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
           : `${type === 'approve' ? '승인 완료!' : '반려되었습니다.'}`;
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

  // Mark history item as read when selected
  useEffect(() => {
    if (selectedHistoryItem && selectedHistoryItem.actionLogs) {
      try {
        const rr = selectedHistoryItem.actionLogs;
        if (rr && rr.startsWith('[')) {
          const logs = JSON.parse(rr);
          const lastUser = logs.slice().reverse().find(l => l.sender === 'user' && !l.isDeleted);
          if (lastUser && lastUser.time) {
            markAsReadByAdmin(selectedHistoryItem.id, lastUser.time);
          }
        }
      } catch (e) {
        console.error("Error marking history as read:", e);
      }
    }
  }, [selectedHistoryItem]);

  const totals = useMemo(() => {
    const monthFiltered = rawSettlements.filter(s => s.date && s.date.startsWith(selectedMonth.replace('.', '-')));
    
    // 승인된 금액(한도 내) 합계
    const total = monthlyUsers.reduce((acc, u) => acc + Math.min(u.approvedSpent, u.monthWeekdays * 10000), 0);
      
    // 보류 중인 금액 합계
    // Use monthlyUsers to get consistent counts with the tabs/cards
    const pendingTotal = monthlyUsers.reduce((acc, u) => acc + u.pendingCount, 0);
    const pendingPeople = monthlyUsers.filter(u => u.pendingCount > 0).length;
    const pendingSpentTotal = monthlyUsers.reduce((acc, u) => acc + u.pendingSpent, 0);
    const unreadTotal = monthlyUsers.reduce((acc, u) => acc + (u.unreadCount || 0), 0);
    
    const activePeople = monthlyUsers.filter(u => u.count > 0).length; // Keep for metrics if needed
    const approvedPeople = monthlyUsers.filter(u => u.count > 0 && u.pendingCount === 0).length;
    const totalPeople = monthlyUsers.length;
    
    return { total, pendingSpentTotal, pendingTotal, pendingPeople, unreadTotal, approvedPeople, activePeople, totalPeople };
  }, [rawSettlements, selectedMonth, monthlyUsers]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const filteredUsers = useMemo(() => {
    let list = [...monthlyUsers];
    if (filterType === "pending") {
      list = list.filter(u => u.pendingCount > 0);
    } else if (filterType === "approved") {
      list = list.filter(u => u.count > 0 && u.pendingCount === 0);
    } 
    // "all" view shows everyone including 0 usage
    
    if (userSortType === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } else if (userSortType === "dept") {
      list.sort((a, b) => a.department.localeCompare(b.department, 'ko') || a.name.localeCompare(b.name, 'ko'));
    } else if (userSortType === "amount") {
      list.sort((a, b) => b.approvedSpent - a.approvedSpent || a.name.localeCompare(b.name, 'ko'));
    }
    
    return list;
  }, [monthlyUsers, filterType, userSortType]);

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
          <div className="header-meta" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '1px', height: '16px', background: '#eee' }}></div>
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
          <div className="summary-label l2">{selectedMonth.split('.')[1]}월 총 입금액</div>
          
          <div className="summary-greeting v1" onClick={() => {
            if (newMsgIdx !== -1) {
              setReviewIndex(newMsgIdx);
              setIsReviewPanelOpen(true);
            } else {
              const firstUnreadUser = monthlyUsers.find(u => u.unreadCount > 0);
              if (firstUnreadUser) {
                setSelectedUser(firstUnreadUser);
                // Also try to find the specific unread item in history and select it
                const unreadItem = firstUnreadUser.history.find(h => {
                   const seen = adminLastSeen[h.id];
                   if (h.actionLogs && h.actionLogs.startsWith('[')) {
                      try {
                         const logs = JSON.parse(h.actionLogs);
                         const last = logs[logs.length-1];
                         return last.sender === 'user' && (!seen || new Date(last.time) > new Date(seen));
                      } catch(e){}
                   }
                   return false;
                });
                if (unreadItem) setSelectedHistoryItem(unreadItem);
              } else {
                setIsReviewPanelOpen(true);
              }
            }
          }} style={{ position: 'relative' }}>
            <span className="mobile-hide" style={{ marginRight: '4px' }}>관리자님, </span>
            <span className="underline" style={{ color: totals.pendingTotal > 0 ? '#ef4444' : '#15803d' }}>
              <span className="num-spacing summary-num">{totals.pendingTotal}</span>
              건의 
            </span>
            &nbsp;
            <span style={{ position: 'relative' }}>
              <span className="greeting-sub">승인요청이 있습니다.</span>
              {totals.unreadTotal > 0 && (
                <div className="new-msg-bubble" style={{ position: "absolute", bottom: "115%", right: "-12px", background: "#ef4444", color: "#fff", fontSize: "0.85rem", fontWeight: 500, padding: "5px 12px", borderRadius: "12px", whiteSpace: "nowrap", zIndex: 20, cursor: "pointer", pointerEvents: "auto" }}>
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

            <div className="panel-content" onScroll={(e) => setShowReviewShadow(e.target.scrollTop > 5)}>
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
                    boxShadow: showReviewShadow ? '0 10px 20px -10px rgba(0,0,0,0.12)' : 'none',
                    borderBottom: showReviewShadow ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    transition: '0.2s'
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
                      <div style={{ marginBottom: 8 }}>
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
                            <button 
                              className="btn-receipt-view" 
                              onClick={() => window.open(currentReview.item.image_url, '_blank')}
                              style={{ 
                                padding: '6px 14px', 
                                borderRadius: '20px', 
                                border: '1.5px solid #111', 
                                background: 'none', 
                                fontSize: '0.8rem', 
                                fontWeight: 700, 
                                cursor: 'pointer'
                              }}
                            >
                              영수증 보기
                            </button>
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
                      <div className="chat-meta right">
                        {currentReview.user.name} · {currentReview.item.date ? (() => {
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
                        <div key={logIdx} className={`bubble-wrap ${isUser ? 'user' : 'admin'} ${log.isDeleted ? 'is-deleted' : ''}`}>
                          <div style={{ display: 'flex', alignItems: 'center', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                            <div className={`chat-bubble ${isUser ? 'user' : 'admin'} ${log.type === 'approve' ? 'bg-green' : (log.type === 'reject' ? 'bg-red' : '')} ${log.isDeleted ? 'deleted-style' : ''}`} style={{ padding: '0.85rem 1.15rem', width: 'fit-content' }}>
                              {log.text}
                            </div>
                            {!log.isDeleted && !isUser && !currentReview.item.isReplaced && log.type !== 'cancel' && (
                              <button 
                                className="btn-msg-del" 
                                onClick={async () => {
                                  if (currentReview.item.isReplaced) return;
                                  const newLogs = actionLogs.map((item, i) => i === logIdx ? { ...item, isDeleted: true } : item);
                                  const undoLog = { text: "[결정 취소] 이전의 처리가 취소되었습니다.", type: "cancel", sender: "ai", isDeleted: false, time: new Date().toISOString() };
                                  const finalLogs = [...newLogs, undoLog];
                                  setActionLogs(finalLogs);
                                  await updateSettlementStatus(currentReview.item.id, '보류', JSON.stringify(finalLogs));
                                }} 
                                title="삭제" style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={log.type === 'approve' ? "#16a34a" : "#e04a4a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                              </button>
                            )}
                          </div>
                          <div className={`chat-meta ${isUser ? 'right' : 'left'}`}>
                            {(() => {
                              let label = isUser ? currentReview.user.name : "관리자";
                              if (log.sender === 'ai' || log.text === "승인 완료!") label = "AI 잘먹이";
                              
                              const rawTime = log.time || currentReview.item.time || currentReview.item.date.split(' ')[1];
                              const timeStr = (() => {
                                if (!rawTime) return "방금 전";
                                const d = new Date(rawTime.includes('T') ? rawTime : (currentReview.item.date.split(' ')[0] + ' ' + rawTime));
                                if (isNaN(d.getTime())) return "방금 전";
                                const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
                                const period = d.getHours() < 12 ? "오전" : "오후";
                                const hour = d.getHours() % 12 || 12;
                                const min = d.getMinutes().toString().padStart(2, '0');
                                return `${dateStr} ${period} ${hour}:${min}`;
                              })();
                              
                              return `${label} · ${log.isDeleted ? "삭제됨 · " : ""}${timeStr}`;
                            })()}
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
                    const isProcessed = currentReview.item.status === '승인완료' || currentReview.item.status === '반려';
                    const isReplaced = currentReview.item.isReplaced;
                    // If a message was just sent but status not yet reflected in currentReview.item.status 
                    // (though handleApprove updates currentReview.item.status locally in most patterns here)
                    const isLocalProcessed = actionLogs.some(log => (log.type === 'approve' || log.type === 'reject') && !log.isDeleted);
                    const effectiveDisabled = isProcessed || isReplaced || isLocalProcessed;
                    
                    return (
                      <div className="panel-footer-fixed">
                        {isReplaced && (
                          <div style={{ padding: '8px 24px', background: 'rgba(0,0,0,0.03)', fontSize: '0.8rem', color: '#999', textAlign: 'center', marginBottom: '8px', fontWeight: 600, width: '100%' }}>
                            {currentReview.user.name}님에 의해 교체된 영수증 입니다.
                          </div>
                        )}
                        <div className={`message-pill-container ${effectiveDisabled ? 'disabled' : ''}`}>
                          <input
                            type="text"
                            id="reviewMsgInput"
                            className="message-pill-input"
                            placeholder={isReplaced ? "교체된 영수증입니다." : (effectiveDisabled ? "정산 처리가 이미 완료되었습니다." : "반려 또는 승인 사유를 입력하세요.")}
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
              <div className="tab-group" style={{ alignItems: 'center' }}>
                <div className="sort-selector-wrapper" onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsSortMenuOpen(!isSortMenuOpen);
                  setIsFilterMenuOpen(false);
                }}>
                  <div className="sort-trigger">
                    {userSortType === "name" ? "이름순" : userSortType === "dept" ? "부서별" : "금액순"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, transform: isSortMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  {isSortMenuOpen && (
                    <div className="sort-dropdown shadow-side">
                      {[
                        { val: 'name', label: '이름순' },
                        { val: 'dept', label: '부서별' },
                        { val: 'amount', label: '금액순' }
                      ].map(opt => (
                        <div 
                          key={opt.val}
                          className={`sort-option ${userSortType === opt.val ? 'active' : ''}`}
                          onClick={() => {
                            setUserSortType(opt.val);
                            setIsSortMenuOpen(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="filter-divider" style={{ width: '1px', height: '14px', background: '#eee', margin: '0 8px' }} />

                <div className="sort-selector-wrapper" onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsFilterMenuOpen(!isFilterMenuOpen);
                  setIsSortMenuOpen(false);
                }}>
                  <div className="sort-trigger" style={{ color: filterType === 'pending' && totals.pendingPeople > 0 ? '#ef4444' : '#333' }}>
                    {filterType === "pending" ? `승인요청 (${totals.pendingPeople})` : filterType === "all" ? `전체 (${totals.totalPeople})` : `승인완료 (${totals.approvedPeople})`}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, transform: isFilterMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  {isFilterMenuOpen && (
                    <div className="sort-dropdown shadow-side" style={{ left: 'auto', right: -10 }}>
                      {[
                        { val: 'pending', label: `승인요청 (${totals.pendingPeople})` },
                        { val: 'all', label: `전체 (${totals.totalPeople})` },
                        { val: 'approved', label: `승인완료 (${totals.approvedPeople})` }
                      ].map(opt => (
                        <div 
                          key={opt.val}
                          className={`sort-option ${filterType === opt.val ? 'active' : ''}`}
                          onClick={() => {
                            setFilterType(opt.val);
                            setIsFilterMenuOpen(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="user-grid">
            {filteredUsers.length === 0 ? (
              <div style={{ 
                gridColumn: '1 / -1', 
                width: '100%',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 1rem', 
                textAlign: 'center', 
                background: 'transparent', 
                color: '#bbb',
                fontWeight: 600,
                fontSize: '1.05rem',
                margin: '1rem 0'
              }}>
                {filterType === 'pending' ? '현재 신청된 승인 요청 내역이 없습니다.' : '내역이 없습니다.'}
              </div>
            ) : (
              Array.from({ length: gridColumns }).map((_, colIdx) => (
                <div key={colIdx} className="grid-column">
                {filteredUsers
                  .filter((_, i) => i % gridColumns === colIdx)
                  .map(user => (
                    <div
                      key={user.id}
                      className={`user-card ${user.pendingCount > 0 ? 'pending' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="card-header">
                        <div>
                          <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.name} <span className="dept-label" style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600, marginTop: '2px' }}>{user.department}</span>
                          </div>
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
                          <div className="info-label">{selectedMonth.split('.')[1]}월 총 입금 금액</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="info-amount">₩{Math.min(user.approvedSpent, user.monthWeekdays * 10000).toLocaleString()}</div>
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
                              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#000' }}>총 사용 금액</div>
                              <div style={{ fontSize: '1.35rem', fontWeight: 950, color: '#000' }}>
                                ₩{(user.approvedSpent + user.pendingSpent).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ))
          )}
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

            <div className="panel-content history-layout" onScroll={(e) => {
              if (!selectedHistoryItem) setShowHistoryShadow(e.target.scrollTop > 5);
            }}>
              {!selectedHistoryItem ? (
                <>
                  <div style={{ zIndex: 10, background: '#fff', position: 'sticky', top: 0, paddingBottom: '1rem', boxShadow: showHistoryShadow ? '0 10px 20px -10px rgba(0,0,0,0.12)' : 'none', borderBottom: showHistoryShadow ? '1px solid rgba(0,0,0,0.05)' : 'none', transition: '0.2s', margin: '0 -4px 0', padding: '0 4px 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', marginTop: '1rem' }}>
                      <div className="user-name" style={{ fontSize: '1rem', fontWeight: 900 }}>{selectedUser.name}</div>
                      <div className="dept-label" style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600 }}>{selectedUser.department}</div>
                    </div>

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
                  </div>

                  <div className="history-list no-scrollbar" style={{ paddingBottom: '2rem' }}>
                    {(selectedUser.history || [])
                      .filter(item => {
                        if (historyFilter === "전체") return true;
                        if (historyFilter === "승인") return item.status === "승인완료";
                        if (historyFilter === "보류") return item.status === "보류" || item.status === "예외요청";
                        if (historyFilter === "반려") return item.status === "반려";
                        return false;
                      })
                      .map((item, idx) => {
                        const isViolation = item.status === "보류" || item.status === "예외요청";
                        const isApproved = item.status === "승인완료";
                        const isRejected = item.status === "반려";
                        return (
                          <div key={idx} className="history-item-card" onClick={() => setSelectedHistoryItem(item)}>
                            <div className="history-card-top">
                              <span className="history-meta">{item.date.split(' ')[0]} · 식당</span>
                              <span className={`history-status-badge ${isApproved ? 'approved' : (isRejected ? 'pending' : 'pending')}`} style={{ background: isRejected ? '#FEE2E2' : '', color: isRejected ? '#E24B4A' : '' }}>
                                {item.status}
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
                <div className="history-detail-view no-scrollbar" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    {/* Sticky Summary Card */}
                    <div style={{ 
                      position: 'relative', 
                      zIndex: 100, 
                      background: '#fff', 
                      padding: '4px 4px 0',
                      margin: '0 -4px',
                      boxShadow: showHistoryDetailShadow ? '0 10px 20px -10px rgba(0,0,0,0.12)' : 'none',
                      borderBottom: showHistoryDetailShadow ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      transition: '0.2s',
                      flexShrink: 0
                    }}>
                      <div className="receipt-card detailed" style={{ 
                        background: '#fff', 
                        borderRadius: '16px', 
                        padding: '24px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        marginBottom: '16px',
                        border: '1px solid #f0f0f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <span style={{ fontSize: '0.9rem', color: '#999', fontWeight: 600 }}>{selectedHistoryItem.date.split(' ')[0]}</span>
                          <span style={{ 
                            backgroundColor: selectedHistoryItem.status === '승인완료' ? '#E2F5EC' : (selectedHistoryItem.status === '반려' ? '#FEE2E2' : '#FFF4E5'), 
                            color: selectedHistoryItem.status === '승인완료' ? '#1E8A4A' : (selectedHistoryItem.status === '반려' ? '#E24B4A' : '#D97706'), 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700 
                          }}>
                            {selectedHistoryItem.status === '승인완료' ? '승인완료' : (selectedHistoryItem.status === '반려' ? '반려' : '예외요청')}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#111', marginBottom: '16px', lineHeight: 1.3 }}>
                          {selectedHistoryItem.category || "메뉴"} · {selectedHistoryItem.desc}
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          {(() => {
                            const dObj = { 
                              id: selectedHistoryItem.id, 
                              date: selectedHistoryItem.date.split(' ')[0], 
                              time: selectedHistoryItem.time || selectedHistoryItem.date.split(' ')[1],
                              category: selectedHistoryItem.category,
                              amount: selectedHistoryItem.amount
                            };
                            const issues = validate(dObj, allowedCategories, rawSettlements);
                            const filteredIssues = issues.filter(iss => !iss.includes("이미 제출된 내역"));
                            if (filteredIssues.length === 0) return null;
                            return filteredIssues.map((iss, idx) => {
                              const isApprovedOrRejected = selectedHistoryItem.status === '승인완료' || selectedHistoryItem.status === '반려';
                              return (
                                <div key={idx} style={{ 
                                  display: "flex", 
                                  alignItems: "flex-start", 
                                  gap: 8, 
                                  color: isApprovedOrRejected ? "rgba(226, 75, 74, 0.4)" : "#e24b4a", 
                                  fontSize: '0.85rem', 
                                  fontWeight: 700, 
                                  lineHeight: 1.5, 
                                  marginBottom: 6 
                                }}>
                                  <span style={{ flexShrink: 0, marginTop: 2, opacity: isApprovedOrRejected ? 0.4 : 1 }}><Icon.Alert size={14} /></span>
                                  <span style={{ textDecoration: isApprovedOrRejected ? 'line-through' : 'none' }}>{iss}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {selectedHistoryItem.image_url && (
                          <button onClick={() => window.open(selectedHistoryItem.image_url, '_blank')} style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px solid #111', background: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', marginBottom: '16px' }}>영수증 보기</button>
                        )}
                        <div style={{ textAlign: 'right', fontSize: '1.75rem', fontWeight: 950, color: '#111' }}>₩{selectedHistoryItem.amount.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="detail-scroll-area no-scrollbar" onScroll={e => setShowHistoryDetailShadow(e.target.scrollTop > 5)} style={{ flex: 1, overflowY: 'auto', padding: '0 4px 120px' }}>
                      <div className="history-chat-row">
                        <div className="bubble-wrap user" style={{ width: '100%' }}>
                          <div className="chat-bubble user" style={{ padding: '0.85rem 1.15rem' }}>{selectedHistoryItem.violationLog || "영수증 정산 요청드립니다."}</div>
                          <div className="chat-meta right">{selectedUser.name} · {(() => {
                            const [dPart, tPart] = selectedHistoryItem.date.split(' ');
                            const d = new Date(dPart);
                            const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
                            const timeStr = tPart ? (() => {
                              const [h, m] = tPart.split(':').map(Number);
                              const period = h < 12 ? '오전' : '오후';
                              const hour = h % 12 || 12;
                              return `${period} ${hour}:${m.toString().padStart(2, '0')}`;
                            })() : "";
                            return `${dateStr} ${timeStr}`;
                          })()}
                          </div>
                        </div>

                        {(() => {
                          let logs = [];
                          try { if (selectedHistoryItem.actionLogs?.startsWith('[')) logs = JSON.parse(selectedHistoryItem.actionLogs); } catch(e) {}
                          return logs.map((log, idx) => {
                            const isUser = log.sender === 'user';
                            const senderLabel = isUser ? selectedUser.name : (log.sender === 'ai' ? "AI 잘먹이" : "관리자");
                            const d = new Date(log.time);
                            const time = `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, '0')}`;
                            return (
                             <div key={idx} className={`bubble-wrap ${isUser ? 'user' : 'admin'} ${log.isDeleted ? 'is-deleted' : ''}`} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
                               <div style={{ display: 'flex', alignItems: 'center', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                                 <div className={`chat-bubble ${isUser ? 'user' : 'admin'} ${log.type === 'approve' ? 'bg-green' : (log.type === 'reject' ? 'bg-red' : '')} ${log.isDeleted ? 'deleted-style' : ''}`} style={{ width: 'fit-content', padding: '0.85rem 1.15rem' }}>{log.text}</div>
                                 {!log.isDeleted && !isUser && log.type !== 'cancel' && (
                                   <button className="btn-msg-del" onClick={async (e) => {
                                      e.stopPropagation();
                                      const currentLogs = JSON.parse(selectedHistoryItem.reject_reason || '[]');
                                      const newLogs = currentLogs.map((item, i) => i === idx ? { ...item, isDeleted: true } : item);
                                      const undoLog = { text: "[결정 취소] 이전의 처리가 취소되었습니다.", type: "cancel", sender: "ai", isDeleted: false, time: new Date().toISOString() };
                                      const finalLogs = [...newLogs, undoLog];
                                      const newStr = JSON.stringify(finalLogs);
                                      await updateSettlementStatus(selectedHistoryItem.id, '보류', newStr);
                                      setSelectedHistoryItem(prev => ({ ...prev, status: '보류', reject_reason: newStr }));
                                   }} title="삭제" style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={log.type === 'approve' ? "#16a34a" : "#e04a4a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg></button>
                                 )}
                               </div>
                               <div className={`chat-meta ${isUser ? 'right' : 'left'}`} style={{ width: '100%', textAlign: isUser ? 'right' : 'left' }}>
                                 {(() => {
                                   let label = isUser ? selectedUser.name : "관리자";
                                   if (log.sender === 'ai' || log.text === "승인 완료!") label = "AI 잘먹이";
                                   
                                   const rawTime = log.time || selectedHistoryItem.time || selectedHistoryItem.date.split(' ')[1];
                                   const timeStr = (() => {
                                      if (!rawTime) return "방금 전";
                                      const d = new Date(rawTime.includes('T') ? rawTime : (selectedHistoryItem.date.split(' ')[0] + ' ' + rawTime));
                                      if (isNaN(d.getTime())) return "방금 전";
                                      const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
                                      const period = d.getHours() < 12 ? "오전" : "오후";
                                      const hour = d.getHours() % 12 || 12;
                                      const min = d.getMinutes().toString().padStart(2, '0');
                                      return `${dateStr} ${period} ${hour}:${min}`;
                                   })();
                                   return `${label} · ${log.isDeleted ? "삭제됨 · " : ""}${timeStr}`;
                                 })()}
                               </div>
                             </div>
                            );
                          });
                        })()}

                        {historyChats[selectedHistoryItem.id]?.map((chat, ci) => (
                           <div key={ci} className={`bubble-wrap ${chat.sender === 'user' ? 'user' : 'admin'}`}>
                             <div className={`chat-bubble ${chat.sender}`} style={{ width: 'fit-content', padding: '0.85rem 1.15rem' }}>{chat.text}</div>
                             <div className={`chat-meta ${chat.sender === 'user' ? 'right' : 'left'}`}>{chat.time}</div>
                           </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    </div>

                    {/* History Footer */}
                    <div className="panel-footer-fixed" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                      {(() => {
                        const isHistoryProcessed = selectedHistoryItem.status === '승인완료' || selectedHistoryItem.status === '반려';
                        return (
                          <>
                            <div className={`message-pill-container ${isHistoryProcessed ? 'disabled' : ''}`}>
                              <input type="text" className="message-pill-input" placeholder={isHistoryProcessed ? "정산 처리가 이미 완료되었습니다." : "메시지를 입력하세요."} disabled={isHistoryProcessed} value={historyInput} onChange={e => setHistoryInput(e.target.value)} />
                            </div>
                            <div className="cta-group" style={{ alignItems: 'center' }}>
                              <button className="btn-nav" disabled={true}>‹</button>
                              <button className={`btn-cta reject ${isHistoryProcessed ? 'disabled' : ''}`} disabled={isHistoryProcessed}>반려</button>
                              <button className={`btn-cta approve ${isHistoryProcessed ? 'disabled' : ''}`} disabled={isHistoryProcessed}>승인</button>
                              <button className="btn-nav" disabled={true}>›</button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <FeedbackSystem userName="관리자" currentPath={pathLabel} showAdminView={true} />
    </div>
  );
}