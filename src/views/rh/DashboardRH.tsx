import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Avatar,
  Row,
  Col,
  Spin,
  ConfigProvider,
  Grid,
  Pagination,
  Empty,
  Dropdown,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  ReadOutlined,
  TeamOutlined,
  UserDeleteOutlined,
  SearchOutlined,
  CheckOutlined,
  DownOutlined,
  LoadingOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useDashboardRH, PHASE_LABELS } from './useDashboardRH';
import type { AbsenceByTraining, DashboardTraining, StoredStatus, TrainingPhase } from './useDashboardRH';

const { Text } = Typography;
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
  fuchsia50: '#fdf4ff',
  fuchsia200: '#f5d0fe',
  fuchsia500: '#d946ef',
  fuchsia700: '#a21caf',
  amber50: '#fffbeb',
  amber200: '#fde68a',
  amber500: '#f59e0b',
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

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: C.indigo600,
  borderColor: C.indigo600,
  borderRadius: 12,
  height: 46,
  padding: '0 20px',
  fontWeight: 600,
  boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
};

const useCountUp = (target: number, decimals = 0, duration = 700) => {
  const [value, setValue] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    let raf = 0;
    const from = prev.current;
    const start = performance.now();
    const factor = 10 ** decimals;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round((from + (target - from) * eased) * factor) / factor;
      prev.current = current;
      setValue(current);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, duration]);

  return value;
};

type KpiKind = 'indigo' | 'emerald' | 'fuchsia' | 'rose';

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
  rose: { accent: C.rose500, accentDark: C.rose700, soft: C.rose50, border: C.rose200, glow: 'rgba(244,63,94,0.28)' },
};

type KpiCardProps = {
  kind: KpiKind;
  label: string;
  value: number;
  icon: React.ReactNode;
  decimals?: number;
  suffix?: string;
  compact?: boolean;
  onClick?: () => void;
};

const KpiCard: React.FC<KpiCardProps> = ({ kind, label, value, icon, decimals = 0, suffix, compact = false, onClick }) => {
  const [hover, setHover] = useState(false);
  const theme = KPI_THEMES[kind];
  const animated = useCountUp(value, decimals);
  const iconSize = compact ? 34 : 46;

  return (
    <div
      onClick={onClick}
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
        cursor: onClick ? 'pointer' : 'default'
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
            <p style={{ margin: 0, fontSize: 26, lineHeight: 1, fontWeight: 800, color: theme.accentDark, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
              {animated.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
              {suffix && <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 2, opacity: 0.75 }}>{suffix}</span>}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: iconSize, height: iconSize, borderRadius: 10, fontSize: 16, color: '#fff', background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`, boxShadow: `0 8px 16px -6px ${theme.glow}`, transform: hover ? 'rotate(-6deg) scale(1.08)' : 'rotate(0) scale(1)', transition: 'transform .25s ease', flexShrink: 0 }}>
              {icon}
            </div>
          </div>
          <p style={{ marginTop: 0, marginBottom: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: theme.accentDark, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ marginTop: 0, marginBottom: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: theme.accentDark, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </p>
            <p style={{ margin: 0, fontSize: 30, lineHeight: 1, fontWeight: 800, color: theme.accentDark, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
              {animated.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
              {suffix && <span style={{ fontSize: 16, fontWeight: 700, marginLeft: 2, opacity: 0.75 }}>{suffix}</span>}
            </p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: iconSize, height: iconSize, borderRadius: 14, fontSize: 20, color: '#fff', background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`, boxShadow: `0 8px 16px -6px ${theme.glow}`, transform: hover ? 'rotate(-6deg) scale(1.08)' : 'rotate(0) scale(1)', transition: 'transform .25s ease', flexShrink: 0 }}>
            {icon}
          </div>
        </div>
      )}
    </div>
  );
};

