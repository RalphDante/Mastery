import React, { useState, useEffect, useRef } from 'react';
import styles from './CreateFilePage.module.css'


function DisplayFlashCards({flashCards, setFlashCards, onDelete, autoResize}){

    const textareaRefs = useRef([]);

    const onEdit = (index, fieldType, value)=>{
        const editedFlashCard = flashCards.map((flashCard, i)=>{
            return i === index? {...flashCard, [fieldType]: value} : flashCard
        }
        )  
        setFlashCards(editedFlashCard);
    }

    useEffect(() => {
        textareaRefs.current.forEach(textarea => {
            if (textarea) {
                autoResize({ target: textarea });
            }
        });
    }, [flashCards, autoResize]);


    
    return(

        <>
        <ul className={styles.list}>

                {flashCards.map((flashCard, index)=>(
                    <li className={styles.listItem}key={index}>
                         
                        <div className={styles.innerDisplayFlashCardsContainer}>
                            <div className={styles.questionContainer}>
                                <textarea className={styles.flashCardInput} value={flashCard.question}
                                    ref={el => textareaRefs.current[index * 2] = el}
                                    onChange={(e)=>{
                                        onEdit(index, 'question', e.target.value)
                                        autoResize(e)
                                    }}
                                    placeholder='Question'
                                    onInput={autoResize}
                                    ></textarea>

                            </div>
                            <div className={styles.answerContainer}>
                                <textarea className={styles.flashCardInput} value={flashCard.answer}
                                    ref={el => textareaRefs.current[index * 2 + 1] = el}
                                    onChange={(e)=>{
                                        onEdit(index, 'answer', e.target.value)
                                        autoResize(e)
                                    }}
                                    placeholder='Answer'
                                    onInput={autoResize}
                                
                                ></textarea>

                            </div>

                                
                        </div>
                        <div>
                            <button className={styles.btn} onClick={()=>onDelete(index)}>Delete</button>

                        </div>


                    
                    </li>
    
                ))}
            
        </ul>
        
        </>
    )


}

export default DisplayFlashCards;