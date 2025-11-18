import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import * as faceapi from "face-api.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Camera, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { employeeApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FaceRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
}

type CapturedDescriptor = {
  vector: number[];
  confidence: number;
};

export function FaceRegistrationModal({
  open,
  onOpenChange,
  employee,
}: FaceRegistrationModalProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedDescriptors, setCapturedDescriptors] = useState<CapturedDescriptor[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>("");

  const targetCaptures = 3;
  const progress = (capturedDescriptors.length / targetCaptures) * 100;

  const registerMutation = useMutation({
    mutationFn: (descriptors: CapturedDescriptor[]) =>
      employeeApi.registerFace(employee.id, descriptors),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Berhasil!",
        description: "Wajah berhasil didaftarkan",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal mendaftarkan wajah",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open) {
      loadModels();
    } else {
      cleanup();
    }
  }, [open]);

  const loadModels = async () => {
    try {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      startCamera();
    } catch (err) {
      console.error("Error loading models:", err);
      setError("Gagal memuat model face recognition");
      toast({
        title: "Error",
        description: "Gagal memuat model face recognition",
        variant: "destructive",
      });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          setError("");
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Gagal mengakses kamera");
      toast({
        title: "Error",
        description: "Gagal mengakses kamera. Pastikan izin kamera diberikan.",
        variant: "destructive",
      });
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setModelsLoaded(false);
    setCapturedDescriptors([]);
    setError("");
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || isCapturing) {
      return;
    }

    setIsCapturing(true);
    setError("");

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("Wajah tidak terdeteksi. Posisikan wajah di depan kamera.");
        toast({
          title: "Wajah Tidak Terdeteksi",
          description: "Posisikan wajah Anda di depan kamera",
          variant: "destructive",
        });
        setIsCapturing(false);
        return;
      }

      // Draw detection on canvas
      const canvas = canvasRef.current;
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      const resizedDetection = faceapi.resizeResults(detection, displaySize);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, [resizedDetection]);
        faceapi.draw.drawFaceLandmarks(canvas, [resizedDetection]);
      }

      // Store descriptor with confidence metadata
      const descriptor: CapturedDescriptor = {
        vector: Array.from(detection.descriptor),
        confidence: detection.detection.score,
      };
      setCapturedDescriptors((prev) => [...prev, descriptor]);

      toast({
        title: "Berhasil!",
        description: `Foto ${capturedDescriptors.length + 1}/${targetCaptures} berhasil diambil`,
      });
    } catch (err) {
      console.error("Error capturing face:", err);
      setError("Gagal mendeteksi wajah");
      toast({
        title: "Error",
        description: "Gagal mendeteksi wajah. Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = () => {
    if (capturedDescriptors.length < targetCaptures) {
      toast({
        title: "Belum Cukup",
        description: `Capture minimal ${targetCaptures} foto wajah`,
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(capturedDescriptors);
  };

  const handleReset = () => {
    setCapturedDescriptors([]);
    setError("");
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const isComplete = capturedDescriptors.length >= targetCaptures;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrasi Wajah</DialogTitle>
          <DialogDescription>
            Daftarkan wajah untuk {employee?.name} ({employee?.employeeId})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
            
            {!modelsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                  <p>Memuat model...</p>
                </div>
              </div>
            )}

            {modelsLoaded && !cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p>Mengaktifkan kamera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Foto Terambil: {capturedDescriptors.length}/{targetCaptures}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-medium text-sm">Instruksi:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Pastikan pencahayaan cukup</li>
              <li>Posisikan wajah di tengah kamera</li>
              <li>Tatap kamera dengan jelas</li>
              <li>Ambil {targetCaptures} foto dari berbagai sudut sedikit</li>
            </ol>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {isComplete && !error && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Semua foto berhasil diambil! Klik "Daftarkan" untuk menyimpan.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={registerMutation.isPending}
          >
            Batal
          </Button>
          
          {capturedDescriptors.length > 0 && !isComplete && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={registerMutation.isPending}
            >
              Reset
            </Button>
          )}

          {!isComplete ? (
            <Button
              type="button"
              onClick={captureFrame}
              disabled={!cameraReady || isCapturing || registerMutation.isPending}
            >
              {isCapturing && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              <Camera className="mr-2 w-4 h-4" />
              Ambil Foto ({capturedDescriptors.length}/{targetCaptures})
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending && (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              )}
              <CheckCircle2 className="mr-2 w-4 h-4" />
              Daftarkan Wajah
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
