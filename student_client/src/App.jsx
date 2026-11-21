import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./Index";
import TeacherRegistry from "./TeacherRegistry";
import Info from "./info";
import ResultAnalysisDashboard from "./ResultAnalysisDashboard";
import TopperFinder from "./TopperFinder";
import Mantainance from "./Mantainance";
import Result from "./Result";
import { MAINTAINANCE_MODE } from "./systemConfig";

function App() {
  if(MAINTAINANCE_MODE) {
    return <Mantainance/>
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/student" element={<Info />} />
        <Route path="/:Id" element={<Info />} />
        <Route path="/result" element={<Result/>} />
      <Route path="/teacher" element={<TeacherRegistry/>} />
      <Route path="/topper-finder" element={<TopperFinder/>} />
      <Route path="/result-analysis" element={<ResultAnalysisDashboard/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
