import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/authProvider.jsx'
import { createAuthService } from './auth/createAuthService.js'
import './styles/reset.css'
import './styles/global.css'

const authService = createAuthService()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider service={authService}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)