import api from "./axios";
import type { LoginRequest, SignupRequest } from "../types/auth.types";

const login = async (data: LoginRequest) =>{
  return api.post("/auth/login", data);
}    


const signup = async (data: SignupRequest) =>{
  return api.post("/auth/signup", data);
}    


const getMe = async () => {
  return api.get("/auth/me");
}

export {login , signup, getMe }
