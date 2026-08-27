import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { removeToken } from '../services/token.service';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { getUnreadCount } from '../services/notification.service';

import { logout } from '../api/auth.api';

function Navbar() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const clearUser = useAuthStore((state) => state.clearUser);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    const currentUserId = user?._id || user?.id || "";

    const { data: unreadData } = useQuery({
        queryKey: queryKeys.notifications.unreadCount,
        queryFn: getUnreadCount,
        enabled: isAuthenticated,
        refetchInterval: 10000,
    });
    const unreadCount = unreadData?.data?.unreadCount || 0;

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error("Server logout error:", err);
        } finally {
            removeToken();
            clearUser();
            navigate('/login');
        }
    };

    return (
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
    );
}

export default Navbar;