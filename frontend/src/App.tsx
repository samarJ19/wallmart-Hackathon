import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
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

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        
        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/foryou" element={<Foryou />} />
                    <Route path="/product/:productId" element={<ProductDetailPage />} />
                    <Route path="/manageusers" element={<GroupManagementPage />} />
                  </Routes>
                </Layout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
