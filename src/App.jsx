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
    setIsLoading(true)
    
    // 가입 시도
    const { data, error } = await supabase.auth.signUp({
      email: `${userId}@daumit.net`,
      password: password,
      options: { data: { full_name: name } }
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
          { full_name: name, email: `${userId}@daumit.net` }
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
    <div className="login-container">
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
              <div className="input-card" style={{ marginBottom: 12 }}>
                <input 
                  type="text" 
                  className="input-main" 
                  placeholder="본인의 성명 입력" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  lang="ko"
                  autoComplete="name"
                  required
                />
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
      
      <footer className="branding-footer">
        <p className="copyright">© 다음정보시스템즈. All Rights Reserved.</p>
      </footer>
    </div>
  )
}

export default App
