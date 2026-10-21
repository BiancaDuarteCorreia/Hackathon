import React, { useState } from 'react';
import { Layout, Menu, Typography, Button, Drawer, Grid, Avatar, ConfigProvider } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  SafetyCertificateOutlined,
  QrcodeOutlined,
  MenuOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  ContactsOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

// Mesma paleta das telas do sistema
const C = {
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate800: '#1e293b',
  slate900: '#0f172a',
  indigo50: '#eef2ff',
  indigo100: '#e0e7ff',
  indigo600: '#4f46e5',
  rose50: '#fff1f2',
  rose600: '#e11d48',
};

const HEADER_HEIGHT = 64;
const SIDER_WIDTH = 248;

type Role = 'ADMIN' | 'RH' | 'LEADER' | 'INSTRUCTOR';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  RH: 'Administração',
  LEADER: 'Líder',
  INSTRUCTOR: 'Instrutor',
};

// Tela inicial de cada cargo (logo, clique na marca e fallback do menu)
const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/rh',
  RH: '/rh',
  LEADER: '/lider',
  INSTRUCTOR: '/instrutor',
};

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  // Cargos que enxergam o item. Sem "roles" = todos.
  roles?: Role[];
};

// Permissões de visualização:
// ADMIN = tudo | RH = Dashboard, Colaboradores, Certificados e Validação
// LEADER = Portal do Líder, Certificados e Validação | INSTRUCTOR = Painel do Instrutor, Certificados e Validação
const NAV_ITEMS: NavItem[] = [
  { key: '/rh', label: 'Dashboard', icon: <DashboardOutlined />, roles: ['ADMIN', 'RH'] },
  { key: '/colaboradores', label: 'Colaboradores', icon: <ContactsOutlined />, roles: ['ADMIN', 'RH'] },
  { key: '/usuarios', label: 'Usuários', icon: <UserSwitchOutlined />, roles: ['ADMIN'] },
  { key: '/lider', label: 'Portal do Líder', icon: <TeamOutlined />, roles: ['ADMIN', 'LEADER'] },
  { key: '/instrutor', label: 'Painel do Instrutor', icon: <VideoCameraOutlined />, roles: ['ADMIN', 'INSTRUCTOR'] },
  { key: '/certificados', label: 'Certificados', icon: <SafetyCertificateOutlined />, roles: ['ADMIN', 'RH', 'LEADER', 'INSTRUCTOR'] },
  { key: '/validar', label: 'Validação Pública', icon: <QrcodeOutlined /> },
];

// Lê o usuário logado e normaliza as roles para evitar que fiquem como null
const readSession = (): { role: Role | null; name: string } => {
  try {
    const raw = localStorage.getItem('admin_data');
    if (!raw) return { role: null, name: '' };
    
    const parsed = JSON.parse(raw);
    const rawRole = String(parsed?.role || parsed?.user?.role || '').toUpperCase().trim();
    
    let role: Role | null = null;
    
    // Mapeamento tolerante a falhas (inglês/português, case-insensitive)
    if (rawRole === 'ADMIN' || rawRole === 'ADMINISTRADOR') {
      role = 'ADMIN';
    } else if (rawRole === 'RH' || rawRole === 'ADMINISTRAÇÃO' || rawRole === 'ADMINISTRACAO') {
      role = 'RH';
    } else if (rawRole === 'LEADER' || rawRole === 'LIDER' || rawRole === 'LÍDER') {
      role = 'LEADER';
    } else if (rawRole === 'INSTRUCTOR' || rawRole === 'INSTRUTOR') {
      role = 'INSTRUCTOR';
    }

    return { 
      role, 
      name: String(parsed?.name || parsed?.nome || parsed?.user?.name || parsed?.email || '').trim() 
    };
  } catch (e) {
    console.error('Erro ao ler sessão:', e);
    return { role: null, name: '' };
  }
};

