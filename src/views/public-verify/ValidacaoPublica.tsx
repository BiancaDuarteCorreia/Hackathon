import React, { useState, useCallback, useEffect } from 'react';
import {
  Input,
  Typography,
  Tag,
  message,
  Avatar,
  Spin,
  ConfigProvider,
  Grid,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useValidacaoPublica } from './useValidacaoPublica'; // Ajuste o caminho se estiver em ./hooks/useValidacaoPublica

const { Text } = Typography;
const { useBreakpoint } = Grid;

// Mesma paleta do Portal do Líder (slate / indigo / emerald / rose)
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
  indigo200: '#c7d2fe',
  indigo500: '#6366f1',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  emerald50: '#ecfdf5',
  emerald200: '#a7f3d0',
  emerald600: '#059669',
  emerald700: '#047857',
  rose50: '#fff1f2',
  rose200: '#fecdd3',
  rose600: '#e11d48',
  rose700: '#be123c',
};

const surfaceCardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  border: `1px solid ${C.slate100}`,
  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: C.slate500,
};

const badgeStyle = (bg: string, border: string, color: string): React.CSSProperties => ({
  background: bg,
  borderColor: border,
  color,
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '2px 10px',
  margin: 0,
});

const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const prefixIconStyle: React.CSSProperties = { color: C.slate400, fontSize: 16, marginRight: 6 };

// Lê o código da URL (ex.: ?codigo=CERT-2026-X89B4K), que é o que um QR Code aponta
const getCodeFromUrl = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('codigo') || params.get('code') || '').trim().toUpperCase();
  } catch {
    return '';
  }
};

