import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './CreateFilePage.module.css'
import {app, auth} from '../../api/firebase'
import { onAuthStateChanged } from 'firebase/auth';
import { useDropzone } from "react-dropzone";
import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';

function DisplayFlashCards({flashCards, setFlashCards, onDelete, autoResize}){

    const [authUser, setAuthUser] = useState(null);
    const [draggingOverStates, setDraggingOverStates] = useState({});
    const [uploadingStates, setUploadingStates] = useState({});
    const [imageFields, setImageFields] = useState({}); // Track which fields contain images
    const textareaRefs = useRef([])

    // Initialize Cloudinary
    const cld = new Cloudinary({ cloud: { cloudName: 'dph28fehb' } });

    const ImageUploader = ({ onImageUpload, index, field }) => {
        const { getRootProps, getInputProps } = useDropzone({
            onDrop: (acceptedFiles) => {
                onImageUpload(acceptedFiles[0], field, index);
            }
        });
    
        return (
            <div className='bg-blend-darken'> 
                <i {...getRootProps()} className="fa-sharp fa-regular fa-image text-2xl cursor-pointer hover:text-green-500"></i>
                <input {...getInputProps()} />
            </div>
        );
    };

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

    // Updated function to upload to Cloudinary
    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'flashcard_images_preset'); 
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/dph28fehb/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Cloudinary error:', errorData);
                throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const data = await response.json();
            return data.public_id; // Return the public_id instead of URL
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    };

    const handleImageClick = async (file, field, index) => {
        if(file && file.type.startsWith('image/') && authUser){
            setUploadingStates(prev => ({...prev, [`${index}-${field}`]: true}));
            
            try {
                const publicId = await uploadToCloudinary(file);
                
                const updatedFlashCards = [...flashCards];
                updatedFlashCards[index][field] = publicId; // Store public_id instead of URL
                
                // Update the corresponding type field
                if (field === 'question') {
                    updatedFlashCards[index].question_type = 'image';
                } else if (field === 'answer') {
                    updatedFlashCards[index].answer_type = 'image';
                }
                
                setFlashCards(updatedFlashCards);
                
                // Mark this field as containing an image
                setImageFields(prev => ({...prev, [`${index}-${field}`]: true}));
                
            } catch (error) {
                console.error("Error uploading image: ", error);
                alert("Error uploading file, please try again");
            } finally {
                setUploadingStates(prev => ({...prev, [`${index}-${field}`]: false}));
            }
        } else {
            alert("Drop an image file")
        }
    }


    const handleDrop = async (e, field, index) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];

        if(file && file.type.startsWith('image/') && authUser){
            setUploadingStates(prev => ({...prev, [`${index}-${field}`]: true}));
            
            try {
                const publicId = await uploadToCloudinary(file);
                
                const updatedFlashCards = [...flashCards];
                updatedFlashCards[index][field] = publicId; // Store public_id instead of URL
                
                // Update the corresponding type field
                if (field === 'question') {
                    updatedFlashCards[index].question_type = 'image';
                } else if (field === 'answer') {
                    updatedFlashCards[index].answer_type = 'image';
                }
                
                setFlashCards(updatedFlashCards);
                
                // Mark this field as containing an image
                setImageFields(prev => ({...prev, [`${index}-${field}`]: true}));
                
            } catch (error) {
                console.error("Error uploading image: ", error);
                alert("Error uploading file, please try again");
            } finally {
                setUploadingStates(prev => ({...prev, [`${index}-${field}`]: false}));
            }
        } else {
            alert("Drop an image file")
        }
    }


    // Helper function to check if field contains a Cloudinary image
    const isCloudinaryImage = (fieldValue, field, index) => {
        const flashCard = flashCards[index];
        if (field === 'question') {
            return flashCard.question_type === 'image' && fieldValue;
        } else if (field === 'answer') {
            return flashCard.answer_type === 'image' && fieldValue;
        }
        return false;
    };
    // Helper function to create optimized Cloudinary image
    const createOptimizedImage = (publicId) => {
        return cld
            .image(publicId)
            .format('auto')
            .quality('auto');
            // Removed the .resize() to show original size
    };

    return(
        <>
        <ul className={`${styles.list}`}>
            {flashCards.map((flashCard, index)=>(
                <li className={styles.listItem} key={index}>
                    <div className={`${styles.innerDisplayFlashCardsContainer} md:flex md:flex-wrap`}>
                        <div className={`${styles.questionContainer}  md:w-1/2 w-full`}>
                            {isCloudinaryImage(flashCard.question, 'question', index) ? (
                                <div className="relative">
                                    <AdvancedImage 
                                        cldImg={createOptimizedImage(flashCard.question)} 
                                        className={styles.flashCardImage}
                                    />
                                    <button 
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        onClick={() => {
                                            const updatedFlashCards = [...flashCards];
                                            updatedFlashCards[index].question = '';
                                            updatedFlashCards[index].question_type = 'text'; // Reset to text
                                            setFlashCards(updatedFlashCards);
                                            setImageFields(prev => ({...prev, [`${index}-question`]: false}));
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <textarea 
                                        className={`${styles.flashCardInput} bg-gray-800 shadow-lg border border-gray-700 ${draggingOverStates[`${index}-question`]? styles.dragOver : ''}`} 
                                        value={flashCard.question}
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
                                        disabled={uploadingStates[`${index}-question`]}
                                    />
                                    {uploadingStates[`${index}-question`] ? (
                                        <div className="text-sm text-gray-500">Uploading...</div>
                                    ) : (
                                        <ImageUploader 
                                            onImageUpload={handleImageClick}
                                            index={index}
                                            field="question"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                        
                        <div className={`${styles.answerContainer} md:w-1/2 w-full`}>
                            {isCloudinaryImage(flashCard.answer, 'answer', index) ? (
                                <div className="relative">
                                    <AdvancedImage 
                                        cldImg={createOptimizedImage(flashCard.answer)} 
                                        className={styles.flashCardImage}
                                    />
                                    <button 
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        onClick={() => {
                                            const updatedFlashCards = [...flashCards];
                                            updatedFlashCards[index].answer = '';
                                            updatedFlashCards[index].answer_type = 'text'; // Reset to text
                                            setFlashCards(updatedFlashCards);
                                            setImageFields(prev => ({...prev, [`${index}-answer`]: false}));
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <textarea 
                                        className={`${styles.flashCardInput} bg-gray-800 shadow-lg border border-gray-700 ${draggingOverStates[`${index}-answer`] ? styles.dragOver : ''}`} 
                                        value={flashCard.answer}
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
                                        disabled={uploadingStates[`${index}-answer`]}
                                    />
                                    {uploadingStates[`${index}-answer`] ? (
                                        <div className="text-sm text-gray-500">Uploading...</div>
                                    ) : (
                                        <ImageUploader 
                                            onImageUpload={handleImageClick}
                                            index={index}
                                            field="answer"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className=''>
                        <button className={`${styles.btn} ml-auto`} onClick={()=>onDelete(index)}>Delete</button>
                    </div>
                </li>
            ))}
        </ul>
        </>
    )
}

export default DisplayFlashCards;