import React from "react";

interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  error?: string;
  helperText?: string;
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
  error,
  helperText,
}: InputProps) {
  return (
    <div className={`input-group ${className}`}>
      <label className="input-label">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={onChange}
        className={`input-field ${error ? "input-field-error" : ""}`}
      />
      {error ? (
        <span className="input-error-text">{error}</span>
      ) : helperText ? (
        <span className="input-helper-text">{helperText}</span>
      ) : null}
    </div>
  );
}

export default Input;