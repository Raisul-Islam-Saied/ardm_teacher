import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./Index";
import Info from "./info";
import Mantainance from "./Mantainance";
import Result from "./Result";
import ResultAnalysisDashboard from "./ResultAnalysisDashboard";
import { MAINTAINANCE_MODE } from "./systemConfig";
import TeacherRegistry from "./TeacherRegistry";
import TopperFinder from "./TopperFinder";

function App() {
  if (MAINTAINANCE_MODE) {
    return <Mantainance />;
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/profile" element={<Index />} />
        <Route path="/search" element={<Index />} />
        <Route path="/admission" element={<Index />} />
        <Route path="/admission/:step" element={<Index />} />
        <Route path="/students/:studentId" element={<Index />} />
        <Route path="/students/:studentId/edit" element={<Index />} />
        <Route path="/students/:studentId/edit/:step" element={<Index />} />
        
        <Route path="/student" element={<Info />} />
        <Route path="/result" element={<Result />} />
        <Route path="/teacher" element={<TeacherRegistry />} />
        <Route path="/topper-finder" element={<TopperFinder />} />
        <Route path="/result-analysis" element={<ResultAnalysisDashboard />} />
        <Route path="/:Id" element={<Info />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;