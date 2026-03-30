import { Routes, Route } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { LinePage } from './pages/LinePage';
import { ChatsPage } from './pages/ChatsPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { CrewPage } from './pages/CrewPage';
import { SignalsPage } from './pages/SignalsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<LinePage />} />
        <Route path="line" element={<LinePage />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="crew" element={<CrewPage />} />
        <Route path="signals" element={<SignalsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
