type LoadingSpinnerProps = {
  text?: string;
};

export default function LoadingSpinner({ text = "Loading..." }: LoadingSpinnerProps) {
  return <div className="flex justify-center py-20 text-gray-400 font-bold animate-pulse">{text}</div>;
}