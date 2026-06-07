import {Link} from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 font-sans">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-semibold text-neutral-900">Page not found</h1>
        <p className="text-sm text-neutral-600">
          This waiver URL is not registered. Check the merchant and location path.
        </p>
        <Link to="/" className="inline-block text-sm font-medium text-neutral-900 underline underline-offset-2">
          Back to location list
        </Link>
      </div>
    </div>
  );
}