export const MainLayout: React.FC = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  // < 768px = celular | < 992px = menu lateral vira gaveta
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showSider = !!screens.lg;

  const { role, name } = readSession();
  const homePath = role ? HOME_BY_ROLE[role] : '/validar';

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
  const menuItems = visibleItems.map(({ key, label, icon }) => ({ key, label, icon }));

  // Item selecionado = o de caminho mais específico que combina com a rota atual
  const selectedKey =
    [...visibleItems]
      .sort((a, b) => b.key.length - a.key.length)
      .find((item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`))?.key ?? homePath;

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    navigate('/login', { replace: true });
  };

  const handleNavigate = (key: string) => {
    navigate(key);
    setMobileDrawerOpen(false);
  };

  const brand = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(homePath)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(homePath);
      }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
    >
      <img
        src="https://linsagro.com.br/wp-content/uploads/2022/07/cropped-Lins_Logo_Horizontal_RGB_Preferencial_20250512_Keenwork_AF.png"
        alt="Lins Agroindustrial"
        style={{ height: isMobile ? 26 : 32, width: 'auto', flexShrink: 0 }}
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
      {!isMobile && (
        <>
          <div style={{ width: 1, height: 28, background: C.slate200, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.slate900, letterSpacing: '-0.02em' }}>Gestão de Treinamentos Internos (RH)</span>
          </div>
        </>
      )}
    </div>
  );

  // Menu + botão de sair (reaproveitado no menu lateral e na gaveta)
  const navigation = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => handleNavigate(key)}
        style={{ borderInlineEnd: 0, background: 'transparent', flex: 1 }}
      />

      <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${C.slate100}` }}>
        <Button
          block
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{
            height: 44,
            borderRadius: 12,
            fontWeight: 600,
            background: C.rose50,
            borderColor: C.rose50,
            color: C.rose600,
          }}
        >
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: C.indigo600,
          colorText: C.slate800,
          colorBorder: C.slate200,
          borderRadius: 12,
        },
        components: {
          Menu: {
            itemBg: 'transparent',
            itemColor: C.slate600,
            itemHoverBg: C.slate50,
            itemHoverColor: C.slate900,
            itemSelectedBg: C.indigo50,
            itemSelectedColor: C.indigo600,
            itemBorderRadius: 12,
            itemHeight: 44,
            itemMarginInline: 12,
            itemMarginBlock: 4,
            iconSize: 17,
            fontSize: 14.5,
          },
          Layout: {
            headerBg: '#ffffff',
            siderBg: '#ffffff',
            bodyBg: C.slate50,
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: C.slate50 }}>
        {/* Cabeçalho */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            height: HEADER_HEIGHT,
            lineHeight: 'normal',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: isMobile ? '0 12px' : '0 24px',
            background: '#fff',
            borderBottom: `1px solid ${C.slate100}`,
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {!showSider && (
              <Button
                type="text"
                aria-label="Abrir menu de navegação"
                icon={<MenuOutlined style={{ fontSize: 18, color: C.slate600 }} />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ width: 40, height: 40, borderRadius: 12 }}
              />
            )}
            {brand}
          </div>

          {/* Pessoa logada */}
          {(name || role) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2, minWidth: 0 }}>
                  <Text
                    strong
                    ellipsis
                    style={{ color: C.slate800, fontSize: 14, maxWidth: 220 }}
                  >
                    {name || (role ? ROLE_LABELS[role] : '')}
                  </Text>
                  {name && role && <span style={{ fontSize: 12, color: C.slate500 }}>{ROLE_LABELS[role]}</span>}
                </div>
              )}
              <Avatar
                shape="square"
                size={38}
                style={{
                  flexShrink: 0,
                  backgroundColor: C.indigo50,
                  color: C.indigo600,
                  border: `1px solid ${C.indigo100}`,
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                {(name || (role ? ROLE_LABELS[role] : '?')).charAt(0).toUpperCase()}
              </Avatar>
            </div>
          )}
        </Header>

        <Layout hasSider style={{ background: C.slate50 }}>
          {/* Menu lateral (desktop) */}
          {showSider && (
            <Sider
              width={SIDER_WIDTH}
              theme="light"
              style={{
                position: 'sticky',
                top: HEADER_HEIGHT,
                height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                overflowY: 'auto',
                background: '#fff',
                borderRight: `1px solid ${C.slate100}`,
              }}
            >
              <div style={{ height: '100%', paddingTop: 12 }}>{navigation}</div>
            </Sider>
          )}

          {/* Gaveta de navegação (celular e tablet) */}
          <Drawer
            title={<div style={{ color: C.slate900, fontWeight: 700, fontSize: 16 }}>Menu de Navegação</div>}
            placement="left"
            onClose={() => setMobileDrawerOpen(false)}
            open={mobileDrawerOpen && !showSider}
            size={280}
            styles={{
              header: { borderBottom: `1px solid ${C.slate100}`, background: 'rgba(248,250,252,0.5)' },
              body: { padding: '12px 0 0' },
            }}
          >
            {navigation}
          </Drawer>

          <Layout style={{ background: C.slate50, minWidth: 0 }}>
            <Content
              style={{
                padding: isMobile ? 12 : 24,
                minWidth: 0,
                minHeight: `calc(100vh - ${HEADER_HEIGHT}px - 53px)`,
              }}
            >
              <Outlet />
            </Content>

            <Footer
              style={{
                padding: '16px 24px',
                textAlign: 'center',
                background: 'transparent',
                borderTop: `1px solid ${C.slate100}`,
              }}
            >
            </Footer>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};