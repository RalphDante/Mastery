import React, {useState, useEffect} from 'react';
import {ref, getDatabase, onValue} from 'firebase/database';
import {app} from '../../firebase';
import DisplayFiles from './DisplayFiles'
import { useNavigate, useLocation } from 'react-router-dom';




function DisplayFolder({uid}){
  
  const navigate = useNavigate();

  const [folder, setFolder] = useState([]);


  const db = getDatabase(app);
  const folderRef = ref(db, `QuizletsFolders/${uid}`)




  useEffect(()=>{
      const onSnapshot = onValue(folderRef, (snapshot)=>{
        const data = snapshot.val()
  
        if(data){
          
          const firstInnerKey = Object.keys(data).map(key =>({
            name: key,
            ...data[key]
          }));
          setFolder(firstInnerKey)
          ;

        }

  


      })
  },[uid])
  return (
    <div>
      <ul >
      {folder.map((folderItem, index)=>(
        folder.length>0 ? (
          <li>
            <a href="#" onClick={(e)=>{
              e.preventDefault();

              navigate("/displayfiles", {state: {folderName: folderItem.name}})
            }

            }><p>{folderItem.name}</p></a>
            
            <button>Delete</button>
          </li>
        ) : (
          <p>no folder</p>
        )
      ))

      }

      </ul>
    </div>


  )
}

export default DisplayFolder;