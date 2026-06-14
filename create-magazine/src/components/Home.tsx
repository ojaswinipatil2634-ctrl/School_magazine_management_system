import React from 'react';
import { motion } from 'motion/react';
import { Layout, Plus, BookOpen, Sparkles, Upload } from 'lucide-react';

interface HomeProps {
  user: any;
  onDesignMagazine: () => void;
  onCreateInteractive: () => void;
  onUploadPDF: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onDesignMagazine, onCreateInteractive, onUploadPDF }) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl w-full space-y-8"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4" />
            Welcome to CreativeIndia
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter leading-none">
            Hello, <span className="text-indigo-600">{user?.displayName?.split(' ')[0] || 'Creator'}</span>!
          </h1>
          <p className="text-xl text-zinc-500 font-medium max-w-2xl mx-auto">
            Ready to bring your stories to life? Choose your creation path below and start designing your next masterpiece.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pt-6">
          {/* Static Magazine Option */}
          <motion.button
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDesignMagazine}
            className="group relative bg-white border-2 border-zinc-100 p-10 rounded-[40px] text-left hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500"
          >
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:rotate-6 transition-transform">
              <Layout className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight">Static Magazine Design</h3>
            <p className="text-zinc-500 font-medium leading-relaxed mb-6">
              Perfect for professional layouts, print-ready designs, and visual storytelling with advanced canvas tools.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
              design static magazine <Plus className="w-4 h-4" />
            </div>
          </motion.button>

          {/* Interactive Magazine Option */}
          <motion.button
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateInteractive}
            className="group relative bg-white border-2 border-zinc-100 p-10 rounded-[40px] text-left hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] rounded-2xl flex items-center justify-center text-white mb-8 group-hover:-rotate-6 transition-transform">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight">Interactive Magazine</h3>
            <p className="text-zinc-500 font-medium leading-relaxed mb-6">
              Create engaging digital experiences with MCQ, Fill in the blanks, True or False, and Guess the word elements.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
              Create Interactive Magazine <Plus className="w-4 h-4" />
            </div>
          </motion.button>

          {/* Upload PDF Option */}
          <motion.button
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onUploadPDF}
            className="group relative bg-white border-2 border-zinc-100 p-10 rounded-[40px] text-left hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] rounded-2xl flex items-center justify-center text-white mb-8 group-hover:rotate-6 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight">Upload PDF Magazine</h3>
            <p className="text-zinc-500 font-medium leading-relaxed mb-6">
              Already have a design? Upload your PDF magazine directly to share it with the CreativeIndia community.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
              Upload PDF Magazine <Upload className="w-4 h-4" />
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
