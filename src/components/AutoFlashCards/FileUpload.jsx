import { useDropzone } from "react-dropzone";

function FileUpload(){

    const handleDrop = (files) => {
        files.forEach((file)=>{
            console.log(file.name);
        })
    }


    const {getRootProps, getInputProps} = useDropzone({
        accept: ".pdf,.docx,.pptx",
        onDrop: (acceptedFiles) => {
            handleDrop(acceptedFiles);
        }
    })

    return(
        <div {...getRootProps()} className="w-full h-10 bg-white">
            
            <input {...getInputProps()} >
            </input>  
           
        </div>
        
    )
}

export default FileUpload;