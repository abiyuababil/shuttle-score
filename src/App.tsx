import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BracketPage from "./pages/BracketPage";
import ScorekeeperPage from "./pages/ScorekeeperPage";

export default function App() {
  return (
    <div className="min-h-[100dvh] bg-surface">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tournament/:id" element={<BracketPage />} />
        <Route path="/match/:id" element={<ScorekeeperPage />} />
      </Routes>
    </div>
  );
}
