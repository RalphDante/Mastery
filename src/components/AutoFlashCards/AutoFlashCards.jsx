import styles from "./AutoFlashCards.module.css";
import FileUpload from "./FileUpload.jsx";

function AutoFlashCards(){



    return(
        <div className="flex flex-col justify-start">
            <h2 className="my-2">Paste your notes or upload a file and I'll do the rest</h2>
            
            <input className={`${styles.inputField} min-h-20`}></input>
            <button className='btn btn-primary' style={{maxWidth: '8rem'}}>Upload a file</button>
            <button className='btn btn-primary' style={{maxWidth: '8rem'}}>Paste Notes</button>

            <FileUpload />
        </div>
        
    )
}


export default AutoFlashCards;