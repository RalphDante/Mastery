import React from "react";
import { useNavigate, useLocation } from "react-router-dom";


function CreateFileInDisplayFilesBtn (){

    const location =    useLocation()

    const {folderName} = location.state;

    const navigate = useNavigate()

    const handleCreate = ()=>{
        navigate('/createfile', {state: {folderName: folderName}});

    }
    return(
        <button onClick={handleCreate}>Create File</button>
    )

}

export default CreateFileInDisplayFilesBtn;