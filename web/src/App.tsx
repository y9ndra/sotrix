import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Feed from './pages/Feed'
import Explore from './pages/Explore'
import MyPosts from './pages/MyPosts'
import { getToken, saveToken, removeToken } from './services/token.service'
import ProtectedRoute from './components/ProtectedRoute'
import AuthInitializer from './components/AuthInitializer'

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
    <>
      <AuthInitializer />
      <Routes>
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Homepage token={token} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/feed" 
        element={
          <ProtectedRoute>
            <Feed isAuthenticated={!!token} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/explore" 
        element={
          <ProtectedRoute>
            <Explore isAuthenticated={!!token} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/my-posts" 
        element={
          <ProtectedRoute>
            <MyPosts isAuthenticated={!!token} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route path="/login" element={<Login onLogin={loginUser} />} />
      <Route path="/signup" element={<Signup />} />
      <Route 
        path="/profile/:id" 
        element={
          <ProtectedRoute>
            <Profile isAuthenticated={!!token} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
    </Routes>
    </>
  )
}

export default App;


