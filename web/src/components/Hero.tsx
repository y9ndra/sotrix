import { Link } from 'react-router-dom';

function Hero(){
    return(
        <section>
            <h1>Sotrix the Social Media Platform</h1>
            <p>Connect with your friends and family on Sotrix. Share your thoughts, photos, and videos with the world.</p>
            <Link to="/signup">
                <button>Get Started</button>
            </Link>
        </section>
    );
}


export default Hero;