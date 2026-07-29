import React from "react";
import "./InfoDiv.css";

function InfoDiv({info, infoLabel, onClick}){
    return(
        <div className="container" onClick={onClick}>
            <div className="info">
                {info}
            </div>
            <div className="info-label" onClick={onClick}>
                {infoLabel}
            </div>
        </div>
    )
}

export default InfoDiv;