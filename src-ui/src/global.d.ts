type FullscreenLoadingParam = string | { message?: string; count?: number };

interface Window {
  vloading?: {
    show: (param?: FullscreenLoadingParam) => void;
    loading: (param?: FullscreenLoadingParam) => void;
    dismiss: () => void;
  };
}