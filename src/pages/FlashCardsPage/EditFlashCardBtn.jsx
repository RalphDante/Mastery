import { useNavigate } from "react-router-dom";

function EditDeckBtn({deckId}){

    const navigate = useNavigate();

    const handleEditFlashCard = ()=>{
        navigate(`/edit-deck/${deckId}`);
        
    }

    return(

        <div>
            <button className="btn btn-primary" onClick={handleEditFlashCard}>Edit Deck</button>           

        </div>
    )
}

export default EditDeckBtn;