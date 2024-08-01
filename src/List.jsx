import React, {useState, useEffect} from 'react'
function List(){
    
    const [counter, setCounter] = useState(0);

    useEffect(() => {
        console.log(counter)
    }, [counter]);

    return(
        <>
        <h1>Count: {counter}</h1>
        <button onClick={() => {setCounter(counter + 1)}}>Add 1</button>
        <button onClick={() => {setCounter(counter - 1)}}>Minus 1</button>
        </>
    );


};

export default List