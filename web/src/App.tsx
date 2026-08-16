import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Feed from './pages/Feed'
import Explore from './pages/Explore'
import MyPosts from './pages/MyPosts'
import { getToken, removeToken } from './services/token.service'
import ProtectedRoute from './components/ProtectedRoute'
import AuthInitializer from './components/AuthInitializer'
import { useAuthStore } from './store/authStore'

function App() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearUser = useAuthStore((state) => state.clearUser);

  const logoutUser = () => {
    removeToken();
    clearUser();
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
            <Homepage token={getToken()} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/feed" 
        element={
          <ProtectedRoute>
            <Feed isAuthenticated={isAuthenticated} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/explore" 
        element={
          <ProtectedRoute>
            <Explore isAuthenticated={isAuthenticated} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/my-posts" 
        element={
          <ProtectedRoute>
            <MyPosts isAuthenticated={isAuthenticated} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route 
        path="/profile/:id" 
        element={
          <ProtectedRoute>
            <Profile isAuthenticated={isAuthenticated} onLogout={logoutUser} />
          </ProtectedRoute>
        } 
      />
    </Routes>
    </>
  )
}

export default App;


