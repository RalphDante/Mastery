import CreateFile from './CreateFile'

import { useLocation } from 'react-router-dom';

function EditFlashCardPage(){

    const location = useLocation();

    const {fileName} = location.state || {};

    return (
        <div>
            <CreateFile 
            fileNameDirectory = {fileName}
        />
        </div>
        
    )
}

export default EditFlashCardPage;