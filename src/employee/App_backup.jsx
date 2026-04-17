import { useState, useRef, useEffect } from "react";

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
    return ["?뚯떇??,"?쒖떇","以묒떇","?쇱떇","?묒떇","遺꾩떇","移댄럹","而ㅽ뵾?꾨Ц??,"?쒓낵??,"踰좎씠而ㅻ━","?몄쓽??,"?덊띁留덉폆","諛깊솕??,"?몃뱶肄뷀듃"];
  }
}

function validate(d, allowed, existingSubs = []) {
  const issues = [];
  
  const isDup = existingSubs.some(s => s.date === d.date && s.id !== d.id);
  if (isDup) issues.push("?대떦 ?좎쭨( " + d.date + " )???대? ?쒖텧???댁뿭???덉뒿?덈떎.");

  if (!d.time || !d.time.includes(":")) {
    issues.push("?쒓컙 ?뺣낫瑜??뺤씤?????놁뒿?덈떎.");
  } else {
    const [h, m] = d.time.split(":").map(Number);
    const tot = h * 60 + m;
    if (tot < 600 || tot > 840) issues.push(`寃곗젣 ?쒓컙(${d.time})???뺤궛 ?덉슜 ?쒓컙(10:00~14:00)??吏?ъ뒿?덈떎.`);
  }

  if (!d.date) {
    issues.push("?좎쭨 ?뺣낫瑜??뺤씤?????놁뒿?덈떎.");
  } else {
    const dow = new Date(d.date).getDay();
    if (dow === 0 || dow === 6) issues.push("二쇰쭚/怨듯쑕???ъ슜? 吏?먮릺吏 ?딆뒿?덈떎.");
  }

  const catMatch = allowed.some(t => {
    const cStr = (d.category || "").split(/[\/,쨌\s]/);
    return cStr.some(c => c.trim().includes(t) || t.includes(c.trim()));
  });
  if (!catMatch) issues.push("吏???낆쥌???꾨떃?덈떎. (?낆쥌: " + (d.category || "誘명솗??) + ")");
  
  const cleanAmt = String(d.amount || "").replace(/[^\d]/g, "");
  if (!cleanAmt || parseInt(cleanAmt) <= 0) issues.push("湲덉븸 ?뺣낫瑜??뺤씤?????놁뒿?덈떎.");
  
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

const DAYS = ["??, "??, "??, "紐?, "湲?];

function getWeekDates(year, month, week) {
  const dates = [];
  const firstDay = new Date(year, month - 1, 1);
  const day = firstDay.getDay(); 
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() + diffToMonday);
  firstMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  for (let i = 0; i < 5; i++) {
    const d = new Date(firstMonday);
    d.setDate(firstMonday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getWeekCount(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const day = firstDay.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() + diffToMonday);
  let count = 0;
  let cur = new Date(firstMonday);
  while (cur <= lastDay) { 
    count++; 
    cur.setDate(cur.getDate() + 7); 
  }
  return count;
}

function Badge({ status }) {
  const map = {
    "?뱀씤?꾨즺": { bg: "#E2F5EC", color: "#1E8A4A", label: "?뱀씤" },
    "?덉쇅?붿껌": { bg: "#FEF3E2", color: "#B87020", label: "蹂대쪟" },
    "諛섎젮": { bg: "#FDECEA", color: "#C0392B", label: "諛섎젮" },
  };
  const s = map[status] || map["?뱀씤?湲?];
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
          <h3 style={{ fontSize: 24, fontWeight: 900, color: "#111", margin: 0 }}>?좎쭨 ?좏깮</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Close /></button>
        </div>
        <p style={{ fontSize: 13, color: "#aaa", margin: "4px 0 32px", fontWeight: 600 }}>理쒓렐 3媛쒖썡媛꾩쓽 ?댁뿭留??뺤씤??媛?ν빀?덈떎.</p>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 48, marginTop: -24, borderTop: "1.5px solid #f5f5f5", borderBottom: "1.5px solid #f5f5f5", pointerEvents: "none" }} />
          <Col options={years.map(y => ({val:y, label:`${y}??}))} selected={tempY} onSelect={setTempY} isOpen={isOpen} />
          <div style={{ width: 1.5, height: 160, background: "#f5f5f5" }} />
          <Col options={months.map(m => ({val:m, label:`${m}??}))} selected={tempM} onSelect={setTempM} isOpen={isOpen} />
          <div style={{ width: 1.5, height: 160, background: "#f5f5f5" }} />
          <Col options={weeks.map(w => ({val:w, label:`${w}二?}))} selected={tempW} onSelect={setTempW} isOpen={isOpen} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "#fff", color: "#000", fontWeight: 800, fontSize: 17, border: "1.5px solid #000", borderRadius: 20, cursor: "pointer" }}>痍⑥냼</button>
          <button onClick={() => { onConfirm(tempY, tempM, tempW); onClose(); }} style={{ flex: 1.6, padding: "18px", background: "#000", color: "#fff", fontWeight: 800, fontSize: 17, border: "none", borderRadius: 20, cursor: "pointer" }}>?뺤씤</button>
        </div>
      </div>
    </div>
  );
}

function AppDetailView({ sub, onBack, onShowImg, chats, onSendChat, replyTxt, setReplyTxt }) {
  if (!sub) return null;
  const MOCK_REPLY = (sub.status === "?뱀씤?꾨즺" || sub.status === "?뱀씤")
    ? "?뱀씤 ?꾨즺!\n5??22?쇱뿉 ?낃툑 ?⑸땲??"
    : (sub.status === "諛섎젮" 
      ? "?뺤궛 湲곗? ?쒓컙(14:00)??1?쒓컙 ?댁긽 珥덇낵?섏뿬 諛섎젮?섏뿀?듬땲??\n?뚮챸?????꾩슂??寃쎌슦 ?듬? ?④꺼二쇱꽭??" 
      : "寃??以묒엯?덈떎.\n異붽? 臾몄쓽 ?ы빆???덉쑝?쒕㈃ ?볤????④꺼二쇱꽭??");

  const getImageUrl = (data) => {
    if (!data) return null;
    return data.image_url || data.imageUrl || data.image_path || data.receipt_url || data.img || data.image || 
           Object.values(data).find(v => typeof v === "string" && (v.startsWith("http") || v.startsWith("data:image")));
  };
  const finalImage = getImageUrl(sub);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>?붿껌 ?곸꽭</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 180px", minHeight: 0 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: "24px", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#999", fontWeight: 700 }}>{sub.date}</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#555" }}>{sub.category} 쨌 {sub.store_name || sub.storeName}</p>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                {(sub.status === "諛섎젮" || sub.status === "?덉쇅?붿껌") && (
                  <span style={{ fontSize: 12, color: "#E24B4A", fontWeight: 700 }}>{sub.status === "諛섎젮" ? `諛섎젮 ?ъ쑀: ${sub.reject_reason || sub.rejectReason || "寃곗젣 ?쒓컙(15:00) 誘몄???}` : "蹂대쪟 ?ъ쑀: 寃곗젣 ?쒓컙(15:00) 誘몄???}</span>
                )}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    if(finalImage) onShowImg(finalImage);
                    else window.alert("?곸닔利??곗씠?곌? ?놁뒿?덈떎.");
                  }}
                  style={{ background: "#fff", border: "1px solid #000", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 10px", borderRadius: 20, pointerEvents: "auto" }}
                >
                  ?곸닔利?蹂닿린
                </button>
              </div>
              {!finalImage && (
                <div style={{ background: "#FEE2E2", color: "#E24B4A", padding: "16px", borderRadius: "12px", fontSize: "12px", marginTop: "16px", fontWeight: "600", width: "100%", wordBreak: "break-all", lineHeight: 1.5 }}>
                  <span style={{ fontSize: 14 }}>?좑툘 ?대?吏 ????ㅻ쪟</span><br/>
                  DB???섍꺼以 ?ъ쭊 ?곗씠?곌? ?꾨씫?섏뿀?듬땲?? <b>Supabase ?뚯씠釉???而щ읆紐?/b>???뺤씤?댁빞 ?⑸땲??<br/>
                  <div style={{ background: "rgba(255,255,255,0.5)", padding: "8px", borderRadius: "6px", marginTop: "6px" }}>
                    <span style={{ color: "#333" }}>?꾩옱 DB??議댁옱?섎뒗 ??ぉ??</span><br/>
                    <span style={{ color: "#000", fontWeight: 900 }}>{Object.keys(sub).join(", ")}</span>
                  </div>
                </div>
              )}
            </div>
            <Badge status={sub.status} />
          </div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, textAlign: "right" }}>??parseInt(sub.amount || 0).toLocaleString()}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ background: "#000", color: "#fff", padding: "14px 18px", borderRadius: "18px 2px 18px 18px", maxWidth: "85%", fontSize: 15, lineHeight: 1.5, fontWeight: 500 }}>
              {sub.exc_text || sub.excText 
                ? `${sub.exc_text || sub.excText}?쇰줈 ?뺤궛 ?붿껌?쒕┰?덈떎.` 
                : "?곸닔利??뺤궛 ?붿껌?쒕┰?덈떎."}
            </div>
            <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
              {(() => {
                const d = sub.created_at ? new Date(sub.created_at) : new Date();
                return `${d.getMonth() + 1}??${d.getDate()}??${d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
              })()}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ background: "#fff", color: "#333", padding: "14px 18px", borderRadius: "2px 18px 18px 18px", maxWidth: "85%", fontSize: 15, lineHeight: 1.5, fontWeight: 500, border: "1.5px solid #eee", whiteSpace: "pre-wrap" }}>
              {MOCK_REPLY}
            </div>
            <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
              愿由ъ옄 쨌 {(() => {
                const d = sub.created_at ? new Date(new Date(sub.created_at).getTime() + 5 * 60000) : new Date();
                return `${d.getMonth() + 1}??${d.getDate()}??${d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
              })()}
            </span>
          </div>

          {(chats || []).map((chat, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: chat.sender === "admin" ? "flex-start" : "flex-end" }}>
              <div style={{ background: chat.sender === "admin" ? "#fff" : "#000", color: chat.sender === "admin" ? "#333" : "#fff", padding: "14px 18px", borderRadius: chat.sender === "admin" ? "2px 18px 18px 18px" : "18px 2px 18px 18px", maxWidth: "85%", fontSize: 15, lineHeight: 1.5, fontWeight: 500, border: chat.sender === "admin" ? "1.5px solid #eee" : "none" }}>{chat.text}</div>
              <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
                {chat.sender === "admin" ? "愿由ъ옄 쨌 諛⑷툑 ?? : "諛⑷툑 ??}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 28px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ background: "#fff", borderRadius: 32, border: "1.5px solid #eee", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.06)", pointerEvents: "auto" }}>
          <input value={replyTxt} onChange={e => setReplyTxt(e.target.value)} onKeyDown={e => { if(e.key === "Enter" && replyTxt.trim()) onSendChat(); }} placeholder="硫붿떆吏瑜??낅젰?섏꽭??" style={{ flex: 1, border: "none", outline: "none", padding: "10px 0", fontSize: 15, fontWeight: 500 }} />
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
  const [duplicateDate, setDuplicateDate] = useState("");
  const [duplicateId, setDuplicateId] = useState(null);
  const [excType, setExcType] = useState("");
  const [excText, setExcText] = useState("");
  const [allowed, setAllowed] = useState([]);
  
  const getInitialWeek = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const maxW = getWeekCount(y, m);
    let targetW = 1;
    for (let w = 1; w <= maxW; w++) {
      const dates = getWeekDates(y, m, w).map(d => d.toISOString().slice(0, 10));
      if (dates.includes(now.toISOString().slice(0, 10))) { targetW = w; break; }
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
  const [filter, setFilter] = useState("?꾩껜");
  const [replyText, setReplyText] = useState("");
  const [localChats, setLocalChats] = useState({});
  const [isImgModal, setIsImgModal] = useState(false);
  const [pick, setPick] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [user, setUser] = useState(null);
  const fileRef = useRef();

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
      setUser({
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
      });
    } else {
      // ?몄뀡 ?놁쑝硫?濡쒓렇???붾㈃?쇰줈 (index.html)
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
        console.error("Storage ?낅줈???ㅽ뙣 ?곸꽭:", errorData);
        throw new Error("?낅줈???ㅽ뙣");
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
    // 以묐났 援먯껜 嫄댁씠 ?덉쑝硫?癒쇱? ??젣
    if (duplicateId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/settlements?id=eq.${duplicateId}`, {
          method: "DELETE",
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        setDuplicateId(null);
      } catch (e) {
        console.error("Duplicate Delete Error:", e);
      }
    }

    const finalStatus = isEx ? "?덉쇅?붿껌" : "?뱀씤?꾨즺";
    const payload = {
      store_name: data.storeName || data.store_name,
      date: data.date,
      time: data.time,
      amount: data.amount,
      category: data.category,
      status: finalStatus,
      exc_text: isEx ? excText : null,
      image_url: data.image_url || preview,
      user_name: user?.full_name || "?듬챸"
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
            const wds = getWeekDates(y, m, w).map(dateObj => {
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
    } catch (e) { alert("?곕룞 ?ㅽ뙣"); }
  };

  const processFile = async (f) => {
    if (!f) return;
    setModal("checking");
    
    // ?낅줈???뺤씤 諛?fallback (Staleness 諛⑹?)
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
        alert("API ?ㅺ? ?ㅼ젙?섏? ?딆븯?듬땲?? Vercel ??쒕낫?쒖쓽 ?섍꼍 蹂?섎? ?뺤씤?댁＜?몄슂.");
        setModal(null);
        return;
      }

      const payload = {
        contents: [{
          parts: [
            { text: "???대?吏??寃곗젣 ?곸닔利??먮뒗 ?뱀씤 ?댁뿭 ?ㅽ겕由곗꺑?낅땲?? ?대?吏?먯꽌 湲?⑤? ?몄떇?섏뿬 ?ㅼ쓬 ?뺣낫瑜?異붿텧?섍퀬 諛섎뱶??JSON ?뺥깭濡?諛섑솚?섏꽭??\n1. storeName: 寃곗젣 媛留뱀젏, ?뚯떇?먯씠??媛寃뚯쓽 ?뺥솗???곹샇紐?n2. date: 寃곗젣 ?좎쭨 (諛섎뱶??YYYY-MM-DD ?뺤떇?쇰줈 蹂??\n3. time: 寃곗젣 ?쒓컙 (HH:MM ?뺤떇?쇰줈 蹂??\n4. amount: 理쒖쥌 ?뱀씤 湲덉븸 ?レ옄 (?⑥쐞??肄ㅻ쭏 ?쒖쇅, ?レ옄留??낅젰)\n5. category: 媛留뱀젏 ?낆쥌 ?뺣낫 (?? ?쒖떇, ?쇱떇, 移댄럹 ??\n\n?ㅻⅨ ?뺥깭 ?놁씠 ?ㅼ쭅 { \"storeName\": \"\", \"date\": \"\", \"time\": \"\", \"amount\": \"\", \"category\": \"\" } ?뺥깭???쒖닔 JSON留?諛섑솚?섏꽭??" },
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

      // Validation: Strict current month check
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      
      const [rY, rM] = result.date.split("-").map(n => parseInt(n));
      if (rY !== curYear || rM !== curMonth) {
        setModal("invalid_month");
        return;
      }

      setOcr(result); 
      const currentIssues = validate(result, allowed, subs);
      setIssues(currentIssues);

      const holidayIssue = currentIssues.find(iss => iss.includes("二쇰쭚") || iss.includes("怨듯쑕??));
      if (holidayIssue) {
        setModal("holiday_error");
        return;
      }

      const duplicateEntry = subs.find(s => s.date === result.date && (s.status === "?뱀씤?꾨즺" || s.status === "?덉쇅?붿껌" || s.status === "?뱀씤"));
      if (duplicateEntry) {
        setDuplicateDate(result.date);
        setDuplicateId(duplicateEntry.id);
        setModal("duplicate");
        return;
      }
      setStep("result");
    } catch (e) { 
      console.error(e);
      alert("?곸닔利??대?吏 遺꾩꽍???ㅽ뙣?덉뒿?덈떎. ?띿뒪?멸? ??蹂댁씠?붿? ?뺤씤 ???ㅼ떆 ?쒕룄?댁＜?몄슂."); 
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
    setModal("checking");
    try {
      // 1. ?꾨컲 ?ы빆 寃??      const currentIssues = validate(ocr, allowed, subs);
      setIssues(currentIssues);

      // ?꾨컲 ?ы빆???덉쑝硫?寃곌낵 ?섏씠吏濡??대룞 (援먯껜???꾩쭅 ????
      if (currentIssues.length > 0) {
        setModal(null);
        setStep("result");
        return;
      }

      // 2. ?꾨컲 ?ы빆 ?놁쑝硫?湲곗〈 ??젣 ???덇쾬 ?쒖텧
      await fetch(`${SUPABASE_URL}/rest/v1/settlements?id=eq.${duplicateId}`, {
        method: "DELETE",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      await submit(false, ocr);
      setDuplicateId(null);
    } catch (e) {
      console.error(e);
      alert("援먯껜???ㅽ뙣?덉뒿?덈떎.");
      setModal(null);
    }
  };

  const MENUS = [
    { name: "?쒖쑁蹂띠쓬", emoji: "?ⅸ", cat: "?쒖떇" },
    { name: "?덇퉴??, emoji: "?뜳", cat: "?쇱떇" },
    { name: "吏쒖옣硫?, emoji: "?뜙", cat: "以묒떇" },
    { name: "援?갈", emoji: "?뜴", cat: "?쒖떇" },
    { name: "?꾨쾭嫄?, emoji: "?뜑", cat: "?묒떇" },
    { name: "源移섏컡媛?, emoji: "?쪟", cat: "?쒖떇" },
    { name: "珥덈갈", emoji: "?뜠", cat: "?쇱떇" },
    { name: "留덈씪??, emoji: "?뜴", cat: "以묒떇" },
    { name: "?먮윭??, emoji: "?쪞", cat: "嫄닿컯?? }
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
    const approvedTotal = subs.filter(s => monthFilter(s) && (s.status === "?뱀씤?꾨즺" || s.status === "?뱀씤?湲?)).reduce((a, s) => a + parseInt(s.amount || 0), 0);
    const pendingTotal = subs.filter(s => monthFilter(s) && (s.status === "?덉쇅?붿껌")).reduce((a, s) => a + parseInt(s.amount || 0), 0);
    const weekDates = getWeekDates(selYear, selMonth, selWeek);
    const payMonth = selMonth === 12 ? 1 : selMonth + 1;
    const payYear = selMonth === 12 ? selYear + 1 : selYear;
    const payDateStr = `${String(payYear).slice(2)}.${String(payMonth).padStart(2,"0")}.22`;

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
            {pullY > 80 ? "?덈줈怨좎묠???꾪빐 ?먯쓣 ?볦쑝?몄슂 ?봽" : "?밴꺼???덈줈怨좎묠 ??}
          </div>
        )}
        <div style={{ padding: "30px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/bi_zaleat.png" style={{ width: 48, height: 48, objectFit: "contain" }} alt="logo" />
            <div style={{ fontWeight: 900, fontSize: 23, letterSpacing: "-0.5px", display: "flex", alignItems: "center" }}>
              <span>ZAL</span><span style={{ margin: "0 6px" }}>:</span><span>?섎㉨</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <button onClick={() => setStep("list")} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </button>
            <button onClick={() => setStep("my")} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: "40px" }}>
          <div style={{ padding: "0 28px 32px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 27, fontWeight: 900, lineHeight: 1.4, letterSpacing: "-1.5px" }}>
              {user?.full_name}?섏쓽 <span style={{ opacity: 0.55, fontWeight: 500 }}>留쏆엳???섎（瑜?br/>?ㅼ쓬?뺣낫?쒖뒪?쒖쫰媛 吏?먰빀?덈떎!</span>
            </p>
            <div style={{ marginTop: 40, display: "inline-block", position: "relative" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#666", fontWeight: 700 }}>{payDateStr} ?낃툑 ?덉젙</p>
              <div style={{ position: "relative", display: "inline-block" }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "#000", letterSpacing: "-1px", position: "relative", zIndex: 2 }}>{approvedTotal.toLocaleString()}??/span>
                <div style={{ position: "absolute", bottom: 4, left: -4, right: -4, height: 16, background: "#FEC601", opacity: 0.8, zIndex: 1 }} />
              </div>
              {pendingTotal > 0 && <span style={{ fontSize: 15, color: "#999", fontWeight: 700, marginLeft: 10 }}>(+{pendingTotal.toLocaleString()} 蹂대쪟)</span>}
            </div>
          </div>
          <div style={{ padding: "20px 28px 16px" }}>
            <button onClick={() => setIsPickerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#333", fontSize: 16, fontWeight: 800 }}>{String(selYear).slice(2)}??{selMonth}??{selWeek}二?/span>
              <Icon.ChevronDown color="#333" />
            </button>
          </div>
          <div style={{ padding: "0 14px 48px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 0, transform: `translateX(${dragX * 0.7}px)`, transition: dragX === 0 ? "transform 0.3s ease-out" : "none" }}>
              {weekDates.map((date, i) => {
                const localY = date.getFullYear();
                const localM = String(date.getMonth() + 1).padStart(2, '0');
                const localD = String(date.getDate()).padStart(2, '0');
                const dateKey = `${localY}-${localM}-${localD}`;
                const daySub = subs.find(s => s.date === dateKey && (s.status === "?뱀씤?꾨즺" || s.status === "?덉쇅?붿껌"));
                
                const FOOD_IMGS = [
                  "/food_01.webp", "/food_02.webp", "/food_03.webp", 
                  "/food_04.png", "/food_05.png", "/food_06.png"
                ];
                // Use i (0-4) directly to ensure zero duplicates within a 5-day week
                const foodImg = FOOD_IMGS[i % FOOD_IMGS.length];

                return (
                  <div key={i} onClick={() => { if(daySub){setSelectedSub(daySub); setStep("detail");} }} style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, cursor: daySub ? "pointer" : "default", flex: 1 }}>
                    <div style={{ height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {daySub ? (
                        <div style={{ position: "relative" }}>
                          <img src={foodImg} style={{ width: 88, height: 88, objectFit: "contain" }} alt="food" />
                          {daySub.status === "?덉쇅?붿껌" && (
                            <div style={{ position: "absolute", top: 2, right: 0, background: "#E24B4A", color: "#fff", fontSize: 11, fontWeight: 900, padding: "3px 6px", borderRadius: 8, border: "2.5px solid #FFFBF0" }}>蹂대쪟</div>
                          )}
                        </div>
                      ) : (
                        <img src="/food_00.png" style={{ width: 52, height: 52, opacity: 0.6 }} alt="empty" />
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: daySub ? "#111" : "#bbb" }}>{["??,"??,"??,"紐?,"湲?][i]} {date.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: "0 28px", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ textAlign: "center", fontSize: 12, color: "#999", fontWeight: 700, margin: "0 0 4px" }}>?곸닔利앹쓣 ?щ━硫??뚯떇??梨꾩썙吏묐땲??/p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "24px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 18 }}>?곸닔利??щ━湲?/button>
            <button onClick={() => { doPick(); setStep("menu"); }} style={{ width: "100%", padding: "20px", borderRadius: 16, border: "1px solid #000", background: "transparent", color: "#000", fontWeight: 700, fontSize: 17 }}>?ㅻ뒛 萸?癒뱀??</button>
          </div>
        </div>
      </div>
    );
  };

  const statusMapForFilter = {
    "?뱀씤": "?뱀씤?꾨즺",
    "蹂대쪟": "?덉쇅?붿껌",
    "諛섎젮": "諛섎젮"
  };

  const AppList = () => {
    const [sortType, setSortType] = useState("upload");

    const filteredSubs = subs.filter(s => {
      if (filter === "?꾩껜") return true;
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
          <span style={{ fontWeight: 800, fontSize: 18 }}>?뺤궛 ?댁뿭</span>
        </div>

        <div style={{ padding: "0 28px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["?꾩껜", "?뱀씤", "蹂대쪟", "諛섎젮"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#000" : "#fff", color: filter === f ? "#fff" : "#999", border: "none", borderRadius: 30, padding: "8px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "0.2s" }}>{f}</button>
            ))}
          </div>
          <div style={{ display: "flex" }}>
            <button 
              onClick={() => setSortType(prev => prev === "date" ? "upload" : "date")} 
              style={{ background: "none", border: "none", fontSize: 13, color: "#111", fontWeight: 800, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>{sortType === "date" ? "?좎쭨?? : "?낅줈?쒖닚"}</span>
              <div style={{ display: "flex", flexDirection: "column", fontSize: 8, color: "#bbb", lineHeight: 1, gap: 2 }}>
                <span>??/span>
                <span>??/span>
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
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#bbb", fontWeight: 700 }}>{s.date} 쨌 {s.category}</p>
                    <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#111", letterSpacing: "-0.5px" }}>{s.store_name || s.storeName}</h4>
                  </div>
                  <Badge status={s.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#000" }}>??parseInt(s.amount || 0).toLocaleString()}</span>
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


  function handleSendChat() {
    if (!replyText.trim() || !selectedSub) return;
    const msg = replyText;
    setLocalChats(prev => ({
      ...prev,
      [selectedSub.id]: [...(prev[selectedSub.id] || []), { sender: "me", text: msg }]
    }));
    setReplyText("");
    setTimeout(() => {
      setLocalChats(prev => ({
        ...prev,
        [selectedSub.id]: [...(prev[selectedSub.id] || []), { sender: "admin", text: "?뺤씤 ???듬? ?쒕━寃좎뒿?덈떎." }]
      }));
    }, 1000);
  }

  const AppResult = () => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px 240px", minHeight: 0 }}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEE2E2", color: "#E24B4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px", fontWeight: 800 }}>!</div>
          <p style={{ fontSize: 22, color: "#111", fontWeight: 900, marginBottom: 16 }}>?뺤궛 湲곗???留욎? ?딅뒗 ?곸닔利앹씠?먯슂</p>
          {issues.map((iss, i) => (
            <p key={i} style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "2px 0", fontWeight: 500 }}>{iss}</p>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", marginBottom: 20 }}>
          <div style={{ padding: "24px" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["媛寃뚮챸", ocr?.storeName, false],
                  ["?좎쭨", ocr?.date, issues.some(iss => iss.includes("?좎쭨") || iss.includes("二쇰쭚"))],
                  ["?쒓컙", ocr?.time, issues.some(iss => iss.includes("?쒓컙"))],
                  ["湲덉븸", "?? + parseInt(ocr?.amount || 0).toLocaleString(), issues.some(iss => iss.includes("湲덉븸"))],
                  ["?낆쥌", ocr?.category, issues.some(iss => iss.includes("?낆쥌"))]
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
            <button onClick={() => setIsImgModal(true)} style={{ width: "100%", marginTop: 16, padding: "14px", borderRadius: 12, border: "1.5px solid #eee", background: "#fafafa", color: "#666", fontWeight: 700, fontSize: 14 }}>?곸닔利?蹂닿린</button>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 28px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", display: "flex", gap: 12, zIndex: 9999 }}>
        <button onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 100); }} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #E5E7EB", background: "#fff", color: "#333", fontWeight: 800, fontSize: 16 }}>?ㅼ떆 ?쒖텧</button>
        <button onClick={() => {
          if (issues.some(i => i.includes("?쒓컙"))) setExcType("?낅Т ?곗옣");
          else if (issues.some(i => i.includes("?낆쥌"))) setExcType("湲고?");
          setExcText("?낅Т 誘명똿 吏??);
          setStep("exception");
        }} style={{ flex: 2, padding: "18px", borderRadius: 16, border: "none", background: "#E24B4A", color: "#fff", fontWeight: 800, fontSize: 16 }}>?덉쇅 ?붿껌?섍린</button>
      </div>
    </div>
  );

  const AppException = () => {
    const mainIssue = issues[0] || "";
    let summary = "?덉쇅 ?뺤궛 ?좎껌 嫄?;
    if (mainIssue.includes("?쒓컙")) summary = `[?쒓컙 ???ъ슜] ${ocr?.time} 寃곗젣 嫄?;
    else if (mainIssue.includes("?좎쭨") || mainIssue.includes("二쇰쭚")) summary = `[?ъ슜 ?쇱옄] ${ocr?.date} 寃곗젣 嫄?;
    else if (mainIssue.includes("?낆쥌")) summary = `[吏?????낆쥌] ${ocr?.category} 寃곗젣 嫄?;

    const CHIPS = ["?낅Т 誘명똿 吏??, "?쇨렐 ????? ?먯떖", "?앸떦 寃곗젣 ?쒖뒪???ㅻ쪟", "?몃? 誘명똿 ?곗옣", "湲고?"];

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
        <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px 240px", minHeight: 0 }}>
          <img src="/pencil.webp" style={{ width: 52, height: 52, marginBottom: 32, marginLeft: 5 }} alt="pencil" />
          <div style={{ padding: "0 0 48px", textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1.4, letterSpacing: "-0.5px" }}>{summary}??br/>?곸꽭 ?ъ쑀瑜??묒꽦?댁＜?몄슂.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: 8, marginBottom: 24 }}>
            {CHIPS.map(c => (
              <button key={c} onClick={() => setExcText(c)} style={{ padding: "10px 16px", borderRadius: 20, border: "1.5px solid #eee", background: excText === c ? "#000" : "#fff", color: excText === c ? "#fff" : "#666", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "0.2s" }}>{c}</button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <textarea 
              value={excText} 
              onChange={e => setExcText(e.target.value.slice(0, 200))} 
              placeholder="?? ?꾨줈?앺듃 留덇컧?쇰줈 ?명빐 ?먯떖 ?앹궗媛 ??뼱議뚯뒿?덈떎." 
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
            ?덉쇅 ?좎껌?섍린
          </button>
        </div>
      </div>
    );
  };

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
            {pullY > 80 ? "?덈줈怨좎묠???꾪빐 ?먯쓣 ?볦쑝?몄슂 ?봽" : "?밴꺼???덈줈怨좎묠 ??}
          </div>
        )}
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => { setStep("home"); window.history.replaceState({}, '', window.location.pathname); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>?ㅻ뒛 萸?癒뱀??</span>
        </div>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "min(20vh, 100px)", marginBottom: 24 }}>{pick?.emoji || "?쨺"}</div>
          <p style={{ fontSize: 16, color: "#888", marginBottom: 8, fontWeight: 600 }}>{pick?.cat}</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: "-1px" }}>{pick?.name} ?대뼚?몄슂?</h2>
        </div>

        <div style={{ padding: "16px 28px 32px", display: "flex", gap: 12, zIndex: 10, flexShrink: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 16px)" }}>
          <button 
            onClick={() => {
              if(pick?.name) window.open(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent("??二쇰? " + pick.name)}`, '_blank');
            }}
            disabled={!pick}
            style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #E5E7EB", background: "#fff", color: "#333", fontWeight: 800, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {pick?.name || "硫붾돱"} 李얘린
          </button>
          <button 
            onClick={doPick} 
            style={{ flex: 2, padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            ?ㅻⅨ 硫붾돱 異붿쿇
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
      return parseInt(p[0]) === myYear && parseInt(p[1]) === myMonth && (s.status === "?뱀씤?꾨즺" || s.status === "?덉쇅?붿껌");
    });
    const monthTotal = monthSubs.reduce((a, s) => a + parseInt(s.amount || 0), 0);

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setStep("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon.Back /></button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>留덉씠?섏씠吏</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 100px" }}>
          <div style={{ background: "#fff", borderRadius: 36, padding: "40px 24px", textAlign: "center", marginBottom: 28, boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#f5f5f5", margin: "0 auto 20px", overflow: "hidden" }}>
              <img src="/profile.png" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="profile" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#111" }}>{user?.full_name}</h2>
            <p style={{ fontSize: 13, color: "#999", fontWeight: 700 }}>?ㅼ쓬?뺣낫?쒖뒪?쒖쫰 쨌 {user?.email}</p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => shiftMyMonth(-1)} 
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", opacity: (new Date(myYear, myMonth - 1, 1) <= new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)) ? 0.3 : 1 }}
              >
                <Icon.ChevronLeft size={20} color="#ccc" />
              </button>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-0.5px" }}>{myYear}??{String(myMonth).padStart(2, "0")}??/span>
              <button 
                onClick={() => shiftMyMonth(1)} 
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", opacity: (new Date(myYear, myMonth - 1, 1) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) ? 0.3 : 1 }}
              >
                <Icon.ChevronRight size={20} color="#ccc" />
              </button>
            </div>
            <button onClick={() => setStep("list")} style={{ background: "none", border: "none", fontSize: 13, color: "#aaa", fontWeight: 700, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              ?댁뿭蹂닿린 <Icon.ChevronRight size={14} color="#ccc" />
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 28, padding: "24px", marginBottom: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E2F5EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>?뱤</div>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#333" }}>?뺤궛 ?꾪솴</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#000" }}>??monthTotal.toLocaleString()}</span>
            </div>
            <div style={{ height: 8, background: "#f2f2f2", borderRadius: 10, position: "relative", marginBottom: 14 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (monthTotal/220000)*100)}%`, background: "#FEC601", borderRadius: 10 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#bbb", fontWeight: 700 }}>
              <span>?꾩옱吏異?/span>
              <span>珥??쒕룄 ??20,000</span>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 28, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E8F0FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>?뮩</div>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#333" }}>?낃툑怨꾩쥖</span>
            </div>
            <span style={{ fontSize: 14, color: "#666", fontWeight: 700 }}>湲됱뿬怨꾩쥖</span>
          </div>

          <div 
            onClick={() => setStep("policy")}
            style={{ background: "#fff", borderRadius: 28, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 10px 40px rgba(0,0,0,0.03)", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FFF0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>?뱥</div>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#333" }}>?앸? 吏???뺤콉</span>
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
              濡쒓렇?꾩썐
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
          <span style={{ fontWeight: 800, fontSize: 18 }}>?앸? 吏???뺤콉</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 120px" }}>
            {/* Hero Section */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0 48px" }}>
                <div style={{ width: 130, flexShrink: 0, marginLeft: -12 }}>
                    <img src="/zaleat.png" alt="ZAL Character" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
                <div style={{ padding: "0 4px", marginBottom: 12, flex: 1, marginTop: 10 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 950, margin: "0 0 8px", color: "#000", letterSpacing: "-1px" }}>?덈뀞? ???섎㉨?댁빞!</h1>
                    <p style={{ fontSize: 16, color: "#666", fontWeight: 700, lineHeight: 1.5, letterSpacing: "-0.5px" }}>?뚯궗 ?앺솢??利먭굅????앸? 吏??<br/>?닿? ?먯꽭???뚮젮以꾧쾶!</p>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* ?뱀뀡: ?ъ슜 議곌굔 */}
                <section>
                    <div style={{ background: "#fff", borderRadius: 32, padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.03)", border: "1.5px solid #FDF5E6" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            {[
                                { icon: "?뱟", t: "吏???쇱젙", d: "?됱씪 洹쇰Т??湲곗? (1??1??" },
                                { icon: "??, t: "?뺤궛 ?쒓컙", d: "?ㅼ쟾 10:00 ~ ?ㅽ썑 2:00" }
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
                                <span style={{ fontSize: 20 }}>?뱧</span> ?ъ슜 媛???μ냼
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {[
                                    { icon: "?ⅲ", text: "?쇰컲 ?앸떦 (???낆쥌)" },
                                    { icon: "??, text: "移댄럹 諛?踰좎씠而ㅻ━" },
                                    { icon: "?룵", text: "諛깊솕??留덊듃 ?몃뱶肄뷀듃/?몄쓽?? }
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

                {/* ?뱀뀡: ?뺤궛 諛?吏湲?*/}
                <section>
                    <div style={{ background: "#fff", borderRadius: 32, padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
                        <h2 style={{ fontSize: 17, fontWeight: 900, color: "#111", marginBottom: 24 }}>?뺤궛 諛?吏湲??덉감</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {[
                                { label: "吏?먭툑", val: "洹쇰Т?쇱닔 x 10,000?? },
                                { label: "???湲곌컙", val: "?대떦 ???꾩껜" },
                                { label: "?쒖텧 留덇컧", val: "?듭썡 10?쇨퉴吏" },
                                { label: "吏湲됱씪", val: "留ㅼ썡 22??, accent: true }
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

                {/* ?뱀뀡: 吏湲?遺덇? */}
                <section style={{ paddingBottom: 40 }}>
                    <div style={{ background: "#fff", borderRadius: 32, padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
                        <h2 style={{ fontSize: 17, fontWeight: 900, color: "#111", marginBottom: 24 }}>吏湲?遺덇? ?ъ쑀</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[
                            { icon: "?븩", t: "?쒓컙 ?? },
                            { icon: "?슜", t: "怨듯쑕?? },
                            { icon: "?룚截?, t: "?닿? 以? },
                            { icon: "?뱞", t: "?곸닔利?誘몃퉬" },
                            { icon: "?슟", t: "以묐났 ?ъ슜" }
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
    home: <AppHome />, 
    my: <AppMyPage />, 
    list: <AppList />, 
    result: <AppResult />, 
    exception: <AppException />, 
    menu: <AppMenu />, 
    policy: <AppPolicy />,
    detail: <AppDetailView sub={selectedSub} onBack={() => { if(step==="detail") setStep("home"); }} onShowImg={(img) => { setPreview(img); setIsImgModal(true); }} chats={selectedSub ? localChats[selectedSub.id] : []} onSendChat={handleSendChat} replyTxt={replyText} setReplyTxt={setReplyText} /> 
  };

  const StatusModal = ({ type, onClose }) => (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: "#fff", width: "100%", maxWidth: 320, borderRadius: 36, padding: "48px 24px 24px", textAlign: "center", boxShadow: "0 30px 60px rgba(0,0,0,0.3)" }}>
        {type === "checking" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>?쨼</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>?뺤씤 以묒엯?덈떎...</h3>
            <p style={{ fontSize: 15, color: "#666", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>AI媛 ?곸닔利??뺣낫瑜?br/>瑗쇨세?섍쾶 遺꾩꽍?섍퀬 ?덉뒿?덈떎.</p>
          </>
        ) : type === "holiday_error" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>?슟</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>?깅줉 遺덇?</h3>
            <p style={{ fontSize: 15, color: "#666", margin: "0 0 40px", lineHeight: 1.6, fontWeight: 500 }}>怨듯쑕?쇱쓽 ?곸닔利앹?<br/>?깅줉??遺덇????⑸땲??</p>
            <button onClick={onClose} style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", background: "#1A1C30", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>?뺤씤</button>
          </>
        ) : type === "quota_error" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>?뮯</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>泥섎━ 遺덇?</h3>
            <p style={{ fontSize: 16, color: "#e74c3c", margin: "0 0 40px", lineHeight: 1.6, fontWeight: 800 }}>?곷Т?? ?щ젅?㏃씠 ?놁뼱??br/>遺꾩꽍??紐삵빐???졼뀪</p>
            <button onClick={onClose} style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", background: "#1A1C30", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>?뺤씤</button>
          </>
        ) : type === "duplicate" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>?뱟</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>?대? ?쒖텧???댁뿭???덉뒿?덈떎.</h3>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 32px", lineHeight: 1.6, fontWeight: 500 }}>?대떦 ?좎쭨({duplicateDate})???대? ?쒖텧??br/>?곸닔利??댁뿭??議댁옱?⑸땲??</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={handleReplace} style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>?곸닔利?援먯껜?섍린</button>
              <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "1.5px solid #eee", background: "#fff", color: "#999", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>痍⑥냼</button>
            </div>
          </>
        ) : type === "invalid_month" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>?뱠</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>?깅줉 遺덇?</h3>
            <p style={{ fontSize: 15, color: "#666", margin: "0 0 32px", lineHeight: 1.6, fontWeight: 500 }}>?대쾲???곸닔利앸쭔<br/>?낅줈?쒓? 媛?ν빀?덈떎.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button 
                onClick={() => {
                  setModal(null);
                  setTimeout(() => fileRef.current.click(), 100);
                }} 
                style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
              >
                ?ㅻⅨ ?곸닔利??좏깮
              </button>
              <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "1.5px solid #eee", background: "#fff", color: "#999", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>痍⑥냼</button>
            </div>
          </>
        ) : type === "server_busy" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 24 }}>?숋툘</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>?쒕쾭 吏??/h3>
            <p style={{ fontSize: 15, color: "#666", margin: "0 0 32px", lineHeight: 1.6, fontWeight: 500 }}>AI媛 ?덈Т 諛붾튌??br/>吏湲??뱀옣? ??듭쓣 紐??섍쿋?ㅻ꽕??</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button 
                onClick={() => processFile(file)} 
                style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
              >
                ?ㅼ떆 ?쒕룄
              </button>
              <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "1.5px solid #eee", background: "#fff", color: "#999", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>痍⑥냼</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E2F5EC", color: "#1E8A4A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 24, fontWeight: 900 }}>??/div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>?쒖텧???꾨즺?섏뿀?듬땲??</h3>
            <p style={{ fontSize: 13, color: "#999", fontWeight: 600, margin: "0 0 40px", lineHeight: 1.5 }}>
              {type === "done_ex" ? (
                <>?뱀씤 ?щ????대떦???뺤씤 ??br/>寃곗젙?⑸땲??</>
              ) : (
                "留ㅼ썡 22?쇱뿉 ?낃툑?⑸땲??"
              )}
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: "20px", borderRadius: 20, border: "none", background: "#1A1C30", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>?뺤씤</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#f2f2eb", fontFamily: "'Pretendard', sans-serif", letterSpacing: "-0.5px" }}>
      <style>{`
        @media (max-width: 1060px) { .desktop-panel { display: none !important; } .app-container { width: 100% !important; border-left: none !important; } }
        @media (max-height: 820px) { .footer-copy { display: none !important; } }
        :root { --side-pad: 32px; --item-gap: 64px; --btn-bot: 60px; }
        @media (max-width: 480px) { :root { --side-pad: 28px; --item-gap: 40px; --btn-bot: 40px; } }
      `}</style>
      <div className="desktop-panel" style={{ width: 600, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px" }}>
        <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-2px", color: "#000" }}>?먯떖 ????<br /><span style={{ color: "#fff", textShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>10珥?/span>???뺤궛!</h1>
        <p style={{ fontSize: 18, color: "rgba(0,0,0,0.6)", marginTop: 24, fontWeight: 600 }}>?곸닔利??ъ쭊 ???μ씠硫?異⑸텇?⑸땲??</p>
      </div>
      <div className="app-container" style={{ width: 460, flexShrink: 0, height: "calc(var(--vh, 1vh) * 100)", boxShadow: "30px 30px 60px -15px rgba(0,0,0,0.12)", borderLeft: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#FFFBF0" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", height: "100%", overflow: "hidden" }}>
          {screens[step] || <AppHome />}
        </div>
        {modal && <StatusModal type={modal} onClose={reset} />}
        {deleteId && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)", zIndex: 11000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "#fff", borderRadius: 32, padding: "40px 24px 24px", textAlign: "center", width: "100%", maxWidth: 320 }}>
              <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 32 }}>?뺣쭚 ??젣?섏떆寃좎뒿?덇퉴?</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #eee", background: "#fff", color: "#666", fontWeight: 700, cursor: "pointer" }}>?꾨땲??/button>
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
                }} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, cursor: "pointer" }}>??/button>
              </div>
            </div>
          </div>
        )}
        {isImgModal && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", flexDirection: "column", padding: "40px 24px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button onClick={() => setIsImgModal(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, fontWeight: 300 }}>??/button>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src={preview} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
            </div>
          </div>
        )}
        <BottomSheetPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} year={selYear} month={selMonth} week={selWeek} onConfirm={(y, m, w) => { setSelYear(y); setSelMonth(m); setSelWeek(w); }} />
      </div>
    </div>
  );
}
