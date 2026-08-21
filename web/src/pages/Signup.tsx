import React, {useState} from "react";
import Button from "../components/Button"
import Input from "../components/Input"
import { signup } from "../api/auth.api";
import { Link, useNavigate } from "react-router-dom";

function Signup(){
      const [username, setUsername] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [email, setEmail] = useState("");
      const [error, setError] = useState("");
      const [success, setSuccess] = useState("");
      const [loading, setLoading] = useState(false);
      const navigate = useNavigate();

      function handleusernamechange(event: React.ChangeEvent<HTMLInputElement>){
        setUsername(event.target.value);
      }
      function handlepasswordchange(event: React.ChangeEvent<HTMLInputElement>){
        setPassword(event.target.value);
      }
      function handleconfirmpasswordchange(event: React.ChangeEvent<HTMLInputElement>){
        setConfirmPassword(event.target.value);
      }
      function handleemailchange(event: React.ChangeEvent<HTMLInputElement>){
        setEmail(event.target.value);
      }
      async function handlesignup(){
        setError("");
        setSuccess("");
        if (!username || !email || !password || !confirmPassword) {
          setError("All fields are required");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        setLoading(true);
        try{
          const response = await signup({ username, email, password });
          console.log(response);
          setSuccess("Signup successful! Redirecting to login...");
          setUsername("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setTimeout(() => {
            navigate("/login");
          }, 1500);
        }
        catch(err: any){
          console.error(err);
          const errMsg = err.response?.data?.message || err.message || "Failed to sign up";
          setError(errMsg);
        }
        finally {
          setLoading(false);
        }
      }

    return (
      <div className="auth-container">
        <div className="auth-card signup-card">
          <span className="auth-header-tag">Account Signup</span>
          <h2 className="auth-title">Sign Up</h2>
          
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}
          
          <Input 
            label="Username"
            placeholder="Pick a handle"
            value={username}
            onChange={handleusernamechange}
          />

          <Input 
            label="Email"
            placeholder="name@domain.com"
            value={email}
            onChange={handleemailchange}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            type="password"
            onChange={handlepasswordchange}
          />

          <Input 
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            type="password"
            onChange={handleconfirmpasswordchange}
          />

          <Button 
            name={loading ? "Signing up..." : "Sign Up"} 
            onClick={handlesignup} 
            disabled={loading}
          />
          
          <div className="auth-link-group">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
          
          <div className="auth-back-container">
            <button onClick={() => navigate(-1)} className="auth-back-button">
              Back
            </button>
            <span>|</span>
            <Link to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    );
}
export default Signup;