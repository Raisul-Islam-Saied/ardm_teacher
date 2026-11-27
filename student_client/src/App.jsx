import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { getPortalSettings } from "./config/systemConfig";
import Index from "./Index";
import Info from "./info";
import Mantainance from "./Mantainance";
import Result from "./Result";
import ResultAnalysisDashboard from "./ResultAnalysisDashboard";
import { systemSettingsApi } from "./services/studentApiService";
import TeacherRegistry from "./TeacherRegistry";
import TopperFinder from "./TopperFinder";
import PasswordRecoveryView from "./views/PasswordRecoveryView";

function App() {
  const [maintenanceMode, setMaintenanceMode] = useState(
    () => Boolean(getPortalSettings().maintenanceMode)
  );

  useEffect(() => {
    let active = true;
    systemSettingsApi
      .getPublicSettings()
      .then((res) => {
        if (!active) return;
        const sp = res?.studentPortal || {};
        if (typeof sp.maintenanceMode === "boolean") {
          setMaintenanceMode(sp.maintenanceMode);
        }
      })
      .catch(() => {
        // অফলাইন বা সার্ভার ডাউন থাকলে localStorage-এ সংরক্ষিত সর্বশেষ সেটিংস ব্যবহার করবে
      });

    return () => {
      active = false;
    };
  }, []);

  if (maintenanceMode) {
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
        <Route path="/password-recovery" element={<PasswordRecoveryView />} />
        
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