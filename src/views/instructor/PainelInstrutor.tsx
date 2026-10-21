import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Input,
  Select,
  message,
  Avatar,
  Row,
  Col,
  Spin,
  ConfigProvider,
  Grid,
  Pagination,
  Empty,
  Popconfirm,
} from 'antd';
import {
  CameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  TeamOutlined,
  AuditOutlined,
  SearchOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePainelInstrutor } from './usePainelInstrutor';
import type { StudentAttendee, AttendanceStatus } from './usePainelInstrutor';

const { Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 10;

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
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
  amber50: '#fffbeb',
  amber200: '#fde68a',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  rose50: '#fff1f2',
  rose200: '#fecdd3',
  rose500: '#f43f5e',
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

const thTitle = (text: string) => <span style={labelStyle}>{text}</span>;

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

const primaryButtonStyle = (isMobile: boolean): React.CSSProperties => ({
  flex: isMobile ? 1 : undefined,
  backgroundColor: C.indigo600,
  borderColor: C.indigo600,
  borderRadius: 12,
  height: 46,
  padding: '0 20px',
  fontWeight: 600,
  boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
});

const useCountUp = (target: number, duration = 700) => {
  const [value, setValue] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    let raf = 0;
    const from = prev.current;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      prev.current = current;
      setValue(current);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
};

type KpiKind = 'indigo' | 'emerald' | 'rose' | 'amber';

type KpiTheme = {
  accent: string;
  accentDark: string;
  soft: string;
  border: string;
  glow: string;
};

const KPI_THEMES: Record<KpiKind, KpiTheme> = {
  indigo: { accent: C.indigo500, accentDark: C.indigo700, soft: C.indigo50, border: C.indigo200, glow: 'rgba(99,102,241,0.28)' },
  emerald: { accent: C.emerald500, accentDark: C.emerald700, soft: C.emerald50, border: C.emerald200, glow: 'rgba(16,185,129,0.28)' },
  rose: { accent: C.rose500, accentDark: C.rose700, soft: C.rose50, border: C.rose200, glow: 'rgba(244,63,94,0.28)' },
  amber: { accent: C.amber500, accentDark: C.amber700, soft: C.amber50, border: C.amber200, glow: 'rgba(245,158,11,0.28)' },
};

type KpiCardProps = {
  kind: KpiKind;
  label: string;
  value: number;
  icon: React.ReactNode;
  compact?: boolean;
};

const KpiCard: React.FC<KpiCardProps> = ({ kind, label, value, icon, compact = false }) => {
  const [hover, setHover] = useState(false);
  const theme = KPI_THEMES[kind];
  const animated = useCountUp(value);
  const iconSize = compact ? 34 : 46;

  const labelEl = (
    <p
      title={label}
      style={{
        marginTop: 0,
        marginRight: 0,
        marginLeft: 0,
        marginBottom: compact ? 0 : 6,
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: compact ? '0.04em' : '0.06em',
        color: theme.accentDark,
        opacity: 0.85,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </p>
  );

  const valueEl = (
    <p
      style={{
        marginTop: 0,
        marginRight: 0,
        marginLeft: 0,
        marginBottom: 0,
        fontSize: compact ? 26 : 30,
        lineHeight: 1,
        fontWeight: 800,
        color: theme.accentDark,
        letterSpacing: '-0.03em',
      }}
    >
      {animated}
    </p>
  );

  const iconEl = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: iconSize,
        height: iconSize,
        borderRadius: compact ? 10 : 14,
        fontSize: compact ? 16 : 20,
        color: '#fff',
        background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`,
        boxShadow: `0 8px 16px -6px ${theme.glow}`,
        transform: hover ? 'rotate(-6deg) scale(1.08)' : 'rotate(0) scale(1)',
        transition: 'transform .25s ease',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        padding: compact ? 14 : 18,
        borderRadius: 16,
        background: `linear-gradient(135deg, #ffffff 0%, ${theme.soft} 100%)`,
        border: `1px solid ${theme.border}`,
        boxShadow: hover ? `0 14px 28px -10px ${theme.glow}` : '0 1px 2px 0 rgba(0,0,0,0.04)',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all .25s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -28,
          top: -28,
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: theme.accent,
          opacity: hover ? 0.14 : 0.07,
          transform: hover ? 'scale(1.25)' : 'scale(1)',
          transition: 'all .35s ease',
          pointerEvents: 'none',
        }}
      />
      {compact ? (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {valueEl}
            {iconEl}
          </div>
          {labelEl}
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            {labelEl}
            {valueEl}
          </div>
          {iconEl}
        </div>
      )}
    </div>
  );
};

const getStatusTag = (status: AttendanceStatus) => {
  switch (status) {
    case 'PRESENT':
      return <Tag style={badgeStyle(C.emerald50, C.emerald200, C.emerald600)}>Presente</Tag>;
    case 'ABSENT':
      return <Tag style={badgeStyle(C.rose50, C.rose200, C.rose600)}>Ausente</Tag>;
    default:
      return <Tag style={badgeStyle(C.amber50, C.amber200, C.amber600)}>Pendente</Tag>;
  }
};

const STATUS_SWITCH: { value: AttendanceStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'ENROLLED', label: 'Pendente', color: C.amber600, bg: C.amber50, border: C.amber200 },
  { value: 'PRESENT', label: 'Presente', color: C.emerald600, bg: C.emerald50, border: C.emerald200 },
  { value: 'ABSENT', label: 'Ausente', color: C.rose600, bg: C.rose50, border: C.rose200 },
];

