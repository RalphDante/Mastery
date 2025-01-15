import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

// Use the CDN worker path
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


function FileUpload(){

  

    const {getRootProps, getInputProps} = useDropzone({
        accept: ".pdf,.docx,.pptx",
        multiple: false,
        onDrop: (acceptedFiles) => {
            const fileType = acceptedFiles[0].type;

            if(fileType === 'application/pdf'){
                readPDF(acceptedFiles[0]);
            }
        }
    })

    const readPDF = (file) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
    
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => item.str).join(' ');
            text += `${pageText} `;
          }
    
          console.log('Extracted PDF Text:', text);
          sendToAI(text);
        };
    
        reader.readAsArrayBuffer(file);
      };

      const sendToAI = (text) => {
        console.log("sending to ai")
      }

    return(
        <div className="w-full h-10 ">
            
    
            <button {...getRootProps()} className='btn btn-primary' style={{maxWidth: '8rem'}}>Upload a file</button>
            <input {...getInputProps()} ></input>



           
        </div>
        
    )
}

export default FileUpload;