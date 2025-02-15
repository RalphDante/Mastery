import React, {useState, useEffect} from 'react';
import {ref, getDatabase, onValue} from 'firebase/database';
import {app, auth} from '../../firebase';
import DisplayFiles from './DisplayFiles'
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CreateFilePage.module.css'





function DisplayFolder({uid}){
  
  const navigate = useNavigate();

  const [folder, setFolder] = useState([]);

  const [authUser, setAuthUser] = useState(null);

//   useEffect(()=>{
//     onAuthStateChanged(auth, (user)=>{
//         if(user){
//             setAuthUser(user)
            
//         } else {
//             setAuthUser(null)
//         }
//     })
// },[])


  const db = getDatabase(app);
  const folderRef = ref(db, `QuizletsFolders/${uid}`)

  const handleClick = (folderName,e)=>{
    e.preventDefault();

    navigate("/displayfiles", {state: {folderName: folderName}})
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
    

        
        <div className={`${styles.folderListContainer} flex justify-center flex-wrap gap-3`}>
        
        
        {folder.map((folderItem, index)=>(
          folder.length>0 ? (
              <div onClick={(e)=>handleClick(folderItem.name,e)} className={styles.card}>
                  <div className={styles.card2}>
                      
                          <a style={{textDecoration: 'none'}} href="#" >{folderItem.name}</a>
                  </div>
              </div>
              
              
          ) : (
            <h4>loading folder...</h4>
          )
        ))}
        <div onClick={(e)=>handleCreate(e)} className={styles.card}>
                <div className={styles.card2}>
                    
                        <a style={{textDecoration: 'none', color:'white', fontSize: '30px'}} href="#" ><i class="fa fa-plus" aria-hidden="true"></i></a>
                </div>
        </div>

      </div>

    


  )
}

export default DisplayFolder;