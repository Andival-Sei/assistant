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
    if (!videoElement) return;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Проверка доступности MediaDevices API
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          let message =
            "Камера недоступна. Убедитесь, что вы используете современный браузер.";

          // Проверка HTTPS
          if (
            location.protocol !== "https:" &&
            location.hostname !== "localhost" &&
            location.hostname !== "127.0.0.1"
          ) {
            message =
              "Для доступа к камере требуется HTTPS-соединение. Используйте безопасное соединение или localhost.";
          }

          throw new Error(message);
        }

        // Остановить предыдущий поток
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Запросить видео поток
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
          },
          audio: false,
        });

        // Установить поток в ref и state
        streamRef.current = mediaStream;
        setStream(mediaStream);

        // Установить поток на видео элемент ТОЛЬКО если её ещё нет
        if (videoElement.srcObject !== mediaStream && !videoElement.srcObject) {
          videoElement.srcObject = mediaStream;
          console.log("Stream set to video element");
        }
      } catch (err) {
        let errorMessage = "Не удалось получить доступ к камере";

        if (err instanceof Error) {
          // Обработка разных типов ошибок
          if (
            err.name === "NotAllowedError" ||
            err.message.includes("Permission denied")
          ) {
            errorMessage =
              "Доступ к камере запрещён. Разрешите доступ к камере в настройках браузера.";
          } else if (
            err.name === "NotFoundError" ||
            err.message.includes("No device")
          ) {
            errorMessage =
              "Камера не найдена. Убедитесь, что камера подключена и работает.";
          } else if (
            err.name === "NotReadableError" ||
            err.message.includes("in use")
          ) {
            errorMessage =
              "Камера уже используется другим приложением. Закройте другие приложения, использующие камеру.";
          } else if (
            err.name === "OverconstrainedError" ||
            err.message.includes("constraints")
          ) {
            errorMessage =
              "Камера не поддерживает требуемые параметры. Попробуйте переключить камеру.";
          } else if (err.message.includes("HTTPS")) {
            errorMessage =
              "Для доступа к камере требуется HTTPS-соединение. Используйте безопасное соединение.";
          } else {
            errorMessage = err.message;
          }
        }

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
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log("Track stopped:", track.kind);
        });
        streamRef.current = null;
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
      setStream(null);
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        console.error("Missing refs");
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      console.log("Video dimensions:", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        networkState: video.networkState,
      });

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError("Видео ещё не загружено, подождите...");
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      // Установка размеров канваса
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Отрисовка видео на канвас
      ctx.drawImage(video, 0, 0);

      // Преобразование в blob и отправка
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log("Captured image, blob size:", blob.size);
            onCapture(blob);
            handleClose();
          } else {
            setError("Не удалось захватить изображение");
          }
        },
        "image/jpeg",
        0.95
      );
    } catch (err) {
      console.error("Capture error:", err);
      setError(
        `Ошибка при захвате: ${err instanceof Error ? err.message : "неизвестная ошибка"}`
      );
    }
  };

  const handleVideoCanPlay = async () => {
    console.log(
      "Video can play, videoWidth:",
      videoRef.current?.videoWidth,
      "videoHeight:",
      videoRef.current?.videoHeight
    );
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        console.log("Video started playing");
        setIsLoading(false);
      } catch (err) {
        console.error("Play error:", err);
        setError("Не удалось запустить видеопоток");
      }
    }
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
            <div className="flex flex-col items-center gap-4 text-center p-6">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-500" />
              </div>
              <div className="space-y-2">
                <p className="text-red-500 font-medium">{error}</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Убедитесь что вы разрешили доступ к камере</p>
                  {location.protocol !== "https:" &&
                    location.hostname !== "localhost" &&
                    location.hostname !== "127.0.0.1" && (
                      <p className="text-amber-500 font-medium">
                        ⚠️ Требуется HTTPS-соединение для доступа к камере
                      </p>
                    )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Обновить страницу
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleCamera}
                >
                  Попробовать снова
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                disablePictureInPicture
                onCanPlay={handleVideoCanPlay}
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
