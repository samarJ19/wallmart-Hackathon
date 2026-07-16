import { Routes, Route } from 'react-router-dom'
import { SignedIn } from '@clerk/clerk-react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Profile from './pages/Profile'
import SignInPage from './pages/auth/SignInPage'
import SignUpPage from './pages/auth/SignUpPage'
import { Toaster } from '@/components/ui/sonner'
import Foryou from './components/Foryou'
import ProductDetailPage from './pages/ProductDetail'
import GroupManagementPage from './pages/GroupManagementPage'
import GroupChat from './components/GroupChat'
import { AlertContainer } from './components/AlertContainer'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public auth routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        
        {/* Public browsing routes */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/products" element={<Layout><Products /></Layout>} />
        <Route path="/product/:productId" element={<Layout><ProductDetailPage /></Layout>} />
        
        {/* Protected routes - require login */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Layout>
                <Cart />
                <SignedIn>
                  <a target='_blank' rel='noopener noreferrer' href="https://cdn.botpress.cloud/webchat/v3.0/shareable.html?configUrl=https://files.bpcontent.cloud/2025/07/09/14/20250709144825-NDMVBF9H.json">
                    <img className='w-[45px] h-[50px] flex fixed bottom-10 left-10 ' src='chatIcon.png'/>
                  </a>
                  <GroupChat/>
                  <AlertContainer/>
                </SignedIn>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
                <SignedIn>
                  <a target='_blank' rel='noopener noreferrer' href="https://cdn.botpress.cloud/webchat/v3.0/shareable.html?configUrl=https://files.bpcontent.cloud/2025/07/09/14/20250709144825-NDMVBF9H.json">
                    <img className='w-[45px] h-[50px] flex fixed bottom-10 left-10 ' src='chatIcon.png'/>
                  </a>
                  <GroupChat/>
                  <AlertContainer/>
                </SignedIn>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/foryou"
          element={
            <ProtectedRoute>
              <Layout>
                <Foryou />
                <SignedIn>
                  <a target='_blank' rel='noopener noreferrer' href="https://cdn.botpress.cloud/webchat/v3.0/shareable.html?configUrl=https://files.bpcontent.cloud/2025/07/09/14/20250709144825-NDMVBF9H.json">
                    <img className='w-[45px] h-[50px] flex fixed bottom-10 left-10 ' src='chatIcon.png'/>
                  </a>
                  <GroupChat/>
                  <AlertContainer/>
                </SignedIn>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manageusers"
          element={
            <ProtectedRoute>
              <Layout>
                <GroupManagementPage />
                <SignedIn>
                  <a target='_blank' rel='noopener noreferrer' href="https://cdn.botpress.cloud/webchat/v3.0/shareable.html?configUrl=https://files.bpcontent.cloud/2025/07/09/14/20250709144825-NDMVBF9H.json">
                    <img className='w-[45px] h-[50px] flex fixed bottom-10 left-10 ' src='chatIcon.png'/>
                  </a>
                  <GroupChat/>
                  <AlertContainer/>
                </SignedIn>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
