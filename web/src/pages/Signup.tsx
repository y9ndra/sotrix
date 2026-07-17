import React, {useState} from "react";
import Button from "../components/Button"
import Input from "../components/Input"
import { signup } from "../api/auth.api";

function Signup(){
      const [username, setUsername] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [email, setEmail] = useState("");
      const [error, setError] = useState("");
      const [success, setSuccess] = useState("");

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
        try{
          const response = await signup(username,email,password);
          console.log(response);
          setSuccess("Signup successful! You can now log in.");
          setUsername("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        }
        catch(err: any){
          console.error(err);
          const errMsg = err.response?.data?.message || err.message || "Failed to sign up";
          setError(errMsg);
        }
      }

    return(
        <div style={{ margin: "20px 0", padding: "20px", border: "1px solid #ccc", borderRadius: "5px" }}>
        <h2>Sign Up</h2>
        {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
        {success && <div style={{ color: "green", marginBottom: "10px" }}>{success}</div>}
        
        <Input 
          label="Username"
          placeholder="Enter your username"
          value={username}
          onChange={handleusernamechange}/>

        <Input 
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChange={handleemailchange}/>

        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          type="password"
          onChange={handlepasswordchange}/>

        <Input 
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          type="password"
          onChange={handleconfirmpasswordchange}/>

        <br />
        <Button name="Signup" onClick={handlesignup}/>
        </div>
    )
}
export default Signup