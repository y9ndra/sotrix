import React, {useState} from "react";
import Button from "../components/Button"
import Input from "../components/Input"
import { signup } from "../api/auth.api";
function Signup(){

      const [username, setUsername] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [email, setEmail] = useState("");
      function handleusernamechange(event: React.ChangeEvent<HTMLInputElement>){
        setUsername(event.target.value);
        console.log(username);
      }
      function handlepasswordchange(event: React.ChangeEvent<HTMLInputElement>){
        setPassword(event.target.value);
        console.log(password);
      }
      function handleconfirmpasswordchange(event: React.ChangeEvent<HTMLInputElement>){
        setConfirmPassword(event.target.value);
        console.log(confirmPassword);
      }
      function handleemailchange(event: React.ChangeEvent<HTMLInputElement>){
        setEmail(event.target.value);
        console.log(email);
      }
      async function handlesignup(){
        if (password !== confirmPassword) {
          console.log("Passwords do not match");
          return;
        }
        try{
          const response = await signup(username,email,password);
          console.log(response);
        }
        catch(error){
          console.log(error);
        }
      }

    return(
        <>
        <Input 
        label="Name"
        placeholder="Enter your name"
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
           onChange={handlepasswordchange}/>

        <Input 
          label="Confirm Password"
          placeholder="Confirm your password"
           value={confirmPassword}
           onChange={handleconfirmpasswordchange}/>

        <Button name="Signup"
        onClick={handlesignup}/>
        </>
    )
}
export default Signup