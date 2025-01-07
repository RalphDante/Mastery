import React, {useState, useEffect} from 'react';
import {ref, getDatabase, onValue} from 'firebase/database';
import {app} from '../../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from '../CreatePage/CreateFilePage.module.css'




function DisplayFilesFromOtherUsers({uid}){
  
  const navigate = useNavigate();

  const [folder, setFolder] = useState([]);


  const db = getDatabase(app);
  const folderRef = ref(db, `PublicFolder`)

  const handleClick = (folderName,e)=>{
    e.preventDefault();

    navigate(`/publicFlashCards/${encodeURIComponent(`${folderName}`)}`)

    //FILE NAME IS NOT DEFINED
    //PRETTY SURE THE CODE AT THE TOP IS THE KEY TO IT!!! JUST MAKE IT WORK AND WE GUCCI
  }

  const handleCreate = (e)=>{
    e.preventDefault()
    navigate("/createfolder")
  }


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

      return ()=> onSnapshot;
 

      })
  },[uid])
  return (
    
    <div>
        <div className={`${styles.folderListContainer} flex flex-wrap justify-center gap-3`}>
            {folder.map((folderItem, index) => (
                folder.length > 0 ? (
                    <div 
                        key={index} 
                        onClick={(e) => handleClick(folderItem.name, e)} 
                        className={styles.card}
                    >
                        <div className={styles.card2}>
                            {/* Keep the first underscore and extract the folder name */}
                            <a 
                                style={{ textDecoration: 'none' }} 
                                href="#"
                            >
                                {folderItem.name.split('_').slice(0, 2).join('_')}
                            </a>
                        </div>
                    </div>
                ) : (
                    <h4 key={index}>Loading files...</h4>
                )
            ))}
        </div>
    </div>
    


  )
}

export default DisplayFilesFromOtherUsers;