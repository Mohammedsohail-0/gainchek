import "./ClientCard.css";
import Profile from "./Profile";

function ClientCard({name, data, others}){
    return(
        <div className="card">
            <Profile size={"md"}></Profile>
            <div className="data">
                {data}
            </div>
            <div className="others">
                {others}
            </div>
        </div>
    )
}

export default ClientCard