import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notification.store';
import { removeToken } from '../services/token.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { getUnreadCount } from '../services/notification.service';
import { logout } from '../api/auth.api';

function Navbar() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const clearUser = useAuthStore((state) => state.clearUser);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const currentUserId = user?._id || user?.id || "";

    const storeUnreadCount = useNotificationStore((state) => state.unreadCount);
    const setStoreUnreadCount = useNotificationStore((state) => state.setUnreadCount);
    const resetNotifications = useNotificationStore((state) => state.resetNotifications);

    const { data: unreadData } = useQuery({
        queryKey: queryKeys.notifications.unreadCount,
        queryFn: getUnreadCount,
        enabled: isAuthenticated,
        refetchInterval: 5000,
    });

    useEffect(() => {
        if (typeof unreadData?.data?.unreadCount === "number") {
            setStoreUnreadCount(unreadData.data.unreadCount);
            // Whenever unread count updates from backend, simultaneously sync notifications list
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        }
    }, [unreadData?.data?.unreadCount, setStoreUnreadCount, queryClient]);

    const unreadCount = typeof storeUnreadCount === "number" ? storeUnreadCount : (unreadData?.data?.unreadCount ?? 0);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error("Server logout error:", err);
        } finally {
            removeToken();
            clearUser();
            resetNotifications();
            navigate('/login');
        }
    };

    return (
        <>
            <nav className="nav-control-center">
                <Link to="/" className="nav-logo">SOTRIX</Link>
                
                <ul className="nav-spaces">
                    <li>
                        <Link to="/" className="nav-space-link">home</Link>
                    </li>
                    {isAuthenticated && (
                        <li>
                            <Link to="/explore" className="nav-space-link">discover</Link>
                        </li>
                    )}
                    {isAuthenticated && (
                        <li>
                            <Link to="/search" className="nav-space-link">search</Link>
                        </li>
                    )}
                    {isAuthenticated && (
                        <li>
                            <span className="nav-space-link disabled" title="Chats coming soon">messages</span>
                        </li>
                    )}
                    {isAuthenticated && (
                        <li>
                            <Link to={`/profile/${currentUserId}`} className="nav-space-link">profile</Link>
                        </li>
                    )}
                </ul>

                <ul className="nav-utilities">
                    {isAuthenticated && (
                        <li>
                            <Link to="/notifications" className="nav-utility-link" title="Notifications">
                                <span className="nav-icon">🔔</span>
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </Link>
                        </li>
                    )}
                    {isAuthenticated ? (
                        <li>
                            <button onClick={handleLogout} className="nav-logout-btn">
                                logout
                            </button>
                        </li>
                    ) : (
                        <>
                            <li><Link to="/login" className="nav-space-link">login</Link></li>
                            <li><Link to="/signup" className="nav-space-link">signup</Link></li>
                        </>
                    )}
                </ul>
            </nav>

            {isAuthenticated && (
                <div className="mobile-bottom-nav">
                    <Link to="/" className={`mobile-nav-link ${location.pathname === "/" ? "active" : ""}`}>
                        home
                    </Link>
                    <Link to="/explore" className={`mobile-nav-link ${location.pathname.startsWith("/explore") ? "active" : ""}`}>
                        discover
                    </Link>
                    <Link to="/search" className={`mobile-nav-link ${location.pathname.startsWith("/search") ? "active" : ""}`}>
                        search
                    </Link>
                    <Link to={`/profile/${currentUserId}`} className={`mobile-nav-link ${location.pathname.startsWith("/profile") ? "active" : ""}`}>
                        profile
                    </Link>
                </div>
            )}
        </>
    );
}

export default Navbar;