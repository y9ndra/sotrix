import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { removeToken } from '../services/token.service';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { getUnreadCount } from '../services/notification.service';

function Navbar() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const clearUser = useAuthStore((state) => state.clearUser);
    const navigate = useNavigate();

    const { data: unreadData } = useQuery({
        queryKey: queryKeys.notifications.unreadCount,
        queryFn: getUnreadCount,
        enabled: isAuthenticated,
        refetchInterval: 10000,
    });
    const unreadCount = unreadData?.data?.unreadCount || 0;

    const handleLogout = () => {
        removeToken();
        clearUser();
        navigate('/login');
    };

    return (
        <nav>
            <h1>Sotrix</h1>
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/feed">Feed</Link></li>
                {isAuthenticated && <li><Link to="/explore">Explore</Link></li>}
                {isAuthenticated && (
                    <li>
                        <Link to="/notifications">
                            Notifications
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                        </Link>
                    </li>
                )}
                {!isAuthenticated ? (
                    <>
                        <li><Link to="/login">Login</Link></li>
                        <li><Link to="/signup">Signup</Link></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/my-posts">My Posts</Link></li>
                        <li>
                            <button 
                                onClick={handleLogout} 
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'inherit', 
                                    cursor: 'pointer', 
                                    font: 'inherit', 
                                    padding: 0 
                                }}
                            >
                                Logout
                            </button>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
}

export default Navbar;