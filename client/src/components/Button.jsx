import React from "react";
import "./Button.css";

function Button({ text, children, variant, className = "", onClick, ...props }) {
    const combinedClassName = ["btn-component", className, variant].filter(Boolean).join(" ");
    return (
        <button
            className={combinedClassName}
            onClick={onClick}
            {...props}
        >
            {children || text}
        </button>
    );
}

export default Button;