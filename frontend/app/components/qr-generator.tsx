"use client";

import type React from "react";
import { useState } from "react";
import QRCode from "qrcode";

interface QRCodeData {
  dataURL: string;
  text: string;
  type: string;
  formattedData: string;
}

interface QRGeneratorProps {
  onQRGenerated: (qr: QRCodeData) => void;
  onClose: () => void;
}

const QRGenerator = ({ onQRGenerated, onClose }: QRGeneratorProps) => {
  const [qrText, setQrText] = useState<string>("");
  const [generatedQR, setGeneratedQR] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleGenerateQR = async () => {
    if (!qrText.trim()) return;

    setLoading(true);
    try {
      const qrDataURL = await QRCode.toDataURL(qrText, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });

      setGeneratedQR({
        dataURL: qrDataURL,
        text: qrText,
        type: "url",
        formattedData: qrText,
      });
    } catch (error) {
      console.error("QR generation failed:", error);
      alert("Failed to generate QR code. Please check your URL.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseQR = () => {
    if (generatedQR && onQRGenerated) {
      onQRGenerated(generatedQR);
      onClose();
    }
  };

  const handleDownloadQR = () => {
    if (!generatedQR) return;

    const link = document.createElement("a");
    link.href = generatedQR.dataURL;
    link.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              🌐 Generate Website QR Code
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Enter Website URL</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={qrText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setQrText(e.target.value)
                  }
                  placeholder="https://example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Examples: https://forms.google.com/your-form,
                  https://yourwebsite.com, https://instagram.com/yourprofile
                </p>
              </div>

              <button
                onClick={handleGenerateQR}
                disabled={!qrText.trim() || loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ color: "white" }}
              >
                {loading ? "Generating..." : "🔄 Generate QR Code"}
              </button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Preview</h3>

              {generatedQR ? (
                <div className="text-center">
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <img
                      src={generatedQR.dataURL || "/placeholder.svg"}
                      alt="Generated QR Code"
                      className="mx-auto max-w-full h-auto"
                      style={{ maxWidth: "200px" }}
                    />
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p>
                      <strong>URL:</strong> {generatedQR.text}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadQR}
                      className="flex-1 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                      style={{ color: "white" }}
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={handleUseQR}
                      className="flex-1 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                      style={{ color: "white" }}
                    >
                      ✅ Use in Poster
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
                  <div className="text-4xl mb-2">🌐</div>
                  <p>Your QR code will appear here</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              💡 Common Use Cases:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • <strong>Event Registration:</strong> Link to Google Forms or
                event pages
              </li>
              <li>
                • <strong>Social Media:</strong> Direct links to Instagram,
                LinkedIn, etc.
              </li>
              <li>
                • <strong>Website:</strong> Your main website or landing page
              </li>
              <li>
                • <strong>Contact Forms:</strong> Easy way for people to reach
                you
              </li>
              <li>
                • <strong>Portfolio:</strong> Link to your work or resume
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
