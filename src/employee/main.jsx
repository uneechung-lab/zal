import React from 'react'
import ReactDOM from 'react-dom/client'
import '../index.css'
import App from './App'

const root = document.getElementById('root')
root.style.height = '100%'
root.style.display = 'flex'
root.style.flexDirection = 'column'

ReactDOM.createRoot(root).render(
  <React.StrictMode><App /></React.StrictMode>
)