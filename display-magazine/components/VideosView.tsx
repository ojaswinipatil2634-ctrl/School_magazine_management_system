
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  speaker: string;
}

const VideosView: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'videos'));
        const firestoreVideos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Video[];
        setVideos(firestoreVideos);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="space-y-6 pb-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-montserrat">Workshops</h2>
        <div className="flex space-x-2">
           <button className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
           </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="aspect-video bg-gray-200 dark:bg-slate-800 rounded-[32px]"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {videos.map(video => (
            <div key={video.id} className="group cursor-pointer">
              <div className="relative aspect-video rounded-[32px] overflow-hidden shadow-xl mb-4">
                <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={video.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-center justify-center">
                   <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-2xl">
                      <svg className="w-8 h-8 text-white fill-current translate-x-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                   </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white tracking-widest">
                  {video.duration}
                </div>
              </div>
              <div className="px-2">
                <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">{video.title}</h3>
                <div className="flex items-center space-x-2 mt-1">
                   <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                   <span className="text-xs font-bold text-gray-500">{video.speaker}</span>
                   <span className="text-[10px] text-gray-300">•</span>
                   <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500">Expert Session</span>
                </div>
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div className="text-center py-20 opacity-50">
              <p className="text-5xl mb-4">📹</p>
              <p className="text-sm font-bold">No workshops found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideosView;
