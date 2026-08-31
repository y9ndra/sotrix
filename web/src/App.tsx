import { Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Search from './pages/Search';
import ProtectedRoute from './components/ProtectedRoute';
import AuthInitializer from './components/AuthInitializer';
import Notifications from './pages/Notifications';
import DeckLayout from './components/DeckLayout';

import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "./services/socket.service";

function App() {
  useEffect(() => {
    const socket = connectSocket();

    if (socket) {
      socket.on("connect", () => {
        console.log("Connected to Socket.IO server:", socket.id);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from Socket.IO server");
      });
    }

    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
      }

      disconnectSocket();
    };
  }, []);

  return (
    <>
      <AuthInitializer />
      <Routes>
        {/* Unprotected Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Layered Deck Workspace Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DeckLayout />
            </ProtectedRoute>
          }
        >
          {/* Base Layer Home timeline route */}
          <Route path="/" element={<></>} />

          {/* Sliding Sheet Panel sub-routes */}
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile/:id" element={<Profile />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
