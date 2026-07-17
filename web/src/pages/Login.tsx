import { login } from "../api/auth.api"
import React, { useState } from "react";   
import Button from "../components/Button"
import Input from "../components/Input"

function Login(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    try{
      const response = await login(username,password);
      console.log(response);
      setSuccess("Logged in successfully!");
      setUsername("");
      setPassword("");
    }
    catch(err: any){
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Failed to log in";
      setError(errMsg);
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
        <Button name="Login" onClick={handlelogin}/>
        </div>
    )
}
export default Login