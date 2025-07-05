import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from './CreateFilePage.module.css'


function CreateFileInDisplayFilesBtn (){

    const location =    useLocation()

    const {folderName} = location.state;

    const navigate = useNavigate()

    const handleCreate = ()=>{
        navigate('/createfile', {state: {folderName: folderName}});

    }
    return(
        <div onClick={(e)=>handleCreate(e)} className={styles.card}>
              <div className={styles.card2}>
                  
                      <a style={{textDecoration: 'none', color:'white', fontSize: '30px'}}><i class="fa fa-plus" aria-hidden="true"></i></a>
              </div>
      </div>
    )

}

export default CreateFileInDisplayFilesBtn;