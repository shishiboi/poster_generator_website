"use client";

import { useState } from "react";
import QRGenerator from "./components/qr-generator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// Type definitions
interface QRCode {
  dataURL: string;
  text: string;
  type: string;
  formattedData: string;
}

interface PosterData {
  posterUrl: string;
  posterFilename: string;
  originalPrompt: string;
  enhancedPrompt: string;
  qrCodes: QRCode[];
}

export default function Home() {
  const { user, signOut } = useAuth();
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [posterFilename, setPosterFilename] = useState<string>("poster.png");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showQRGenerator, setShowQRGenerator] = useState<boolean>(false);
  const [generatedQRs, setGeneratedQRs] = useState<QRCode[]>([]);

  // Use environment variable for API URL
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const handleEnhance = async () => {
    if (!originalPrompt.trim()) return;

    setIsEnhancing(true);
    setError("");
    setEnhancedPrompt("");

    try {
      const response = await fetch(`${API_BASE_URL}/enhance_prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: originalPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEnhancedPrompt(data.enhanced_prompt);
    } catch (err) {
      console.error("Enhancement error:", err);
      setError(
        "Failed to enhance prompt. Please check your connection and try again."
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!enhancedPrompt.trim()) return;

    setIsGenerating(true);
    setError("");
    setPosterUrl(null);
    setPosterDataUrl(null);

    try {
      const response = await fetch(`${API_BASE_URL}/generate_poster`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle the image response
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setPosterUrl(imageUrl);

      // Convert blob to data URL for storage
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setPosterDataUrl(result);
        }
      };
      reader.readAsDataURL(blob);

      // Generate filename
      const filename = `poster_${Date.now()}.png`;
      setPosterFilename(filename);
    } catch (err) {
      console.error("Generation error:", err);
      setError(
        "Failed to generate poster. Please check your connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQRGenerated = (qrData: QRCode) => {
    setGeneratedQRs([...generatedQRs, qrData]);
  };

  // Save to database if user is signed in
  const handleSaveToAccount = async () => {
    if (!posterDataUrl || !user) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      // Upload poster to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${posterFilename}`;
      const { error: uploadError } = await supabase.storage
        .from("posters")
        .upload(fileName, dataURLtoBlob(posterDataUrl), {
          contentType: "image/png",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("posters").getPublicUrl(fileName);

      // Save poster metadata to database
      const { error: dbError } = await supabase
        .from("posters")
        .insert({
          user_id: user.id,
          original_prompt: originalPrompt,
          enhanced_prompt: enhancedPrompt,
          poster_url: publicUrl,
          filename: posterFilename,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setSuccess("✅ Poster saved to your account!");
    } catch (error) {
      console.error("Error saving poster:", error);
      setError("Failed to save poster to account. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Regular edit (uses localStorage like before)
  const handleEditPoster = () => {
    if (posterDataUrl) {
      const posterData: PosterData = {
        posterUrl: posterDataUrl,
        posterFilename,
        originalPrompt: originalPrompt,
        enhancedPrompt,
        qrCodes: generatedQRs,
      };

      localStorage.setItem("posterData", JSON.stringify(posterData));
      window.location.href = "/editor";
    }
  };

  // Helper function to convert data URL to blob
  const dataURLtoBlob = (dataURL: string) => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleRemoveQR = (index: number) => {
    setGeneratedQRs(generatedQRs.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700 sm:text-5xl">
            AI Poster Generator
          </h1>
        </div>

        {/* Header with Auth Status */}
        <div className="flex justify-between items-center mb-8 bg-white rounded-lg shadow p-4">
          {user ? (
            // Signed in user
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {user.user_metadata?.full_name || "User"}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          ) : (
            // Anonymous user
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold">
                👤
              </div>
              <div>
                <p className="font-medium text-gray-900">Anonymous User</p>
                <p className="text-sm text-gray-500">
                  Create an account to save your work!
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {user ? (
              <>
                <Link
                  href="/gallery"
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  📁 My Posters
                </Link>
                <button
                  onClick={signOut}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  style={{ color: "white", textDecoration: "none" }}
                >
                  Sign Up to Save Posters
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6 text-center max-w-6xl mx-auto">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg mb-6 text-center max-w-6xl mx-auto">
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Main content wrapper */}
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 lg:p-10 mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* Original Prompt */}
            <div className="space-y-4">
              <div className="flex items-center justify-between h-8">
                <label className="block text-lg font-semibold text-gray-900">
                  Original Prompt
                </label>
                <div></div>
              </div>
              <textarea
                value={originalPrompt}
                onChange={(e) => setOriginalPrompt(e.target.value)}
                placeholder="Type your raw idea here..."
                className="w-full h-64 p-4 text-gray-900 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors duration-200"
                style={{ minHeight: "256px" }}
              />
            </div>

            {/* Enhanced Prompt */}
            <div className="space-y-4">
              <div className="flex items-center justify-between h-8">
                <label className="block text-lg font-semibold text-gray-900">
                  Enhanced Prompt
                </label>
                <button
                  onClick={handleEnhance}
                  disabled={isEnhancing || !originalPrompt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  style={{ color: "white" }}
                >
                  {isEnhancing ? "Enhancing..." : "Enhance"}
                </button>
              </div>
              <textarea
                value={enhancedPrompt}
                onChange={(e) => setEnhancedPrompt(e.target.value)}
                placeholder="Enhanced version will appear here..."
                className="w-full h-64 p-4 text-gray-900 bg-gray-50 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors duration-200"
                style={{ minHeight: "256px" }}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !enhancedPrompt.trim()}
              className="px-8 py-3 bg-green-600 text-white font-semibold text-lg rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-lg"
              style={{ color: "white" }}
            >
              {isGenerating ? "Generating..." : "Generate Poster"}
            </button>
          </div>
        </div>

        {/* QR Code Section - Show after poster is generated */}
        {posterUrl && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">
                📱 QR Codes for Your Poster
              </h3>
              <button
                onClick={() => setShowQRGenerator(true)}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-md"
                style={{ color: "white" }}
              >
                + Generate QR Code
              </button>
            </div>

            {generatedQRs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {generatedQRs.map((qr, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <img
                      src={qr.dataURL || "/placeholder.svg"}
                      alt={`QR Code ${index + 1}`}
                      className="w-20 h-20 mx-auto mb-3 rounded"
                    />
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {qr.text}
                    </p>
                    <button
                      onClick={() => handleRemoveQR(index)}
                      className="text-red-500 text-sm hover:text-red-700 transition-colors font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📱</div>
                <p className="text-lg">
                  No QR codes yet. Generate some for your Google Forms, website,
                  or contact info!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Poster Preview */}
        {posterUrl && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
              Your Generated Poster
            </h2>
            <div className="flex justify-center mb-8">
              <img
                src={posterUrl || "/placeholder.svg"}
                alt="Generated poster"
                className="max-w-md max-h-96 object-contain border border-gray-200 shadow-lg rounded-lg"
              />
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href={posterUrl}
                download={posterFilename}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                style={{ color: "white", textDecoration: "none" }}
              >
                📥 Download Original
              </a>

              <button
                onClick={handleEditPoster}
                disabled={!posterDataUrl}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md"
                style={{ color: "white" }}
              >
                ✏️ Edit Poster
              </button>

              {user && (
                <button
                  onClick={handleSaveToAccount}
                  disabled={!posterDataUrl || isSaving}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-md"
                  style={{ color: "white" }}
                >
                  {isSaving ? "Saving..." : "💾 Save Poster"}
                </button>
              )}
            </div>

            {user && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 max-w-2xl mx-auto bg-green-50 p-4 rounded-lg">
                  ✅ <strong>Signed In:</strong> Your posters will be saved to
                  your account automatically!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Generator Modal */}
      {showQRGenerator && (
        <QRGenerator
          onQRGenerated={handleQRGenerated}
          onClose={() => setShowQRGenerator(false)}
        />
      )}
    </div>
  );
}
