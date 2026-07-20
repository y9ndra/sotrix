import { login } from "../api/auth.api"
import React, { useState } from "react";   
import Button from "../components/Button"
import Input from "../components/Input"
import { Link, useNavigate } from "react-router-dom";

interface LoginProps {
  onLogin: (token: string) => void;
}

function Login({ onLogin }: LoginProps){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
  async function handlelogin(){
    setError("");
    setSuccess("");
    if (!username || !password) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    try{
      const response = await login({ identifier: username, password });
      console.log(response);
      if (response.data && response.data.token) {
        onLogin(response.data.token);
        setSuccess("Logged in successfully!");
        setUsername("");
        setPassword("");
        navigate("/");
      } else {
        setError("Failed to obtain authentication token");
      }
    }
    catch(err: any){
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Failed to log in";
      setError(errMsg);
    }
    finally {
      setLoading(false);
    }
  }
    return(
        <div style={{ margin: "20px 0", padding: "20px", border: "1px solid #ccc", borderRadius: "5px" }}>
        <h2>Log In</h2>
        {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
        {success && <div style={{ color: "green", marginBottom: "10px" }}>{success}</div>}

        <Input
          label="Username or email"
          placeholder="Enter your username or email"
          value={username}
          onChange={handleusernamechange}/>
        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          type="password"
          onChange={handlepasswordchange}/>
        <br />
        <Button name={loading ? "Logging in..." : "Login"} onClick={handlelogin} disabled={loading}/>
        
        <div style={{ marginTop: "15px" }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
        <div style={{ marginTop: "10px" }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#0066cc', 
              textDecoration: 'underline', 
              cursor: 'pointer', 
              font: 'inherit', 
              padding: 0 
            }}
          >
            Back
          </button>
          {" | "}
          <Link to="/">Back to Home</Link>
        </div>
        </div>
    )
}
export default Login