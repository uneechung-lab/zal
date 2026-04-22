import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const Icon = {
  Feedback: ({ size = 24, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Close: ({ size = 20, color = "#999" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  File: ({ size = 18, color = "#666" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  ),
  Send: ({ size = 20, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>
  ),
  List: ({ size = 22, color = "#000" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  )
};

export default function FeedbackSystem({ userName, userEmail, currentPath, showAdminView = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdminListOpen, setIsAdminListOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (showAdminView) {
      const checkNew = async () => {
        const { count, error } = await supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .or('is_read.eq.false,is_read.is.null');
        setHasNew(!error && count > 0);
      };
      checkNew();
      
      const sub = supabase.channel('feedback_changes')
        .on('postgres_changes', { event: '*', table: 'feedbacks' }, () => checkNew())
        .subscribe();
      return () => supabase.removeChannel(sub);
    }
  }, [showAdminView]);

  const handleOpenStatus = () => {
    setIsAdminListOpen(true);
  };

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    setMessage("");
    setFile(null);
  };

  const getPageName = () => {
    if (currentPath) return currentPath;
    return window.location.pathname.split('/').pop() || "메인";
  };

  const uploadFile = async (f) => {
    const ext = f.name.split('.').pop();
    const fileName = `feedback/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, f);
      
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (e) {
      console.error("Upload Error:", e);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    let fileUrl = null;
    if (file) {
      fileUrl = await uploadFile(file);
    }

    try {
      const { error } = await supabase.from('feedbacks').insert([{
        user_name: userName || "익명",
        user_email: userEmail || "",
        page_name: getPageName(),
        message: message,
        file_url: fileUrl,
        status: '접수',
        is_read: false
      }]);

      if (error) throw error;
      alert("의견이 접수되었습니다. 감사합니다!");
      handleClose();
    } catch (e) {
      console.error(e);
      alert("접수 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 12, zIndex: 10000 }}>
        {/* Status List FAB (White) - Only for Admin */}
        {showAdminView && (
          <button 
            onClick={handleOpenStatus}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "1px solid #999",
              transition: "transform 0.2s",
              position: "relative"
            }}
            onMouseOver={e => e.currentTarget.style.transform = "scale(1.05) translateY(-2px)"}
            onMouseOut={e => e.currentTarget.style.transform = "scale(1) translateY(0)"}
            title="의견 현황 보기"
          >
            <Icon.List color="#000" />
            {hasNew && (
              <div style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 12,
                height: 12,
                background: "#FF5A5A",
                borderRadius: "50%",
                border: "2px solid #fff"
              }} />
            )}
          </button>
        )}

        {/* Submit Feedback FAB (Black) */}
        <button 
          onClick={handleOpen}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#000",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: "none",
            transition: "transform 0.2s"
          }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.05) translateY(-2px)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1) translateY(0)"}
          title="의견 보내기"
        >
          <Icon.Feedback color="#fff" />
        </button>
      </div>

      {/* Submission Modal Overlay */}
      {isOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
          padding: 20
        }} onClick={handleClose}>
          <div 
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 400,
              borderRadius: 24,
              overflow: "hidden",
              animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "24px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>의견 보내기</h3>
              <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon.Close /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "0 24px 24px" }}>
              {(userName || userEmail) && (
                <div style={{ fontSize: 12, color: "#999", marginBottom: 12, fontWeight: 600 }}>
                  작성자: {userName || "익명"} ({userEmail || "이메일 없음"})
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#999", display: "block", marginBottom: 8 }}>현재 화면</label>
                <div style={{ background: "#f5f5f5", padding: "10px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
                  {getPageName()}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#999", display: "block", marginBottom: 8 }}>내용</label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="테스트 중 발견한 불편한 점이나 제안하고 싶은 내용을 자유롭게 작성해 주세요."
                  required
                  style={{
                    width: "100%",
                    height: 120,
                    padding: "14px",
                    borderRadius: 16,
                    border: "1.5px solid #eee",
                    fontSize: 15,
                    resize: "none",
                    fontFamily: "inherit",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <input 
                  type="file" 
                  ref={fileRef}
                  style={{ display: "none" }}
                  onChange={e => setFile(e.target.files[0])}
                  accept="image/*"
                />
                <button 
                  type="button"
                  onClick={() => fileRef.current.click()}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    background: "#f9f9f9", 
                    border: "1.5px dashed #ccc", 
                    width: "100%", 
                    padding: "12px", 
                    borderRadius: 12, 
                    cursor: "pointer",
                    fontSize: 14,
                    color: file ? "#111" : "#888",
                    fontWeight: 600
                  }}
                >
                  <Icon.File color={file ? "#111" : "#888"} />
                  {file ? file.name : "파일 첨부 (선택)"}
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !message.trim()}
                style={{ 
                  width: "100%", 
                  padding: "16px", 
                  borderRadius: 16, 
                  background: (isSubmitting || !message.trim()) ? "#eee" : "#000", 
                  color: "#fff", 
                  border: "none", 
                  fontSize: 16, 
                  fontWeight: 800, 
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                {isSubmitting ? "전송 중..." : <><Icon.Send size={18} /> 의견 제출하기</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin List Overlay (Dimmed) */}
      {isAdminListOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 10002
        }} onClick={() => setIsAdminListOpen(false)}>
          <FeedbackAdminList onClose={() => setIsAdminListOpen(false)} />
        </div>
      )}

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

export function FeedbackAdminList({ onClose }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setFeedbacks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const selectedFeedback = feedbacks.find(f => f.id === selectedId);

  return (
    <div 
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "100%",
        maxWidth: 480,
        height: "100%",
        background: "#fff",
        boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
        zIndex: 10002,
        display: "flex",
        flexDirection: "column",
        animation: "slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      
      <div style={{ padding: "24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>테스트 의견 현황</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon.Close /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>불러오는 중...</div>
        ) : feedbacks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>접수된 의견이 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {feedbacks.map(f => (
              <div 
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: selectedId === f.id ? "2px solid #000" : "1.5px solid #f0f0f0",
                  cursor: "pointer",
                  transition: "0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#999" }}>{f.user_name} ({f.user_email || "N/A"}) · {f.page_name}</span>
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    padding: "2px 8px", 
                    borderRadius: 8,
                    background: f.status === '해결' ? "#E2F5EC" : f.status === '진행중' ? "#FFF0F0" : "#f5f5f5",
                    color: f.status === '해결' ? "#1E8A4A" : f.status === '진행중' ? "#FF5A5A" : "#666"
                  }}>{f.status}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {f.message}
                </div>
                <div style={{ fontSize: 11, color: "#ccc", marginTop: 8 }}>
                  {new Date(f.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFeedback && (
        <FeedbackDetail 
          feedback={selectedFeedback} 
          onBack={() => setSelectedId(null)} 
          onRefresh={fetchFeedbacks}
        />
      )}
    </div>
  );
}

function FeedbackDetail({ feedback, onBack, onRefresh }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('feedback_comments')
      .select('*')
      .eq('feedback_id', feedback.id)
      .order('created_at', { ascending: true });
    if (!error) setComments(data);
  };

  const markAsRead = async () => {
    if (feedback.is_read) return;
    const { error } = await supabase
      .from('feedbacks')
      .update({ is_read: true })
      .eq('id', feedback.id);
    if (!error) onRefresh();
  };

  useEffect(() => {
    fetchComments();
    markAsRead();
  }, [feedback.id]);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('feedback_comments').insert([{
        feedback_id: feedback.id,
        user_name: "관리자",
        message: newComment,
        is_admin: true
      }]);
      if (error) throw error;
      setNewComment("");
      fetchComments();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await supabase.from('feedbacks').update({ status }).eq('id', feedback.id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "#fff",
      zIndex: 10,
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ padding: "24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24 }}>←</button>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>의견 상세</h3>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#FEC601", marginBottom: 4 }}>{feedback.page_name}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{feedback.user_name}님의 의견</div>
              <div style={{ fontSize: 13, color: "#999", fontWeight: 600 }}>이메일: {feedback.user_email || "없음"}</div>
            </div>
            <select 
              value={feedback.status} 
              onChange={e => updateStatus(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, fontWeight: 700 }}
            >
              <option value="접수">접수</option>
              <option value="진행중">진행중</option>
              <option value="해결">해결</option>
              <option value="반려">반려</option>
            </select>
          </div>
          
          <div style={{ fontSize: 16, lineHeight: 1.6, color: "#333", whiteSpace: "pre-wrap", background: "#f9f9f9", padding: 20, borderRadius: 16 }}>
            {feedback.message}
          </div>

          {feedback.file_url && (
            <div style={{ marginTop: 16 }}>
              <img 
                src={feedback.file_url} 
                style={{ width: "100%", borderRadius: 12, border: "1px solid #eee" }} 
                alt="첨부파일"
                onClick={() => window.open(feedback.file_url, '_blank')}
              />
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 24 }}>
          <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800 }}>댓글 및 답변</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {comments.map(c => (
              <div key={c.id} style={{ alignSelf: c.is_admin ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div style={{ 
                  background: c.is_admin ? "#000" : "#f0f0f0", 
                  color: c.is_admin ? "#fff" : "#000",
                  padding: "12px 16px",
                  borderRadius: c.is_admin ? "16px 2px 16px 16px" : "2px 16px 16px 16px",
                  fontSize: 14,
                  lineHeight: 1.5
                }}>
                  {c.message}
                </div>
                <div style={{ fontSize: 10, color: "#ccc", marginTop: 4, textAlign: c.is_admin ? "right" : "left" }}>
                  {c.is_admin ? "관리자" : c.user_name} · {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 32px", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input 
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1.5px solid #eee", outline: "none" }}
            onKeyDown={e => e.key === 'Enter' && handleSendComment()}
          />
          <button 
            onClick={handleSendComment}
            disabled={isSending || !newComment.trim()}
            style={{ padding: "0 20px", borderRadius: 12, background: "#000", color: "#fff", border: "none", fontWeight: 700 }}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
