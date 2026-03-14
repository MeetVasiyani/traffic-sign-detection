import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Detection from "./pages/Detection";
import MissingSignPrediction from "./pages/MissingSignPrediction";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/missing-sign" element={<MissingSignPrediction />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
