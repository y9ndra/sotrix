import {useState} from "react";
import Button from "../components/Button"
import Input from "../components/Input"
function Signup(){

      const [username, setUsername] = useState("");
      const [password, setPassword] = useState("");
      const [email, setEmail] = useState("");
      function handleusernamechange(event){
        setUsername(event.target.value);
        console.log(username);
      }
      function handlepasswordchange(event){
        setPassword(event.target.value);
        console.log(password);
      }
      function handleemailchange(event){
        setEmail(event.target.value);
        console.log(email);
      }
      function handleclick(){
        console.log("button clicked",username,password);
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
           value={password}
           onChange={handlepasswordchange}/>

        <Button name="Signup"
        onClick={handleclick}/>
        </>
    )
}
export default Signup