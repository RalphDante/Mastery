import CreateFile from './CreateFile'

import { useLocation, useParams } from 'react-router-dom';

function EditFlashCardPage(){


    const { deckId } = useParams();

    return (
        <div>
            <CreateFile 
            deckId = {deckId}
        />
        </div>
        
    )
}

export default EditFlashCardPage;