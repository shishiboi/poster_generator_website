"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, type Poster } from "@/lib/supabase";
import Link from "next/link";

export default function Gallery() {
  const { user, loading: authLoading } = useAuth();
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchPosters();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const fetchPosters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("posters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPosters(data || []);
    } catch (error) {
      console.error("Error fetching posters:", error);
      setError("Failed to load your posters");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (posterId: string) => {
    if (!confirm("Are you sure you want to delete this poster?")) return;

    try {
      const { error } = await supabase
        .from("posters")
        .delete()
        .eq("id", posterId);

      if (error) throw error;

      setPosters(posters.filter((p) => p.id !== posterId));
    } catch (error) {
      console.error("Error deleting poster:", error);
      setError("Failed to delete poster");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your posters...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            You need to sign in to view your saved posters.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              style={{ color: "white", textDecoration: "none" }}
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              style={{ color: "white", textDecoration: "none" }}
            >
              Back to Generator
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Posters</h1>
            <p className="text-gray-600 mt-1">
              {posters.length} poster{posters.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              style={{ color: "white", textDecoration: "none" }}
            >
              + Create New Poster
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Posters Grid */}
        {posters.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No posters yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first AI-generated poster to see it here!
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              style={{ color: "white", textDecoration: "none" }}
            >
              Create Your First Poster
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posters.map((poster) => (
              <div
                key={poster.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Poster Image */}
                <div className="aspect-[3/4] bg-gray-100 relative">
                  <img
                    src={poster.poster_url || "/placeholder.svg"}
                    alt="Generated poster"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "/placeholder.svg?height=400&width=300&text=Image+Not+Found";
                    }}
                  />
                </div>

                {/* Poster Info */}
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {poster.original_prompt.length > 60
                        ? poster.original_prompt.substring(0, 60) + "..."
                        : poster.original_prompt}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(poster.created_at)}
                    </p>
                  </div>

                  {/* Enhanced Prompt Preview */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 line-clamp-3">
                      <strong>Enhanced:</strong> {poster.enhanced_prompt}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(poster.poster_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = poster.filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Download failed:", error);
                          // Fallback: open in new tab
                          window.open(poster.poster_url, "_blank");
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 text-center"
                      style={{ color: "white" }}
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={() => {
                        // Create poster data for editor
                        const posterData = {
                          posterUrl: poster.poster_url,
                          posterFilename: poster.filename,
                          originalPrompt: poster.original_prompt,
                          enhancedPrompt: poster.enhanced_prompt,
                          qrCodes: [],
                        };
                        localStorage.setItem(
                          "posterData",
                          JSON.stringify(posterData)
                        );
                        window.location.href = "/editor";
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                      style={{ color: "white" }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(poster.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      style={{ color: "white" }}
                      title="Delete poster"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
