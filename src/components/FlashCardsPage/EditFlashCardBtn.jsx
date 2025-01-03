import { useNavigate } from "react-router-dom";

function EditFlashCardBtn({fileName}){

    const navigate = useNavigate();

    const handleEditFlashCard = ()=>{
        navigate("/editflashcard", {state: {fileName : fileName}});
        
    }

    return(

        <div>
            <button className="btn btn-primary" onClick={handleEditFlashCard}>Edit Flash Card</button>            

        </div>
    )
}

export default EditFlashCardBtn;