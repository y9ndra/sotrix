import { login } from "../api/auth.api"
import React, { useState } from "react";   
import Button from "../components/Button"
import Input from "../components/Input"

function Login(){

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleusernamechange(event: React.ChangeEvent<HTMLInputElement>){
    setUsername(event.target.value);
  }
  function handlepasswordchange(event: React.ChangeEvent<HTMLInputElement>){
    setPassword(event.target.value);
  }
  async function handlelogin(){
    try{

      const response = await login(username,password);
      console.log(response);
    }
    catch(error){
      console.log(error);
    }
  }
    return(
        <>
        <Input
          label="Username or email"
           placeholder="Enter your username or email"
           value={username}
           onChange={handleusernamechange}/>
        <Input
          label="Password"
           placeholder="Enter your password"
           value={password}
           onChange={handlepasswordchange}/>
        <Button name="Login" 
        onClick={handlelogin}/>
        </>
    )
}
export default Login