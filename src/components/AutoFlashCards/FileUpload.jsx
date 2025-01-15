import React from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function FileUpload() {
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf') {
        readPDF(file);
      }
    }
  });

  const readPDF = async (file) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
    
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => item.str).join(' ');
            text += `${pageText}\n\n`;
          }
    
          console.log('Extracted PDF Text:', text);
          sendToAI(text);
        } catch (error) {
          console.error('Error processing PDF:', error);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
    
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error in readPDF:', error);
    }
  };

  const sendToAI = (text) => {
    console.log("Sending to AI:", text.substring(0, 100) + "...");
    // Implement your AI sending logic here
  };

  return (
    <div className="w-full p-4">
      <div 
        {...getRootProps()} 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors"
      >
        <input {...getInputProps()} />
        <p className="text-center text-gray-600">
          Drag & drop a PDF file here, or click to select one
        </p>
      </div>
    </div>
  );
}

export default FileUpload;