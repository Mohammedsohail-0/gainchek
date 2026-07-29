import React from "react";
import "./Button.css";

function Button({ text, variant, className, onClick }) {
    return (
        <button
            className={`${className} ${variant}`}
            onClick={onClick}
            >
            {text}
        </button >
    )
}

export default Button;