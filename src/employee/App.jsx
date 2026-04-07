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
    return ["?뚯떇??,"?쒖떇","以묒떇","?쇱떇","?묒떇","遺꾩떇","移댄럹","而ㅽ뵾?꾨Ц??,"?쒓낵??,"踰좎씠而ㅻ━","?몄쓽??,"?덊띁留덉폆","諛깊솕??,"?몃뱶肄뷀듃"];
  }
}

function validate(d, allowed) {
  const issues = [];
  const [h, m] = (d.time || "0:0").split(":").map(Number);
  const tot = h * 60 + m;
  if (tot < 600 || tot > 840) issues.push("?ъ슜 媛???쒓컙(10:00~14:00) ???ъ슜?낅땲??");
  const dow = new Date(d.date).getDay();
  if (dow === 0 || dow === 6) issues.push("二쇰쭚/怨듯쑕???ъ슜? 吏?먮릺吏 ?딆뒿?덈떎.");
  const catMatch = allowed.some(t => {
    const cats = (d.category || "").split(/[\/,\s쨌]/);
    return cats.some(c => c.includes(t) || t.includes(c));
  });
  if (!catMatch) issues.push("吏???낆쥌???꾨떃?덈떎. (?낆쥌: " + (d.category || "誘명솗??) + ")");
  if (!d.amount || parseInt(d.amount) <= 0) issues.push("湲덉븸 ?뺣낫瑜??뺤씤?????놁뒿?덈떎.");
  return issues;
}

const DEMO = [
  { id: 1, date: "2026-04-03", time: "12:15", amount: "9500", category: "?쒖떇", storeName: "源諛λ굹??, status: "?뱀씤?湲?, issues: [], exceptionReason: "", rejectReason: "" },
  { id: 2, date: "2026-04-02", time: "13:00", amount: "12000", category: "?쇱떇", storeName: "?ㅼ떆濡?, status: "?뱀씤?꾨즺", issues: [], exceptionReason: "", rejectReason: "" },
  { id: 3, date: "2026-04-01", time: "09:30", amount: "8000", category: "移댄럹", storeName: "?ㅽ?踰낆뒪", status: "諛섎젮", issues: [], exceptionReason: "", rejectReason: "?쒓컙 ???ъ슜?쇰줈 吏湲?遺덇?" },
];

const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  primary: "#C8622A",
  primaryLight: "#F5E6DC",
  text: "#1A1A1A",
  muted: "#888",
  border: "#EBEBEB",
  accent: "#3B3B98",
};

function Badge({ status }) {
  const map = {
    "?뱀씤?湲?: { bg: "#EEF2FF", color: "#3B3B98", label: "?뱀씤 ?湲? },
    "?뱀씤?꾨즺": { bg: "#E2F5EC", color: "#1E8A4A", label: "?뱀씤 ?꾨즺" },
    "?덉쇅?붿껌": { bg: "#FEF3E2", color: "#B87020", label: "?덉쇅 ?붿껌" },
    "諛섎젮": { bg: "#FDECEA", color: "#C0392B", label: "諛섎젮" },
  };
  const s = map[status] || map["?뱀씤?湲?];
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
}

// 醫뚯륫 釉뚮옖???⑤꼸
function BrandPanel() {
  return (
    <div style={{ width: "50%", height: "100vh", background: C.bg, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "48px 52px", position: "relative" }}>
      {/* 濡쒓퀬 */}
      <div style={{ position: "absolute", top: 40, left: 52, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 17 }}>??/div>
        <span style={{ fontWeight: 800, fontSize: 20, color: C.text, letterSpacing: -0.5 }}>ZAL : ??/span>
        <span style={{ fontSize: 13, color: C.muted, marginLeft: 2 }}>癒밴쿋?듬땲??</span>
      </div>

      {/* 以묒븰 移댄뵾 */}
      <div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: C.primary, fontWeight: 700, letterSpacing: 1 }}>?앸? ?뺤궛 ?먮룞???쒖뒪??/p>
        <h1 style={{ margin: "0 0 20px", fontSize: 48, fontWeight: 900, color: C.text, lineHeight: 1.15, letterSpacing: -1.5 }}>
          ?먯떖 ????<br />
          <span style={{ color: C.primary }}>10珥?/span>???뺤궛!
        </h1>
        <p style={{ margin: "0 0 40px", fontSize: 16, color: C.muted, lineHeight: 1.8 }}>
          ?곸닔利??ъ쭊 ???μ씠硫?異⑸텇?⑸땲??<br />
          AI媛 ?먮룞?쇰줈 洹쒖젙???뺤씤?섍퀬<br />
          留ㅼ썡 22???먮룞 ?낃툑源뚯?!
        </p>

        {/* 湲곕뒫 ?쒓렇 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 52 }}>
          {["AI ?먮룞 ?몄떇", "洹쒖젙 利됱떆 寃利?, "?ㅻЪ ?곸닔利?遺덊븘??, "留ㅼ썡 22???먮룞 ?낃툑"].map(t => (
            <span key={t} style={{ background: C.primaryLight, color: C.primary, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 20 }}>{t}</span>
          ))}
        </div>

        {/* ?듦퀎 */}
        <div style={{ display: "flex", gap: 40 }}>
          {[["10珥?, "?뺤궛 ?꾨즺"], ["0??, "?ㅻЪ ?곸닔利?], ["22??, "留ㅼ썡 ?먮룞 ?낃툑"]].map(([num, label]) => (
            <div key={label}>
              <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 900, color: C.primary }}>{num}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ?섎떒 ?뚯궗紐?*/}
      <div style={{ position: "absolute", bottom: 40, left: 52 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>짤 2026 ?ㅼ쓬?뺣낫?쒖뒪?쒖쫰. All rights reserved.</p>
      </div>
    </div>
  );
}

// 紐⑤컮?????섑띁
function MobileFrame({ children }) {
  return (
    <div style={{ width: "50%", height: "100vh", background: "#ffffff", display: "flex", alignItems: "stretch", justifyContent: "center", padding: "0", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 480, height: "100%", background: C.card, borderRadius: 0, boxShadow: "none", overflow: "hidden", display: "flex", flexDirection: "column", borderLeft: "1px solid #eee" }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [subs, setSubs] = useState(DEMO);
  const [step, setStep] = useState("home");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excType, setExcType] = useState("");
  const [excText, setExcText] = useState("");
  const [detail, setDetail] = useState(null);
  const [allowed, setAllowed] = useState([]);
  const fileRef = useRef();

  useEffect(() => { fetchCategories().then(setAllowed); }, []);

  const reset = () => { setStep("home"); setFile(null); setPreview(null); setOcr(null); setIssues([]); setExcType(""); setExcText(""); };

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    const r = new FileReader(); r.onload = ev => setPreview(ev.target.result); r.readAsDataURL(f);
  };

  const runOCR = async () => {
    if (!file) return;
    setLoading(true); setStep("result");
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: (file.type === "image/png" ? "image/png" : "image/jpeg"), data: b64 } },
          { type: "text", text: "移대뱶 留ㅼ텧?꾪몴?낅땲?? JSON留?諛섑솚?섏꽭??\n{\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"amount\":\"?レ옄留?",\"category\":\"?낆쥌紐?",\"storeName\":\"媛留뱀젏紐?"}\n洹쒖튃: amount??湲덉븸 ?レ옄留?8,000?먯씠硫?8000). date???댁슜?쇱떆 湲곗?(26.04.06?대㈃ 2026-04-06)." }
        ]}] })
      });
      const data = await resp.json();
      const txt = data.content?.find(c => c.type === "text")?.text || "{}";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setOcr(parsed); setIssues(validate(parsed, allowed));
    } catch {
      const mock = { date: new Date().toISOString().slice(0,10), time: "12:30", amount: "9800", category: "?쒖떇", storeName: "?뚯뒪???앸떦" };
      setOcr(mock); setIssues(validate(mock, allowed));
    }
    setLoading(false);
  };

  const submit = (isException = false) => {
    setSubs(prev => [{ id: Date.now(), date: ocr.date, time: ocr.time, amount: ocr.amount, category: ocr.category, storeName: ocr.storeName || ocr.category, status: isException ? "?덉쇅?붿껌" : "?뱀씤?湲?, issues, exceptionReason: isException ? "[" + excType + "] " + excText : "", rejectReason: "" }, ...prev]);
    setStep("done");
  };

  // HOME
  const HomeScreen = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* ???ㅻ뜑 */}
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 13, color: C.muted }}>?덈뀞?섏꽭???몝</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>源誘쇱???/p>
        </div>
        <button onClick={() => setStep("list")} style={{ fontSize: 12, color: C.accent, background: "#EEF2FF", border: "none", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 600 }}>?댁뿭 蹂닿린</button>
      </div>

      {/* ?대쾲???붿빟 */}
      <div style={{ margin: "20px 20px 0", background: C.accent, borderRadius: 20, padding: "20px", color: "#fff" }}>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>?대쾲 ???뺤궛 ?꾪솴</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[["?쒖텧", subs.length + "嫄?], ["?뱀씤", subs.filter(s=>s.status==="?뱀씤?꾨즺").length + "嫄?], ["吏湲됱삁??, "?? + subs.filter(s=>s.status==="?뱀씤?꾨즺").reduce((a,s)=>a+parseInt(s.amount),0).toLocaleString()]].map(([k,v]) => (
            <div key={k}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{k}</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ?낅줈???곸뿭 */}
      <div style={{ margin: "20px 20px 0" }}>
        <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.text }}>?곸닔利??깅줉</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {!preview ? (
          <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #DDD", borderRadius: 16, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: C.bg }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 22 }}>?㎨</div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: C.text }}>?곸닔利??ъ쭊 ?щ━湲?/p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>移대뱶 留ㅼ텧?꾪몴 쨌 JPG 쨌 PNG</p>
          </div>
        ) : (
          <div style={{ borderRadius: 16, overflow: "hidden", position: "relative" }}>
            <img src={preview} style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} alt="preview" />
            <button onClick={() => { setFile(null); setPreview(null); }} style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>횞</button>
          </div>
        )}
      </div>

      <button onClick={runOCR} disabled={!file} style={{ margin: "16px 20px 0", padding: "15px", borderRadius: 14, border: "none", background: file ? C.primary : "#DDD", color: "#fff", fontWeight: 800, fontSize: 15, cursor: file ? "pointer" : "default" }}>
        {file ? "?뺤궛 媛???щ? ?뺤씤?섍린 ?? : "?곸닔利앹쓣 癒쇱? ?щ젮二쇱꽭??}
      </button>

      {/* 湲곕뒫 ?덈궡 */}
      <div style={{ margin: "20px 20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { icon: "?쨼", title: "AI ?먮룞 ?몄떇", desc: "?좎쭨쨌?쒓컙쨌湲덉븸쨌?낆쥌 ?먮룞 異붿텧" },
          { icon: "??, title: "洹쒖젙 利됱떆 寃利?, desc: "?쒓컙쨌?낆쥌 洹쒖젙 利됱떆 ?뺤씤" },
          { icon: "?뱟", title: "?붾쭚 ?먮룞 ?뺤궛", desc: "留ㅼ썡 22??怨꾩쥖 ?먮룞 ?낃툑" },
        ].map(f => (
          <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bg, borderRadius: 12 }}>
            <span style={{ fontSize: 18 }}>{f.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{f.title}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // LIST
  const ListScreen = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, padding: 0 }}>??/button>
        <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>?뺤궛 ?댁뿭</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {subs.map(s => (
          <div key={s.id} onClick={() => setDetail(s)} style={{ background: C.bg, borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{s.storeName}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.muted }}>{s.date} 쨌 {s.category}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>??parseInt(s.amount).toLocaleString()}</span>
            </div>
            {s.status === "諛섎젮" && s.rejectReason && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#C0392B", background: "#FDECEA", padding: "5px 8px", borderRadius: 8 }}>諛섎젮: {s.rejectReason}</p>}
          </div>
        ))}
      </div>
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 390 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{detail.storeName}</span>
              <Badge status={detail.status} />
            </div>
            <table style={{ width: "100%", fontSize: 13 }}>
              {[["?좎쭨", detail.date],["?쒓컙", detail.time],["湲덉븸", "?? + parseInt(detail.amount).toLocaleString()],["?낆쥌", detail.category]].map(([k,v]) => (
                <tr key={k}><td style={{ color: C.muted, padding: "5px 0", width: 56 }}>{k}</td><td style={{ fontWeight: 700 }}>{v}</td></tr>
              ))}
            </table>
            {detail.rejectReason && <p style={{ fontSize: 12, color: "#C0392B", background: "#FDECEA", padding: "10px", borderRadius: 10, marginTop: 12 }}>諛섎젮: {detail.rejectReason}</p>}
            <button onClick={() => setDetail(null)} style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>?リ린</button>
          </div>
        </div>
      )}
    </div>
  );

  // RESULT
  const ResultScreen = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, padding: 0 }}>??/button>
        <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>寃利?寃곌낵</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>?쨼</div>
            <p style={{ fontWeight: 800, fontSize: 16, color: C.text, margin: "0 0 8px" }}>AI媛 遺꾩꽍 以묒엯?덈떎</p>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>?좎떆留?湲곕떎??二쇱꽭??..</p>
          </div>
        ) : (
          <>
            {preview && <img src={preview} style={{ width: "100%", borderRadius: 14, maxHeight: 180, objectFit: "cover", marginBottom: 14 }} alt="" />}
            {ocr && (
              <div style={{ background: C.bg, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>AI ?몄떇 寃곌낵</p>
                <table style={{ width: "100%", fontSize: 13 }}>
                  {[["媛寃뚮챸", ocr.storeName],["?좎쭨", ocr.date],["?쒓컙", ocr.time],["湲덉븸", "?? + parseInt(ocr.amount||0).toLocaleString()],["?낆쥌", ocr.category]].filter(([,v])=>v).map(([k,v]) => (
                    <tr key={k}><td style={{ color: C.muted, padding: "3px 0", width: 56 }}>{k}</td><td style={{ fontWeight: 700, color: C.text }}>{v}</td></tr>
                  ))}
                </table>
              </div>
            )}
            {issues.length === 0 ? (
              <div style={{ background: "#E8F7EE", borderRadius: 14, padding: "20px", textAlign: "center", marginBottom: 14, border: "1px solid #B7DFC7" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>??/div>
                <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#1E6B3A", fontSize: 16 }}>?뺤궛 媛?ν빀?덈떎!</p>
                <p style={{ margin: 0, fontSize: 12, color: "#3A8A56" }}>紐⑤뱺 洹쒖젙??異⑹”?⑸땲??/p>
              </div>
            ) : (
              <div style={{ background: "#FDECEA", borderRadius: 14, padding: "14px 16px", marginBottom: 14, border: "1px solid #F5B7B1" }}>
                <p style={{ margin: "0 0 8px", fontWeight: 800, color: "#C0392B", fontSize: 14 }}>?좑툘 洹쒖젙 ?꾨컲</p>
                {issues.map((iss, i) => <p key={i} style={{ margin: "3px 0", fontSize: 12, color: "#C0392B" }}>??{iss}</p>)}
              </div>
            )}
            {issues.length === 0
              ? <button onClick={() => submit(false)} style={{ width: "100%", padding: 15, borderRadius: 14, border: "none", background: C.accent, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>?쒖텧?섍린 ??/button>
              : <button onClick={() => setStep("exception")} style={{ width: "100%", padding: 15, borderRadius: 14, border: "none", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>?덉쇅 ?붿껌?섍린 ??/button>
            }
          </>
        )}
      </div>
    </div>
  );

  // EXCEPTION
  const ExceptionScreen = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setStep("result")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, padding: 0 }}>??/button>
        <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>?덉쇅 ?붿껌</span>
      </div>
      <div style={{ flex: 1, padding: "20px" }}>
        <div style={{ background: "#FEF3E2", borderRadius: 12, padding: "12px 14px", marginBottom: 20, fontSize: 12, color: "#B87020", border: "1px solid #F5CBA7" }}>
          愿由ъ옄 寃?????뱀씤 ?щ?媛 寃곗젙?⑸땲??
        </div>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: C.text }}>?ъ쑀 ?좏삎 *</label>
        <select value={excType} onChange={e => setExcType(e.target.value)} style={{ width: "100%", marginBottom: 18, padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, background: C.bg, color: C.text }}>
          <option value="">?좏깮?섏꽭??/option>
          <option value="議곌린異쒓렐/?쇨렐">議곌린異쒓렐 / ?쇨렐</option>
          <option value="?몃? 誘명똿">?몃? 誘명똿</option>
          <option value="?낅Т ?곗옣">?낅Т ?곗옣</option>
          <option value="湲고?">湲고?</option>
        </select>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8, color: C.text }}>?곸꽭 ?ъ쑀 *</label>
        <textarea value={excText} onChange={e => setExcText(e.target.value)} placeholder="?덉쇅 ?ъ쑀瑜??곸꽭???묒꽦??二쇱꽭?? style={{ width: "100%", minHeight: 110, padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box", background: C.bg, color: C.text, fontFamily: "inherit" }} />
        <button onClick={() => submit(true)} disabled={!excType || !excText.trim()} style={{ width: "100%", marginTop: 16, padding: 15, borderRadius: 14, border: "none", background: excType && excText.trim() ? C.accent : "#DDD", color: "#fff", fontWeight: 800, fontSize: 15, cursor: excType && excText.trim() ? "pointer" : "default" }}>
          ?덉쇅 ?붿껌 ?쒖텧 ??
        </button>
      </div>
    </div>
  );

  // DONE
  const DoneScreen = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>?럦</div>
      <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 10px", color: C.text }}>?쒖텧 ?꾨즺!</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 32px", lineHeight: 1.7 }}>愿由ъ옄 寃????br />留ㅼ썡 22??媛쒖씤 怨꾩쥖濡??낃툑?⑸땲??/p>
      <button onClick={reset} style={{ padding: "14px 36px", borderRadius: 28, border: "none", background: C.accent, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>?덉쑝濡???/button>
    </div>
  );

  const screens = { home: HomeScreen, list: ListScreen, result: ResultScreen, exception: ExceptionScreen, done: DoneScreen };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <BrandPanel />
      <MobileFrame>
        {screens[step] || HomeScreen}
      </MobileFrame>
    </div>
  );
}
