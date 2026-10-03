import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { type Environment, loadEnvironment, VariantProvider } from './variant'
import './styles.css'

function Root() {
  const [env, setEnv] = useState<Environment | null>(null)
  useEffect(() => {
    void loadEnvironment().then((e) => {
      document.documentElement.dataset.uiVariant = e.uiVariant
      setEnv(e)
    })
  }, [])
  if (!env) return <p role="status">앱을 준비하는 중…</p>
  return (
    <VariantProvider value={env.uiVariant}>
      <App />
    </VariantProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
