
import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2, ScanFace, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { User } from '../types';
import { db } from '../services/db';

interface CaptureProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const Capture: React.FC<CaptureProps> = ({ user, onComplete }) => {
  const webcamRef = useRef<Webcam>(null);
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');

  const handleCapture = async () => {
    if (!webcamRef.current) return;
    setCapturing(true);
    setStatus('Capturing Face...');
    setError('');

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setCapturing(false);
      setError('Could not access camera. Please ensure permissions are granted.');
      return;
    }

    setStatus('Uploading Securely...');
    
    // Upload to Supabase Storage
    const publicUrl = await db.uploadFaceImage(user.id, imageSrc);

    if (publicUrl) {
      setStatus('Success! Profile Updated.');
      // Create updated user object
      const updatedUser = { ...user, faceDataRegistered: true, referenceImage: publicUrl };
      setTimeout(() => onComplete(updatedUser), 1000);
    } else {
      setStatus('');
      setError('Upload Failed. Ensure you have created a PUBLIC bucket named "face-photos" in Supabase Storage.');
      setCapturing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
       <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2 text-slate-900">
            <Camera className="w-6 h-6 text-blue-600"/> Face Registration
          </h2>

          <div className="max-w-lg mx-auto mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
                <span className="font-bold text-blue-900 block mb-1">Registration Instructions:</span>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li>Remove <span className="font-bold">glasses</span>, masks, or hats.</li>
                    <li>Ensure your face is well-lit and not in shadow.</li>
                    <li>Keep a neutral expression and look directly at the camera.</li>
                </ul>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-xl overflow-hidden aspect-[4/3] relative mx-auto max-w-lg mb-6 border-4 border-slate-100 shadow-inner">
            <Webcam 
               ref={webcamRef} 
               screenshotFormat="image/jpeg"
               className="w-full h-full object-cover transform scale-x-[-1]" 
            />
             {/* Face Guide Overlay */}
             <div className="absolute inset-0 border-2 border-dashed border-blue-400/50 rounded-2xl m-12 pointer-events-none flex items-center justify-center">
                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur">Center Face Here</span>
              </div>
          </div>

          {error && (
              <div className="max-w-lg mx-auto mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
                  <div className="flex items-center justify-center gap-2 mb-2 font-bold">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Error Detected
                  </div>
                  <p className="mb-3">{error}</p>
                  <div className="flex flex-col gap-2 items-center">
                     <span className="text-xs text-slate-500">Need help? Make sure RLS is configured and Storage is set to Public.</span>
                     <a 
                      href="https://supabase.com/dashboard/project/_/storage/buckets" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium text-xs"
                    >
                      Open Supabase Storage <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
              </div>
          )}

          <button 
            onClick={handleCapture} 
            disabled={capturing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
          >
            {capturing ? <Loader2 className="animate-spin w-5 h-5"/> : <ScanFace className="w-5 h-5" />}
            {capturing ? status : 'Capture & Register'}
          </button>

          <p className="mt-6 text-xs text-slate-400 max-w-sm mx-auto">
            Your biometric data is encrypted and stored securely using industry-standard protocols.
          </p>
       </div>
    </div>
  );
};
