import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { getToken, saveToken, removeToken } from './services/token.service'

function App() {
  const [token, setToken] = useState<string | null>(getToken());

  const loginUser = (newToken: string) => {
    saveToken(newToken);
    setToken(newToken);
  };

  const logoutUser = () => {
    removeToken();
    setToken(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage token={token} onLogout={logoutUser} />} />
        <Route path="/login" element={<Login onLogin={loginUser} />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  )
}

export default App

