import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Camera, CameraOff, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface EnhancedFaceCameraProps {
  onFaceDetected?: (descriptor: Float32Array) => void;
  onFaceCount?: (count: number) => void;
  isCapturing?: boolean;
  className?: string;
  showControls?: boolean;
}

export function EnhancedFaceCamera({
  onFaceDetected,
  onFaceCount,
  isCapturing = true,
  className = "",
  showControls = true,
}: EnhancedFaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>("");
  const [detectionStats, setDetectionStats] = useState({
    faceCount: 0,
    confidence: 0,
    lastDetection: null as Date | null,
  });

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading models:", err);
        setError("Gagal memuat model face recognition");
      }
    };

    loadModels();
  }, []);

  // Get available cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !currentDevice) {
          setCurrentDevice(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error getting devices:", err);
      }
    };

    getDevices();
  }, []);

  // Start camera
  useEffect(() => {
    if (!modelsLoaded) return;

    const startCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: currentDevice
            ? { deviceId: { exact: currentDevice } }
            : { facingMode: "user" },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
        setCameraActive(false);
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded, currentDevice]);

  // Face detection
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !cameraActive || !isCapturing) {
      return;
    }

    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };

        faceapi.matchDimensions(canvasRef.current, displaySize);

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          // Draw detections with custom styling
          resizedDetections.forEach((detection) => {
            const box = detection.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, {
              boxColor: "#3b82f6",
              lineWidth: 3,
              label: "Face Detected",
            });
            drawBox.draw(canvasRef.current!);

            // Draw landmarks
            const landmarks = detection.landmarks;
            const drawLandmarks = new faceapi.draw.DrawFaceLandmarks(landmarks);
            drawLandmarks.draw(canvasRef.current!);
          });
        }

        // Update stats
        const faceCount = detections.length;
        setDetectionStats({
          faceCount,
          confidence: detections[0]?.detection.score || 0,
          lastDetection: new Date(),
        });

        if (onFaceCount) {
          onFaceCount(faceCount);
        }

        // If exactly one face detected, call callback
        if (detections.length === 1 && onFaceDetected) {
          const descriptor = detections[0].descriptor;
          onFaceDetected(descriptor);
        }
      } catch (err) {
        console.error("Error detecting faces:", err);
      }
    };

    detectionIntervalRef.current = setInterval(detectFaces, 500);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [cameraActive, isCapturing, onFaceDetected, onFaceCount]);

  const handleSwitchCamera = () => {
    const currentIndex = devices.findIndex((d) => d.deviceId === currentDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    setCurrentDevice(devices[nextIndex].deviceId);
  };

  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <CameraOff className="w-16 h-16 text-destructive" />
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-destructive">Kamera Error</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          {/* Video and Canvas */}
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-auto"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-white mx-auto" />
                  <p className="text-white text-sm">Memuat kamera...</p>
                </div>
              </div>
            )}

            {/* Detection Stats Overlay */}
            {!isLoading && cameraActive && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      detectionStats.faceCount > 0 ? "bg-green-500" : "bg-red-500"
                    } animate-pulse`}
                  />
                  <span>
                    {detectionStats.faceCount === 0
                      ? "Tidak ada wajah"
                      : detectionStats.faceCount === 1
                      ? "1 wajah terdeteksi"
                      : `${detectionStats.faceCount} wajah terdeteksi`}
                  </span>
                </div>
                {detectionStats.faceCount > 0 && (
                  <div>Confidence: {(detectionStats.confidence * 100).toFixed(0)}%</div>
                )}
              </div>
            )}

            {/* Camera Controls */}
            {showControls && !isLoading && cameraActive && devices.length > 1 && (
              <div className="absolute bottom-4 right-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSwitchCamera}
                  className="bg-black/70 backdrop-blur-sm hover:bg-black/80"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Ganti Kamera
                </Button>
              </div>
            )}

            {/* Guidance Text */}
            {!isLoading && cameraActive && detectionStats.faceCount === 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm text-center">
                Posisikan wajah Anda di depan kamera
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {!isLoading && cameraActive && (
        <div className="mt-4 text-center text-sm text-muted-foreground space-y-1">
          <p>• Pastikan wajah Anda terlihat jelas</p>
          <p>• Hindari pencahayaan yang terlalu terang atau gelap</p>
          <p>• Lihat langsung ke kamera</p>
        </div>
      )}
    </div>
  );
}
