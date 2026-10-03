import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { type Environment, loadEnvironment, VariantProvider } from './variant'
import { isDefectOn, setActiveDefects } from './defects'
import './styles.css'

function Root() {
  const [env, setEnv] = useState<Environment | null>(null)
  useEffect(() => {
    void loadEnvironment().then((e) => {
      document.documentElement.dataset.uiVariant = e.uiVariant
      setActiveDefects(e.webDefects)
      document.documentElement.classList.toggle('no-focus-ring', isDefectOn('DF-026'))
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
