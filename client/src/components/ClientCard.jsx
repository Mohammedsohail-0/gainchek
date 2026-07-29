import "./ClientCard.css";
import Profile from "./Profile";

function ClientCard({ data, others}){
    return(
        <div className="ClientCard">
            <Profile size={"md"}></Profile>
            <div className="data">
               {data.map((line, i) => (
                    <div key={i}>{line}</div>
                ))}
            </div>
            <div className="others">
                {others}
            </div>
        </div>
    )
}

export default ClientCard