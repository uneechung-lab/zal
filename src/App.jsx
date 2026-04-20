import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

// Supabase 초기화
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const Icon = {
  Back: ({ size = 28, color = "#111" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Check: ({ size = 24, color = "#1E8A4A" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17L4 12"/>
    </svg>
  ),
  Alert: ({ size = 24, color = "#E67E22" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function App() {
  const [step, setStep] = useState('login')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [dept, setDept] = useState('')
  const [isDeptOpen, setIsDeptOpen] = useState(false)
  const [autoLogin, setAutoLogin] = useState(() => {
    const saved = localStorage.getItem('autoLogin');
    return saved === null ? true : saved === 'true';
  });
  const [modalType, setModalType] = useState(null) // null, 'sent', 'not_confirmed', 'rate_limit', 'auth_error'
  const [customMsg, setCustomMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    localStorage.setItem('autoLogin', autoLogin);
  }, [autoLogin]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If there's a session, redirect to the employee app
      if (session) {
        window.location.href = '/employee.html';
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const closeDept = () => setIsDeptOpen(false);
    if (isDeptOpen) {
      window.addEventListener('click', closeDept);
    }
    return () => window.removeEventListener('click', closeDept);
  }, [isDeptOpen]);

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: `${userId}@daumit.net`,
      password: password,
    })
    setIsLoading(false)
    
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed')) {
        setModalType('not_confirmed')
      } else if (msg.includes('invalid login credentials')) {
        setCustomMsg("아이디 또는 비밀번호가 일치하지 않습니다.\n가입 당시 입력한 정보를 다시 확인해 주세요.")
        setModalType('auth_error')
      } else {
        alert(`로그인 실패: ${error.message}`)
      }
    } else {
      // 로그인 성공 시 즉시 홈 화면으로 이동
      window.location.href = '/employee.html'
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    
    if (!dept) {
      alert("부서를 선택해 주세요.");
      return;
    }

    setIsLoading(true)
    
    // 가입 시도
      const { data, error } = await supabase.auth.signUp({
      email: `${userId}@daumit.net`,
      password: password,
      options: { data: { full_name: name, department: dept } }
    })

    setIsLoading(false)
    
    if (error) {
      if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
        setModalType('rate_limit')
      } else {
        alert(`가입 실패: ${error.message}`)
      }
    } else {
      // 회원가입 성공 시 profiles 테이블에도 성명 정보 저장
      try {
        await supabase.from('profiles').insert([
          { full_name: name, email: `${userId}@daumit.net`, department: dept }
        ]);
      } catch (e) {
        console.error("Profile creation failed:", e);
      }

      setModalType('sent')
      setStep('login')
      window.open('https://m.mail.daum.net/', '_blank')
    }
  }

  const Modal = () => {
    const isSent = modalType === 'sent'
    const isNotConfirmed = modalType === 'not_confirmed'
    const isRateLimit = modalType === 'rate_limit'
    const isAuthError = modalType === 'auth_error'

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-icon" style={{ background: (isNotConfirmed || isRateLimit || isAuthError) ? '#FEF3E2' : '#E2F5EC' }}>
            {(isNotConfirmed || isRateLimit || isAuthError) ? <Icon.Alert /> : <Icon.Check />}
          </div>
          <h3 className="modal-title">
            {isNotConfirmed ? '인증 확인 필요' : isRateLimit ? '잠시 후 다시 시도' : isAuthError ? '확인 필요' : '메일 발송 완료'}
          </h3>
          <p className="modal-desc">
            {isNotConfirmed && <>아직 이메일 인증이 완료되지 않았습니다.<br/>메일함에서 인증 링크를 클릭해 주세요.</>}
            {isRateLimit && <>보안을 위해 짧은 시간에 여러 번 보낼 수 없습니다.<br/>약 1분 뒤에 다시 시도해 주세요.</>}
            {isSent && <>인증 메일이 발송되었습니다.<br/>메일함 확인 후 로그인해 주세요.</>}
            {isAuthError && <>{customMsg.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</>}
          </p>
          <button className="modal-btn" onClick={() => setModalType(null)}>확인</button>
        </div>
      </div>
    )
  }

  if (checkingSession) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#f2f2eb", fontFamily: "'Outfit', 'Pretendard', sans-serif", letterSpacing: "-0.5px" }}>
      <style>{`
        @media (max-width: 1060px) { 
          .desktop-panel { display: none !important; } 
          .app-container { width: 100% !important; border-left: none !important; } 
          .main-ci { display: none !important; }
          .admin-btn { display: none !important; }
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
      `}</style>
      <img src="/ci.png" className="main-ci" style={{ position: "fixed", top: 40, left: 40, height: 64, width: "auto", objectFit: "contain", zIndex: 100 }} alt="Company CI" />
      
      <div className="desktop-panel" style={{ width: 840, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 320, paddingLeft: 60, paddingTop: 220 }}>
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

      <div className="app-container" style={{ width: 460, flexShrink: 0, height: "100%", boxShadow: "30px 30px 60px -15px rgba(0,0,0,0.12)", borderLeft: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#FFFBF0" }}>
        <div className="login-container" style={{ width: '100%', maxWidth: 'none', margin: 0, height: '100%', paddingBottom: '40px' }}>
          {step === 'login' ? (
            <div className="fade-in">
              <header className="header" style={{ marginBottom: 48, marginLeft: -16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <img src="/zaleat.png" alt="ZAL Character" style={{ width: 110, height: "auto", display: "block" }} />
                  <h1 className="title" style={{ fontSize: 28, marginLeft: 12 }}>
                    <div className="accent-line">반가워요!</div><br/>
                    <span style={{ fontSize: 26, whiteSpace: "nowrap" }}>잘먹이와 맛있는 하루!</span>
                  </h1>
                </div>
              </header>

              <main className="form-section">
                <form onSubmit={handleLogin}>
                  <div className="input-card" style={{ marginBottom: 12 }}>
                    <div className="input-wrapper">
                      <input 
                        type="text" 
                        className="input-main" 
                        placeholder="아이디 입력" 
                        value={userId}
                        onChange={(e) => setUserId(e.target.value.toLowerCase())}
                        inputMode="email"
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck="false"
                        required
                      />
                      <span className="input-domain">@daumit.net</span>
                    </div>
                  </div>

                  <div className="input-card">
                    <div className="input-wrapper">
                      <input 
                        type="password" 
                        className="input-main" 
                        placeholder="비밀번호 입력" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auto-login-wrapper" onClick={() => setAutoLogin(!autoLogin)} style={{ marginTop: 12 }}>
                    <div className={`checkbox-custom ${autoLogin ? 'checked' : ''}`}>
                      {autoLogin && <Icon.Check size={14} color="#fff" />}
                    </div>
                    <span className="auto-login-text">자동로그인</span>
                  </div>

                  <button type="submit" disabled={isLoading} className="login-btn" style={{ marginTop: 32 }}>
                    {isLoading ? '연결 중...' : '로그인'}
                  </button>
                  <button type="button" onClick={() => setStep('join')} className="join-btn">오늘 처음이신가요?</button>
                </form>

                <button className="link-btn">비밀번호 찾기</button>
              </main>
            </div>
          ) : (
            <div className="fade-in">
              <header className="header" style={{ marginBottom: 40 }}>
                <button onClick={() => setStep('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: -8, marginBottom: 20, display: 'block' }}>
                  <Icon.Back />
                </button>
                <h1 className="title">
                  <div className="accent-line">시작하기</div><br/>
                  <span>회사 이메일 계정을 연결합니다.</span>
                </h1>
              </header>

              <main className="form-section">
                <form onSubmit={handleSignUp}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div className="input-card" style={{ flex: 1.5, padding: 4 }}>
                      <input 
                        type="text" 
                        className="input-main" 
                        placeholder="성명 입력" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        lang="ko"
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div 
                      className="input-card" 
                      style={{ flex: 1, padding: 4, position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeptOpen(!isDeptOpen);
                      }}
                    >
                      <div className="select-main" style={{ color: dept === '' ? '#D4D4D4' : 'inherit', display: 'flex', alignItems: 'center' }}>
                        {dept === '' ? '부서선택' : dept}
                      </div>
                      <div style={{ position: 'absolute', right: 20, pointerEvents: 'none', color: '#CCC', fontSize: 12 }}>▼</div>
                      
                      {isDeptOpen && (
                        <div style={{ 
                          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, 
                          background: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', 
                          zIndex: 50, padding: '8px', overflow: 'hidden', border: '1px solid #f0f0f0' 
                        }}>
                          {['관리', '개발', '신사업', '연구소'].map(d => (
                            <div 
                              key={d} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDept(d);
                                setIsDeptOpen(false);
                              }}
                              style={{ 
                                padding: '12px 16px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, 
                                color: dept === d ? '#000' : '#666', background: dept === d ? '#f5f5f5' : 'transparent',
                                transition: '0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#f9f9f9'}
                              onMouseOut={(e) => e.currentTarget.style.background = dept === d ? '#f5f5f5' : 'transparent'}
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="input-card" style={{ marginBottom: 12 }}>
                    <div className="input-wrapper">
                      <input 
                        type="text" 
                        className="input-main" 
                        placeholder="회사 이메일(ID) 입력" 
                        value={userId}
                        onChange={(e) => setUserId(e.target.value.toLowerCase())}
                        inputMode="email"
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck="false"
                        required
                      />
                      <span className="input-domain">@daumit.net</span>
                    </div>
                  </div>
                  <div className="input-card">
                    <input 
                      type="password" 
                      className="input-main" 
                      placeholder="비밀번호 설정" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <button type="submit" disabled={isLoading} className="login-btn" style={{ marginTop: 40, marginBottom: 80 }}>
                    {isLoading ? '메일 전송 중...' : '인증 메일 발송하기'}
                  </button>
                </form>
              </main>
            </div>
          )}

          {modalType && <Modal />}
          
          <footer className="branding-footer" style={{ position: 'absolute', bottom: 40, left: 0, right: 0 }}>
            <p className="copyright">© 다음정보시스템즈. All Rights Reserved.</p>
          </footer>
        </div>
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
          zIndex: 10000,
          transition: "0.2s"
        }}
        onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
        onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        ADMIN
      </a>
    </div>
  )
}

export default App
