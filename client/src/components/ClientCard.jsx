import "./ClientCard.css";
import Profile from "./Profile";

function ClientCard({ data, others, className, onClick, pSize, ...props }) {
    return (
        <div className={`ClientCard ${className || ''}`}{...props} onClick={onClick}>
            <div className="card-body">
                <Profile size={pSize} className={"profile"} ></Profile>
                {data && (
                    <div className="data">
                        {data.map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                )}
                {others && (
                    <div className="others">
                        {others}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ClientCard