export const ValidacaoPublica: React.FC = () => {
  const [queryCode, setQueryCode] = useState('');

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Estabilizando a função de alerta para evitar re-renderizações infinitas
  const handleAlert = useCallback((type: 'success' | 'error' | 'warning', title: string, msg: string) => {
    if (type === 'error') message.error(`${title}: ${msg}`);
    if (type === 'warning') message.warning(msg);
    if (type === 'success') message.success(msg);
  }, []);

  const { verifiedCert, loading, searched, validateCertificate } = useValidacaoPublica(handleAlert);

  const handleSearch = (value: string) => {
    validateCertificate(value);
  };

  // Se a página foi aberta por um link/QR Code com o código, valida automaticamente
  useEffect(() => {
    const urlCode = getCodeFromUrl();
    if (urlCode) {
      setQueryCode(urlCode);
      validateCertificate(urlCode);
    }
  }, [validateCertificate]);

  const detailRows: { label: string; value: React.ReactNode }[] = verifiedCert
    ? [
        { label: 'Colaborador', value: <strong style={{ color: C.indigo700 }}>{verifiedCert.employeeName}</strong> },
        { label: 'Setor', value: verifiedCert.department },
        { label: 'Treinamento', value: <strong>{verifiedCert.trainingTitle}</strong> },
        { label: 'Carga horária', value: `${verifiedCert.workloadHours} horas` },
        { label: 'Data de conclusão', value: verifiedCert.completionDate },
        { label: 'Instrutor', value: verifiedCert.instructorName },
      ]
    : [];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: C.indigo600,
          colorText: C.slate800,
          colorTextSecondary: C.slate500,
          colorBorder: C.slate200,
          colorTextPlaceholder: C.slate400,
          borderRadius: 12,
        },
        components: {
          Input: {
            colorBgContainer: C.slate50,
            hoverBg: '#fff',
            activeBg: '#fff',
            hoverBorderColor: C.slate400,
            activeBorderColor: C.indigo500,
            activeShadow: '0 0 0 4px rgba(99,102,241,0.12)',
            controlHeight: 48,
            paddingInline: 16,
            fontSize: isMobile ? 16 : 15,
          },
          Button: {
            controlHeight: 48,
            fontWeight: 600,
          },
        },
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          margin: '0 auto',
          padding: isMobile ? '16px 12px' : '32px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 16 : 24,
        }}
      >
        {/* Cabeçalho */}
        <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 32, textAlign: 'center' }}>
          <img
            src="https://linsagro.com.br/wp-content/uploads/2022/07/cropped-Lins_Logo_Horizontal_RGB_Preferencial_20250512_Keenwork_AF.png"
            alt="Lins Agroindustrial"
            style={{ height: 34, objectFit: 'contain', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? 10 : 12,
                borderRadius: 16,
                background: C.indigo50,
                color: C.indigo600,
                border: `1px solid ${C.indigo100}`,
                fontSize: isMobile ? 20 : 24,
              }}
            >
              <SafetyCertificateOutlined />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.slate900, letterSpacing: '-0.025em' }}>
                Validação de Certificados
              </h2>
              <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.slate500 }}>
                Confira a autenticidade de certificados da Lins Agroindustrial.
              </p>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 24 }}>
          <span style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Código de validação</span>
          <Input.Search
            allowClear
            value={queryCode}
            onChange={(e) => setQueryCode(e.target.value.toUpperCase())}
            onSearch={handleSearch}
            prefix={<SearchOutlined style={prefixIconStyle} />}
            placeholder="Ex: CERT-2026-X89B4K"
            aria-label="Código de validação do certificado"
            enterButton={loading ? 'Buscando...' : 'Validar'}
            disabled={loading}
          />
          <p style={{ margin: '8px 0 0', fontSize: 13, color: C.slate500 }}>
            O código está impresso no certificado, ao lado da assinatura.
          </p>
        </div>

        {/* Resultado */}
        <Spin spinning={loading}>
          {searched && !loading && (
            <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 24, overflow: 'hidden' }}>
              {verifiedCert ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: C.emerald50,
                      border: `1px solid ${C.emerald200}`,
                    }}
                  >
                    <CheckCircleFilled style={{ color: C.emerald600, fontSize: 28, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.emerald700 }}>Certificado autêntico</div>
                      <div style={{ fontSize: 13, color: C.slate600, wordBreak: 'break-all' }}>
                        Registro <span style={{ ...codeStyle, color: C.emerald700 }}>{verifiedCert.code}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 20, flexWrap: 'wrap' }}>
                    {verifiedCert.attendancePhotoUrl ? (
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <Avatar
                          shape="square"
                          size={80}
                          src={verifiedCert.attendancePhotoUrl}
                          style={{ border: `1px solid ${C.slate200}`, borderRadius: 12 }}
                        />
                        <div style={{ ...labelStyle, fontSize: 10, marginTop: 4 }}>Presença facial</div>
                      </div>
                    ) : (
                      <Avatar
                        shape="square"
                        size={80}
                        icon={<SafetyCertificateOutlined />}
                        style={{
                          flexShrink: 0,
                          backgroundColor: C.indigo50,
                          color: C.indigo600,
                          border: `1px solid ${C.indigo100}`,
                          borderRadius: 12,
                          fontSize: 32,
                        }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detailRows.map((row) => (
                        <div
                          key={row.label}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: '#fff',
                            border: `1px solid ${C.slate100}`,
                          }}
                        >
                          <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>{row.label}</div>
                          <div style={{ color: C.slate800, fontSize: 15, wordBreak: 'break-word' }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Tag style={badgeStyle(C.emerald50, C.emerald200, C.emerald600)}>Ativo e conforme</Tag>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: C.rose50,
                    border: `1px solid ${C.rose200}`,
                  }}
                >
                  <CloseCircleFilled style={{ color: C.rose600, fontSize: 28, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.rose700 }}>Certificado não encontrado</div>
                    <div style={{ fontSize: 14, color: C.slate600, marginTop: 2 }}>
                      O código não corresponde a nenhum certificado ativo. Confira se ele foi digitado como está impresso
                      no certificado, por exemplo CERT-2026-X89B4K.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Spin>
      </div>
    </ConfigProvider>
  );
};
