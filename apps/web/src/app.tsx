import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Providers } from './components/providers';
import { EmulatorsPage } from './pages/emulators-page';
import { HomePage } from './pages/home-page';
import { PubSubPage } from './pages/pubsub-page';
import { StoragePage } from './pages/storage-page';

export function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/emulators" element={<EmulatorsPage />} />
          <Route path="/emulators/pubsub" element={<PubSubPage />} />
          <Route path="/emulators/storage" element={<StoragePage />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
