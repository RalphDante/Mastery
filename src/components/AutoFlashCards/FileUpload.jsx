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
            //sendToAI(text);


        }


        reader.readAsArrayBuffer(file)
    }


    return (
        <div className="w-full h-10">
            
            <button {...getRootProps()} className='btn btn-primary' style={{maxWidth: '8rem'}}>Upload a file</button>
            <input {...getInputProps()} ></input>

        </div>
    )

}

export default FileUpload;