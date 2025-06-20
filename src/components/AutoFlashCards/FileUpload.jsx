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
            for(let i = 1; i < pdf.numPages; i++){
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
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyBzq2AFwxW3rAvIR6M81MAMrj9JvaA5eg8', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
            contents: [{
                parts: [{
                text: `Generate 5 flashcards from this text. 
                Format as JSON: [{"question":"...", "answer":"..."}]
                
                Text: ${text}`
                }]
            }]
            })
        });

            const data = await response.json();
            const flashCards = data.candidates[0].content.parts[0].text;
            const parsedFlashCards = JSON.parse(flashCards);
            console.log(parsedFlashCards);

        } catch(error) {
            console.log(alert("There was an error"), error)
        }
        
};


return (
        <div className="w-full h-10">
            
            <button {...getRootProps()} className='btn btn-primary' style={{maxWidth: '8rem'}}>Upload a file</button>
            <input {...getInputProps()} ></input>

        </div>
    )

}

export default FileUpload;