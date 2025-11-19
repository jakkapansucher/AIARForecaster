import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (!isLoading) fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 group
        ${isLoading 
          ? 'opacity-60 cursor-wait border-gray-200 bg-gray-50' 
          : 'cursor-pointer border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50 bg-white shadow-sm hover:shadow-md'
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".csv"
        className="hidden"
        disabled={isLoading}
      />
      
      <div className="flex flex-col items-center justify-center gap-5">
        <div className={`
          p-5 rounded-full transition-colors duration-300
          ${isLoading ? 'bg-gray-100' : 'bg-indigo-50 group-hover:bg-indigo-100'}
        `}>
          {isLoading ? (
             <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          ) : (
             <UploadCloud className="w-10 h-10 text-indigo-600" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-800">
            {isLoading ? "กำลังประมวลผล..." : "อัปโหลดไฟล์ CSV"}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm">
            ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
            <br/>
            <span className="text-xs text-slate-400 mt-1 inline-block">
               (Required: billPeriod, amount, accountclass)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};