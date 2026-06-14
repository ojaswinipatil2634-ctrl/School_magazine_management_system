import React, { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db, publishDb, storage, handleFirestoreError, OperationType, auth } from "../firebase";
import { Upload, FileText, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';

const UploadForm: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    schoolId: "",
    schoolName: "",
    region: "National",
    year: new Date().getFullYear().toString()
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "pdf" && file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Please select a valid PDF file." });
      e.target.value = "";
      return;
    }

    if (type === "image" && !file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select a valid image file." });
      e.target.value = "";
      return;
    }

    if (type === "pdf") setPdfFile(file);
    else setCoverImage(file);
    setMessage(null);
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    let fileToUpload = file;
    if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
      try {
        const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = (height / width) * maxDim;
                width = maxDim;
              } else {
                width = (width / height) * maxDim;
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas toBlob failed'));
            }, 'image/jpeg', 0.7);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
        fileToUpload = new File([optimizedBlob], file.name, { type: 'image/jpeg' });
      } catch (err) {
        console.warn("Image optimization failed, uploading original:", err);
      }
    }

    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress((prev) => (prev + p) / 2);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !coverImage) {
      setMessage({ type: "error", text: "PDF and Cover Image are required." });
      return;
    }

    if (!metadata.schoolId || !metadata.schoolName) {
      setMessage({ type: "error", text: "School ID and School Name are required." });
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage(null);

    try {
      const timestamp = Date.now();
      const derivedTitle = pdfFile.name.replace(/\.[^/.]+$/, "");
      const fileName = derivedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      const pdfURL = await uploadFile(pdfFile, `magazines/01/${timestamp}_${fileName}.pdf`);
      const coverImageURL = await uploadFile(coverImage, `magazines/01/${timestamp}_${fileName}_cover.jpg`);

      const path = "magazines";
      const magazineId = uuidv4();
      const magazineData = {
        id: magazineId,
        title: derivedTitle,
        description: "Uploaded Magazine",
        pdfUrl: pdfURL,
        thumbnail: coverImageURL,
        schoolId: metadata.schoolId,
        schoolName: metadata.schoolName,
        region: metadata.region,
        year: parseInt(metadata.year),
        userId: auth.currentUser?.uid || 'anonymous',
        published: true,
        magazineType: 'uploaded',
        source: 'uploaded',
        updatedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        likes: 0,
        views: 0
      };

      try {
        // Save to publishDb for public access
        await setDoc(doc(publishDb, path, magazineId), magazineData);
        // Save to temper_magazine so it appears in the user's dashboard as requested
        await setDoc(doc(db, 'temper_magazine', magazineId), magazineData);
        // Also save to 'magazines' collection in main db for the upload action
        await setDoc(doc(db, 'magazines', magazineId), magazineData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }

      setMessage({ type: "success", text: "Magazine uploaded successfully!" });
      setPdfFile(null);
      setCoverImage(null);
      setMetadata({
        schoolId: "",
        schoolName: "",
        region: "National",
        year: new Date().getFullYear().toString()
      });
      // Reset file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      fileInputs.forEach(input => input.value = "");
    } catch (error: any) {
      console.error("Upload error:", error);
      setMessage({ type: "error", text: "Failed to upload magazine. " + error.message });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[32px] border-2 border-zinc-100 shadow-xl shadow-zinc-100/50 mb-8" id="upload-form-container">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Upload Magazine</h2>
          <p className="text-zinc-500 text-sm font-medium">Share your pre-designed PDF with the community</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Magazine PDF
              </div>
            </label>
            <div className="relative group">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, "pdf")}
                className="w-full text-sm text-zinc-500 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer bg-zinc-50 p-2 rounded-3xl border-2 border-dashed border-zinc-200 group-hover:border-indigo-200"
                required
              />
            </div>
            {pdfFile && (
              <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                Selected: {pdfFile.name}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Cover Image
              </div>
            </label>
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "image")}
                className="w-full text-sm text-zinc-500 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer bg-zinc-50 p-2 rounded-3xl border-2 border-dashed border-zinc-200 group-hover:border-indigo-200"
                required
              />
            </div>
            {coverImage && (
              <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                Selected: {coverImage.name}
              </p>
            )}
          </div>
        </div>

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">
              School ID
            </label>
            <input
              type="text"
              value={metadata.schoolId}
              onChange={(e) => setMetadata({ ...metadata, schoolId: e.target.value })}
              placeholder="e.g. SCH-001"
              className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-indigo-600 outline-none transition-all text-sm font-bold"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">
              School Name
            </label>
            <input
              type="text"
              value={metadata.schoolName}
              onChange={(e) => setMetadata({ ...metadata, schoolName: e.target.value })}
              placeholder="e.g. Green Valley High"
              className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-indigo-600 outline-none transition-all text-sm font-bold"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">
              Region
            </label>
            <select
              value={metadata.region}
              onChange={(e) => setMetadata({ ...metadata, region: e.target.value })}
              className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-indigo-600 outline-none transition-all text-sm font-bold"
            >
              <option value="National">National</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="International">International</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">
              Year
            </label>
            <input
              type="number"
              value={metadata.year}
              onChange={(e) => setMetadata({ ...metadata, year: e.target.value })}
              className="w-full px-6 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-indigo-600 outline-none transition-all text-sm font-bold"
              required
            />
          </div>
        </div>

        {uploading && (
          <div className="space-y-3">
            <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="bg-indigo-600 h-full shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              />
            </div>
            <div className="flex justify-between items-center px-1">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Uploading Assets</p>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{Math.round(progress)}%</p>
            </div>
          </div>
        )}

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl flex items-center gap-3 ${
              message.type === "success" 
                ? "bg-green-50 text-green-700 border border-green-100" 
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              message.type === "success" ? "bg-white text-green-600" : "bg-white text-red-600"
            }`}>
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <p className="text-xs font-bold uppercase tracking-tight leading-tight">{message.text}</p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-5 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-white transition-all flex items-center justify-center gap-3 shadow-xl ${
            uploading 
              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none" 
              : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 hover:shadow-indigo-200 active:scale-[0.98]"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Magazine
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;
