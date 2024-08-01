import { useState } from "react";

function CreateFlashCards({onAddFlashCard}){

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

    }

    return(
        <div>
            <form onSubmit={addAsFlashCard}>
                


                <input type="text" value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder = "question"
                ></input>
                <input type="text" value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder = "answer"
                ></input>


                <button type="submit">Add as Flash Card</button>
            </form>
        </div>
    )

}

export default CreateFlashCards;