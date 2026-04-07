import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const rootEl = document.getElementById('root')
rootEl.style.height = '100vh'
rootEl.style.width = '100vw'
rootEl.style.display = 'flex'
rootEl.style.overflow = 'hidden'

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode><App /></React.StrictMode>
)