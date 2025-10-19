import React from 'react'
import ReactDOM from 'react-dom/client'
import './app.css'
import MemoryGamePage from './MemoryGamePage.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryGamePage />
  </React.StrictMode>
)
