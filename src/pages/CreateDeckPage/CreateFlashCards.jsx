import { useState, useRef, useEffect } from "react";
import styles from './CreateFilePage.module.css';

function CreateFlashCards({onAddFlashCard}){

    const textareaRefs = useRef([]);

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");

    const addAsFlashCard = (e) => {
        e.preventDefault();
        onAddFlashCard({
            question, 
            answer, 
            question_type: "text", 
            answer_type: "text"
        });
        setQuestion("");
        setAnswer("");
        resetSizes()
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