type StatusSwitchProps = {
  value: AttendanceStatus;
  disabled?: boolean;
  fullWidth?: boolean;
  onChange: (status: AttendanceStatus) => void;
};

const StatusSwitch: React.FC<StatusSwitchProps> = ({ value, disabled = false, fullWidth = false, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Status de presença"
    style={{
      display: fullWidth ? 'flex' : 'inline-flex',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      background: C.slate100,
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {STATUS_SWITCH.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={active}
          disabled={disabled}
          onClick={() => !active && onChange(opt.value)}
          style={{
            flex: fullWidth ? 1 : undefined,
            height: 32,
            padding: '0 12px',
            borderRadius: 9,
            border: `1px solid ${active ? opt.border : 'transparent'}`,
            background: active ? opt.bg : 'transparent',
            color: active ? opt.color : C.slate500,
            fontSize: 12,
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : active ? 'default' : 'pointer',
            transition: 'all .2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const studentAvatar = (record: StudentAttendee, size: number, fontSize: number) => (
  <Avatar
    shape="square"
    size={size}
    src={record.db_photo_url || undefined}
    style={{
      flexShrink: 0,
      backgroundColor: C.indigo50,
      color: C.indigo600,
      border: `1px solid ${C.indigo100}`,
      borderRadius: 12,
      fontSize,
      fontWeight: 700,
    }}
  >
    {record.name.charAt(0)}
  </Avatar>
);

export const PainelInstrutor: React.FC = () => {
  const handleAlert = useCallback((type: 'success' | 'error', title: string, msg: string) => {
    if (type === 'error') message.error(`${title}: ${msg}`);
    if (type === 'success') message.success(msg);
  }, []);

  const {
    myTrainings,
    selectedTrainingId,
    setSelectedTrainingId,
    attendees,
    filteredAttendees,
    stats,
    activeTrainingTitle,
    statusOptions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    loading,
    updatingId,
    updateAttendance,
    finishTraining,
  } = usePainelInstrutor(handleAlert);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [simulatedMatchUser, setSimulatedMatchUser] = useState<StudentAttendee | null>(null);
  const [page, setPage] = useState<number>(1);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showCards = !screens.lg;

  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedAttendees = filteredAttendees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCameraModal = () => {
    setSimulatedMatchUser(null);
    setIsCameraModalOpen(true);
  };

  const closeCameraModal = () => {
    setIsCameraModalOpen(false);
    setSimulatedMatchUser(null);
  };

  const handleSimulateFacialScan = () => {
    const pendingStudent = attendees.find((a) => a.status === 'ENROLLED');
    if (pendingStudent) {
      setSimulatedMatchUser(pendingStudent);
    } else {
      message.info('Todos os alunos da tela já foram validados.');
    }
  };

  const handleConfirmFacialAttendance = async () => {
    if (!simulatedMatchUser) return;
    const success = await updateAttendance(simulatedMatchUser.enrollment_id, 'PRESENT');
    if (success) closeCameraModal();
  };

  const toolbar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Input
        allowClear
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        prefix={<SearchOutlined style={prefixIconStyle} />}
        placeholder="Buscar por nome ou setor"
        aria-label="Buscar por nome ou setor"
        style={{ flex: '1 1 260px', minWidth: 0 }}
      />
      <Select
        allowClear
        value={statusFilter}
        onChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        options={statusOptions}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
        style={{ flex: isMobile ? '1 1 100%' : '0 0 220px' }}
      />
    </div>
  );

  const columns: ColumnsType<StudentAttendee> = [
    {
      title: thTitle('Colaborador'),
      key: 'name',
      width: 300,
      render: (_, record) => (
        <Space size={12}>
          {studentAvatar(record, 36, 14)}
          <Text strong style={{ color: C.slate800, fontSize: 16 }}>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: thTitle('Setor'),
      dataIndex: 'department',
      key: 'department',
      width: 220,
      render: (dep) => <span style={{ color: C.slate500, fontSize: 16 }}>{dep || 'Geral'}</span>,
    },
    {
      title: thTitle('Status'),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: AttendanceStatus) => getStatusTag(status),
    },
    {
      title: thTitle('Ação Rápida'),
      key: 'actions',
      width: 300,
      align: 'center',
      render: (_, record) => (
        <StatusSwitch
          value={record.status}
          disabled={updatingId === record.enrollment_id}
          onChange={(status) => updateAttendance(record.enrollment_id, status)}
        />
      ),
    },
  ];

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
          Table: {
            headerBg: 'rgba(248,250,252,0.8)',
            headerColor: C.slate500,
            headerSplitColor: 'transparent',
            borderColor: C.slate100,
            rowHoverBg: 'rgba(248,250,252,0.5)',
            cellPaddingBlock: 20,
            cellPaddingInline: 20,
          },
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
          Select: {
            colorBgContainer: C.slate50,
            selectorBg: C.slate50,
            hoverBorderColor: C.slate400,
            activeBorderColor: C.indigo500,
            activeOutlineColor: 'rgba(99,102,241,0.12)',
            optionSelectedBg: C.indigo50,
            optionSelectedColor: C.indigo700,
            optionActiveBg: C.slate100,
            controlHeight: 48,
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
        
        {/* Cabeçalho da Tela */}
        <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 32 }}>
          <div
            className="lins-page-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: isMobile ? 16 : 20,
              paddingBottom: isMobile ? 16 : 24,
              marginBottom: isMobile ? 16 : 24,
              borderBottom: `1px solid ${C.slate100}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
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
                <AuditOutlined />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.slate900, letterSpacing: '-0.025em' }}>
                  Painel do Instrutor
                </h2>
                {myTrainings.length > 0 ? (
                  <Select
                    value={selectedTrainingId}
                    onChange={(val) => { setSelectedTrainingId(val); setPage(1); }}
                    style={{ width: '100%', maxWidth: 350 }}
                    placeholder="Selecione o treinamento"
                  >
                    {myTrainings.map(t => (
                      <Option key={t.id} value={t.id}>{t.title} - {t.date_time}</Option>
                    ))}
                  </Select>
                ) : (
                  <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.slate500, wordBreak: 'break-word' }}>
                    Nenhum treinamento atribuído a você no momento.
                  </p>
                )}
              </div>
            </div>

            {selectedTrainingId && (
              <div style={{ display: 'flex', gap: 12, width: isMobile ? '100%' : 'auto' }}>
                {/* <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  block={isMobile}
                  onClick={openCameraModal}
                  style={primaryButtonStyle(isMobile)}
                >
                  Chamada Câmera
                </Button> */}
                <Popconfirm
                  title="Finalizar Treinamento"
                  description="Deseja encerrar e emitir os certificados?"
                  onConfirm={finishTraining}
                  okText="Sim, finalizar"
                  cancelText="Cancelar"
                >
                  <Button
                    icon={<FlagOutlined />}
                    block={isMobile}
                    style={{
                      flex: isMobile ? 1 : undefined,
                      backgroundColor: C.emerald600,
                      borderColor: C.emerald600,
                      color: '#fff',
                      borderRadius: 12,
                      height: 46,
                      padding: '0 20px',
                      fontWeight: 600,
                      boxShadow: '0 10px 15px -3px rgba(16,185,129,0.25)',
                    }}
                  >
                    Finalizar
                  </Button>
                </Popconfirm>
              </div>
            )}
          </div>

          {selectedTrainingId && (
            <Spin spinning={loading} description="Carregando lista de chamada...">
              <Row gutter={isMobile ? [12, 12] : [16, 16]}>
                <Col xs={12} md={6}>
                  <KpiCard kind="indigo" compact={isMobile} label="Convocados" value={stats.total} icon={<TeamOutlined />} />
                </Col>
                <Col xs={12} md={6}>
                  <KpiCard kind="emerald" compact={isMobile} label="Presentes" value={stats.present} icon={<CheckCircleOutlined />} />
                </Col>
                <Col xs={12} md={6}>
                  <KpiCard kind="rose" compact={isMobile} label="Ausentes" value={stats.absent} icon={<CloseCircleOutlined />} />
                </Col>
                <Col xs={12} md={6}>
                  <KpiCard kind="amber" compact={isMobile} label="Pendentes" value={stats.pending} icon={<ClockCircleOutlined />} />
                </Col>
              </Row>
            </Spin>
          )}
        </div>

        {selectedTrainingId && (
          showCards ? (
            <div style={{ ...surfaceCardStyle, padding: isMobile ? 12 : 16 }}>
              <div style={{ marginBottom: 12 }}>{toolbar}</div>
              <Spin spinning={loading}>
                {filteredAttendees.length === 0 && !loading ? (
                  <Empty description="Nenhum colaborador convocado encontrado" style={{ padding: '24px 0' }} />
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                      gap: 12,
                    }}
                  >
                    {pagedAttendees.map((student) => (
                      <div
                        key={student.enrollment_id}
                        style={{
                          minWidth: 0,
                          padding: 14,
                          borderRadius: 14,
                          background: '#fff',
                          border: `1px solid ${C.slate100}`,
                          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {studentAvatar(student, 40, 15)}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>
                              {student.name}
                            </Text>
                            <div>{getStatusTag(student.status)}</div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: `1px solid ${C.slate100}`,
                          }}
                        >
                          <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Setor</div>
                          <div style={{ color: C.slate600, fontSize: 14, wordBreak: 'break-word', marginBottom: 12 }}>
                            {student.department || 'Geral'}
                          </div>
                          <StatusSwitch
                            fullWidth
                            value={student.status}
                            disabled={updatingId === student.enrollment_id}
                            onChange={(status) => updateAttendance(student.enrollment_id, status)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Spin>

              {filteredAttendees.length > PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={filteredAttendees.length}
                    onChange={setPage}
                    size="small"
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>
          ) : (
            <Card
              className="lins-card"
              style={{ ...surfaceCardStyle, overflow: 'hidden' }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${C.slate100}`,
                  background: 'rgba(248,250,252,0.5)',
                }}
              >
                {toolbar}
              </div>
              <div className="table-responsive-wrapper">
                <Table
                  rowKey="enrollment_id"
                  columns={columns}
                  dataSource={filteredAttendees}
                  loading={loading}
                  locale={{ emptyText: <Empty description="Nenhum colaborador convocado encontrado" /> }}
                  pagination={{
                    current: currentPage,
                    onChange: (p) => setPage(p),
                    pageSize: PAGE_SIZE,
                    size: 'small',
                    showSizeChanger: false,
                    style: { padding: '16px 24px', margin: 0, background: 'rgba(248,250,252,0.5)', borderTop: `1px solid ${C.slate100}` },
                  }}
                  scroll={{ x: 960 }}
                />
              </div>
            </Card>
          )
        )}

        <Modal
          title={<span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>Assistente Visual de Presença</span>}
          open={isCameraModalOpen}
          onCancel={closeCameraModal}
          footer={null}
          destroyOnHidden
          width="min(560px, calc(100vw - 32px))"
          centered
          styles={{
            header: modalHeaderStyle(isMobile),
            body: { padding: isMobile ? 16 : 32, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' },
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: C.indigo50,
              border: `1px solid ${C.indigo100}`,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: C.indigo700 }}>Conferência biométrica ao vivo</div>
            <div style={{ fontSize: 13, color: C.slate600 }}>
              Sistema comparando a captura da webcam com a foto do banco de dados.
            </div>
          </div>

          <div
            style={{
              height: 220,
              background: C.slate900,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 20 }}>
              {/* Foto do Banco */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 90,
                    height: 90,
                    border: `2px solid ${C.slate500}`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#fff'
                  }}
                >
                  {simulatedMatchUser?.db_photo_url ? (
                    <img
                      src={simulatedMatchUser.db_photo_url}
                      alt="Foto do Banco"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <EyeOutlined style={{ fontSize: 24, color: C.slate500 }} />
                  )}
                </div>
                <Text style={{ color: C.slate400, marginTop: 8, fontSize: 11 }}>Foto Cadastro</Text>
              </div>

              {/* Captura "Webcam" */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 110,
                    height: 132,
                    border: `2px dashed ${simulatedMatchUser ? C.emerald500 : C.indigo500}`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {simulatedMatchUser ? (
                    <img
                      src="https://picsum.photos/id/177/200/200"
                      alt="Rosto Identificado"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <CameraOutlined style={{ fontSize: 28, color: C.indigo500 }} />
                  )}
                </div>
                <Text style={{ color: C.slate400, marginTop: 12, fontSize: 13 }}>
                  {simulatedMatchUser ? 'Match biométrico' : 'Enquadre o operador'}
                </Text>
              </div>
            </div>
          </div>

          {simulatedMatchUser && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 16px',
                textAlign: 'center',
                borderRadius: 12,
                background: C.emerald50,
                border: `1px solid ${C.emerald200}`,
                color: C.emerald700,
                fontSize: 14,
              }}
            >
              Identidade confirmada: <strong>{simulatedMatchUser.name}</strong>
            </div>
          )}

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
            <Button onClick={handleSimulateFacialScan} style={cancelButtonStyle(isMobile)}>
              Processar Câmera
            </Button>
            <Button
              type="primary"
              disabled={!simulatedMatchUser}
              loading={!!simulatedMatchUser && updatingId === simulatedMatchUser.enrollment_id}
              onClick={handleConfirmFacialAttendance}
              style={primaryButtonStyle(isMobile)}
            >
              Confirmar Presença e Gerar Certificado
            </Button>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};