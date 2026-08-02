import "./ClientCard.css";
import Profile from "./Profile";

function ClientCard({ data, others, className, onClick }) {
    return (
        <div className={`ClientCard ${className || ''}`} onClick={onClick}>
            <Profile size={"lg"} className={"profile"} ></Profile>
            <div className="card-body">
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