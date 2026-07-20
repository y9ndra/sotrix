interface ButtonProps {
  name: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button = ({name,onClick,disabled}: ButtonProps) => {
    return (
        <>
            <button
            onClick={onClick}
            disabled={disabled}
            >
                {name}
            </button>
        </>
    )
}
export default Button