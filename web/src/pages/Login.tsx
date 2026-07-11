import { useState } from "react";   
import Button from "../components/Button"
import Input from "../components/Input"

function Login(){

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleusernamechange(event){
    setUsername(event.target.value);
  }
  function handlepasswordchange(event){
    setPassword(event.target.value);
  }
  function handleclick(){
    console.log("button clicked",username,password);
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
        onClick={handleclick}/>
        </>
    )
}
export default Login