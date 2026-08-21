interface ButtonProps {
  name: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const Button = ({ name, onClick, disabled, className = "" }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${className}`}
    >
      {name}
    </button>
  );
};

export default Button;