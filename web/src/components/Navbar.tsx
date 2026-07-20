import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

function Navbar({ isAuthenticated, onLogout }: NavbarProps){
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    return(
        <nav>
            <h1>Sotrix</h1>
            <ul>
                <li><Link to="/">Home</Link></li>
                {!isAuthenticated ? (
                    <>
                        <li><Link to="/login">Login</Link></li>
                        <li><Link to="/signup">Signup</Link></li>
                    </>
                ) : (
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