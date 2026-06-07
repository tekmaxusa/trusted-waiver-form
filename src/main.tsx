import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './routes/HomePage.tsx';
import WaiverRoutePage from './routes/WaiverRoutePage.tsx';
import './index.css';

const rawBase = import.meta.env.BASE_URL;
const basename =
  rawBase === '/' || rawBase === '' ? undefined : rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path=":merchantSlug/:waiverSlug" element={<WaiverRoutePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
