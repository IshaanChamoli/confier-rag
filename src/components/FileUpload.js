'use client';

export default function FileUpload({ onFileUpload }) {
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.txt')) {
      alert('Please select a valid .txt file');
      return;
    }

    const text = await file.text();
    onFileUpload({ name: file.name, content: text });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="mb-2 text-sm text-gray-500">Click to upload or drag and drop</p>
      <p className="text-xs text-gray-500">TXT files only</p>
      <input
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
} 