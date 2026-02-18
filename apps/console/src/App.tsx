import { Routes, Route } from 'react-router-dom'
import { ccc } from '@ckb-ccc/connector-react'
import { Layout } from './Layout'
import { OverviewPage } from './pages/OverviewPage'
import { IdentityPage } from './pages/IdentityPage'
import { PlaygroundPage } from './pages/PlaygroundPage'
import { ExplorerPage } from './pages/ExplorerPage'
import { FeedPage } from './pages/FeedPage'
import { KeystoreProvider } from './contexts/KeystoreContext'
import { PdsProvider } from './contexts/PdsContext'

function App() {
  return (
    <ccc.Provider
      clientOptions={[
        { name: 'Testnet', client: new ccc.ClientPublicTestnet() },
        { name: 'Mainnet', client: new ccc.ClientPublicMainnet() },
      ]}
    >
      <KeystoreProvider>
        <PdsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<OverviewPage />} />
              <Route path="identity" element={<IdentityPage />} />
              <Route path="playground" element={<PlaygroundPage />} />
              <Route path="explorer" element={<ExplorerPage />} />
              <Route path="feed" element={<FeedPage />} />
            </Route>
          </Routes>
        </PdsProvider>
      </KeystoreProvider>
    </ccc.Provider>
  )
}

export default App
