import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { removeToken } from '../services/token.service';

function Navbar() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const clearUser = useAuthStore((state) => state.clearUser);
    const navigate = useNavigate();

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
                <li>About</li>
                <li>Contact</li>
                <li>Help</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
            </ul>
        </nav>
    );
}

export default Navbar;