interface ButtonProps {
  name: string;
  onClick: () => void;
}

const Button = ({name,onClick}: ButtonProps) => {
    return (
        <>
            <button
            onClick={onClick}
            >
                {name}
            </button>
        </>
    )
}
export default Button