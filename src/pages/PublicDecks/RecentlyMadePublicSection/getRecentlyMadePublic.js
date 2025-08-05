import { collection, query, where } from "firebase/firestore";
import { db } from "../../../api/firebase";

async function getRecentlyPublishedDecks(){
    try{
        const q = query(
            collection(db, 'decks'),
            where()// fucntion to find most recently published
        )
    } catch(error) {

    }

}

export default getRecentlyPublishedDecks;