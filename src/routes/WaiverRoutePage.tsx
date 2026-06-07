import {useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {resolveWaiverLocation} from '../merchants/registry';
import App from '../App';
import NotFoundPage from './NotFoundPage';

export default function WaiverRoutePage() {
  const {merchantSlug, waiverSlug} = useParams<{merchantSlug: string; waiverSlug: string}>();
  const location = resolveWaiverLocation(merchantSlug, waiverSlug);

  useEffect(() => {
    if (location?.documentTitle) {
      document.title = location.documentTitle;
    }
  }, [location]);

  if (!location) {
    return <NotFoundPage />;
  }

  return <App location={location} />;
}
