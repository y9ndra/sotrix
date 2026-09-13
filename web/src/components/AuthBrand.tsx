import { Link } from "react-router-dom";

const AuthBrand = () => {
  return (
    <div className="auth-brand-below-logo">
      <Link to="/" className="auth-brand-wordmark-link" title="Sotrix">
        <h1 className="auth-brand-wordmark">SOTRIX</h1>
      </Link>
    </div>
  );
};

export default AuthBrand;
