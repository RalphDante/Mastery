import React, { useState, useEffect, useRef } from 'react';
import styles from './CreateFilePage.module.css'
import {app, auth} from '../../firebase'
import {getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { onAuthStateChanged } from 'firebase/auth';



function DisplayFlashCards({flashCards, setFlashCards, onDelete, autoResize}){

    const [authUser, setAuthUser] = useState(null);

    const [image, setImage] = useState(null);

    const [draggingOverStates, setDraggingOverStates] = useState({});

    const textareaRefs = useRef([]);


    useEffect(()=>{
        onAuthStateChanged(auth, (user)=>{
            if(user){
                setAuthUser(user);
            } else {
                setAuthUser(null);
            }
        })
    },[])


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





    
    const handleDragOver = (e, field, index) => {
        e.preventDefault();
        setDraggingOverStates(prev => ({...prev, [`${index}-${field}`] : true }));

    }
    
    const handleDragLeave = (e, field, index) => {
        e.preventDefault();
        setDraggingOverStates(prev => ({...prev, [`${index}-${field}`] : false }));



    }

    const handleDrop = async (e, field, index)=>{
        e.preventDefault();
        const file = e.dataTransfer.files[0];

        if(file && file.type.startsWith('image/') && authUser){
            try {
                const storage = getStorage(app)

                const imageRef = storageRef(storage, `flashcard-images/${authUser.uid}/${file.name}`)

                await uploadBytes(imageRef, file)

                const downloadURL = await getDownloadURL(imageRef);

                const updatedFlashCards = [...flashCards];
                updatedFlashCards[index][field] = downloadURL;
                setFlashCards(updatedFlashCards)
             
            } catch (error) {
                console.error("Error uploading image: ", error);
                alert("Error uploading file, please try again");
            } 
        } else {
            alert("Drop an image file")
        }
    }

    return(

        <>
        <ul className={styles.list}>

                {flashCards.map((flashCard, index)=>(
                    <li className={styles.listItem} key={index}>
                         
                        <div className={styles.innerDisplayFlashCardsContainer}>
                            <div className={styles.questionContainer}>
                                {flashCard.question.startsWith('https://firebasestorage.googleapis.com') ? (
                                    <img src={flashCard.question} alt="Question" className={styles.flashCardImage} />
                                ) : (
                                    <textarea className={`${styles.flashCardInput} ${draggingOverStates[`${index}-question`]? styles.dragOver : ''}`} value={flashCard.question}
                                    ref={el => textareaRefs.current[index * 2] = el}
                                    onDragOver={(e)=>handleDragOver(e, 'question', index)}
                                    onDrop={(e)=>handleDrop(e, 'question', index)}
                                    onDragLeave={(e)=>handleDragLeave(e, 'question', index)}
                                    onChange={(e)=>{
                                        onEdit(index, 'question', e.target.value)
                                        autoResize(e)
                                    }}
                                    placeholder='Question'
                                    onInput={autoResize}
                                    ></textarea>
                                    )
                                }
                                

                            </div>
                            <div className={styles.answerContainer}>
                                {flashCard.answer.startsWith('https://firebasestorage.googleapis.com') ? (
                                    <img src={flashCard.answer} alt='Answer' className={styles.flashCardImage} />
                                ) : (
                                    <textarea className={`${styles.flashCardInput} ${draggingOverStates[`${index}-answer`] ? styles.dragOver : ''}`} value={flashCard.answer}
                                    ref={el => textareaRefs.current[index * 2 + 1] = el}
                                    onDragOver={(e)=>handleDragOver(e, 'answer', index)}
                                    onDrop={(e)=>handleDrop(e, 'answer', index)}
                                    onDragLeave={(e)=>handleDragLeave(e, 'answer', index)}

                                    onChange={(e)=>{
                                        onEdit(index, 'answer', e.target.value)
                                        autoResize(e)
                                    }}
                                    placeholder='Answer'
                                    onInput={autoResize}

                                    
                                
                                    ></textarea>

                                )}
                                   
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