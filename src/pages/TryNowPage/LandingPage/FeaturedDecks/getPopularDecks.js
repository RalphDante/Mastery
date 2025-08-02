import { db } from "../../../../api/firebase";
import { limit, query, collection, where, getDocs, orderBy } from "firebase/firestore";

async function getPopularDecks(limitCount) { // Changed parameter name and removed destructuring
    try {
        const q = query(
            collection(db, 'decks'),
            where('isPublic', '==', true), 
            orderBy('copies', 'desc'),
            limit(3) 
        );

        const querySnapshot = await getDocs(q);

        const topDecks = [];
        querySnapshot.forEach((doc) => {
            topDecks.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return topDecks;

    } catch (error) {
        console.log("Error fetching popular decks: ", error);
        throw error; // Re-throw so the calling component can handle it
    }
}

export default getPopularDecks;