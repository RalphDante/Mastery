import { useNavigate } from "react-router-dom";

function EditFlashCardBtn({folderName}){

    const navigate = useNavigate();

    const handleEditFlashCard = ()=>{
        navigate("/editflashcard", {state: {folderName : folderName}});
        
    }

    return(

        <div>
            <button onClick={handleEditFlashCard}>Edit Flash Card</button>            

        </div>
    )
}

export default EditFlashCardBtn;