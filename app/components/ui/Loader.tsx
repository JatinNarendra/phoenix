import { FaSpinner } from "react-icons/fa";

interface LoaderProps {
  isLoading: boolean;
}

export default function Loader({ isLoading }: LoaderProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center">
        <FaSpinner className="text-4xl text-white animate-spin" />
      </div>
    </div>
  );
}
