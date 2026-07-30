import "./ClientCard.css";
import Profile from "./Profile";

function ClientCard({ name, data, others, className }){
    return(
        <div className={`ClientCard ${className || ''}`}>
            <Profile size={"lg"} name={name}></Profile>
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