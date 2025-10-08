import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function EditDeckBtn({deckId}){

    

    const navigate = useNavigate();

    const handleEditFlashCard = ()=>{
        navigate(`/edit-deck/${deckId}`);
        
    }

    return(

            <a 
                href="#" 
                onClick={(e) => handleEditFlashCard()} 
                className="block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors"
            >
                Edit Deck
            </a>       

    )
}

export default EditDeckBtn;