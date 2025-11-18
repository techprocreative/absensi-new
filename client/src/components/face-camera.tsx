import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Camera, AlertCircle } from "lucide-react";

interface FaceCameraProps {
  onFaceDetected?: (descriptor: Float32Array) => void;
  onNoFaceDetected?: () => void;
  isCapturing?: boolean;
  className?: string;
}

export function FaceCamera({ 
  onFaceDetected, 
  onNoFaceDetected,
  isCapturing = false,
  className 
}: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setError("Gagal memuat model face recognition");
        setLoading(false);
      }
    };

    loadModels();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!modelsLoaded) return;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          videoRef.current.onloadedmetadata = () => {
            setLoading(false);
            setDetectionActive(true);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
        setLoading(false);
      }
    };

    startVideo();
  }, [modelsLoaded]);

  useEffect(() => {
    if (!detectionActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    let animationFrame: number;

    const detectFace = async () => {
      if (!video.paused && !video.ended && video.readyState === video.HAVE_ENOUGH_DATA) {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (detection) {
          const resizedDetection = faceapi.resizeResults(detection, displaySize);
          
          if (ctx) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            const box = resizedDetection.detection.box;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          }

          if (isCapturing && onFaceDetected) {
            onFaceDetected(detection.descriptor);
          }
        } else {
          if (onNoFaceDetected) {
            onNoFaceDetected();
          }
        }
      }

      animationFrame = requestAnimationFrame(detectFace);
    };

    detectFace();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [detectionActive, isCapturing, onFaceDetected, onNoFaceDetected]);

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`relative overflow-hidden ${className}`} data-testid="card-face-camera">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card z-10 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat kamera...</p>
        </div>
      )}
      
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-auto rounded-lg"
          data-testid="video-camera-feed"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          data-testid="canvas-face-overlay"
        />
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
        <Camera className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">Posisikan wajah Anda di depan kamera</span>
      </div>
    </Card>
  );
}
