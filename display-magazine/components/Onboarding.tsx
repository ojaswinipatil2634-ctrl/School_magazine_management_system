
import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const screens = [
    {
      title: "Discover Creativity Across India",
      desc: "Connect with the brightest minds and most artistic schools from every corner of the nation.",
      img: "https://picsum.photos/seed/discover/600/600",
      color: "bg-blue-600"
    },
    {
      title: "Explore School Magazines & Stories",
      desc: "Dive into a digital library of student publications, each telling a unique story of excellence.",
      img: "https://picsum.photos/seed/explore/600/600",
      color: "bg-indigo-600"
    },
    {
      title: "Learn from Leaders & Innovators",
      desc: "Watch insightful content and master the art of creative expression through guided sessions.",
      img: "https://picsum.photos/seed/learn/600/600",
      color: "bg-slate-800"
    }
  ];

  const handleNext = () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col overflow-hidden animate-fadeIn">
      <div className="relative h-[60%] flex items-center justify-center p-12">
        <div className={`absolute inset-0 opacity-40 blur-3xl rounded-full ${screens[step].color} transform -translate-y-1/2`}></div>
        <img 
          src={screens[step].img} 
          alt="Illustration" 
          className="relative z-10 w-full max-w-sm rounded-3xl shadow-2xl animate-scaleIn object-cover h-[350px]"
          key={step}
        />
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-t-[40px] p-10 flex flex-col items-center justify-between text-center space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center space-x-2">
            {screens.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200 dark:bg-slate-700'}`}></div>
            ))}
          </div>
          <h2 className="text-2xl font-bold font-montserrat leading-tight text-slate-900 dark:text-white" key={`title-${step}`}>
            {screens[step].title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm px-4">
            {screens[step].desc}
          </p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={handleNext}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
          >
            {step === screens.length - 1 ? 'Get Started' : 'Next'}
          </button>
          <button 
            onClick={onComplete}
            className="text-gray-400 text-xs font-semibold uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-200"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
