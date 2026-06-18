import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import TemplatesPage from '@/pages/TemplatesPage';
import InstancesPage from '@/pages/InstancesPage';
import NewInstancePage from '@/pages/NewInstancePage';
import DesignerPage from '@/pages/DesignerPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '10px',
            border: '1px solid #f3f4f6',
          },
        }}
      />
      <Routes>
        {/* Designer is full-screen, no sidebar */}
        <Route path="/diseñador" element={<DesignerPage />} />
        <Route path="/plantillas/:id" element={<DesignerPage />} />
        <Route path="/plantillas/nueva" element={<DesignerPage />} />
        <Route path="/instancias/:id" element={<DesignerPage />} />

        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/plantillas" element={<TemplatesPage />} />
          <Route path="/instancias" element={<InstancesPage />} />
          <Route path="/instancias/nueva" element={<NewInstancePage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
