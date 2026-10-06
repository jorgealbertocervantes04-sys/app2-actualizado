import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Course from "./pages/Course";
import Result from "./pages/Result";
import Certificate from "./pages/Certificate";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/curso/:sessionId" element={<Course />} />
      <Route path="/resultado/:sessionId" element={<Result />} />
      <Route path="/certificado/:sessionId" element={<Certificate />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
