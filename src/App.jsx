import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Track from './pages/Track';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/track/:sessionId" element={<Track />} />
      </Routes>
    </Router>
  );
}

export default App;
