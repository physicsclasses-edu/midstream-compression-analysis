'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Type, ArrowRight, Square, Pen, Eraser, Undo } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Position {
  x: number;
  y: number;
}

type Tool = 'pen' | 'arrow' | 'rectangle' | 'text' | 'eraser';

interface DrawAction {
  tool: Tool;
  points?: Position[];
  start?: Position;
  end?: Position;
  text?: string;
  color: string;
  id?: string;
}

interface FeedbackCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackCapture({ isOpen, onClose }: FeedbackCaptureProps) {
  const [captureMode, setCaptureMode] = useState<'selecting' | 'annotating' | 'sending'>('selecting');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawActions, setDrawActions] = useState<DrawAction[]>({});
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#FF0000');
  const [isSending, setIsSending] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [selectionStart, setSelectionStart] = useState<Position | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Position | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Position | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setCaptureMode('selecting');
    setScreenshot(null);
    setDrawActions([]);
    setCurrentAction(null);
    setEmail('');
    setDescription('');
    setSelectionStart(null);
    setSelectionEnd(null);
    setTextInput('');
    setTextPosition(null);
    setIsEditingText(false);
    setDraggingTextId(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleStartSelection = (e: React.MouseEvent) => {
    if (captureMode !== 'selecting') return;
    // Use page coordinates including scroll
    setSelectionStart({ x: e.pageX, y: e.pageY });
    setSelectionEnd({ x: e.pageX, y: e.pageY });
  };

  const handleMoveSelection = (e: React.MouseEvent) => {
    if (captureMode !== 'selecting' || !selectionStart) return;
    // Use page coordinates including scroll
    setSelectionEnd({ x: e.pageX, y: e.pageY });
  };

  const handleEndSelection = async (e: React.MouseEvent) => {
    if (captureMode !== 'selecting' || !selectionStart || !selectionEnd) return;

    // Calculate selection area using page coordinates
    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    if (width < 10 || height < 10) {
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    try {
      // Hide the overlay temporarily
      const overlay = e.currentTarget as HTMLElement;
      overlay.style.opacity = '0';

      // Small delay to ensure overlay is hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the entire document
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Show overlay again
      overlay.style.opacity = '1';

      // Calculate the scale factor between the canvas and actual document
      const scaleX = canvas.width / document.documentElement.scrollWidth;
      const scaleY = canvas.height / document.documentElement.scrollHeight;

      console.log('Debug info:', {
        canvasSize: { width: canvas.width, height: canvas.height },
        documentSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        scale: { x: scaleX, y: scaleY },
        selection: { x, y, width, height },
        scaledSelection: {
          x: x * scaleX,
          y: y * scaleY,
          width: width * scaleX,
          height: height * scaleY
        }
      });

      // The canvas from html2canvas uses the actual page dimensions
      // We need to crop based on our selection coordinates
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');

      // Set the cropped canvas size to match the selection (scaled)
      croppedCanvas.width = width * scaleX;
      croppedCanvas.height = height * scaleY;

      if (ctx) {
        // Draw the cropped portion using scaled coordinates
        ctx.drawImage(
          canvas,
          x * scaleX, y * scaleY, // Source x, y (where to start cropping from source)
          width * scaleX, height * scaleY, // Source width, height (how much to crop)
          0, 0, // Destination x, y (where to draw on destination canvas)
          width * scaleX, height * scaleY // Destination width, height (size on destination canvas)
        );
      }

      setScreenshot(croppedCanvas.toDataURL('image/png'));
      setCaptureMode('annotating');
      setSelectionStart(null);
      setSelectionEnd(null);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
      // Make sure overlay is visible again on error
      const overlay = e.currentTarget as HTMLElement;
      overlay.style.opacity = '1';
    }
  };

  const drawOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !screenshot) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Helper function to draw a single action
      const drawAction = (action: DrawAction) => {
        ctx.strokeStyle = action.color;
        ctx.fillStyle = action.color;
        ctx.lineWidth = 3;

        if (action.tool === 'pen' && action.points) {
          ctx.beginPath();
          action.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        } else if (action.tool === 'arrow' && action.start && action.end) {
          drawArrow(ctx, action.start, action.end);
        } else if (action.tool === 'rectangle' && action.start && action.end) {
          const width = action.end.x - action.start.x;
          const height = action.end.y - action.start.y;
          ctx.strokeRect(action.start.x, action.start.y, width, height);
        } else if (action.tool === 'eraser' && action.points) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = 20;
          ctx.beginPath();
          action.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        // Note: text is not drawn here - it's rendered as draggable DOM elements
      };

      // Draw all completed actions
      drawActions.forEach(drawAction);

      // Draw current action in progress for real-time feedback
      if (currentAction) {
        drawAction(currentAction);
      }
    };
    img.src = screenshot;
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, start: Position, end: Position) => {
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  useEffect(() => {
    if (captureMode === 'annotating') {
      drawOnCanvas();
    }
  }, [screenshot, drawActions, captureMode, currentAction]);

  // Global mouse up handler for text dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingTextId) {
        setDraggingTextId(null);
      }
    };

    if (draggingTextId) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [draggingTextId]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === 'text') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // If currently editing text, finalize it first
      if (isEditingText && textInput.trim() && textPosition) {
        setDrawActions(prev => [
          ...prev,
          {
            tool: 'text',
            start: textPosition,
            text: textInput.trim(),
            color,
            id: `text-${Date.now()}-${Math.random()}`
          },
        ]);
      }

      const rect = canvas.getBoundingClientRect();
      const canvasPos = getCanvasCoordinates(e);

      // Set position for new text input
      setTextPosition({
        x: canvasPos.x,
        y: canvasPos.y,
      });
      setIsEditingText(true);
      setTextInput('');

      // Focus the input after a short delay to ensure it's rendered
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 10);
      return;
    }

    setIsDrawing(true);
    const pos = getCanvasCoordinates(e);

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentAction({ tool: selectedTool, points: [pos], color });
    } else {
      setCurrentAction({ tool: selectedTool, start: pos, end: pos, color });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle text dragging
    if (draggingTextId) {
      const pos = getCanvasCoordinates(e);
      setDrawActions(
        drawActions.map((action) =>
          action.id === draggingTextId && action.start
            ? {
                ...action,
                start: {
                  x: pos.x - dragOffset.x,
                  y: pos.y - dragOffset.y,
                },
              }
            : action
        )
      );
      return;
    }

    if (!isDrawing || !currentAction) return;

    const pos = getCanvasCoordinates(e);

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      const updatedAction = {
        ...currentAction,
        points: [...(currentAction.points || []), pos],
      };
      setCurrentAction(updatedAction);

      // If using eraser, check for text collisions
      if (selectedTool === 'eraser') {
        const eraserRadius = 10; // Half of eraser lineWidth (20/2)
        const textElementsToRemove: string[] = [];

        // Check each text element for collision with eraser
        drawActions.forEach((action) => {
          if (action.tool === 'text' && action.text && action.start && action.id) {
            // Estimate text bounding box (approximate dimensions)
            const textWidth = action.text.length * 12; // Rough estimate: 12px per character
            const textHeight = 25; // Approximate text height

            // Check if eraser position intersects with text bounding box
            const isColliding =
              pos.x + eraserRadius >= action.start.x &&
              pos.x - eraserRadius <= action.start.x + textWidth &&
              pos.y + eraserRadius >= action.start.y - textHeight &&
              pos.y - eraserRadius <= action.start.y + 5;

            if (isColliding) {
              textElementsToRemove.push(action.id);
            }
          }
        });

        // Remove text elements that collided with eraser
        if (textElementsToRemove.length > 0) {
          setDrawActions((prev) =>
            prev.filter((action) => !textElementsToRemove.includes(action.id || ''))
          );
        }
      }
    } else {
      setCurrentAction({ ...currentAction, end: pos });
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingTextId) {
      setDraggingTextId(null);
      return;
    }

    if (isDrawing && currentAction) {
      setDrawActions([...drawActions, currentAction]);
      setCurrentAction(null);
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    // Only add text if there's actual content
    if (textInput.trim() && textPosition) {
      setDrawActions(prev => [
        ...prev,
        {
          tool: 'text',
          start: textPosition,
          text: textInput.trim(),
          color,
          id: `text-${Date.now()}-${Math.random()}`
        },
      ]);
    }
    // Clear input state - user can click again to add more text
    setTextInput('');
    setTextPosition(null);
    setIsEditingText(false);
  };

  const handleTextCancel = () => {
    setTextInput('');
    setTextPosition(null);
    setIsEditingText(false);
  };

  const handleUndo = () => {
    setDrawActions(drawActions.slice(0, -1));
  };

  const handleSendFeedback = async () => {
    if (!email || !screenshot) {
      alert('Please provide an email address.');
      return;
    }

    setIsSending(true);
    setCaptureMode('sending');

    try {
      // Get the final annotated image
      const canvas = canvasRef.current;
      if (!canvas) return;

      const imageData = canvas.toDataURL('image/png');

      // Here you would typically send this to your backend API
      // For now, we'll create a mailto link with the feedback
      const mailtoLink = `mailto:${email}?subject=Feedback - Midstream AI Simulator&body=${encodeURIComponent(
        `Feedback Description:\n${description}\n\nPlease find the screenshot attached (you'll need to implement server-side email handling to attach the image).`
      )}`;

      // In a real implementation, you would send the imageData to your backend
      console.log('Feedback data:', {
        email,
        description,
        imageData: imageData.substring(0, 50) + '...',
      });

      // Open mailto (this is a temporary solution)
      window.location.href = mailtoLink;

      // You can also download the image
      const link = document.createElement('a');
      link.download = 'feedback-screenshot.png';
      link.href = imageData;
      link.click();

      setTimeout(() => {
        alert('Screenshot downloaded! Please attach it to your email.');
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Selection Mode */}
      {captureMode === 'selecting' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 cursor-crosshair"
          onMouseDown={handleStartSelection}
          onMouseMove={handleMoveSelection}
          onMouseUp={handleEndSelection}
        >
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
            <p className="text-gray-900 dark:text-white font-medium">
              Click and drag to select an area to capture
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {selectionStart && selectionEnd && (
            <>
              <div
                ref={selectionRef}
                className="fixed border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none z-50"
                style={{
                  left: Math.min(selectionStart.x, selectionEnd.x) - window.scrollX,
                  top: Math.min(selectionStart.y, selectionEnd.y) - window.scrollY,
                  width: Math.abs(selectionEnd.x - selectionStart.x),
                  height: Math.abs(selectionEnd.y - selectionStart.y),
                }}
              >
                <div className="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium">
                  {Math.round(Math.abs(selectionEnd.x - selectionStart.x))} × {Math.round(Math.abs(selectionEnd.y - selectionStart.y))} px
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Annotation Mode */}
      {captureMode === 'annotating' && screenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
            {/* Header with Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-wrap min-h-[60px]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap leading-none">
                Annotate Screenshot
              </h2>

              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

              {/* Annotation Tools */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedTool('pen')}
                  className={`p-2 transition-all h-9 w-9 flex items-center justify-center relative ${
                    selectedTool === 'pen'
                      ? 'text-blue-500'
                      : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Pen"
                >
                  <Pen size={18} strokeWidth={2.5} />
                  {selectedTool === 'pen' && (
                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTool('arrow')}
                  className={`p-2 transition-all h-9 w-9 flex items-center justify-center relative ${
                    selectedTool === 'arrow'
                      ? 'text-blue-500'
                      : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Arrow"
                >
                  <ArrowRight size={18} strokeWidth={2.5} />
                  {selectedTool === 'arrow' && (
                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTool('rectangle')}
                  className={`p-2 transition-all h-9 w-9 flex items-center justify-center relative ${
                    selectedTool === 'rectangle'
                      ? 'text-blue-500'
                      : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Rectangle"
                >
                  <Square size={18} strokeWidth={2.5} />
                  {selectedTool === 'rectangle' && (
                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTool('text')}
                  className={`p-2 transition-all h-9 w-9 flex items-center justify-center relative ${
                    selectedTool === 'text'
                      ? 'text-blue-500'
                      : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Text"
                >
                  <Type size={18} strokeWidth={2.5} />
                  {selectedTool === 'text' && (
                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTool('eraser')}
                  className={`p-2 transition-all h-9 w-9 flex items-center justify-center relative ${
                    selectedTool === 'eraser'
                      ? 'text-blue-500'
                      : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Eraser"
                >
                  <Eraser size={18} strokeWidth={2.5} />
                  {selectedTool === 'eraser' && (
                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                <div className="w-7 h-7 rounded overflow-hidden cursor-pointer border-0" title="Color">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-full cursor-pointer border-0"
                    style={{ border: 'none', outline: 'none' }}
                  />
                </div>

                <button
                  onClick={handleUndo}
                  className="p-2 transition-all text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 flex items-center justify-center"
                  title="Undo"
                  disabled={drawActions.length === 0}
                >
                  <Undo size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 min-w-[20px]" />

              {/* Right side buttons */}
              <button
                onClick={() => setCaptureMode('sending')}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2 transition-all h-9 text-sm font-semibold shadow-sm"
              >
                <Send size={14} strokeWidth={2.5} />
                Next
              </button>

              <button
                onClick={onClose}
                className="p-2 transition-all text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white h-9 w-9 flex items-center justify-center"
                title="Close"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Canvas */}
            <div
              ref={canvasContainerRef}
              className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative"
            >
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className={`max-w-full max-h-full border-2 border-gray-300 dark:border-gray-600 ${
                    draggingTextId
                      ? 'cursor-grabbing'
                      : selectedTool === 'text'
                      ? 'cursor-text'
                      : 'cursor-crosshair'
                  }`}
                  style={{ display: 'block' }}
                />

                {/* Inline Text Input - Positioned on canvas */}
                {isEditingText && textPosition && canvasRef.current && (
                  <div
                    className="absolute z-10"
                    style={{
                      left: `${(textPosition.x / canvasRef.current.width) * canvasRef.current.getBoundingClientRect().width}px`,
                      top: `${(textPosition.y / canvasRef.current.height) * canvasRef.current.getBoundingClientRect().height}px`,
                    }}
                  >
                    <input
                      ref={textInputRef}
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder=""
                      className="px-1 py-0.5 bg-transparent border-0 text-base font-normal focus:outline-none min-w-[100px] caret-current"
                      style={{
                        color: color,
                        fontSize: '20px',
                        fontFamily: 'Arial',
                        caretColor: color,
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTextSubmit();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          handleTextCancel();
                        }
                      }}
                    />
                  </div>
                )}

                {/* Draggable Text Elements */}
                {drawActions
                  .filter((action) => action.tool === 'text' && action.text && action.start)
                  .map((action) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return null;

                    const rect = canvas.getBoundingClientRect();
                    const scaleX = rect.width / canvas.width;
                    const scaleY = rect.height / canvas.height;

                    return (
                      <div
                        key={action.id}
                        className="absolute hover:opacity-80 transition-opacity px-1 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        style={{
                          left: `${(action.start!.x * scaleX)}px`,
                          top: `${(action.start!.y * scaleY)}px`,
                          color: action.color,
                          fontSize: '20px',
                          fontFamily: 'Arial',
                          userSelect: 'none',
                          pointerEvents: draggingTextId === action.id ? 'none' : 'auto',
                          cursor: draggingTextId === action.id ? 'grabbing' : 'grab',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const rect = canvas.getBoundingClientRect();
                          const scaleX = canvas.width / rect.width;
                          const scaleY = canvas.height / rect.height;

                          const clickX = (e.clientX - rect.left) * scaleX;
                          const clickY = (e.clientY - rect.top) * scaleY;

                          setDraggingTextId(action.id!);
                          setDragOffset({
                            x: clickX - action.start!.x,
                            y: clickY - action.start!.y,
                          });
                        }}
                      >
                        {action.text}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Mode */}
      {captureMode === 'sending' && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Send Feedback
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue or feedback..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCaptureMode('annotating')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  Back
                </button>
                <button
                  onClick={handleSendFeedback}
                  disabled={isSending || !email}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send size={16} />
                      Send Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