const OccupancyCell: React.FC<{ enrolled: number; capacity: number; fontSize?: number }> = ({ enrolled, capacity, fontSize = 16 }) => {
  const pct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const full = capacity > 0 && enrolled >= capacity;

  return (
    <div style={{ minWidth: 100, display: 'inline-block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: C.slate800, fontSize }}>
          <strong>{enrolled}</strong>
          <span style={{ color: C.slate400 }}> / {capacity}</span>
        </span>
        {enrolled > 0 && <EyeOutlined style={{ color: C.indigo500, fontSize: 14 }} />}
      </div>
      <div style={{ height: 6, borderRadius: 999, background: C.slate100, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: full ? C.emerald500 : C.indigo500, transition: 'width .4s ease' }} />
      </div>
    </div>
  );
};

const PHASE_STYLES: Record<TrainingPhase, { bg: string; border: string; color: string }> = {
  OPEN: { bg: C.indigo50, border: C.indigo200, color: C.indigo600 },
  SOLD_OUT: { bg: C.amber50, border: C.amber200, color: C.amber700 },
  IN_PROGRESS: { bg: C.amber50, border: C.amber200, color: C.amber700 },
  COMPLETED: { bg: C.emerald50, border: C.emerald200, color: C.emerald600 },
};

const menuIcon = (checked: boolean) =>
  checked ? <CheckOutlined style={{ color: C.indigo600 }} /> : <span style={{ display: 'inline-block', width: 14 }} />;

type StatusControlProps = {
  training: DashboardTraining;
  loading: boolean;
  onChange: (id: string, status: StoredStatus) => void;
};

const StatusControl: React.FC<StatusControlProps> = ({ training, loading, onChange }) => {
  const style = PHASE_STYLES[training.phase];

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
      <Dropdown
        trigger={['click']}
        disabled={loading}
        menu={{
          items: [
            { key: 'OPEN', label: 'Restaurar Abertura (Reabrir)', icon: menuIcon(training.status === 'OPEN') },
            { key: 'COMPLETED', label: PHASE_LABELS.COMPLETED, icon: menuIcon(training.status === 'COMPLETED') },
          ],
          onClick: ({ key }) => {
            if (key === 'OPEN' || key === 'COMPLETED') onChange(training.id, key);
          },
        }}
      >
        <button
          type="button"
          aria-label={`Alterar status de ${training.title}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <Tag style={badgeStyle(style.bg, style.border, style.color)}>{PHASE_LABELS[training.phase]}</Tag>
          {loading ? <LoadingOutlined style={{ fontSize: 12, color: C.slate400 }} /> : <DownOutlined style={{ fontSize: 10, color: C.slate400 }} />}
        </button>
      </Dropdown>
    </div>
  );
};

const ActionIconButton: React.FC<{ title: string; icon: React.ReactNode; hoverColor: string; hoverBg: string; onClick?: (e: React.MouseEvent) => void; size?: number }> = ({ title, icon, hoverColor, hoverBg, onClick, size = 36 }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size,
        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18, color: hover ? hoverColor : C.slate400,
        background: hover ? hoverBg : 'transparent', transition: 'all .2s ease',
      }}
    >
      {icon}
    </button>
  );
};

const AbsenceChart: React.FC<{ items: AbsenceByTraining[]; isMobile: boolean }> = ({ items, isMobile }) => {
  if (items.length === 0) {
    return <Empty description="Ainda não há treinamentos concluídos com inscrições" style={{ padding: '16px 0' }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 18 }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(180px, 280px) minmax(0, 1fr) 150px', alignItems: 'center', gap: isMobile ? 6 : 16 }}>
          <div style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ display: 'block', color: C.slate800, fontSize: 14 }}>{item.title}</Text>
            <span style={{ fontSize: 12, color: C.slate500 }}>{item.startDate}</span>
          </div>
          <div title={`${item.present} presentes · ${item.absent} faltas`} style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: C.slate100 }}>
            <div style={{ width: `${(item.present / item.enrolled) * 100}%`, background: C.emerald500 }} />
            <div style={{ width: `${(item.absent / item.enrolled) * 100}%`, background: C.rose500 }} />
          </div>
          <div style={{ fontSize: 13, color: C.slate600, whiteSpace: 'nowrap', textAlign: isMobile ? 'left' : 'right' }}>
            <strong style={{ color: item.absent > 0 ? C.rose600 : C.emerald600 }}>{item.absent} {item.absent === 1 ? 'Falta' : 'Faltas'}</strong>{' · '}{item.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </div>
        </div>
      ))}
    </div>
  );
};

const TrainingAvatar: React.FC<{ size: number; fontSize: number }> = ({ size, fontSize }) => (
  <Avatar shape="square" size={size} icon={<ReadOutlined />} style={{ flexShrink: 0, backgroundColor: C.indigo50, color: C.indigo600, border: `1px solid ${C.indigo100}`, borderRadius: 12, fontSize }} />
);

export const DashboardRH: React.FC = () => {
  const handleAlert = useCallback((type: 'success' | 'error', title: string, msg: string) => {
    if (type === 'error') message.error(`${title}: ${msg}`);
    if (type === 'success') message.success(msg);
  }, []);

  const {
    filteredTrainings,
    indicators,
    absenceByTraining,
    instructors,
    instructorOptions,
    statusOptions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    instructorFilter,
    setInstructorFilter,
    loading,
    actionLoading,
    togglingId,
    fetchDashboardData,
    fetchTrainingEnrollments,
    createTraining,
    updateTraining,
    deleteTraining,
    updateTrainingStatus,
  } = useDashboardRH(handleAlert);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTraining, setEditingTraining] = useState<DashboardTraining | null>(null);
  
  const [enrollmentsModal, setEnrollmentsModal] = useState<{ visible: boolean; training: DashboardTraining | null; list: any[]; isLoading: boolean }>({
    visible: false, training: null, list: [], isLoading: false
  });
  const [enrollmentFilter, setEnrollmentFilter] = useState<string | null>(null);
  
  const [showChart, setShowChart] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [page, setPage] = useState<number>(1);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showCards = !screens.lg;
  const fieldGap = isMobile ? 16 : 24;
  const formGutter = isMobile ? 0 : 24;

  const totalPages = Math.max(1, Math.ceil(filteredTrainings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTrainings = filteredTrainings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const openCreateModal = () => {
    setEditingTraining(null);
    setIsModalOpen(true);
  };

  const openEditModal = (training: DashboardTraining, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTraining(training);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTraining(null);
  };

  const handleOpenEnrollments = async (training: DashboardTraining) => {
    if (training.enrolledCount === 0) return;
    setEnrollmentsModal({ visible: true, training, list: [], isLoading: true });
    setEnrollmentFilter(null);
    const list = await fetchTrainingEnrollments(training.id);
    setEnrollmentsModal({ visible: true, training, list, isLoading: false });
  };

  const handleSubmit = async (values: any) => {
    const formattedDateTime = values.date.format('YYYY-MM-DD HH:mm:00');
    
    let success = false;
    if (editingTraining) {
      success = await updateTraining(editingTraining.id, {
        title: values.title,
        description: (values.description || '').trim(),
        dateTime: formattedDateTime,
        spots: values.capacity,
        workload: values.workloadHours,
        instructorId: values.instructorId,
      });
    } else {
      success = await createTraining({
        title: values.title,
        description: (values.description || '').trim(),
        dateTime: formattedDateTime,
        spots: values.capacity,
        workload: values.workloadHours,
        instructorId: values.instructorId,
      });
    }

    if (success) closeModal();
  };

  const toolbar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Input
        allowClear
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        prefix={<SearchOutlined style={prefixIconStyle} />}
        placeholder="Buscar por título ou instrutor"
        style={{ flex: '1 1 260px', minWidth: 0 }}
      />
      <Select
        allowClear
        value={statusFilter}
        onChange={(value) => { setStatusFilter(value); setPage(1); }}
        options={statusOptions}
        placeholder="Todos os status"
        style={{ flex: isMobile ? '1 1 100%' : '0 0 220px' }}
      />
      <Select
        allowClear
        value={instructorFilter}
        onChange={(value) => { setInstructorFilter(value); setPage(1); }}
        options={instructorOptions}
        placeholder="Todos os instrutores"
        style={{ flex: isMobile ? '1 1 100%' : '0 0 240px' }}
      />
    </div>
  );

  const columns: ColumnsType<DashboardTraining> = [
    {
      title: thTitle('Treinamento'),
      key: 'title',
      width: 340,
      render: (_, record) => (
        <Space size={12}>
          <TrainingAvatar size={36} fontSize={16} />
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ color: C.slate800, fontSize: 16, display: 'block' }}>{record.title}</Text>
            <span style={{ fontSize: 12, color: C.slate500, display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.description || undefined}>
              {record.description || record.category}
            </span>
          </div>
        </Space>
      ),
    },
    {
      title: thTitle('Instrutor'),
      dataIndex: 'instructorName',
      key: 'instructorName',
      width: 180,
      align: 'left',
      render: (name) => <span style={{ color: C.slate500, fontSize: 15 }}>{name}</span>,
    },
    {
      title: thTitle('Carga Horária'),
      dataIndex: 'workloadHours',
      key: 'workloadHours',
      width: 150,
      align: 'center',
      render: (hours) => <Tag style={badgeStyle(C.slate100, C.slate200, C.slate600)}>{hours}h</Tag>,
    },
    {
      title: thTitle('Data'),
      dataIndex: 'startDate',
      key: 'startDate',
      width: 150,
      align: 'center',
      render: (date) => <span style={{ color: C.slate500, fontSize: 15, whiteSpace: 'nowrap' }}>{date}</span>,
    },
    {
      title: thTitle('Vagas'),
      key: 'occupancy',
      width: 150,
      align: 'center',
      render: (_, record) => <OccupancyCell enrolled={record.enrolledCount} capacity={record.capacity} fontSize={15} />,
    },
    {
      title: thTitle('Status'),
      key: 'status',
      width: 180,
      align: 'center',
      render: (_, record) => <StatusControl training={record} loading={togglingId === record.id} onChange={updateTrainingStatus} />,
    },
    {
      title: thTitle('Ações'),
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <ActionIconButton title="Editar" icon={<EditOutlined />} hoverColor={C.indigo600} hoverBg={C.indigo50} onClick={(e) => openEditModal(record, e)} />
          <Popconfirm title="Excluir Treinamento?" description="Esta ação não pode ser desfeita." onConfirm={(e) => { e?.stopPropagation(); deleteTraining(record.id); }} onCancel={(e) => e?.stopPropagation()} okText="Sim" cancelText="Não">
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
              <ActionIconButton title="Excluir" icon={<DeleteOutlined />} hoverColor={C.rose600} hoverBg={C.rose50} />
            </div>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredEnrollments = enrollmentsModal.list.filter(item => 
    !enrollmentFilter || item.status === enrollmentFilter
  );

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: C.indigo600, colorText: C.slate800, colorTextSecondary: C.slate500, colorBorder: C.slate200, colorTextPlaceholder: C.slate400, borderRadius: 12 },
        components: {
          Table: { headerBg: 'rgba(248,250,252,0.8)', headerColor: C.slate500, headerSplitColor: 'transparent', borderColor: C.slate100, rowHoverBg: 'rgba(248,250,252,0.5)', cellPaddingBlock: 20, cellPaddingInline: 20 },
          Input: { colorBgContainer: C.slate50, hoverBg: '#fff', activeBg: '#fff', hoverBorderColor: C.slate400, activeBorderColor: C.indigo500, activeShadow: '0 0 0 4px rgba(99,102,241,0.12)', controlHeight: 48, paddingInline: 16, fontSize: isMobile ? 16 : 15 },
          InputNumber: { colorBgContainer: C.slate50, hoverBg: '#fff', activeBg: '#fff', hoverBorderColor: C.slate400, activeBorderColor: C.indigo500, activeShadow: '0 0 0 4px rgba(99,102,241,0.12)', controlHeight: 48, fontSize: isMobile ? 16 : 15 },
          DatePicker: { colorBgContainer: C.slate50, hoverBorderColor: C.slate400, activeBorderColor: C.indigo500, activeShadow: '0 0 0 4px rgba(99,102,241,0.12)', controlHeight: 48, fontSize: isMobile ? 16 : 15 },
          Select: { colorBgContainer: C.slate50, selectorBg: C.slate50, hoverBorderColor: C.slate400, activeBorderColor: C.indigo500, activeOutlineColor: 'rgba(99,102,241,0.12)', optionSelectedBg: C.indigo50, optionSelectedColor: C.indigo700, optionActiveBg: C.slate100, controlHeight: 48, fontSize: isMobile ? 16 : 15 },
          Form: { labelColor: C.slate500, verticalLabelPadding: '0 0 8px' },
          Modal: { contentBg: '#fff', headerBg: 'rgba(248,250,252,0.5)', borderRadiusLG: 16 },
          Button: { controlHeight: 46, fontWeight: 600 },
        },
      }}
    >
      <div style={{ width: '100%', minWidth: 0, maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
        <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 32 }}>
          <div className="lins-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? 16 : 20, paddingBottom: isMobile ? 16 : 24, marginBottom: isMobile ? 16 : 24, borderBottom: `1px solid ${C.slate100}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 12, borderRadius: 16, background: C.indigo50, color: C.indigo600, border: `1px solid ${C.indigo100}`, fontSize: isMobile ? 20 : 24 }}>
                <ReadOutlined />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.slate900, letterSpacing: '-0.025em' }}>Gestão de Treinamentos</h2>
                <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.slate500 }}>Indicadores de desempenho e grade de capacitação.</p>
              </div>
            </div>
            <Button type="primary" icon={<PlusOutlined />} block={isMobile} onClick={openCreateModal} style={primaryButtonStyle}>
              Novo Treinamento
            </Button>
          </div>

          <Spin spinning={loading} description="Carregando indicadores...">
            <Row gutter={isMobile ? [12, 12] : [16, 16]}>
              <Col xs={12} md={8}>
                <KpiCard kind="indigo" compact={isMobile} label="Treinamentos abertos" value={indicators.openTrainings} icon={<ReadOutlined />} />
              </Col>
              <Col xs={12} md={8}>
                <KpiCard kind="emerald" compact={isMobile} label="Vagas disponíveis" value={indicators.availableSpots} icon={<TeamOutlined />} />
              </Col>
              <Col xs={12} md={8}>
                <KpiCard 
                  kind="rose" 
                  compact={isMobile} 
                  label="Taxa de faltas (Clique para ver)" 
                  value={indicators.absenceRate} 
                  decimals={1} 
                  suffix="%" 
                  icon={<UserDeleteOutlined />} 
                  onClick={() => setShowChart(!showChart)}
                />
              </Col>
            </Row>
          </Spin>
        </div>

        {showChart && (
          <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 16 : 24 }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.slate900, letterSpacing: '-0.02em' }}>Faltas em treinamentos concluídos</h3>
                <p style={{ margin: '2px 0 0', fontSize: isMobile ? 13 : 14, color: C.slate500 }}>Presentes e faltas por treinamento.</p>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: C.slate600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: C.emerald500 }} />Presentes</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: C.rose500 }} />Faltas</span>
              </div>
            </div>
            <Spin spinning={loading}>
              <AbsenceChart items={absenceByTraining} isMobile={isMobile} />
            </Spin>
          </div>
        )}

        {showCards ? (
          <div style={{ ...surfaceCardStyle, padding: isMobile ? 12 : 16 }}>
            <div style={{ marginBottom: 12 }}>{toolbar}</div>
            <Spin spinning={loading}>
              {filteredTrainings.length === 0 && !loading ? (
                <Empty description="Nenhum treinamento encontrado" style={{ padding: '24px 0' }} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  {pagedTrainings.map((training) => (
                    <div 
                      key={training.id} 
                      onClick={() => handleOpenEnrollments(training)}
                      style={{ minWidth: 0, padding: 14, borderRadius: 14, background: '#fff', border: `1px solid ${C.slate100}`, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)', cursor: training.enrolledCount > 0 ? 'pointer' : 'default' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <TrainingAvatar size={40} fontSize={18} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>{training.title}</Text>
                          <div><StatusControl training={training} loading={togglingId === training.id} onChange={updateTrainingStatus} /></div>
                        </div>
                        <div style={{ display: 'flex', flexShrink: 0 }}>
                          <ActionIconButton size={40} title="Editar" icon={<EditOutlined />} hoverColor={C.indigo600} hoverBg={C.indigo50} onClick={(e) => openEditModal(training, e)} />
                          <Popconfirm title="Excluir" onConfirm={(e) => { e?.stopPropagation(); deleteTraining(training.id); }} onCancel={(e) => e?.stopPropagation()} okText="Sim" cancelText="Não">
                            <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
                              <ActionIconButton size={40} title="Excluir" icon={<DeleteOutlined />} hoverColor={C.rose600} hoverBg={C.rose50} />
                            </div>
                          </Popconfirm>
                        </div>
                      </div>
                      {training.description && <p style={{ margin: '12px 0 0', fontSize: 13, color: C.slate500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{training.description}</p>}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.slate100}` }}>
                        <div style={{ minWidth: 0 }}><div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Instrutor</div><div style={{ color: C.slate600, fontSize: 14, wordBreak: 'break-word' }}>{training.instructorName}</div></div>
                        <div style={{ minWidth: 0 }}><div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Data</div><div style={{ color: C.slate600, fontSize: 14, whiteSpace: 'nowrap' }}>{training.startDate}</div></div>
                        <div style={{ minWidth: 0 }}><div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Carga</div><div style={{ color: C.slate600, fontSize: 14 }}>{training.workloadHours}h</div></div>
                        <div style={{ minWidth: 0 }}><div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Vagas</div><OccupancyCell enrolled={training.enrolledCount} capacity={training.capacity} fontSize={14} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Spin>
            {filteredTrainings.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <Pagination current={currentPage} pageSize={PAGE_SIZE} total={filteredTrainings.length} onChange={setPage} size="small" showSizeChanger={false} />
              </div>
            )}
          </div>
        ) : (
          <Card className="lins-card" style={{ ...surfaceCardStyle, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.slate100}`, background: 'rgba(248,250,252,0.5)' }}>{toolbar}</div>
            <div className="table-responsive-wrapper">
              <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredTrainings}
                loading={loading}
                locale={{ emptyText: <Empty description="Nenhum treinamento encontrado" /> }}
                pagination={{ current: currentPage, onChange: (p) => setPage(p), pageSize: PAGE_SIZE, size: 'small', showSizeChanger: false, style: { padding: '16px 24px', margin: 0, background: 'rgba(248,250,252,0.5)', borderTop: `1px solid ${C.slate100}` } }}
                scroll={{ x: 1300 }}
                onRow={(record) => ({
                  onClick: () => handleOpenEnrollments(record),
                  style: { cursor: record.enrolledCount > 0 ? 'pointer' : 'default' }
                })}
              />
            </div>
          </Card>
        )}

        <Modal
          title={<span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>{editingTraining ? 'Editar Treinamento' : 'Novo Treinamento'}</span>}
          open={isModalOpen}
          onCancel={closeModal}
          footer={null}
          destroyOnHidden={false}
          width="min(880px, calc(100vw - 32px))"
          centered
          styles={{ header: { padding: isMobile ? 16 : 24, margin: 0, borderBottom: `1px solid ${C.slate100}`, background: 'rgba(248,250,252,0.5)', borderRadius: '16px 16px 0 0' }, body: { padding: isMobile ? 16 : 32, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' } }}
        >
          <Form 
            key={editingTraining ? editingTraining.id : 'new_training'}
            form={form} 
            preserve={false} 
            autoComplete="off" 
            layout="vertical" 
            size="large" 
            requiredMark={false} 
            onFinish={handleSubmit} 
            initialValues={editingTraining ? {
              title: editingTraining.title,
              description: editingTraining.description,
              instructorId: editingTraining.instructorId,
              date: editingTraining.dateTimeISO ? dayjs(editingTraining.dateTimeISO, 'YYYY-MM-DD HH:mm:ss') : null,
              workloadHours: editingTraining.workloadHours,
              capacity: editingTraining.capacity
            } : { capacity: 20, workloadHours: 8 }}
          >
            <Form.Item name="title" label={thTitle('Título do Treinamento')} rules={[{ required: true, message: 'Informe o título' }]} style={{ marginBottom: fieldGap }}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label={thTitle('Descrição')} style={{ marginBottom: fieldGap }}>
              <Input.TextArea rows={3} maxLength={500} showCount />
            </Form.Item>
            <Row gutter={formGutter}>
              <Col xs={24} md={12}>
                <Form.Item name="instructorId" label={thTitle('Instrutor')} rules={[{ required: true, message: 'Selecione um instrutor' }]} style={{ marginBottom: fieldGap }}>
                  <Select placeholder="Selecione" loading={loading} options={instructors.map((inst) => ({ value: inst.id, label: inst.name }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="date" label={thTitle('Data e Hora')} rules={[{ required: true, message: 'Informe a data' }]} style={{ marginBottom: fieldGap }}>
                  <DatePicker style={{ width: '100%' }} showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm"/>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={formGutter}>
              <Col xs={24} md={12}>
                <Form.Item name="workloadHours" label={thTitle('Carga Horária (h)')} rules={[{ required: true, message: 'Informe a carga horária' }]} style={{ marginBottom: fieldGap }}>
                  <InputNumber min={1} max={200} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="capacity" label={thTitle('Total de Vagas')} rules={[{ required: true, message: 'Informe o total de vagas' }]} style={{ marginBottom: fieldGap }}>
                  <InputNumber min={1} max={500} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item style={{ textAlign: 'right', marginBottom: 0, paddingTop: 24, borderTop: `1px solid ${C.slate100}` }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button onClick={closeModal} style={{ flex: isMobile ? 1 : undefined, background: C.slate100, borderColor: C.slate100, color: C.slate600, borderRadius: 12, height: 46, padding: '0 20px', fontWeight: 600 }}>Cancelar</Button>
                <Button type="primary" htmlType="submit" loading={actionLoading} style={{ ...primaryButtonStyle, flex: isMobile ? 1 : undefined }}>{editingTraining ? 'Salvar Alterações' : 'Salvar Treinamento'}</Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal de Inscritos */}
        <Modal
          title={<span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>Inscritos na Turma</span>}
          open={enrollmentsModal.visible}
          onCancel={() => setEnrollmentsModal({ visible: false, training: null, list: [], isLoading: false })}
          footer={null}
          destroyOnHidden
          width="min(600px, calc(100vw - 32px))"
          centered
          styles={{ header: { padding: isMobile ? 16 : 24, margin: 0, borderBottom: `1px solid ${C.slate100}`, background: 'rgba(248,250,252,0.5)', borderRadius: '16px 16px 0 0' }, body: { padding: isMobile ? 16 : 24, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' } }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', color: C.slate800 }}>{enrollmentsModal.training?.title}</Text>
            <Text style={{ fontSize: 13, color: C.slate500 }}>{enrollmentsModal.training?.startDate}</Text>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Select
              allowClear
              value={enrollmentFilter}
              onChange={(value) => setEnrollmentFilter(value)}
              placeholder="Filtrar por status"
              style={{ width: '100%' }}
              options={[
                { value: 'PRESENT', label: 'Presente' },
                { value: 'ABSENT', label: 'Ausente' },
                { value: 'ENROLLED', label: 'Pendente' }
              ]}
            />
          </div>

          <Spin spinning={enrollmentsModal.isLoading}>
            {filteredEnrollments.length === 0 && !enrollmentsModal.isLoading ? (
              <Empty description="Nenhum colaborador encontrado com este status" style={{ padding: '24px 0' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredEnrollments.map((student) => (
                  <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: C.slate50, borderRadius: 12, border: `1px solid ${C.slate100}` }}>
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ color: C.slate800, fontSize: 14, display: 'block' }}>{student.name}</Text>
                      <Text style={{ color: C.slate500, fontSize: 12 }}>{student.department || 'Geral'}</Text>
                    </div>
                    <div>
                      {student.status === 'PRESENT' && <Tag color="success">Presente</Tag>}
                      {student.status === 'ABSENT' && <Tag color="error">Ausente</Tag>}
                      {student.status === 'ENROLLED' && <Tag color="warning">Pendente</Tag>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Spin>
        </Modal>

      </div>
    </ConfigProvider>
  );
};