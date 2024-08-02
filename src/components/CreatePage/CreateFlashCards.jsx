import { useState, useRef, useEffect } from "react";
import styles from './CreateFilePage.module.css';


function CreateFlashCards({onAddFlashCard}){

    const textareaRefs = useRef([]);

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");

    const addAsFlashCard = (e) => {
        e.preventDefault();
        if (question.trim() === "" || answer.trim() === "") {
            alert("Please enter both a question and an answer.");
            return;
        }
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
            <form onSubmit={addAsFlashCard}>
                
            <div className={styles.createFlashCardContainer}>

            <div className={styles.questionContainer}>
                <textarea className={styles.flashCardInput} type="text" value={question}
                ref={(el)=>textareaRefs.current[0] = el}
                onChange={(e) =>{ 
                    setQuestion(e.target.value) 
                    autoResize(e)
                }}
                placeholder = "question"
                onInput={autoResize}

                ></textarea>
            </div>
            <div className={styles.answerContainer}>
                <textarea className={styles.flashCardInput} type="text" value={answer}
                ref={(el)=>textareaRefs.current[1] = el}
                onChange={(e) =>{
                    setAnswer(e.target.value)
                    autoResize(e)
                }}
                onInput={autoResize}
                placeholder = "answer"
                ></textarea>

            </div>
            </div>
            
               

                <button type="submit">Add as Flash Card</button>
            </form>
    )

}

export default CreateFlashCards;