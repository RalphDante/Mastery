import { useNavigate } from "react-router-dom";

function EditFlashCardBtn({deckId}){

    const navigate = useNavigate();

    const handleEditFlashCard = ()=>{
        navigate(`/edit-deck/${deckId}`);
        
    }

    return(

        <div>
            <button className="btn btn-primary" onClick={handleEditFlashCard}>Edit Flash Card</button>           

        </div>
    )
}

export default EditFlashCardBtn;