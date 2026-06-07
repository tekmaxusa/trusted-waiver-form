import {Link} from 'react-router-dom';
import {listAllWaiverHrefPaths} from '../merchants/registry';

/** Root index: links to every waiver route (mirrors TrustedWaiver discovery). */
export default function HomePage() {
  const paths = listAllWaiverHrefPaths();
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-16 font-sans">
      <div className="max-w-lg w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Saheli Eyebrow Threading</h1>
          <p className="text-sm text-neutral-500 mt-2">Select your salon location to open the client waiver.</p>
        </div>
        <ul className="space-y-2">
          {paths.map((href) => (
            <li key={href}>
              <Link
                to={href}
                className="block w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 text-sm font-medium text-neutral-800 transition-colors"
              >
                /{href}/
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
