import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Feed from './pages/Feed'
import MyPosts from './pages/MyPosts'
import { getToken, saveToken, removeToken } from './services/token.service'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const navigate = useNavigate();

  const loginUser = (newToken: string) => {
    saveToken(newToken);
    setToken(newToken);
  };

  const logoutUser = () => {
    removeToken();
    setToken(null);
    navigate('/login');
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <ProtectedRoute isAuthenticated={!!token}>
            <Homepage token={token} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route path="/feed" element={<Feed isAuthenticated={!!token} onLogout={logoutUser} />} />
      <Route 
        path="/my-posts" 
        element={
          <ProtectedRoute isAuthenticated={!!token}>
            <MyPosts isAuthenticated={!!token} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route path="/login" element={<Login onLogin={loginUser} />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile/:id" element={<Profile />} />
    </Routes>
  )
}

export default App;


