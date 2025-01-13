import { useDropzone } from "react-dropzone";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

function FileUpload(){

  

    const {getRootProps, getInputProps} = useDropzone({
        accept: ".pdf,.docx,.pptx",
        multiple: false,
        onDrop: (acceptedFiles) => {
            const fileType = acceptedFiles[0].type;

            if(fileType === 'application/pdf'){
                readPDF(acceptedFiles);
            }
        }
    })

    const readPDF = (file) => {
        const doSumshit = file;
        console.log(doSumshit[0].type, "test")
    }

    return(
        <div className="w-full h-10 ">
            
    
            <button {...getRootProps()} className='btn btn-primary' style={{maxWidth: '8rem'}}>Upload a file</button>
            <input {...getInputProps()} ></input>



           
        </div>
        
    )
}

export default FileUpload;