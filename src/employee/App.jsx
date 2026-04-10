import { useState, useRef, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    return cStr.some(c => c.trim().includes(t) || t.includes(c.trim()));
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
    "승인완료": { bg: "#E2F5EC", color: "#1E8A4A", label: "승인" },
    "예외요청": { bg: "#FEF3E2", color: "#B87020", label: "보류" },
    "반려": { bg: "#FDECEA", color: "#C0392B", label: "반려" },
  };
  const s = map[status] || map["승인대기"];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
}

function BottomSheetPicker({ isOpen, onClose, year, month, week, onConfirm }) {
  const [tempY, setTempY] = useState(year);
  const [tempM, setTempM] = useState(month);
  const [tempW, setTempW] = useState(week);
  useEffect(() => { if (isOpen) { setTempY(year); setTempM(month); setTempW(week); } }, [isOpen, year, month, week]);
  const wCnt = getWeekCount(tempY, tempM);
  useEffect(() => { if (isOpen && tempW > wCnt) setTempW(1); }, [tempM, tempY, wCnt, tempW, isOpen]);
  if (!isOpen) return null;
  const Col = ({ options, selected, onSelect }) => (
    <div style={{ flex: 1, height: 180, overflowY: "auto", scrollBehavior: "smooth", display: "flex", flexDirection: "column", padding: "70px 0" }}>
      {options.map(opt => (
        <div key={opt.val} onClick={() => onSelect(opt.val)} style={{ minHeight: 40, lineHeight: "40px", textAlign: "center", fontSize: selected === opt.val ? 20 : 16, fontWeight: selected === opt.val ? 800 : 500, color: selected === opt.val ? "#111" : "#bbb", cursor: "pointer", transition: "0.2s" }}>
          {opt.label}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", animation: "fadeIn 0.2s" }} />
      <div style={{ position: "relative", background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "24px 24px 32px", animation: "slideUp 0.3s ease-out" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>날짜 선택</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#111", padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 16 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 40, marginTop: -20, borderTop: "1px solid #eee", borderBottom: "1px solid #eee", pointerEvents: "none" }} />
          <Col options={[2024,2025,2026,2027].map(y => ({val:y, label:`${String(y).slice(2)}년`}))} selected={tempY} onSelect={setTempY} />
          <Col options={Array.from({length:12},(_,i)=>({val:i+1, label:`${i+1}월`}))} selected={tempM} onSelect={setTempM} />
          <Col options={Array.from({length:wCnt},(_,i)=>({val:i+1, label:`${i+1}주`}))} selected={tempW} onSelect={setTempW} />
        </div>
        <button onClick={() => { onConfirm(tempY, tempM, tempW); onClose(); }} style={{ width: "100%", padding: 18, background: "#0A84FF", color: "#fff", fontWeight: 600, fontSize: 16, border: "none", borderRadius: 12, cursor: "pointer", marginTop: 24 }}>확인</button>
      </div>
    </div>
  );
}

function AppDetailView({ sub, onBack, onShowImg, chats, onSendChat, replyTxt, setReplyTxt }) {
  if (!sub) return null;
  const MOCK_REPLY = (sub.status === "승인완료" || sub.status === "승인")
    ? "승인 완료!\n5월 22일에 입금 됩니다."
    : (sub.status === "반려" 
      ? "정산 기준 시간(14:00)을 1시간 이상 초과하여 반려되었습니다.\n소명이 더 필요한 경우 답변 남겨주세요." 
      : "검토 중입니다.\n추가 문의 사항이 있으시면 댓글을 남겨주세요.");

  const getImageUrl = (data) => {
    if (!data) return null;
    return data.image_url || data.imageUrl || data.image_path || data.receipt_url || data.img || data.image || 
           Object.values(data).find(v => typeof v === "string" && (v.startsWith("http") || v.startsWith("data:image")));
  };
  const finalImage = getImageUrl(sub);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>요청 상세</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 180px", minHeight: 0 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: "24px", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#999", fontWeight: 700 }}>{sub.date}</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#555" }}>{sub.category} · {sub.store_name || sub.storeName}</p>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                {(sub.status === "반려" || sub.status === "예외요청") && (
                  <span style={{ fontSize: 12, color: "#E24B4A", fontWeight: 700 }}>{sub.status === "반려" ? `반려 사유: ${sub.reject_reason || sub.rejectReason || "결제 시간(15:00) 미준수"}` : "보류 사유: 결제 시간(15:00) 미준수"}</span>
                )}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    if(finalImage) onShowImg(finalImage);
                    else window.alert("영수증 데이터가 없습니다.");
                  }}
                  style={{ background: "#fff", border: "1px solid #000", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 10px", borderRadius: 20, pointerEvents: "auto" }}
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

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ background: "#000", color: "#fff", padding: "14px 18px", borderRadius: "18px 2px 18px 18px", maxWidth: "85%", fontSize: 15, lineHeight: 1.5, fontWeight: 500 }}>
              {sub.exc_text || sub.excText 
                ? `${sub.exc_text || sub.excText}으로 정산 요청드립니다.` 
                : "영수증 정산 요청드립니다."}
            </div>
            <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
              {(() => {
                const d = sub.created_at ? new Date(sub.created_at) : new Date();
                return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
              })()}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ background: "#fff", color: "#333", padding: "14px 18px", borderRadius: "2px 18px 18px 18px", maxWidth: "85%", fontSize: 15, lineHeight: 1.5, fontWeight: 500, border: "1.5px solid #eee", whiteSpace: "pre-wrap" }}>
              {MOCK_REPLY}
            </div>
            <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
              관리자 · {(() => {
                const d = sub.created_at ? new Date(new Date(sub.created_at).getTime() + 5 * 60000) : new Date();
                return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
              })()}
            </span>
          </div>

          {(chats || []).map((chat, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: chat.sender === "admin" ? "flex-start" : "flex-end" }}>
              <div style={{ background: chat.sender === "admin" ? "#fff" : "#000", color: chat.sender === "admin" ? "#333" : "#fff", padding: "14px 18px", borderRadius: chat.sender === "admin" ? "2px 18px 18px 18px" : "18px 2px 18px 18px", maxWidth: "85%", fontSize: 15, lineHeight: 1.5, fontWeight: 500, border: chat.sender === "admin" ? "1.5px solid #eee" : "none" }}>{chat.text}</div>
              <span style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontWeight: 600 }}>
                {chat.sender === "admin" ? "관리자 · 방금 전" : "방금 전"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ background: "#fff", borderRadius: 32, border: "1.5px solid #eee", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.06)", pointerEvents: "auto" }}>
          <input value={replyTxt} onChange={e => setReplyTxt(e.target.value)} onKeyDown={e => { if(e.key === "Enter" && replyTxt.trim()) onSendChat(); }} placeholder="메시지를 입력하세요." style={{ flex: 1, border: "none", outline: "none", padding: "10px 0", fontSize: 15, fontWeight: 500 }} />
          <button onClick={onSendChat} disabled={!replyTxt.trim()} style={{ background: replyTxt.trim() ? "#000" : "#f0f0f0", color: "#fff", border: "none", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontWeight: 900, fontSize: 18, transition: "0.2s" }}>➔</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [subs, setSubs] = useState([]);
  const [step, setStep] = useState("home");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [issues, setIssues] = useState([]);
  const [modal, setModal] = useState(null);
  const [excType, setExcType] = useState("");
  const [excText, setExcText] = useState("");
  const [allowed, setAllowed] = useState([]);
  const [selYear, setSelYear] = useState(2026);
  const [selMonth, setSelMonth] = useState(4);
  const [selWeek, setSelWeek] = useState(2);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [replyText, setReplyText] = useState("");
  const [localChats, setLocalChats] = useState({});
  const [isImgModal, setIsImgModal] = useState(false);
  const [pick, setPick] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const fileRef = useRef();

  useEffect(() => { 
    fetchSubs();
    fetchCategories().then(setAllowed); 
  }, []);

  const fetchSubs = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/settlements?order=created_at.desc`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      setSubs(data);
    } catch (e) { console.error(e); }
  };

  const uploadToStorage = async (file) => {
    const fileName = `${Date.now()}_${encodeURIComponent(file.name)}`;
    try {
      const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/receipts/${fileName}`, {
        method: "POST",
        headers: { 
          "apikey": SUPABASE_KEY, 
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": file.type 
        },
        body: file
      });
      if(!resp.ok) throw new Error("업로드 실패");
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
    const finalStatus = isEx ? "예외요청" : "승인완료";
    const payload = {
      store_name: data.storeName,
      date: data.date,
      time: data.time,
      amount: data.amount,
      category: data.category,
      status: finalStatus,
      exc_text: isEx ? excText : null,
      image_url: data.image_url || preview
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
    } catch (e) { alert("연동 실패"); }
  };

  const handleFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
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
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "이 이미지는 결제 영수증 또는 승인 내역 스크린샷입니다. 이미지에서 글씨를 인식하여 다음 정보를 추출하고 반드시 JSON 형태로 반환하세요:\n1. storeName: 결제 가맹점, 음식점이나 가게의 정확한 상호명\n2. date: 결제 날짜 (반드시 YYYY-MM-DD 형식으로 변환)\n3. time: 결제 시간 (HH:MM 형식으로 변환)\n4. amount: 최종 승인 금액 숫자 (단위나 콤마 제외, 숫자만 입력)\n5. category: 가맹점 업종 정보 (예: 한식, 일식, 카페 등)\n\n다른 형태 없이 오직 { \"storeName\": \"\", \"date\": \"\", \"time\": \"\", \"amount\": \"\", \"category\": \"\" } 형태의 순수 JSON만 반환하세요." },
              { inline_data: { mime_type: f.type || "image/jpeg", data: b64 } }
            ]
          }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      
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
      setOcr(result); 
      const currentIssues = validate(result, allowed, subs);
      setIssues(currentIssues);
      if (currentIssues.length === 0) {
        submit(false, result);
      } else {
        setModal(null); setStep("result");
      }
    } catch (err) {
      console.error("OCR Parse Error:", err);
      alert(`영수증 이미지 분석에 실패했습니다. (${err.message})\n텍스트가 잘 보이는지 확인 후 다시 시도해주세요.`);
      setModal(null);
      setFile(null);
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

  const approvedTotal = subs.filter(s => s.status === "승인완료" || s.status === "승인대기").reduce((a, s) => a + parseInt(s.amount || 0), 0);
  const pendingTotal = subs.filter(s => s.status === "예외요청").reduce((a, s) => a + parseInt(s.amount || 0), 0);
  const weekDates = getWeekDates(selYear, selMonth, selWeek);
  const payMonth = selMonth === 12 ? 1 : selMonth + 1;
  const payYear = selMonth === 12 ? selYear + 1 : selYear;
  const payDateStr = `${String(payYear).slice(2)}.${String(payMonth).padStart(2,"0")}.22`;

  const AppHome = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      <div style={{ padding: "30px var(--side-pad) 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>ZAL:잘먹</span>
        <button onClick={() => setStep("list")} style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#555" }}>내역보기</button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: "var(--btn-bot)" }}>
        <div style={{ padding: "0 var(--side-pad) var(--item-gap)" }}>
          <p style={{ margin: "0 0 32px", fontSize: 24, color: "#777", fontWeight: 500, lineHeight: 1.45, letterSpacing: "-1px" }}>
            <span style={{ fontWeight: 800, color: "#000" }}>정다음</span>님, 맛있는 하루를<br/>다음정보시스템즈가 지원합니다!
          </p>
          <div style={{ marginTop: 40 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#333", fontWeight: 600 }}>{payDateStr} 입금 예정</p>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: "#000", letterSpacing: "-1px" }}>
              {approvedTotal.toLocaleString()}원
              {pendingTotal > 0 && <span style={{ fontSize: 16, color: "#999", fontWeight: 600, marginLeft: 10 }}>(+{pendingTotal.toLocaleString()} 보류)</span>}
            </p>
          </div>
        </div>
        <div style={{ padding: "0 var(--side-pad) 32px" }}>
          <button onClick={() => setIsPickerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#444", fontSize: 16, fontWeight: 700 }}>{String(selYear).slice(2)}년 {selMonth}월 {selWeek}주</span>
            <span style={{ fontSize: 10 }}>▼</span>
          </button>
        </div>
        <div style={{ padding: "0 var(--side-pad) var(--item-gap)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().slice(0, 10);
              const daySub = subs.find(s => s.date === dateStr && (s.status === "승인완료" || s.status === "예외요청"));
              const foodImages = ["/food_01.webp", "/food_02.webp", "/food_03.webp"];
              const selectedFood = foodImages[(i + date.getDate()) % 3];
              const DAYS = ["일","월","화","수","목","금","토"];
              return (
                <div key={i} style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {daySub ? (
                      <div style={{ position: "relative" }}>
                        <img src={selectedFood} style={{ width: 80, height: 80, objectFit: "contain" }} alt="식단" />
                        {daySub.status === "예외요청" && (
                          <div style={{ position: "absolute", top: 0, right: -4, background: "#E24B4A", color: "#fff", fontSize: 10, fontWeight: 900, padding: "3px 6px", borderRadius: 10, border: "2px solid #FFFBF0" }}>보류</div>
                        )}
                      </div>
                    ) : (
                      <img src="/food_00.png" style={{ width: 64, height: 64, opacity: 0.9 }} alt="빈그릇" />
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: daySub ? "#111" : "#bbb" }}>{DAYS[date.getDay()]} {date.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: "0 var(--side-pad)", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ textAlign: "center", fontSize: 13, color: "#888", fontWeight: 700, margin: "0 0 4px" }}>영수증을 올리면 음식이 채워집니다</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "20px", borderRadius: 16, border: "none", background: "#000", color: "#fff", fontWeight: 800, fontSize: 17 }}>영수증 올리기</button>
          <button onClick={() => { doPick(); setStep("menu"); }} style={{ width: "100%", padding: "20px", borderRadius: 16, border: "2px solid #000", background: "transparent", color: "#000", fontWeight: 800, fontSize: 17 }}>오늘 뭐 먹지?</button>
        </div>
      </div>
    </div>
  );

  const statusMapForFilter = {
    "승인": "승인완료",
    "보류": "예외요청",
    "반려": "반려"
  };

  const filteredSubs = subs.filter(s => {
    if (filter === "전체") return true;
    return s.status === statusMapForFilter[filter];
  });

  const AppList = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>정산 내역</span>
        </div>
        
        <div style={{ display: "flex", gap: 12, padding: "0 24px 20px", overflowX: "auto", msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {["전체", "승인", "보류", "반려"].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              style={{ 
                padding: "8px 20px", borderRadius: 20, border: "none", whiteSpace: "nowrap",
                background: filter === f ? "#000" : "#fff",
                color: filter === f ? "#fff" : "#888",
                fontWeight: 700, fontSize: 13, transition: "0.2s"
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 180px", minHeight: 0 }}>
          {filteredSubs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#bbb", fontWeight: 600 }}>내역이 없습니다.</div>
          ) : (
            filteredSubs.map(s => (
              <div key={s.id} onClick={() => { setSelectedSub(s); setStep("detail"); }} style={{ background: "#fff", borderRadius: 24, padding: "24px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#999", fontWeight: 600 }}>{s.date} · {s.category}</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#111" }}>{s.store_name || s.storeName}</p>
                  </div>
                  <Badge status={s.status} />
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>₩{parseInt(s.amount || 0).toLocaleString()}</p>
                  
                  <div style={{ display: "flex", gap: 8 }}>
                    {(s.status === "예외요청" || s.status === "반려") && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(s.id);
                        }}
                        style={{ padding: "8px", borderRadius: 12, background: "#FFF0F0", color: "#E24B4A", fontSize: 16, border: "none", cursor: "pointer" }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
  );


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
        [selectedSub.id]: [...(prev[selectedSub.id] || []), { sender: "admin", text: "확인 후 답변 드리겠습니다." }]
      }));
    }, 1000);
  }

  const AppResult = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px 240px", minHeight: 0 }}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEE2E2", color: "#E24B4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px", fontWeight: 800 }}>!</div>
          <p style={{ fontSize: 22, color: "#111", fontWeight: 900, marginBottom: 16 }}>정산 기준에 맞지 않는 영수증이에요</p>
          {issues.map((iss, i) => (
            <p key={i} style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "2px 0", fontWeight: 500 }}>{iss}</p>
          ))}
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

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", display: "flex", gap: 12, zIndex: 9999 }}>
        <button onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 100); }} style={{ flex: 1, padding: "18px", borderRadius: 16, border: "2px solid #E5E7EB", background: "#fff", color: "#333", fontWeight: 800, fontSize: 16 }}>다시 제출</button>
        <button onClick={() => {
          if (issues.some(i => i.includes("시간"))) setExcType("업무 연장");
          else if (issues.some(i => i.includes("업종"))) setExcType("기타");
          setExcText("업무 미팅 지연");
          setStep("exception");
        }} style={{ flex: 2, padding: "18px", borderRadius: 16, border: "none", background: "#E24B4A", color: "#fff", fontWeight: 800, fontSize: 16 }}>예외 요청하기</button>
      </div>
    </div>
  );

  const AppException = (() => {
    const mainIssue = issues[0] || "";
    let summary = "예외 정산 신청 건";
    if (mainIssue.includes("시간")) summary = `[시간 외 사용] ${ocr?.time} 결제 건`;
    else if (mainIssue.includes("날짜") || mainIssue.includes("주말")) summary = `[사용 일자] ${ocr?.date} 결제 건`;
    else if (mainIssue.includes("업종")) summary = `[지원 외 업종] ${ocr?.category} 결제 건`;

    const CHIPS = ["업무 미팅 지연", "야근 후 늦은 점심", "식당 결제 시스템 오류", "외부 미팅 연장", "기타"];

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, height: "100%", overflow: "hidden", position: "relative" }}>
        <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px 240px", minHeight: 0 }}>
          <img src="/pencil.webp" style={{ width: 52, height: 52, marginBottom: 32, marginLeft: 5 }} alt="pencil" />
          <div style={{ padding: "0 0 48px", textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1.4, letterSpacing: "-0.5px" }}>{summary}의<br/>상세 사유를 작성해주세요.</p>
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
              placeholder="예: 프로젝트 마감으로 인해 점심 식사가 늦어졌습니다." 
              style={{ width: "100%", minHeight: 195, padding: "20px", borderRadius: 24, border: "none", background: "#fff", fontSize: 16, lineHeight: 1.6, resize: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }} 
            />
            <span style={{ position: "absolute", bottom: 12, right: 16, fontSize: 12, color: "#bbb", fontWeight: 600 }}>({excText.length}/200)</span>
          </div>

        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", zIndex: 9999 }}>
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
  })();

  const AppMenu = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, position: "relative" }}>
      <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 0 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>오늘 뭐 먹지?</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 32px 180px", textAlign: "center" }}>
        <div style={{ fontSize: 100, marginBottom: 32 }}>{pick?.emoji || "🤔"}</div>
        <p style={{ fontSize: 16, color: "#888", marginBottom: 8, fontWeight: 600 }}>{pick?.cat}</p>
        <h2 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: "-1px" }}>{pick?.name} 어떠세요?</h2>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 40px", background: "linear-gradient(to top, #FFFBF0 70%, transparent)", display: "flex", gap: 12, zIndex: 10 }}>
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

  const screens = { 
    home: AppHome, 
    list: AppList, 
    result: AppResult, 
    exception: AppException, 
    menu: AppMenu, 
    detail: <AppDetailView 
      sub={selectedSub} 
      onBack={() => setStep("list")} 
      onShowImg={(img) => { setPreview(img); setIsImgModal(true); }}
      chats={selectedSub ? localChats[selectedSub.id] : []}
      onSendChat={handleSendChat}
      replyTxt={replyText}
      setReplyTxt={setReplyText}
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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(180deg, #FFB100 0%, #FFD688 50%, #FFF5D6 100%)", fontFamily: "'Pretendard', sans-serif", letterSpacing: "-0.5px" }}>
      <style>{`
        @media (max-width: 1060px) { .desktop-panel { display: none !important; } .app-container { width: 100% !important; border-left: none !important; } }
        @media (max-height: 820px) { .footer-copy { display: none !important; } }
        :root { --side-pad: 32px; --item-gap: 64px; --btn-bot: 60px; }
        @media (max-width: 480px) { :root { --side-pad: 24px; --item-gap: 40px; --btn-bot: 40px; } }
      `}</style>
      <div className="desktop-panel" style={{ width: 600, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px" }}>
        <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-2px", color: "#000" }}>점심 한 끼,<br /><span style={{ color: "#fff", textShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>10초</span>에 정산!</h1>
        <p style={{ fontSize: 18, color: "rgba(0,0,0,0.6)", marginTop: 24, fontWeight: 600 }}>영수증 사진 한 장이면 충분합니다.</p>
      </div>
      <div className="app-container" style={{ width: 460, flexShrink: 0, height: "100vh", boxShadow: "30px 30px 60px -15px rgba(0,0,0,0.12)", borderLeft: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#FFFBF0" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", height: "100%", overflow: "hidden" }}>
          {screens[step] || AppHome}
        </div>
        {step === "home" && (
          <div className="footer-copy" style={{ position: "absolute", bottom: 15, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "#999", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "-0.3px", pointerEvents: "none" }}>
            ⓒ 다음정보시스템즈
          </div>
        )}
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
    </div>
  );
}