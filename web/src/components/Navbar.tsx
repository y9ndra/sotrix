import { Link } from 'react-router-dom';

function Navbar(){
    return(
        <nav>
            <h1>Sotrix</h1>
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/signup">Signup</Link></li>
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