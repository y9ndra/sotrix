import React from "react";

interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
}

function Input({ label, placeholder, value, onChange, type = "text", className = "" }: InputProps) {
  return (
    <div className={`input-group ${className}`}>
      <label className="input-label">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={onChange}
        className="input-field"
      />
    </div>
  );
}

export default Input;