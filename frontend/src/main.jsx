import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ScrollAoTopo from './components/ScrollAoTopo/ScrollAoTopo.jsx'
import ConfirmacaoProvider from './components/ConfirmacaoProvider/ConfirmacaoProvider.jsx'
import ToastProvider from './components/ToastProvider/ToastProvider.jsx'
import SessaoExpirada from './components/SessaoExpirada/SessaoExpirada.jsx'
import { AuthProvider } from './auth/authProvider.jsx'
import { createAuthService } from './auth/createAuthService.js'
import { LocalTokenStore } from './auth/localTokenStore.js'
import { avisarSessaoExpirada } from './auth/sessaoExpirada.js'
import { http, configurarHttp } from './api/http.js'
import './styles/reset.css'
import './styles/global.css'

const tokenStore = new LocalTokenStore()
const authService = createAuthService({ http, tokenStore })

configurarHttp({
  tokenStore,
  aoExpirarSessao: () => {
    authService.logout()
    avisarSessaoExpirada()
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollAoTopo />
      <ToastProvider>
        <SessaoExpirada />
        <AuthProvider service={authService}>
          <ConfirmacaoProvider>
            <App />
          </ConfirmacaoProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
