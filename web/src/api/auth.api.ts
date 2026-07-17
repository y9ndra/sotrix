import api from "./axios";

const login = async (identifier: string, password: string) =>{
  return api.post("/auth/login",{identifier,password});
}    


const signup = async (username: string, email: string, password: string) =>{
  return api.post("/auth/signup",{username,email,password});
}    


export {login , signup }
