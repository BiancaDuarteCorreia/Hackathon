import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import AuthScreen from './auth/AuthScreen';
import { DashboardRH } from './rh/DashboardRH';
import { GerenciarUsuariosRH } from './employees/GerenciarUsuariosRH';
import { GerenciarColaboradoresRH } from './employeesPublic/GerenciarColaboradoresRH'; // <--- Nova tela de colaboradores importada
import { PortalLider } from './leader/PortalLider';
import { PainelInstrutor } from './instructor/PainelInstrutor';
import { Certificados } from './certificates/Certificados';
import { ValidacaoPublica } from './public-verify/ValidacaoPublica';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const adminDataStr = localStorage.getItem('admin_data');
  let userRole = 'RH';

  if (adminDataStr) {
    try {
      const adminData = JSON.parse(adminDataStr);
      userRole = adminData.role || 'RH';
    } catch (e) {
      console.error('Erro ao ler dados do usuário:', e);
    }
  }

  if (userRole === 'ADMIN' || allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  switch (userRole) {
    case 'LEADER':
      return <Navigate to="/lider" replace />;
    case 'INSTRUCTOR':
      return <Navigate to="/instrutor" replace />;
    case 'RH':
    default:
      return <Navigate to="/rh" replace />;
  }
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<AuthScreen />} />

      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        
        <Route 
          path="rh" 
          element={
            <ProtectedRoute allowedRoles={['RH', 'ADMIN']}>
              <DashboardRH />
            </ProtectedRoute>
          } 
        />

        {/* Gerenciamento de Usuários (Restrito estritamente a ADMIN conforme definido anteriormente) */}
        <Route 
          path="usuarios" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <GerenciarUsuariosRH />
            </ProtectedRoute>
          } 
        />

        {/* Nova Rota para Gerenciamento e Cadastro de Colaboradores (RH e ADMIN) */}
        <Route 
          path="colaboradores" 
          element={
            <ProtectedRoute allowedRoles={['RH', 'ADMIN']}>
              <GerenciarColaboradoresRH />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="lider" 
          element={
            <ProtectedRoute allowedRoles={['LEADER', 'ADMIN']}>
              <PortalLider />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="instrutor" 
          element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}>
              <PainelInstrutor />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="certificados" 
          element={
            <ProtectedRoute allowedRoles={['RH', 'ADMIN']}>
              <Certificados />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="validar" 
          element={
            <ProtectedRoute allowedRoles={['RH', 'LEADER', 'INSTRUCTOR', 'ADMIN']}>
              <ValidacaoPublica />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  );
};