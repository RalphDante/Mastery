import React, { useState } from 'react';
import styles from './CreateFilePage.module.css'


function DisplayFlashCards({flashCards, setFlashCards, onDelete}){

    const onEdit = (index, fieldType, value)=>{
        const editedFlashCard = flashCards.map((flashCard, i)=>{
            return i === index? {...flashCard, [fieldType]: value} : flashCard
        }
        )  
        setFlashCards(editedFlashCard);
    }




    
    return(

        <>
        <ul className={styles.list}>

                {flashCards.map((flashCard, index)=>(
                    <li className={styles.listItem}key={index}>
                         
                        <div className={styles.innerDisplayFlashCardsContainer}>
                            <div className={styles.questionContainer}>
                                <input className={styles.flashCardInput} value={flashCard.question}
                                    onChange={(e)=>onEdit(index, 'question', e.target.value)}
                                    placeholder='Question'
                                    ></input>
                                    <button onClick={()=>onDelete(index)}>Delete</button>

                            </div>
                            <div className={styles.answerContainer}>
                                <input className={styles.flashCardInput}value={flashCard.answer}
                                    onChange={(e)=>onEdit(index, 'answer', e.target.value)}
                                    placeholder='Answer'
                                
                                ></input>

                            </div>
                                
                        </div>

                    
                    </li>
    
                ))}
            
        </ul>
        
        </>
    )


}

export default DisplayFlashCards;