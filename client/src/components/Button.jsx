import React from "react";
import "./Button.css";

function Button({ text, children, variant, className = "", onClick, fullWidth, loading, ...props }) {
    const combinedClassName = ["btn-component", className, variant, fullWidth ? "btn-full-width" : "", loading ? "btn-loading" : ""].filter(Boolean).join(" ");
    return (
        <button
            className={combinedClassName}
            onClick={onClick}
            disabled={loading || props.disabled}
            {...props}
        >
            {children || text}
        </button>
    );
}

export default Button;