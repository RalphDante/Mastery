import { createPortal } from "react-dom";

function QuickTutorial() {

    return createPortal(
        <>
            <div>
                <h1>
                    Welcome To Mastery!

                </h1>

            </div>
          
        </>
    , body)
}

export default QuickTutorial;