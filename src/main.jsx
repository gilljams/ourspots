import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmProvider } from './utils/useConfirm'
import { ToastProvider } from './utils/useToast'
import { PromptProvider } from './utils/usePrompt'
import { installViewportTracking } from './utils/viewport'

installViewportTracking()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <PromptProvider>
          <App />
        </PromptProvider>
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)