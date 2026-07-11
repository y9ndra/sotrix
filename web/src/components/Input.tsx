function Input({ label, placeholder,value,onChange }) {
  return (
    <div>
      <label>{label}</label>
      <br />
      <input type="text" placeholder={placeholder} value={value} onChange={onChange}/>
    </div>
  );
}

export default Input;