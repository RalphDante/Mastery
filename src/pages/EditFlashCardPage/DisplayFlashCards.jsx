import React, { useState, useEffect, useRef } from 'react';
import styles from './CreateFilePage.module.css'
import {app, auth} from '../../api/firebase'
import {getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { onAuthStateChanged } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useLocation } from 'react-router-dom';
import { useDropzone } from "react-dropzone";




function DisplayFlashCards({flashCards, setFlashCards, onDelete, autoResize, fileNameDirectory}){

    const [authUser, setAuthUser] = useState(null);

    const [draggingOverStates, setDraggingOverStates] = useState({});

    const textareaRefs = useRef([]);


    const location = useLocation();

    const ImageUploader = ({onImageUpload, index, field}) => {
        const {getRootProps, getInputProps} = useDropzone({
            onDrop: (acceptedFiles) => {
                onImageUpload(acceptedFiles[0], field, index);
            }
        }) 
        return (

            <div className='bg-blend-darken'> 
                <i  {...getRootProps()} className="fa-sharp fa-regular fa-image text-2xl cursor-pointer hover:text-green-500"></i>
                <input {...getInputProps()} />
            </div>
   
        )
    }

    const handleImageClick = async (file, field, index)=>{

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



    useEffect(()=>{
        onAuthStateChanged(auth, (user)=>{
            if(user){
                setAuthUser(user);
            } else {
                setAuthUser(null);
            }
        })

    },[])




    useEffect(() => {
        textareaRefs.current.forEach(textarea => {
            if (textarea) {
                autoResize({ target: textarea });
            }
        });
    }, [flashCards, autoResize]);

    

    const onEdit = (index, fieldType, value)=>{
        const editedFlashCard = flashCards.map((flashCard, i)=>{
            return i === index? {...flashCard, [fieldType]: value} : flashCard
        }
        )  
        setFlashCards(editedFlashCard);
    }



    
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

    useEffect(()=>{
        if(authUser){
            const db = getDatabase(app);
            const folderRef = ref(db, `QuizletsFolders/${authUser.uid}/${fileNameDirectory}`)



            const unsubscribe = onValue(folderRef, (snapshot)=>{
                const data = snapshot.val();
            

                if(data){
                    const descriptionUID = Object.keys(data);
                 
                    const flashCardsRef = ref(db, `QuizletsFolders/${authUser.uid}/${fileNameDirectory}/${descriptionUID}/Flashcards`)
                    const unsubscribe = onValue(flashCardsRef, (snapshot)=>{
                        const data = snapshot.val();
                        setFlashCards(data);
                        console.log(data)
                    })

                }
            })

        }
    },[authUser])


    return(

        <>
        {/* <h1>{fileNameDirectory ? fileNameDirectory : "no folder"}</h1> */}
        <ul className={styles.list}>
            
            {flashCards ? (
               flashCards.map((flashCard, index)=>(
                <li className={styles.listItem} key={index}>
                     
                    <div className={`${styles.innerDisplayFlashCardsContainer} md:flex md:flex-wrap`}>
                        <div className={`${styles.questionContainer} md:w-1/2 w-full `}>
                            {flashCard.question.startsWith('https://firebasestorage.googleapis.com') ? (
                                <img src={flashCard.question} alt="Question" className={styles.flashCardImage} />
                            ) : (
                                <>
                                <textarea className={`${styles.flashCardInput} ${draggingOverStates[`${index}-question`]? styles.dragOver : ''} `} value={flashCard.question}
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
                                <ImageUploader 
                                    onImageUpload={handleImageClick}
                                    index={index}
                                    field="question"
                                />
                                </>
                                
                                )
                            }
                            

                        </div>
                        <div className={`${styles.answerContainer} md:w-1/2 w-full`}>
                            {flashCard.answer.startsWith('https://firebasestorage.googleapis.com') ? (
                                <img src={flashCard.answer} alt='Answer' className={styles.flashCardImage} />
                            ) : (
                                <>
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
                                <ImageUploader 
                                    onImageUpload={handleImageClick}
                                    index={index}
                                    field="answer"
                                />

                                </>
                                
                               

                            )}
                            
                        </div>

                            
                    </div>
                    <div>
                        <button className={`${styles.btn} ml-auto`} onClick={()=>onDelete(index)}>Delete</button>

                    </div>


                
                </li>

            ))
            ): "Loading flash cards"}
                
            
        </ul>
        
        </>
    )


}

export default DisplayFlashCards;