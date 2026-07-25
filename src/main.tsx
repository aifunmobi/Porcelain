import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StyleGallery } from './components/StyleGallery.tsx'
import './styles/globals.css'

// Dev-only: ?gallery=1 renders the letterpress style gallery instead of the OS.
const showGallery = new URLSearchParams(window.location.search).has('gallery')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showGallery ? <StyleGallery /> : <App />}
  </StrictMode>,
)
