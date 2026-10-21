import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Button,
  Tag,
  Modal,
  Input,
  message,
  Avatar,
  Spin,
  ConfigProvider,
  Grid,
  Pagination,
  Empty,
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  CheckCircleFilled,
  SafetyCertificateOutlined,
  SearchOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useCertificados } from './useCertificados';
import type { Certificate } from './useCertificados';
import { downloadCertificatePdf } from './certificadoPdf';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 9;

// Mesma paleta do Portal do Líder (slate / indigo / emerald)
const C = {
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
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

const prefixIconStyle: React.CSSProperties = { color: C.slate400, fontSize: 16, marginRight: 6 };

const modalHeaderStyle = (isMobile: boolean): React.CSSProperties => ({
  padding: isMobile ? 16 : 24,
  margin: 0,
  borderBottom: `1px solid ${C.slate100}`,
  background: 'rgba(248,250,252,0.5)',
  borderRadius: '16px 16px 0 0',
});

const cancelButtonStyle = (isMobile: boolean): React.CSSProperties => ({
  flex: isMobile ? 1 : undefined,
  background: C.slate100,
  borderColor: C.slate100,
  color: C.slate600,
  borderRadius: 12,
  height: 46,
  padding: '0 20px',
  fontWeight: 600,
});

const primaryButtonStyle = (isMobile?: boolean): React.CSSProperties => ({
  flex: isMobile ? 1 : undefined,
  backgroundColor: C.indigo600,
  borderColor: C.indigo600,
  color: '#fff',
  borderRadius: 12,
  height: 46,
  padding: '0 20px',
  fontWeight: 600,
  boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
});

const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: C.indigo700,
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export const Certificados: React.FC = () => {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [downloading, setDownloading] = useState<boolean>(false);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const columns = isMobile ? 1 : screens.lg ? 3 : 2;

  // Estabilizando a função de alerta para evitar loop infinito
  const handleAlert = useCallback((type: 'success' | 'error', title: string, msg: string) => {
    if (type === 'error') message.error(`${title}: ${msg}`);
    if (type === 'success') message.success(msg);
  }, []);

  const { certificates, filteredCertificates, search, setSearch, loading, fetchCertificates } =
    useCertificados(handleAlert);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCertificates = filteredCertificates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePreview = (cert: Certificate) => {
    setSelectedCert(cert);
    setIsPreviewOpen(true);
  };

  // Gera o PDF (A4 paisagem, só o certificado) e baixa direto, sem abrir a impressão
  const handleDownload = async () => {
    if (!selectedCert) return;
    setDownloading(true);
    try {
      await downloadCertificatePdf(selectedCert);
      message.success('PDF do certificado gerado.');
    } catch (error) {
      console.error('Erro ao gerar PDF do certificado:', error);
      message.error('Não foi possível gerar o PDF do certificado.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      message.success('Código copiado.');
    } catch {
      message.error('Não foi possível copiar o código.');
    }
  };

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
          Modal: {
            contentBg: '#fff',
            headerBg: 'rgba(248,250,252,0.5)',
            borderRadiusLG: 16,
          },
          Button: {
            controlHeight: 46,
            fontWeight: 600,
          },
        },
      }}
    >
      <div style={{ width: '100%', minWidth: 0, maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
        {/* Cabeçalho */}
        <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 32 }}>
          <div
            className="lins-page-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: isMobile ? 16 : 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
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
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.slate900, letterSpacing: '-0.025em' }}>
                  Certificados Emitidos
                </h2>
                <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.slate500 }}>
                  Consulta e exportação de certificados da Universidade Corporativa Lins Agro.
                </p>
              </div>
            </div>

            <Tag style={badgeStyle(C.indigo50, C.indigo200, C.indigo600)}>
              {certificates.length === 1 ? '1 certificado' : `${certificates.length} certificados`}
            </Tag>
          </div>
        </div>

        {/* Lista */}
        <div style={{ ...surfaceCardStyle, padding: isMobile ? 12 : 16 }}>
          <div style={{ marginBottom: 12 }}>
            <Input
              allowClear
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              prefix={<SearchOutlined style={prefixIconStyle} />}
              placeholder="Buscar por colaborador, treinamento, setor ou código"
              aria-label="Buscar certificados"
            />
          </div>

          <Spin spinning={loading}>
            {filteredCertificates.length === 0 && !loading ? (
              <Empty
                description={search ? 'Nenhum certificado encontrado para essa busca' : 'Nenhum certificado emitido até o momento'}
                style={{ padding: '24px 0' }}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: 12,
                  minHeight: loading ? 120 : undefined,
                }}
              >
                {pagedCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    style={{
                      minWidth: 0,
                      padding: 14,
                      borderRadius: 14,
                      background: '#fff',
                      border: `1px solid ${C.slate100}`,
                      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar
                        shape="square"
                        size={40}
                        style={{
                          flexShrink: 0,
                          backgroundColor: C.indigo50,
                          color: C.indigo600,
                          border: `1px solid ${C.indigo100}`,
                          borderRadius: 12,
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {cert.employeeName.charAt(0)}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>
                          {cert.employeeName}
                        </Text>
                        {cert.isValid && (
                          <div>
                            <Tag style={badgeStyle(C.emerald50, C.emerald200, C.emerald600)}>Válido</Tag>
                          </div>
                        )}
                      </div>
                    </div>

                    <Text
                      strong
                      style={{
                        color: C.indigo700,
                        fontSize: 14,
                        display: 'block',
                        marginTop: 12,
                        lineHeight: 1.35,
                        wordBreak: 'break-word',
                      }}
                    >
                      {cert.trainingTitle}
                    </Text>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 12,
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: `1px solid ${C.slate100}`,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Setor</div>
                        <div style={{ color: C.slate600, fontSize: 14, wordBreak: 'break-word' }}>
                          <TeamOutlined style={{ marginRight: 4, color: C.slate400 }} />
                          {cert.department}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Carga</div>
                        <div style={{ color: C.slate600, fontSize: 14 }}>
                          <ClockCircleOutlined style={{ marginRight: 4, color: C.slate400 }} />
                          {cert.workloadHours}h
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Data</div>
                        <div style={{ color: C.slate600, fontSize: 14, whiteSpace: 'nowrap' }}>
                          <CalendarOutlined style={{ marginRight: 4, color: C.slate400 }} />
                          {formatDate(cert.issueDate)}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Código</div>
                        <div style={{ ...codeStyle, fontSize: 13, wordBreak: 'break-all' }}>{cert.code}</div>
                      </div>
                    </div>

                    <Button
                      type="primary"
                      block
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(cert)}
                      style={{
                        ...primaryButtonStyle(),
                        marginTop: 14,
                        height: 42,
                      }}
                    >
                      Visualizar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Spin>

          {filteredCertificates.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Pagination
                current={currentPage}
                pageSize={PAGE_SIZE}
                total={filteredCertificates.length}
                onChange={setPage}
                size="small"
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        {/* Modal do diploma */}
        <Modal
          open={isPreviewOpen}
          onCancel={() => setIsPreviewOpen(false)}
          footer={null}
          destroyOnHidden
          width="min(720px, calc(100vw - 32px))"
          centered
          styles={{
            header: modalHeaderStyle(isMobile),
            body: { padding: isMobile ? 16 : 32, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' },
          }}
        >
          {selectedCert && (
            <>
              <div
                className="cert-diploma-box"
                style={{
                  border: `4px double ${C.indigo600}`,
                  padding: isMobile ? '20px 14px' : '28px 24px',
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <img
                    src="https://linsagro.com.br/wp-content/uploads/2022/07/cropped-Lins_Logo_Horizontal_RGB_Preferencial_20250512_Keenwork_AF.png"
                    alt="Lins Agroindustrial"
                    style={{ height: 34, objectFit: 'contain' }}
                  />
                  <div style={{ ...labelStyle, fontSize: 11, color: C.indigo600, marginTop: 6 }}>Universidade Corporativa</div>
                </div>

                <h3
                  style={{
                    margin: '12px 0 16px',
                    fontSize: isMobile ? 18 : 22,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: C.indigo700,
                  }}
                >
                  Certificado de Capacitação
                </h3>

                <p style={{ margin: 0, fontSize: 14, color: C.slate500 }}>Certificamos que o colaborador</p>

                <h2 style={{ margin: '4px 0 12px', fontSize: isMobile ? 22 : 26, fontWeight: 800, color: C.slate900, letterSpacing: '-0.02em' }}>
                  {selectedCert.employeeName}
                </h2>

                <p style={{ fontSize: 14.5, maxWidth: 520, margin: '0 auto', color: C.slate700, lineHeight: 1.6 }}>
                  concluiu com êxito o treinamento de{' '}
                  <strong style={{ color: C.indigo700 }}>{selectedCert.trainingTitle}</strong>, com carga horária de{' '}
                  <strong>{selectedCert.workloadHours} horas</strong>, concluído em{' '}
                  <strong>{formatDate(selectedCert.issueDate)}</strong>.
                </p>

                <div style={{ height: 1, background: C.slate200, margin: '24px 0 16px' }} />

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: 16,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ minWidth: 180, borderTop: `1px solid ${C.slate400}`, paddingTop: 6 }}>
                    <Text strong style={{ display: 'block', color: C.slate900, fontSize: 13 }}>
                      {selectedCert.instructorName}
                    </Text>
                    <Text style={{ color: C.slate500, fontSize: 12 }}>Instrutor Técnico</Text>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircleFilled style={{ color: C.emerald600, fontSize: 14 }} />
                      <Text strong style={{ fontSize: 12.5, color: C.emerald600 }}>
                        Autêntico
                      </Text>
                    </div>
                    <div style={{ marginTop: 2, fontSize: 12, color: C.slate500 }}>
                      Código de validação: <span style={{ ...codeStyle, fontSize: 13 }}>{selectedCert.code}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 24,
                  paddingTop: 24,
                  borderTop: `1px solid ${C.slate100}`,
                }}
              >
                <Button onClick={() => setIsPreviewOpen(false)} style={cancelButtonStyle(isMobile)}>
                  Fechar
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyCode(selectedCert.code)}
                  style={cancelButtonStyle(isMobile)}
                >
                  Copiar código
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={handleDownload}
                  style={primaryButtonStyle(isMobile)}
                >
                  Baixar PDF
                </Button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};
