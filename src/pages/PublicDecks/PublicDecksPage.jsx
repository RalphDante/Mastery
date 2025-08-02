import MostCopiesSection from './MostCopiesSection/MostCopiesSection.jsx'
import RecentlyMadePublicSection from './RecentlyMadePublicSection/RecentlyMadePublicSection.jsx';

function PublicDecksPage(){

    return(
        <>
        <div className={`min-h-screen flex flex-col bg-slate-900 text-slate-100`}>
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <MostCopiesSection />
                {/* <RecentlyMadePublicSection /> */}
            </main>    
        </div>
        
        </>
    )
}

export default PublicDecksPage; 