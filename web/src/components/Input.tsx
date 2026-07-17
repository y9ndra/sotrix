import React from "react";

interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function Input({ label, placeholder,value,onChange }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <br />
      <input type="text" placeholder={placeholder} value={value} onChange={onChange}/>
    </div>
  );
}

export default Input;