import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../api/firebase.js';
import Home from '../HomePage/Home.jsx';
import TryNowPage from '../TryNowPage/LandingPage/TryNowPage.jsx';

function RootPage({ onCreateDeckClick, onCreateWithAIModalClick }) {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
      {/* Simple navbar skeleton */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-6 bg-gray-700 rounded w-20 animate-pulse"></div>
        </div>
        <div className="h-8 bg-gray-700 rounded w-16 animate-pulse"></div>
      </nav>

      {/* Main content skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-12">
          
          {/* Welcome section skeleton */}
          <section>
            <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="h-24 bg-gray-700 rounded"></div>
                  <div className="h-24 bg-gray-700 rounded"></div>
                  <div className="h-24 bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Overall mastery section skeleton */}
          <section>
            <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-32 bg-gray-700 rounded"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-32 bg-gray-700 rounded"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-32 bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Learning hub section skeleton */}
          <section>
            <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="h-20 bg-gray-700 rounded"></div>
                  <div className="h-20 bg-gray-700 rounded"></div>
                  <div className="h-20 bg-gray-700 rounded"></div>
                  <div className="h-20 bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
    ); // Or your loading component
  }

  if (authUser) {
    return <Home 
      onCreateDeckClick={onCreateDeckClick}
      onCreateWithAIModalClick={onCreateWithAIModalClick}
    />;
  } else {
    return <TryNowPage />;
  }
}

export default RootPage;