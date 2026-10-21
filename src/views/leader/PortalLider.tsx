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
  message,
  Avatar,
  Checkbox,
  Spin,
  ConfigProvider,
  Grid,
  Pagination,
  Empty,
  Result,
  Popconfirm,
} from 'antd';
import {
  UsergroupAddOutlined,
  TeamOutlined,
  ScheduleOutlined,
  ReadOutlined,
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePortalLider, getAvailableSlots } from './usePortalLider';
import type { TrainingData, TeamMemberData, AttendanceRecord, TeamEnrollment } from './usePortalLider';

type AttendanceStatus = TeamEnrollment['status'];

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 10;

// Mesma paleta da tela de Gestão de Usuários (slate / indigo / emerald / fuchsia / rose)
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
  amber600: '#d97706',
  fuchsia50: '#fdf4ff',
  fuchsia200: '#f5d0fe',
  fuchsia500: '#d946ef',
  fuchsia700: '#a21caf',
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

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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

const primaryButtonStyle = (isMobile?: boolean, disabled?: boolean): React.CSSProperties => ({
  flex: isMobile ? 1 : undefined,
  backgroundColor: C.indigo600,
  borderColor: C.indigo600,
  color: '#fff',
  opacity: disabled ? 0.55 : 1,
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

type KpiKind = 'indigo' | 'emerald' | 'fuchsia' | 'slate' | 'rose';

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
  fuchsia: { accent: C.fuchsia500, accentDark: C.fuchsia700, soft: C.fuchsia50, border: C.fuchsia200, glow: 'rgba(217,70,239,0.28)' },
  slate: { accent: C.slate500, accentDark: C.slate700, soft: C.slate50, border: C.slate200, glow: 'rgba(100,116,139,0.28)' },
  rose: { accent: C.rose500, accentDark: C.rose700, soft: C.rose50, border: C.rose200, glow: 'rgba(244,63,94,0.28)' },
};

type KpiCardProps = {
  kind: KpiKind;
  label: string;
  value: number;
  icon: React.ReactNode;
  compact?: boolean;
  suffix?: string;
  onClick?: () => void;
};

const KpiCard: React.FC<KpiCardProps> = ({ kind, label, value, icon, compact = false, suffix = '', onClick }) => {
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
      {animated}{suffix}
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
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        cursor: onClick ? 'pointer' : 'default',
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

const getSlotsTag = (training: TrainingData) => {
  const slots = getAvailableSlots(training);
  if (training.status === 'COMPLETED') {
    return <Tag style={badgeStyle(C.slate100, C.slate200, C.slate600)}>Concluído</Tag>;
  }
  if (slots <= 0) {
    return <Tag style={badgeStyle(C.rose50, C.rose200, C.rose600)}>Esgotado</Tag>;
  }
  if (slots <= 5) {
    return <Tag style={badgeStyle(C.amber50, C.amber200, C.amber600)}>{slots === 1 ? 'Resta 1 vaga' : `Restam ${slots} vagas`}</Tag>;
  }
  return <Tag style={badgeStyle(C.emerald50, C.emerald200, C.emerald600)}>Restam {slots} vagas</Tag>;
};

const getEnrollLabel = (training: TrainingData) => {
  if (training.status === 'COMPLETED') return 'Concluído';
  if (getAvailableSlots(training) <= 0) return 'Gerenciar Equipe';
  return 'Escalar Equipe';
};

export const PortalLider: React.FC = () => {
  const handleAlert = useCallback((type: 'success' | 'error' | 'warning', title: string, msg: string) => {
    if (type === 'error') message.error(`${title}: ${msg}`);
    if (type === 'success') message.success(msg);
    if (type === 'warning') message.warning(msg);
  }, []);

  const {
    trainings,
    filteredTrainings,
    filteredMembers,
    enrollments,
    leaderDepartment,
    attendance,
    stats,
    search,
    setSearch,
    memberSearch,
    setMemberSearch,
    loading,
    actionLoading,
    fetchData,
    enrollMembers,
    unenrollMember,
  } = usePortalLider(handleAlert);

  const [selectedTraining, setSelectedTraining] = useState<TrainingData | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [attendanceView, setAttendanceView] = useState<'ALL' | 'ABSENT' | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState<string>('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showCards = !screens.lg;
  const kpiColumns = isMobile ? 2 : screens.lg ? 5 : 3;

  const totalPages = Math.max(1, Math.ceil(filteredTrainings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTrainings = filteredTrainings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEnrollment = (training: TrainingData) => {
    setSelectedTraining(training);
    setSelectedMemberIds([]);
    setMemberSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTraining(null);
    setSelectedMemberIds([]);
    setMemberSearch('');
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleConfirmReservation = async () => {
    if (selectedMemberIds.length === 0) {
      message.warning('Selecione ao menos um colaborador.');
      return;
    }
    if (!selectedTraining) return;

    const success = await enrollMembers(selectedTraining.id, selectedMemberIds);
    if (success) closeModal();
  };

  const openAttendance = (view: 'ALL' | 'ABSENT') => {
    setAttendanceSearch('');
    setAttendanceView(view);
  };

  const attendanceRows: AttendanceRecord[] = attendance.filter((r) => {
    if (attendanceView === 'ABSENT' && r.status !== 'ABSENT') return false;
    const q = normalizeText(attendanceSearch);
    if (!q) return true;
    return normalizeText(r.name).includes(q) || normalizeText(r.trainingTitle).includes(q);
  });

  // Versão mais recente do treinamento aberto no modal (vagas mudam após inscrever/desvincular)
  const currentTraining = selectedTraining
    ? trainings.find((t) => t.id === selectedTraining.id) ?? selectedTraining
    : null;

  // userId -> status da inscrição no treinamento aberto no modal
  const enrolledStatusByUser = new Map<string, AttendanceStatus>(
    enrollments
      .filter((e) => currentTraining && String(e.trainingId) === String(currentTraining.id))
      .map((e) => [String(e.userId), e.status] as [string, AttendanceStatus])
  );

  const modalSlots = currentTraining ? getAvailableSlots(currentTraining) : 0;
  const overLimit = selectedMemberIds.length > modalSlots;

  const handleUnenroll = async (memberId: string) => {
    if (!currentTraining) return;
    setRemovingId(memberId);
    await unenrollMember(currentTraining.id, memberId);
    setRemovingId(null);
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
        placeholder="Buscar por treinamento ou instrutor"
        aria-label="Buscar por treinamento ou instrutor"
        style={{ flex: '1 1 100%', minWidth: 0 }}
      />
    </div>
  );

  const columns: ColumnsType<TrainingData> = [
    {
      title: thTitle('Treinamento'),
      key: 'title',
      width: 340,
      render: (_, record) => (
        <Space size={12}>
          <Avatar
            shape="square"
            size={36}
            icon={<ReadOutlined />}
            style={{
              backgroundColor: C.indigo50,
              color: C.indigo600,
              border: `1px solid ${C.indigo100}`,
              borderRadius: 12,
              fontSize: 16,
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ color: C.slate800, fontSize: 16, display: 'block', lineHeight: 1.3 }}>
              {record.title}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: thTitle('Instrutor'),
      dataIndex: 'instructor',
      key: 'instructor',
      width: 200,
      render: (instructor) => <span style={{ color: C.slate500, fontSize: 16 }}>{instructor}</span>,
    },
    {
      title: thTitle('Data'),
      dataIndex: 'startDate',
      key: 'startDate',
      width: 180,
      render: (date) => <span style={{ color: C.slate500, fontSize: 16, whiteSpace: 'nowrap' }}>{date}</span>,
    },
    {
      title: thTitle('Carga'),
      dataIndex: 'workloadHours',
      key: 'workloadHours',
      width: 100,
      render: (hours) => <span style={{ color: C.slate500, fontSize: 16, whiteSpace: 'nowrap' }}>{hours}h</span>,
    },
    {
      title: thTitle('Vagas'),
      key: 'slots',
      width: 160,
      render: (_, record) => getSlotsTag(record),
    },
    {
      title: thTitle('Ações'),
      key: 'actions',
      width: 180,
      align: 'center',
      render: (_, record) => {
        const unavailable = record.status === 'COMPLETED';
        return (
          <Button
            type="primary"
            icon={unavailable ? <StopOutlined /> : <UsergroupAddOutlined />}
            disabled={unavailable}
            onClick={() => openEnrollment(record)}
            style={{
              borderRadius: 12,
              height: 38,
              padding: '0 16px',
              fontWeight: 600,
              ...(unavailable
                ? {}
                : {
                    backgroundColor: C.indigo600,
                    borderColor: C.indigo600,
                    boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
                  }),
            }}
          >
            {getEnrollLabel(record)}
          </Button>
        );
      },
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
                <ScheduleOutlined />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.slate900, letterSpacing: '-0.025em' }}>
                  Portal do Líder
                </h2>
                <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.slate500 }}>
                  Treinamentos com vagas abertas e escalação da sua equipe.
                </p>
              </div>
            </div>
          </div>

          <Spin spinning={loading} description="Carregando treinamentos e vagas...">
            {!leaderDepartment && !loading ? (
                <Result
                    icon={<LockOutlined style={{ color: C.slate400 }} />}
                    title="Nenhum treinamento atribuído a você no momento."
                />
            ) : (
                <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${kpiColumns}, minmax(0, 1fr))`,
                    gap: isMobile ? 12 : 16,
                }}
                >
                <KpiCard kind="indigo" compact={isMobile} label="Treinamentos" value={stats.totalTrainings} icon={<ReadOutlined />} />
                <KpiCard kind="fuchsia" compact={isMobile} label="Vagas Abertas" value={stats.availableSlots} icon={<UsergroupAddOutlined />} />
                <KpiCard kind="slate" compact={isMobile} label="Minha Equipe" value={stats.teamSize} icon={<TeamOutlined />} />
                <KpiCard
                    kind="emerald"
                    compact={isMobile}
                    label="Frequência"
                    value={stats.attendanceRate}
                    suffix="%"
                    icon={<CheckCircleOutlined />}
                    onClick={() => openAttendance('ALL')}
                />
                <div style={isMobile ? { gridColumn: 'span 2' } : undefined}>
                    <KpiCard
                    kind="rose"
                    compact={isMobile}
                    label="Faltas"
                    value={stats.absentCount}
                    icon={<CloseCircleOutlined />}
                    onClick={() => openAttendance('ABSENT')}
                    />
                </div>
                </div>
            )}
          </Spin>
        </div>

        {leaderDepartment && (
            <>
                {/* Lista de Treinamentos (Sem Título, Paginação de 10) */}
                {showCards ? (
                <div style={{ ...surfaceCardStyle, padding: isMobile ? 12 : 16 }}>
                    <div style={{ marginBottom: 12 }}>{toolbar}</div>
                    <Spin spinning={loading}>
                    {filteredTrainings.length === 0 && !loading ? (
                        <Empty description="Nenhum treinamento com vagas abertas encontrado" style={{ padding: '24px 0' }} />
                    ) : (
                        <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                            gap: 12,
                        }}
                        >
                        {pagedTrainings.map((training) => {
                            const unavailable = training.status === 'COMPLETED';
                            return (
                            <div
                                key={training.id}
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
                                <Avatar
                                    shape="square"
                                    size={40}
                                    icon={<ReadOutlined />}
                                    style={{
                                    flexShrink: 0,
                                    backgroundColor: C.indigo50,
                                    color: C.indigo600,
                                    border: `1px solid ${C.indigo100}`,
                                    borderRadius: 12,
                                    fontSize: 17,
                                    }}
                                />
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>
                                    {training.title}
                                    </Text>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {getSlotsTag(training)}
                                    </div>
                                </div>
                                </div>

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
                                    <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Instrutor</div>
                                    <div style={{ color: C.slate600, fontSize: 14, wordBreak: 'break-word' }}>
                                    <UserOutlined style={{ marginRight: 4, color: C.slate400 }} />
                                    {training.instructor}
                                    </div>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Carga</div>
                                    <div style={{ color: C.slate600, fontSize: 14 }}>
                                    <ClockCircleOutlined style={{ marginRight: 4, color: C.slate400 }} />
                                    {training.workloadHours}h
                                    </div>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Data</div>
                                    <div style={{ color: C.slate600, fontSize: 14, whiteSpace: 'nowrap' }}>
                                    <CalendarOutlined style={{ marginRight: 4, color: C.slate400 }} />
                                    {training.startDate}
                                    </div>
                                </div>
                                </div>

                                <Button
                                type="primary"
                                block
                                disabled={unavailable}
                                icon={unavailable ? <StopOutlined /> : <UsergroupAddOutlined />}
                                onClick={() => openEnrollment(training)}
                                style={{
                                    marginTop: 14,
                                    borderRadius: 12,
                                    height: 42,
                                    fontWeight: 600,
                                    ...(unavailable
                                    ? {}
                                    : {
                                        backgroundColor: C.indigo600,
                                        borderColor: C.indigo600,
                                        boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
                                        }),
                                }}
                                >
                                {getEnrollLabel(training)}
                                </Button>
                            </div>
                            );
                        })}
                        </div>
                    )}
                    </Spin>

                    {filteredTrainings.length > PAGE_SIZE && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <Pagination
                        current={currentPage}
                        pageSize={PAGE_SIZE}
                        total={filteredTrainings.length}
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
                        rowKey="id"
                        columns={columns}
                        dataSource={filteredTrainings}
                        loading={loading}
                        locale={{ emptyText: <Empty description="Nenhum treinamento com vagas abertas encontrado" /> }}
                        pagination={{
                        current: currentPage,
                        onChange: (p) => setPage(p),
                        pageSize: PAGE_SIZE,
                        size: 'small',
                        showSizeChanger: false,
                        style: { padding: '16px 24px', margin: 0, background: 'rgba(248,250,252,0.5)', borderTop: `1px solid ${C.slate100}` },
                        }}
                        scroll={{ x: 1000 }}
                    />
                    </div>
                </Card>
                )}

                {/* Modal de Escalação da Equipe */}
                <Modal
                title={
                    <div style={{ minWidth: 0 }}>
                    <span style={{ color: C.slate800, fontWeight: 700, fontSize: 18, display: 'block' }}>Escalar Equipe</span>
                    <span style={{ color: C.slate500, fontWeight: 400, fontSize: 14, display: 'block', wordBreak: 'break-word' }}>
                        {selectedTraining?.title}
                    </span>
                    </div>
                }
                open={isModalOpen}
                onCancel={closeModal}
                footer={null}
                destroyOnHidden
                width="min(640px, calc(100vw - 32px))"
                centered
                styles={{
                    header: modalHeaderStyle(isMobile),
                    body: { padding: isMobile ? 16 : 32, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' },
                }}
                >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                    <span style={labelStyle}>Colaboradores{leaderDepartment ? ` • ${leaderDepartment}` : ''}</span>
                    {currentTraining && getSlotsTag(currentTraining)}
                </div>

                <Input
                    allowClear
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    prefix={<SearchOutlined style={prefixIconStyle} />}
                    placeholder="Buscar por nome ou setor"
                    aria-label="Buscar colaborador"
                    style={{ marginBottom: 12 }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
                    {filteredMembers.length === 0 ? (
                    <Empty description="Nenhum colaborador do seu setor encontrado" style={{ padding: '16px 0' }} />
                    ) : (
                    filteredMembers.map((member: TeamMemberData) => {
                        const enrolledStatus = enrolledStatusByUser.get(String(member.id));
                        const isEnrolled = enrolledStatus !== undefined;
                        const checked = !isEnrolled && selectedMemberIds.includes(member.id);
                        return (
                        <div
                            key={member.id}
                            role={isEnrolled ? undefined : 'checkbox'}
                            aria-checked={isEnrolled ? undefined : checked}
                            tabIndex={isEnrolled ? undefined : 0}
                            onClick={isEnrolled ? undefined : () => toggleMember(member.id)}
                            onKeyDown={
                            isEnrolled
                                ? undefined
                                : (e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    toggleMember(member.id);
                                    }
                                }
                            }
                            style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            borderRadius: 14,
                            cursor: isEnrolled ? 'default' : 'pointer',
                            background: checked ? C.indigo50 : isEnrolled ? C.slate50 : '#fff',
                            border: `1px solid ${checked ? C.indigo200 : C.slate100}`,
                            transition: 'all .2s ease',
                            }}
                        >
                            <Checkbox checked={checked} disabled={isEnrolled} style={{ pointerEvents: 'none' }} />
                            <Avatar
                            shape="square"
                            size={36}
                            style={{
                                flexShrink: 0,
                                backgroundColor: C.indigo50,
                                color: C.indigo600,
                                border: `1px solid ${C.indigo100}`,
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                            }}
                            >
                            {member.name.charAt(0)}
                            </Avatar>
                            <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>
                                {member.name}
                            </Text>
                            <Text ellipsis style={{ color: C.slate500, fontSize: 13, display: 'block' }}>
                                {member.department || 'Geral'}
                            </Text>
                            </div>

                            {isEnrolled && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {enrolledStatus === 'PRESENT' && (
                                <Tag style={badgeStyle(C.emerald50, C.emerald200, C.emerald600)}>Presente</Tag>
                                )}
                                {enrolledStatus === 'ABSENT' && (
                                <Tag style={badgeStyle(C.rose50, C.rose200, C.rose600)}>Faltou</Tag>
                                )}
                                {enrolledStatus === 'ENROLLED' && (
                                <>
                                    <Tag style={badgeStyle(C.indigo50, C.indigo200, C.indigo600)}>Inscrito</Tag>
                                    <Popconfirm
                                    title="Desvincular colaborador?"
                                    description={`${member.name} será removido(a) deste treinamento e a vaga será liberada.`}
                                    okText="Desvincular"
                                    cancelText="Cancelar"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => handleUnenroll(member.id)}
                                    >
                                    <Button
                                        danger
                                        size="small"
                                        icon={<UserDeleteOutlined />}
                                        loading={removingId === member.id}
                                        disabled={actionLoading && removingId !== member.id}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ borderRadius: 10, height: 32, fontWeight: 600 }}
                                    >
                                        {isMobile ? '' : 'Desvincular'}
                                    </Button>
                                    </Popconfirm>
                                </>
                                )}
                            </div>
                            )}
                        </div>
                        );
                    })
                    )}
                </div>

                {overLimit && (
                    <p style={{ margin: '12px 0 0', fontSize: 13, color: C.rose600 }}>
                    Você selecionou {selectedMemberIds.length} colaboradores, mas restam apenas {modalSlots} vagas.
                    </p>
                )}

                <div
                    style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                    marginTop: 24,
                    paddingTop: 24,
                    borderTop: `1px solid ${C.slate100}`,
                    }}
                >
                    <Button onClick={closeModal} style={cancelButtonStyle(isMobile)}>
                    Voltar
                    </Button>
                    <Button
                    type="primary"
                    loading={actionLoading}
                    disabled={selectedMemberIds.length === 0 || overLimit}
                    onClick={handleConfirmReservation}
                    style={primaryButtonStyle(isMobile, selectedMemberIds.length === 0 || overLimit)}
                    >
                    Reservar Vagas ({selectedMemberIds.length})
                    </Button>
                </div>
                </Modal>

                {/* Modal de Frequência / Faltas */}
                <Modal
                title={
                    <div style={{ minWidth: 0 }}>
                    <span style={{ color: C.slate800, fontWeight: 700, fontSize: 18, display: 'block' }}>
                        {attendanceView === 'ABSENT' ? 'Faltas da Equipe' : 'Frequência da Equipe'}
                    </span>
                    <span style={{ color: C.slate500, fontWeight: 400, fontSize: 14, display: 'block' }}>
                        {stats.presentCount} presenças • {stats.absentCount} faltas{leaderDepartment ? ` • ${leaderDepartment}` : ''}
                    </span>
                    </div>
                }
                open={attendanceView !== null}
                onCancel={() => setAttendanceView(null)}
                footer={null}
                destroyOnHidden
                width="min(640px, calc(100vw - 32px))"
                centered
                styles={{
                    header: modalHeaderStyle(isMobile),
                    body: { padding: isMobile ? 16 : 32, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' },
                }}
                >
                <Input
                    allowClear
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    prefix={<SearchOutlined style={prefixIconStyle} />}
                    placeholder="Buscar por colaborador ou treinamento"
                    aria-label="Buscar na lista de chamada"
                    style={{ marginBottom: 12 }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
                    {attendanceRows.length === 0 ? (
                    <Empty
                        description={attendanceView === 'ABSENT' ? 'Nenhuma falta registrada' : 'Nenhuma chamada registrada ainda'}
                        style={{ padding: '16px 0' }}
                    />
                    ) : (
                    attendanceRows.map((record) => {
                        const present = record.status === 'PRESENT';
                        return (
                        <div
                            key={record.id}
                            style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: '#fff',
                            border: `1px solid ${C.slate100}`,
                            }}
                        >
                            <Avatar
                            shape="square"
                            size={36}
                            style={{
                                flexShrink: 0,
                                backgroundColor: C.indigo50,
                                color: C.indigo600,
                                border: `1px solid ${C.indigo100}`,
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                            }}
                            >
                            {record.name.charAt(0)}
                            </Avatar>
                            <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>
                                {record.name}
                            </Text>
                            <Text ellipsis style={{ color: C.slate500, fontSize: 13, display: 'block' }}>
                                {record.trainingTitle} • {record.trainingDate}
                            </Text>
                            </div>
                            {present ? (
                            <Tag style={badgeStyle(C.emerald50, C.emerald200, C.emerald600)}>Presente</Tag>
                            ) : (
                            <Tag style={badgeStyle(C.rose50, C.rose200, C.rose600)}>Faltou</Tag>
                            )}
                        </div>
                        );
                    })
                    )}
                </div>

                <div
                    style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 24,
                    paddingTop: 24,
                    borderTop: `1px solid ${C.slate100}`,
                    }}
                >
                    <Button onClick={() => setAttendanceView(null)} style={cancelButtonStyle(isMobile)}>
                    Fechar
                    </Button>
                </div>
                </Modal>
            </>
        )}
      </div>
    </ConfigProvider>
  );
};