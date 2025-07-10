import { useNavigate } from "react-router-dom";

function EditDeckBtn({deckId}){

    const navigate = useNavigate();

    const handleEditFlashCard = ()=>{
        navigate(`/edit-deck/${deckId}`);
        
    }

    return(

        <div>
            <button className="px-6 py-3 bg-white/10 text-white/70 rounded-xl font-semibold transition-all hover:-translate-y-1" onClick={handleEditFlashCard}>Edit Deck</button>           

        </div>
    )
}

export default EditDeckBtn;