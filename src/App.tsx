import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { AppRoutes } from './views/routes';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: '#0032A0',
          colorSuccess: '#00B5AD',
          colorWarning: '#F59E0B',
          colorError: '#DC2626',
          colorInfo: '#3063D6',
          colorText: '#2d3748',
          colorTextHeading: '#0f172a',
          borderRadius: 6,
          fontFamily: "'Noto Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          colorBgLayout: '#f8fafc',
          colorBorderSecondary: '#eaecf0',
          fontSize: 13,
        },
        components: {
          Card: {
            borderRadiusLG: 6,
            paddingLG: 16,
            headerHeight: 44,
            boxShadowTertiary: 'none',
          },
          Button: {
            borderRadius: 4,
            controlHeight: 34,
            fontSize: 13,
            fontWeight: 500,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            rowHoverBg: '#f1f5f9',
            cellPaddingBlock: 10,
            cellPaddingInline: 12,
            fontSize: 13,
          },
          Menu: {
            itemSelectedBg: '#ebf2ff',
            itemSelectedColor: '#0032A0',
            itemHoverBg: '#f1f5f9',
            itemHeight: 38,
            fontSize: 13,
          },
          Statistic: {
            contentFontSize: 22,
            titleFontSize: 12,
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;