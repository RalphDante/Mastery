import { useState, useRef, useEffect } from "react";
import styles from './CreateFilePage.module.css';


function CreateFlashCards({onAddFlashCard}){

    const textareaRefs = useRef([]);

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");

    const addAsFlashCard = (e) => {
        e.preventDefault();
        // if (question.trim() === "" || answer.trim() === "") {
        //     alert("Please enter both a question and an answer.");
        //     return;
        // }
        onAddFlashCard({question, answer})
        setQuestion("");
        setAnswer("");
        resetSizes()
    }

    
    const autoResize = (e)=>{
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    }

    const resetSizes = ()=>{
        textareaRefs.current.forEach((textarea)=>{
            textarea.style.height = 'auto'
        })
    }

    

    return(
            
        <div className={styles.addNewFlashCardBtnContainer}>
            <button className={styles.addCardBtn} onClick={addAsFlashCard}>ADD CARD</button>
                
        </div>

    )

}

export default CreateFlashCards;