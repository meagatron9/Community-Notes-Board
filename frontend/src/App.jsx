import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home loads the main board */}
        <Route path="/" element={<Dashboard />} />

        {/* Allows /board/BOARDID if you want multiple boards later */}
        <Route path="/board/:code" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
