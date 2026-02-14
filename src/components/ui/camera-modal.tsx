import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

interface CameraModalProps {
  isOpen: boolean;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraModal({ isOpen, onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const videoElement = videoRef.current;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Остановить предыдущий поток
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoElement) {
          videoElement.srcObject = mediaStream;
          streamRef.current = mediaStream;
          setStream(mediaStream);

          // Убедимся что видео запустилось
          videoElement.onloadedmetadata = () => {
            videoElement?.play().catch((e) => {
              console.error("Play error:", e);
              setError("Не удалось запустить видеопоток");
            });
          };
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Не удалось получить доступ к камере";
        setError(errorMessage);
        console.error("Camera error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initCamera();

    // Очистка при закрытии
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        setStream(null);
        streamRef.current = null;
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Установка размеров канваса
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Отрисовка видео на канвас
    ctx.drawImage(video, 0, 0);

    // Преобразование в blob и отправка
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        handleClose();
      }
    }, "image/jpeg");
  };

  const handleToggleCamera = () => {
    // Остановим текущий поток
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setStream(null);
    // Переключим режим и нативно перезагрузим камеру
    setFacingMode(facingMode === "user" ? "environment" : "user");
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-h-screen sm:max-w-2xl sm:max-h-[90vh] bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold">Сфотографировать чек</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Видео */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm">Загрузка камеры...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <p className="text-red-500">{error}</p>
              <p className="text-sm text-muted-foreground">
                Убедитесь что вы разрешили доступ к камере
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                className="w-full h-full object-cover bg-black"
                style={{
                  transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
                }}
              />
              {/* Сетка для выравнивания */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/3 left-0 right-0 border-t border-white" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-white" />
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-white" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-white" />
              </div>
            </>
          )}
          {/* Невидимый canvas для захвата */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Контролы */}
        <div className="p-4 border-t bg-muted/20 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleToggleCamera}
            disabled={isLoading || !stream}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Переключить камеру
          </Button>
          <Button
            onClick={handleCapture}
            disabled={isLoading || !stream}
            className="flex-1"
            size="lg"
          >
            <Camera className="h-4 w-4 mr-2" />
            Снять
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
