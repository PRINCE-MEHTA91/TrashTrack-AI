import { Routes, Route } from 'react-router-dom'
import LandingPage          from './pages/LandingPage'
import LoginPage            from './pages/LoginPage'
import SignupPage           from './pages/SignupPage'
import ForgotPasswordPage   from './pages/ForgotPasswordPage'

function App() {
  return (
    <Routes>
      <Route path="/"                element={<LandingPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    </Routes>
  )
}

export default App
