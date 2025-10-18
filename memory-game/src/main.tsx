import React from 'react'
import ReactDOM from 'react-dom/client'
import './app.css'
import MemoryGameSandbox from './MemoryGameSandbox.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryGameSandbox />
  </React.StrictMode>
)
