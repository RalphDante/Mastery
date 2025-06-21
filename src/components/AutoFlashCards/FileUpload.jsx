import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function FileUpload(){

    const {getRootProps, getInputProps} = useDropzone({
        multiple: false,
        accept: {
            'application/pdf': ['.pdf']
        },
        onDrop: (acceptedFile) => {
            const fileType = acceptedFile[0].type
            if(fileType === 'application/pdf'){
                readPDF(acceptedFile[0]);
            }
        }
    })

    const readPDF = async (file)=>{
        const reader = new FileReader();
        reader.onload = async (event) => {
            const typedArray = new Uint8Array(event.target.result);
            const pdf = await pdfjsLib.getDocument(typedArray).promise;
            
            let text = '';
            // Fixed: Should be <= not <
            for(let i = 1; i <= pdf.numPages; i++){
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map((item)=>item.str).join(" ")
                text += `${pageText} `;
            }

            console.log('Extracted PDF Text:', text);
            sendToAI(text);
        }

        reader.readAsArrayBuffer(file)
    }

    const sendToAI = async (text) => {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBzq2AFwxW3rAvIR6M81MAMrj9JvaA5eg8', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate 25 flashcards from this text. 
                            Format as JSON: [{"question":"...", "answer":"..."}]
                            
                            Text: ${text}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            const flashCardsText = data.candidates[0].content.parts[0].text;
            
            // Extract JSON from markdown code blocks
            const extractJSON = (text) => {
                // Try to find JSON within ```json ``` blocks
                const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    return jsonMatch[1].trim();
                }
                
                // Try to find JSON within ``` ``` blocks
                const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch) {
                    return codeMatch[1].trim();
                }
                
                // Try to find JSON array directly
                const arrayMatch = text.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    return arrayMatch[0];
                }
                
                // Return original text if no patterns match
                return text.trim();
            };

            const cleanJSON = extractJSON(flashCardsText);
            console.log('Cleaned JSON:', cleanJSON);
            
            const parsedFlashCards = JSON.parse(cleanJSON);
            console.log('Parsed flashcards:', parsedFlashCards);

        } catch(error) {
            console.error("There was an error:", error);
            alert("There was an error generating flashcards");
        }
    };

    return (
        <div className="w-full h-10">
            <button {...getRootProps()} className='btn btn-primary' style={{maxWidth: '8rem'}}>Create with AI</button>
            <input {...getInputProps()} />
        </div>
    )
}

export default FileUpload;