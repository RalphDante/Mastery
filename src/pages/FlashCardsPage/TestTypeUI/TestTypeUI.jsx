import { useState } from "react";
import { FillInTheBlank } from "./FillInTheBlank";
import MultipleChoice from "./MultipleChoice"
import { TrueOrFalse } from "./TrueOrFalse";


export const TestTypeUI = (flashCards) => {


    if(!flashCards){
        return;
    }

    const [currentFlashcard, setCurrentFlashcard] = useState(null);

    const [userAnswer, setUserAnswer] = useState(null);




    const renderTestTypeUI = (card)=>{
    switch(card){
        case "multiple-choice":
            return <MultipleChoice 
                        card={card} 
                        userAnswer={setUserAnswer}
                    
                    />;
        case "fill-in-the-blank":
            return <TrueOrFalse 
                        card={card} 
                        userAnswer={setUserAnswer}
                    />;
        case "fill-in-the-blank":
            return <FillInTheBlank    
                        card={card} 
                        userAnswer={setUserAnswer}
                     />;

        default:
            return console.log("Invalid question type");
    }

    }


    return(
        <>
            <div>
                {renderTestTypeUI()}
            </div>
        </>
    )
}