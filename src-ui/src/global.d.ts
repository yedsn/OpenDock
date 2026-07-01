type FullscreenLoadingParam = string | { message?: string; count?: number };

interface Window {
  vloading?: {
    show: (param?: FullscreenLoadingParam) => void;
    loading: (param?: FullscreenLoadingParam) => void;
    dismiss: () => void;
  };
}

// Vite worker imports (?worker suffix). Keeps TypeScript from choking on the query string.
declare module "*?worker" {
  const WorkerCtor: { new (): Worker };
  export default WorkerCtor;
}
