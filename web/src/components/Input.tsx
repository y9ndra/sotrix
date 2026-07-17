import React from "react";

interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}

function Input({ label, placeholder, value, onChange, type = "text" }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <br />
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}/>
    </div>
  );
}

export default Input;