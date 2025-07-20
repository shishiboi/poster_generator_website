"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

// Type definitions
interface QRCode {
  dataURL: string;
  text: string;
  type: string;
  formattedData: string;
}

interface PosterCanvasProps {
  posterUrl?: string;
  qrCodes?: QRCode[];
}

interface Element {
  type: "text" | "image";
  x: number;
  y: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textAlign?: string;
  imageData?: HTMLImageElement;
  width?: number;
  height?: number;
  originalAspectRatio?: number;
  qrData?: QRCode;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResizeHandle {
  type: string;
  x: number;
  y: number;
}

function PosterCanvas({ posterUrl, qrCodes = [] }: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [error, setError] = useState("");
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Text editor states
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [newTextContent, setNewTextContent] = useState("Your text here");
  const [newTextSize, setNewTextSize] = useState(32);
  const [newTextColor, setNewTextColor] = useState("#000000");
  const [newTextFont, setNewTextFont] = useState("Arial");
  const [newTextAlign, setNewTextAlign] = useState("left");

  // Floating toolbar states
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [toolbarUpdateTimeout, setToolbarUpdateTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Canvas dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 1200;
  const EXPORT_SCALE = 1024 / 800;

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#666666";
      ctx.font = "28px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🎨 Canvas Ready!", CANVAS_WIDTH / 2, 300);
      ctx.fillText(
        "Click 'Load Background' to add your AI poster",
        CANVAS_WIDTH / 2,
        350
      );
      ctx.fillText("or start adding elements below", CANVAS_WIDTH / 2, 400);

      setCanvasReady(true);
      console.log("Canvas initialized successfully!");
    }
  }, []);

  // Auto-load QR codes when component mounts
  useEffect(() => {
    if (qrCodes && qrCodes.length > 0 && canvasReady) {
      console.log("Auto-loading QR codes:", qrCodes);

      qrCodes.forEach((qr, index) => {
        const img = new Image();
        img.onload = () => {
          const newQRElement: Element = {
            type: "image",
            imageData: img,
            x: 300 + index * 20,
            y: 900 + index * 20,
            width: 150,
            height: 150,
            originalAspectRatio: 1,
            qrData: qr,
          };

          setElements((prev) => [...prev, newQRElement]);
        };
        img.src = qr.dataURL;
      });
    }
  }, [qrCodes, canvasReady]);

  // Update floating toolbar position when text element is selected or moved
  useEffect(() => {
    if (
      selectedElement !== null &&
      elements[selectedElement]?.type === "text" &&
      canvasRef.current
    ) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const element = elements[selectedElement];
      const canvasScale = canvas.offsetWidth / CANVAS_WIDTH;

      // Position toolbar to the right of the text element
      setToolbarPosition({
        x: rect.left + (element.x + 200) * canvasScale, // 200px to the right of text
        y: rect.top + (element.y - element.fontSize!) * canvasScale, // Align with top of text
      });
      setShowFloatingToolbar(true);
    } else {
      setShowFloatingToolbar(false);
    }
  }, [selectedElement, elements, isDragging]);

  const getElementBounds = (
    element: Element,
    ctx: CanvasRenderingContext2D
  ): Bounds | null => {
    if (element.type === "text" && element.text && element.fontSize) {
      ctx.font = `${element.fontSize}px ${element.fontFamily || "Arial"}`;
      const textWidth = ctx.measureText(element.text).width;
      return {
        x: element.x,
        y: element.y - element.fontSize,
        width: textWidth,
        height: element.fontSize,
      };
    } else if (element.type === "image" && element.width && element.height) {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
    }
    return null;
  };

  const getResizeHandles = (bounds: Bounds): ResizeHandle[] => {
    const handleSize = 8;
    return [
      {
        type: "nw",
        x: bounds.x - handleSize / 2,
        y: bounds.y - handleSize / 2,
      },
      {
        type: "ne",
        x: bounds.x + bounds.width - handleSize / 2,
        y: bounds.y - handleSize / 2,
      },
      {
        type: "sw",
        x: bounds.x - handleSize / 2,
        y: bounds.y + bounds.height - handleSize / 2,
      },
      {
        type: "se",
        x: bounds.x + bounds.width - handleSize / 2,
        y: bounds.y + bounds.height - handleSize / 2,
      },
    ];
  };

  const isPointInElement = (
    x: number,
    y: number,
    element: Element,
    ctx: CanvasRenderingContext2D
  ): boolean => {
    const bounds = getElementBounds(element, ctx);
    if (!bounds) return false;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  };

  const isPointInHandle = (
    x: number,
    y: number,
    handle: ResizeHandle
  ): boolean => {
    const handleSize = 8;
    return (
      x >= handle.x &&
      x <= handle.x + handleSize &&
      y >= handle.y &&
      y <= handle.y + handleSize
    );
  };

  // Check if point is on the selection border (not inside the element)
  const isPointOnSelectionBorder = (
    x: number,
    y: number,
    element: Element,
    ctx: CanvasRenderingContext2D
  ): boolean => {
    const bounds = getElementBounds(element, ctx);
    if (!bounds) return false;

    const borderThickness = 15; // Make border area much thicker for easier clicking

    // Expanded bounds that include the border area
    const expandedBounds = {
      x: bounds.x - borderThickness,
      y: bounds.y - borderThickness,
      width: bounds.width + borderThickness * 2,
      height: bounds.height + borderThickness * 2,
    };

    // Core text area (smaller than actual text bounds)
    const coreTextBounds = {
      x: bounds.x + 5,
      y: bounds.y + 5,
      width: Math.max(0, bounds.width - 10),
      height: Math.max(0, bounds.height - 10),
    };

    // Point is in expanded area
    const inExpandedArea =
      x >= expandedBounds.x &&
      x <= expandedBounds.x + expandedBounds.width &&
      y >= expandedBounds.y &&
      y <= expandedBounds.y + expandedBounds.height;

    // Point is in core text area
    const inCoreArea =
      coreTextBounds.width > 0 &&
      coreTextBounds.height > 0 &&
      x >= coreTextBounds.x &&
      x <= coreTextBounds.x + coreTextBounds.width &&
      y >= coreTextBounds.y &&
      y <= coreTextBounds.y + coreTextBounds.height;

    // Border area is expanded area minus core area
    return inExpandedArea && !inCoreArea;
  };

  const redrawCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (backgroundLoaded && (window as any).backgroundImage) {
      ctx.drawImage(
        (window as any).backgroundImage,
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      );
    } else {
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    elements.forEach((element, index) => {
      if (element.type === "text" && element.text) {
        ctx.fillStyle = element.color || "#000000";
        ctx.font = `${element.fontSize || 32}px ${
          element.fontFamily || "Arial"
        }`;
        ctx.textAlign = (element.textAlign as CanvasTextAlign) || "left";
        ctx.fillText(element.text, element.x, element.y);

        if (selectedElement === index) {
          const bounds = getElementBounds(element, ctx);
          if (bounds) {
            // Draw selection border
            ctx.strokeStyle = "#007bff";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
              bounds.x - 5,
              bounds.y - 5,
              bounds.width + 10,
              bounds.height + 10
            );
            ctx.setLineDash([]);

            // Draw a thicker invisible border area for easier clicking
            ctx.strokeStyle = "rgba(0, 123, 255, 0.1)";
            ctx.lineWidth = 10;
            ctx.strokeRect(
              bounds.x - 10,
              bounds.y - 10,
              bounds.width + 20,
              bounds.height + 20
            );
          }
        }
      } else if (
        element.type === "image" &&
        element.imageData &&
        element.width &&
        element.height
      ) {
        ctx.drawImage(
          element.imageData,
          element.x,
          element.y,
          element.width,
          element.height
        );

        if (selectedElement === index) {
          ctx.strokeStyle = "#007bff";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            element.x - 2,
            element.y - 2,
            element.width + 4,
            element.height + 4
          );
          ctx.setLineDash([]);
        }
      }
    });

    if (selectedElement !== null && elements[selectedElement]) {
      const element = elements[selectedElement];
      const bounds = getElementBounds(element, ctx);
      if (bounds) {
        const handles = getResizeHandles(bounds);

        ctx.fillStyle = "#007bff";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;

        handles.forEach((handle) => {
          ctx.fillRect(handle.x, handle.y, 8, 8);
          ctx.strokeRect(handle.x, handle.y, 8, 8);
        });
      }
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [elements, selectedElement, backgroundLoaded]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check for resize handles first
    if (selectedElement !== null && elements[selectedElement]) {
      const element = elements[selectedElement];
      const bounds = getElementBounds(element, ctx);
      if (bounds) {
        const handles = getResizeHandles(bounds);

        for (const handle of handles) {
          if (isPointInHandle(x, y, handle)) {
            setIsResizing(true);
            setResizeHandle(handle.type);
            return;
          }
        }
      }
    }

    let clickedElement = -1;
    let clickedOnBorder = false;

    // Check if we clicked on any element
    for (let i = elements.length - 1; i >= 0; i--) {
      if (isPointInElement(x, y, elements[i], ctx)) {
        clickedElement = i;

        // For text elements, check if we clicked on the border
        if (elements[i].type === "text") {
          // If element is already selected, check if we're in the border area
          if (selectedElement === i) {
            clickedOnBorder = isPointOnSelectionBorder(x, y, elements[i], ctx);
          } else {
            // If not selected, selecting it but not dragging yet
            clickedOnBorder = false;
          }
        } else if (elements[i].type === "image") {
          // Images can always be dragged
          clickedOnBorder = true;
        }
        break;
      }
    }

    // Also check if we clicked in the border area of the currently selected text element
    if (
      clickedElement === -1 &&
      selectedElement !== null &&
      elements[selectedElement]?.type === "text"
    ) {
      if (isPointOnSelectionBorder(x, y, elements[selectedElement], ctx)) {
        clickedElement = selectedElement;
        clickedOnBorder = true;
      }
    }

    if (clickedElement >= 0) {
      setSelectedElement(clickedElement);

      // Start dragging if we clicked on the border or it's an image
      if (clickedOnBorder || elements[clickedElement].type === "image") {
        setIsDragging(true);
        const element = elements[clickedElement];
        setDragOffset({
          x: x - element.x,
          y: y - element.y,
        });
      }
    } else {
      // Clicked on empty space - deselect
      setSelectedElement(null);
      setIsDragging(false);
    }
  };

  const updateToolbarPosition = () => {
    if (
      selectedElement !== null &&
      elements[selectedElement]?.type === "text" &&
      canvasRef.current
    ) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const element = elements[selectedElement];
      const canvasScale = canvas.offsetWidth / CANVAS_WIDTH;

      // Position toolbar to the right of the text element
      setToolbarPosition({
        x: rect.left + (element.x + 200) * canvasScale, // 200px to the right of text
        y: rect.top + (element.y - element.fontSize!) * canvasScale, // Align with top of text
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (isResizing && selectedElement !== null && resizeHandle) {
      const element = elements[selectedElement];
      const newElements = [...elements];
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (element.type === "image" && element.width && element.height) {
        const originalBounds = getElementBounds(element, ctx);
        if (!originalBounds) return;

        switch (resizeHandle) {
          case "se":
            newElements[selectedElement] = {
              ...element,
              width: Math.max(20, x - element.x),
              height: Math.max(20, y - element.y),
            };
            break;
          case "sw":
            const newWidth = Math.max(
              20,
              originalBounds.x + originalBounds.width - x
            );
            newElements[selectedElement] = {
              ...element,
              x: x,
              width: newWidth,
              height: Math.max(20, y - element.y),
            };
            break;
          case "ne":
            const newHeight = Math.max(
              20,
              originalBounds.y + originalBounds.height - y
            );
            newElements[selectedElement] = {
              ...element,
              y: y,
              width: Math.max(20, x - element.x),
              height: newHeight,
            };
            break;
          case "nw":
            const newW = Math.max(
              20,
              originalBounds.x + originalBounds.width - x
            );
            const newH = Math.max(
              20,
              originalBounds.y + originalBounds.height - y
            );
            newElements[selectedElement] = {
              ...element,
              x: x,
              y: y,
              width: newW,
              height: newH,
            };
            break;
        }
      } else if (element.type === "text" && element.fontSize) {
        const originalBounds = getElementBounds(element, ctx);
        if (!originalBounds) return;

        switch (resizeHandle) {
          case "se":
            const scaleX = Math.max(
              0.5,
              (x - element.x) / originalBounds.width
            );
            const scaleY = Math.max(
              0.5,
              (y - (element.y - element.fontSize)) / originalBounds.height
            );
            const avgScale = (scaleX + scaleY) / 2;
            newElements[selectedElement] = {
              ...element,
              fontSize: Math.max(
                12,
                Math.min(100, element.fontSize * avgScale)
              ),
            };
            break;
        }
      }

      setElements(newElements);
    } else if (isDragging && selectedElement !== null) {
      const newElements = [...elements];
      newElements[selectedElement] = {
        ...newElements[selectedElement],
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      };
      setElements(newElements);

      // Update toolbar position immediately during drag
      if (elements[selectedElement]?.type === "text") {
        setTimeout(updateToolbarPosition, 0);
      }
    }

    // Update cursor based on what we're hovering over
    const canvas = canvasRef.current;
    if (canvas && selectedElement !== null && elements[selectedElement]) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const element = elements[selectedElement];
      const bounds = getElementBounds(element, ctx);
      if (bounds) {
        const handles = getResizeHandles(bounds);

        let cursor = "default";

        // Check resize handles first
        for (const handle of handles) {
          if (isPointInHandle(x, y, handle)) {
            switch (handle.type) {
              case "nw":
              case "se":
                cursor = "nw-resize";
                break;
              case "ne":
              case "sw":
                cursor = "ne-resize";
                break;
            }
            break;
          }
        }

        // If not on a handle, check if we're on the border or inside
        if (cursor === "default") {
          if (element.type === "text") {
            if (isPointOnSelectionBorder(x, y, element, ctx)) {
              cursor = "move";
            } else if (isPointInElement(x, y, element, ctx)) {
              cursor = "text"; // Text cursor when over the text content
            }
          } else if (
            element.type === "image" &&
            isPointInElement(x, y, element, ctx)
          ) {
            cursor = "move";
          }
        }

        canvas.style.cursor = cursor;
      }
    } else if (canvas) {
      canvas.style.cursor = "default";
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (let i = elements.length - 1; i >= 0; i--) {
      if (
        elements[i].type === "text" &&
        isPointInElement(x, y, elements[i], ctx)
      ) {
        setSelectedElement(i);
        setIsEditing(true);
        setEditText(elements[i].text || "");
        break;
      }
    }
  };

  const handleTextEdit = (newText: string) => {
    if (
      selectedElement !== null &&
      elements[selectedElement]?.type === "text"
    ) {
      const newElements = [...elements];
      newElements[selectedElement] = {
        ...newElements[selectedElement],
        text: newText,
      };
      setElements(newElements);
    }
    setIsEditing(false);
    setEditText("");
  };

  const handleLoadBackground = async () => {
    if (!posterUrl || !canvasRef.current) return;

    setIsLoading(true);
    setError("");

    try {
      console.log("Loading background image...");

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        console.log("Background image loaded successfully!");
        (window as any).backgroundImage = img;
        setBackgroundLoaded(true);
        setIsLoading(false);
        redrawCanvas();
      };

      img.onerror = () => {
        console.error("Failed to load background image");
        setError("Failed to load poster background image");
        setIsLoading(false);
      };

      img.src = posterUrl;
    } catch (err) {
      console.error("Error loading background:", err);
      setError("Error loading background: " + (err as Error).message);
      setIsLoading(false);
    }
  };

  const handleAddText = () => {
    setShowTextEditor(true);
  };

  const handleCreateText = () => {
    const newText: Element = {
      type: "text",
      text: newTextContent,
      x: 100,
      y: 150,
      fontSize: newTextSize,
      color: newTextColor,
      fontFamily: newTextFont,
      textAlign: newTextAlign,
    };

    setElements([...elements, newText]);
    setSelectedElement(elements.length);
    setShowTextEditor(false);

    // Reset form
    setNewTextContent("Your text here");
    setNewTextSize(32);
    setNewTextColor("#000000");
    setNewTextFont("Arial");
    setNewTextAlign("left");
  };

  const handleAddImages = (files: FileList | null, type: string) => {
    if (!files || files.length === 0) return;

    const maxFiles = type === "logo" ? 3 : 1;
    const filesToProcess = Array.from(files).slice(0, maxFiles);

    filesToProcess.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          let width, height;

          if (type === "qr") {
            width = 150;
            height = 150 / aspectRatio;
          } else {
            width = 120;
            height = 120 / aspectRatio;
          }

          const newImage: Element = {
            type: "image",
            imageData: img,
            x: type === "qr" ? 300 + index * 20 : 50 + index * 140,
            y: type === "qr" ? 900 + index * 20 : 1050,
            width: width,
            height: height,
            originalAspectRatio: aspectRatio,
          };

          setElements((prev) => [...prev, newImage]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteSelected = () => {
    if (selectedElement !== null) {
      const newElements = elements.filter(
        (_, index) => index !== selectedElement
      );
      setElements(newElements);
      setSelectedElement(null);
    }
  };

  const updateSelectedTextElement = (updates: Partial<Element>) => {
    if (
      selectedElement !== null &&
      elements[selectedElement]?.type === "text"
    ) {
      const newElements = [...elements];
      newElements[selectedElement] = {
        ...newElements[selectedElement],
        ...updates,
      };
      setElements(newElements);
    }
  };

  const handleExportFinal = () => {
    if (!canvasRef.current) return;

    try {
      const exportCanvas = document.createElement("canvas");
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) return;

      exportCanvas.width = 1024;
      exportCanvas.height = 1536;

      const scale = EXPORT_SCALE;
      exportCtx.scale(scale, scale);

      if (backgroundLoaded && (window as any).backgroundImage) {
        exportCtx.drawImage(
          (window as any).backgroundImage,
          0,
          0,
          CANVAS_WIDTH,
          CANVAS_HEIGHT
        );
      } else {
        exportCtx.fillStyle = "#f8f9fa";
        exportCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      elements.forEach((element) => {
        if (element.type === "text" && element.text) {
          exportCtx.fillStyle = element.color || "#000000";
          exportCtx.font = `${element.fontSize || 32}px ${
            element.fontFamily || "Arial"
          }`;
          exportCtx.textAlign =
            (element.textAlign as CanvasTextAlign) || "left";
          exportCtx.fillText(element.text, element.x, element.y);
        } else if (
          element.type === "image" &&
          element.imageData &&
          element.width &&
          element.height
        ) {
          exportCtx.drawImage(
            element.imageData,
            element.x,
            element.y,
            element.width,
            element.height
          );
        }
      });

      const dataURL = exportCanvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `final_poster_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Poster exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      setError("Export failed: " + (error as Error).message);
    }
  };

  const handleClearCanvas = () => {
    setElements([]);
    setSelectedElement(null);
    setBackgroundLoaded(false);
    (window as any).backgroundImage = null;
    redrawCanvas();
  };

  const selectedTextElement =
    selectedElement !== null && elements[selectedElement]?.type === "text"
      ? elements[selectedElement]
      : null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-2xl">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Floating Text Toolbar */}
      {showFloatingToolbar && selectedTextElement && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-xl p-2 flex items-center gap-2"
          style={{
            left: `${Math.max(
              10,
              Math.min(window.innerWidth - 400, toolbarPosition.x)
            )}px`,
            top: `${Math.max(10, toolbarPosition.y)}px`,
            zIndex: 1000,
            pointerEvents: "auto",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Remove the drag handle div entirely */}

          {/* Font Family */}
          <select
            value={selectedTextElement.fontFamily || "Arial"}
            onChange={(e) =>
              updateSelectedTextElement({ fontFamily: e.target.value })
            }
            className="px-2 py-1 border border-gray-300 rounded bg-white text-black text-sm"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Impact">Impact</option>
          </select>

          {/* Font Size */}
          <select
            value={selectedTextElement.fontSize || 32}
            onChange={(e) =>
              updateSelectedTextElement({
                fontSize: Number.parseInt(e.target.value),
              })
            }
            className="px-2 py-1 border border-gray-300 rounded bg-white text-black text-sm"
          >
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
            <option value="36">36</option>
            <option value="42">42</option>
            <option value="48">48</option>
            <option value="56">56</option>
            <option value="64">64</option>
            <option value="72">72</option>
          </select>

          {/* Font Size Buttons */}
          <button
            onClick={() =>
              updateSelectedTextElement({
                fontSize: Math.min(
                  100,
                  (selectedTextElement.fontSize || 32) + 2
                ),
              })
            }
            className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
            title="Increase font size"
          >
            A+
          </button>
          <button
            onClick={() =>
              updateSelectedTextElement({
                fontSize: Math.max(
                  12,
                  (selectedTextElement.fontSize || 32) - 2
                ),
              })
            }
            className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
            title="Decrease font size"
          >
            A-
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300"></div>

          {/* Text Alignment */}
          <button
            onClick={() => updateSelectedTextElement({ textAlign: "left" })}
            className={`p-1 rounded text-sm ${
              selectedTextElement.textAlign === "left"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100"
            }`}
            title="Align Left"
          >
            ⬅️
          </button>
          <button
            onClick={() => updateSelectedTextElement({ textAlign: "center" })}
            className={`p-1 rounded text-sm ${
              selectedTextElement.textAlign === "center"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100"
            }`}
            title="Align Center"
          >
            ↔️
          </button>
          <button
            onClick={() => updateSelectedTextElement({ textAlign: "right" })}
            className={`p-1 rounded text-sm ${
              selectedTextElement.textAlign === "right"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100"
            }`}
            title="Align Right"
          >
            ➡️
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300"></div>

          {/* Text Color */}
          <input
            type="color"
            value={selectedTextElement.color || "#000000"}
            onChange={(e) =>
              updateSelectedTextElement({ color: e.target.value })
            }
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            title="Text Color"
          />
        </div>
      )}

      {/* Simple Text Creation Modal */}
      {showTextEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Text</h3>
              <button
                onClick={() => setShowTextEditor(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <textarea
                value={newTextContent}
                onChange={(e) => setNewTextContent(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded bg-white text-black resize-none"
                rows={4}
                placeholder="Enter your text here..."
              />

              {/* Live Preview */}
              <div className="mt-4 p-4 border border-gray-200 rounded bg-gray-50">
                <p className="text-xs text-gray-600 mb-2">
                  Preview (actual size):
                </p>
                <div
                  className="bg-white p-4 rounded border overflow-auto"
                  style={{ maxHeight: "200px" }}
                >
                  <div
                    style={{
                      fontSize: `${newTextSize}px`,
                      color: newTextColor,
                      fontFamily: newTextFont,
                      textAlign: newTextAlign as any,
                      lineHeight: "1.2",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {newTextContent || "Your text will appear here..."}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={handleCreateText}
                disabled={!newTextContent.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ color: "white" }}
              >
                Add Text
              </button>
              <button
                onClick={() => setShowTextEditor(false)}
                className="px-6 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700 transition-colors"
                style={{ color: "white" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Editing Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Edit Text
            </h3>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4 bg-white text-black"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleTextEdit(editText)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                style={{ color: "white" }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                style={{ color: "white" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10 rounded">
            <div className="text-lg">Loading background image...</div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          className="border-2 border-gray-300 shadow-lg"
          style={{ maxWidth: "100%" }}
        />
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 flex-wrap justify-center">
        {!backgroundLoaded && posterUrl && (
          <button
            onClick={handleLoadBackground}
            disabled={!canvasReady || isLoading}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            style={{ color: "white" }}
          >
            {isLoading ? "Loading..." : "Load Poster Background"}
          </button>
        )}

        <button
          onClick={handleClearCanvas}
          disabled={!canvasReady}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
          style={{ color: "white" }}
        >
          🗑️ Clear Canvas
        </button>
      </div>

      {/* Editing Controls */}
      <div className="bg-gray-50 p-6 rounded-lg w-full max-w-4xl">
        <h3 className="font-semibold mb-4 text-center">
          Add Your Custom Elements
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex flex-col items-center gap-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
            <span className="text-2xl">📱</span>
            <span className="text-sm font-medium" style={{ color: "white" }}>
              Add QR Code
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleAddImages(e.target.files, "qr")}
              className="hidden"
              disabled={!canvasReady}
            />
          </label>

          <label className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition">
            <span className="text-2xl">🏢</span>
            <span className="text-sm font-medium" style={{ color: "white" }}>
              Add Logos (up to 3)
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleAddImages(e.target.files, "logo")}
              className="hidden"
              disabled={!canvasReady}
            />
          </label>

          <button
            onClick={handleAddText}
            disabled={!canvasReady}
            className="flex flex-col items-center gap-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            style={{ color: "white" }}
          >
            <span className="text-2xl">📝</span>
            <span className="text-sm font-medium">Add Text</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={!canvasReady || selectedElement === null}
            className="flex flex-col items-center gap-2 p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
            style={{ color: "white" }}
          >
            <span className="text-2xl">🗑️</span>
            <span className="text-sm font-medium">Delete Selected</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleExportFinal}
            disabled={!canvasReady}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition text-lg"
            style={{ color: "white" }}
          >
            🚀 Export Final Poster (1024x1536)
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 max-w-2xl text-center bg-blue-50 p-4 rounded-lg">
        <p className="font-semibold mb-2">💡 How to Use:</p>
        <ul className="text-left space-y-1">
          <li>
            • <strong>Click text</strong> to select and show formatting toolbar
          </li>
          <li>
            • <strong>Drag the border</strong> (dashed outline) to move text
          </li>
          <li>
            • <strong>Text cursor</strong> appears when hovering over text
            content
          </li>
          <li>
            • <strong>Move cursor</strong> appears when hovering over borders
          </li>
          <li>
            • <strong>Double-click</strong> text to edit the content
          </li>
          <li>
            • <strong>Images</strong> can be dragged anywhere
          </li>
          <li>
            • <strong>Add multiple logos</strong> at once (up to 3)
          </li>
        </ul>
      </div>
    </div>
  );
}

export default PosterCanvas;
