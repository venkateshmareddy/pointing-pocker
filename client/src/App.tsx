import { Routes, Route } from 'react-router-dom';
import Landing from '@/pages/Landing';
import SessionRoom from '@/pages/SessionRoom';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/room/:roomId" element={<SessionRoom />} />
    </Routes>
  );
}
