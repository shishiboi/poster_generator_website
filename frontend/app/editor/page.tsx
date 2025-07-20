"use client";

import { useEffect, useState } from "react";
import PosterCanvas from "../components/poster-canvas";

// Add type definition for poster data
interface PosterData {
  posterUrl: string;
  posterFilename: string;
  originalPrompt: string;
  enhancedPrompt: string;
  qrCodes?: Array<{
    dataURL: string;
    text: string;
    type: string;
    formattedData: string;
  }>;
}

export default function EditorPage() {
  const [posterData, setPosterData] = useState<PosterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem("posterData");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData) as PosterData;
        setPosterData(parsedData);
      } catch (error) {
        console.error("Failed to parse poster data:", error);
      }
    }
    setLoading(false);
  }, []);

  const handleBackToGenerator = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  if (!posterData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No poster to edit</h2>
          <p className="text-gray-600 mb-4">Please generate a poster first</p>
          <button
            onClick={handleBackToGenerator}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            style={{ color: "white" }}
          >
            ← Back to Generator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBackToGenerator}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            style={{ color: "white" }}
          >
            ← Back to Generator
          </button>
          <h1 className="text-3xl font-bold text-blue-700">Poster Editor</h1>
          <div></div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-2">Original Prompt:</h3>
          <p className="text-gray-700 text-sm mb-3">
            {posterData.originalPrompt}
          </p>
          <h3 className="font-semibold mb-2">Enhanced Prompt:</h3>
          <p className="text-gray-600 text-xs">{posterData.enhancedPrompt}</p>

          {/* Show QR codes info */}
          {posterData.qrCodes && posterData.qrCodes.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">QR Codes Ready:</h3>
              <div className="flex gap-2 flex-wrap">
                {posterData.qrCodes.map((qr, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                  >
                    {qr.type}: {qr.text.substring(0, 20)}...
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 QR codes will automatically appear on the canvas below
              </p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6">
            Customize Your Poster
          </h2>
          <PosterCanvas
            posterUrl={posterData.posterUrl}
            qrCodes={posterData.qrCodes || []}
          />
        </div>
      </div>
    </div>
  );
}
