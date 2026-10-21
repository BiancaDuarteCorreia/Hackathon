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
  Upload,
} from 'antd';
import {
  UserAddOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  IdcardOutlined,
  SearchOutlined,
  MailOutlined,
  LockOutlined,
  ApartmentOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useGerenciarUsuarios, generateTempPassword, MAX_PHOTO_SIZE } from './useGerenciarUsuarios';
import type { SystemUser } from './useGerenciarUsuarios';

const { Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 10;

// Paleta equivalente ao Tailwind usado no ExtratoView (slate / indigo / emerald / fuchsia / rose)
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
  emerald100: '#d1fae5',
  emerald200: '#a7f3d0',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
  fuchsia50: '#fdf4ff',
  fuchsia100: '#fae8ff',
  fuchsia200: '#f5d0fe',
  fuchsia500: '#d946ef',
  fuchsia600: '#c026d3',
  fuchsia700: '#a21caf',
  rose50: '#fff1f2',
  rose600: '#e11d48',
  rose700: '#be123c',
};

type RoleFilter = 'ALL' | SystemUser['role'];

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

// Máscara progressiva do CPF: 000.000.000-00
const maskCpf = (value?: string) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

const formatCpf = (cpf?: string | null) => {
  if (!cpf) return '-';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Contador animado para os valores dos KPIs
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

type KpiTheme = {
  accent: string;
  accentDark: string;
  soft: string;
  border: string;
  glow: string;
};

const KPI_THEMES: Record<RoleFilter, KpiTheme> = {
  ALL: { accent: C.indigo500, accentDark: C.indigo700, soft: C.indigo50, border: C.indigo200, glow: 'rgba(99,102,241,0.28)' },
  INSTRUCTOR: { accent: C.fuchsia500, accentDark: C.fuchsia700, soft: C.fuchsia50, border: C.fuchsia200, glow: 'rgba(217,70,239,0.28)' },
  LEADER: { accent: C.emerald500, accentDark: C.emerald700, soft: C.emerald50, border: C.emerald200, glow: 'rgba(16,185,129,0.28)' },
  RH: { accent: C.slate500, accentDark: C.slate700, soft: C.slate50, border: C.slate200, glow: 'rgba(100,116,139,0.28)' },
};

type KpiCardProps = {
  kind: RoleFilter;
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
      {/* Círculo decorativo ao fundo */}
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
        // Mobile: número + ícone na linha de cima, rótulo ocupa a largura inteira embaixo
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

// Botão de ícone da coluna Ações (cinza → colorido no hover, como no Extrato)
type ActionIconButtonProps = {
  title: string;
  icon: React.ReactNode;
  hoverColor: string;
  hoverBg: string;
  onClick: () => void;
  size?: number;
};

const ActionIconButton: React.FC<ActionIconButtonProps> = ({ title, icon, hoverColor, hoverBg, onClick, size = 36 }) => {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 18,
        color: hover ? hoverColor : C.slate400,
        background: hover ? hoverBg : 'transparent',
        transition: 'all .2s ease',
      }}
    >
      {icon}
    </button>
  );
};

export const GerenciarUsuariosRH: React.FC = () => {
  const handleAlert = useCallback((type: 'success' | 'error', title: string, msg: string) => {
    if (type === 'error') message.error(`${title}: ${msg}`);
    if (type === 'success') message.success(msg);
  }, []);

  const {
    users,
    filteredUsers,
    departmentOptions,
    roleOptions,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    setorFilter,
    setSetorFilter,
    loading,
    actionLoading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  } = useGerenciarUsuarios(handleAlert);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState<number>(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState<boolean>(false);

  // URL temporária (blob:) da foto escolhida, liberada ao trocar/fechar (mesmo padrão do useProfile)
  const tempUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (tempUrlRef.current) {
        URL.revokeObjectURL(tempUrlRef.current);
      }
    };
  }, []);

  // Credenciais exibidas uma única vez (cadastro, criação de login ou nova senha)
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);

  // < 768px = celular | < 992px = tabela vira lista de cards
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showCards = !screens.lg;
  const fieldGap = isMobile ? 16 : 24;
  const formGutter = isMobile ? 0 : 24;

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
        placeholder="Buscar por nome, e-mail ou CPF"
        aria-label="Buscar por nome, e-mail ou CPF"
        style={{ flex: '1 1 260px', minWidth: 0 }}
      />
      <Select
        allowClear
        value={roleFilter}
        onChange={(value) => {
          setRoleFilter(value);
          setPage(1);
        }}
        options={roleOptions}
        placeholder="Todos os cargos"
        aria-label="Filtrar por cargo"
        style={{ flex: isMobile ? '1 1 100%' : '0 0 220px' }}
      />
      <Select
        allowClear
        value={setorFilter}
        onChange={(value) => {
          setSetorFilter(value);
          setPage(1);
        }}
        options={departmentOptions}
        placeholder="Todos os setores"
        aria-label="Filtrar por setor"
        style={{ flex: isMobile ? '1 1 100%' : '0 0 240px' }}
      />
    </div>
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const revokeTempPreview = () => {
    if (tempUrlRef.current) {
      URL.revokeObjectURL(tempUrlRef.current);
      tempUrlRef.current = null;
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    revokeTempPreview();
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemoveCurrentPhoto(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    revokeTempPreview();
    setPhotoFile(null);
    setPhotoPreview(user.photo_url || null);
    setRemoveCurrentPhoto(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    revokeTempPreview();
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemoveCurrentPhoto(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Copiado!');
    } catch {
      message.error('Não foi possível copiar.');
    }
  };

  const handleSubmit = async (values: any) => {
    let success = false;

    if (editingUser) {
      const needsLogin = !editingUser.hasLogin;
      success = await updateUser(editingUser.id, {
        name: values.name,
        cpf: values.cpf,
        role: values.role,
        department: values.department,
        photoFile,
        removePhoto: removeCurrentPhoto,
        ...(needsLogin ? { email: values.email, tempPassword: values.tempPassword } : {}),
      });
      if (success && needsLogin) {
        setCredentials({ name: values.name, email: values.email, password: values.tempPassword });
      }
    } else {
      success = await createUser({
        name: values.name,
        cpf: values.cpf,
        email: values.email,
        tempPassword: values.tempPassword,
        role: values.role,
        department: values.department,
        photoFile,
      });
      if (success) {
        setCredentials({ name: values.name, email: values.email, password: values.tempPassword });
      }
    }

    if (success) {
      closeModal();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleSelectPhoto = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      message.error('A imagem é muito grande. O limite máximo é de 10MB.');
      return;
    }

    revokeTempPreview();
    const previewUrl = URL.createObjectURL(file);
    tempUrlRef.current = previewUrl;

    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setRemoveCurrentPhoto(false);
  };

  const handleRemovePhoto = () => {
    revokeTempPreview();
    setPhotoFile(null);
    setPhotoPreview(null);
    // Se o usuário já tinha foto salva, ela é removida ao clicar em Salvar
    if (editingUser?.photo_url) setRemoveCurrentPhoto(true);
  };

  const getRoleTag = (role: string) => {
    switch (role) {
      case 'RH':
        return <Tag style={badgeStyle(C.indigo50, C.indigo200, C.indigo600)}>Administração</Tag>;
      case 'LEADER':
        return <Tag style={badgeStyle(C.emerald50, C.emerald200, C.emerald600)}>Líder</Tag>;
      case 'INSTRUCTOR':
        return <Tag style={badgeStyle(C.fuchsia50, C.fuchsia200, C.fuchsia600)}>Instrutor</Tag>;
      default:
        return <Tag style={badgeStyle(C.slate100, C.slate200, C.slate600)}>{role}</Tag>;
    }
  };

  const columns: ColumnsType<SystemUser> = [
    {
      title: thTitle('Colaborador'),
      key: 'name',
      width: 280,
      render: (_, record) => (
        <Space size={12}>
          <Avatar
            shape="square"
            size={36}
            src={record.photo_url}
            style={{
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
          <Text strong style={{ color: C.slate800, fontSize: 16 }}>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: thTitle('E-mail'),
      dataIndex: 'email',
      key: 'email',
      width: 260,
      render: (email) => <span style={{ color: C.slate500, fontSize: 16 }}>{email || '-'}</span>,
    },
    {
      title: thTitle('CPF'),
      dataIndex: 'cpf',
      key: 'cpf',
      width: 180,
      render: (cpf) => <span style={{ color: C.slate500, fontSize: 16, whiteSpace: 'nowrap' }}>{formatCpf(cpf)}</span>,
    },
    {
      title: thTitle('Cargo'),
      dataIndex: 'role',
      key: 'role',
      width: 192,
      render: (role) => getRoleTag(role),
    },
    {
      title: thTitle('Setor'),
      dataIndex: 'department',
      key: 'department',
      width: 220,
      render: (dep) => <span style={{ color: C.slate500, fontSize: 16 }}>{dep || 'Geral'}</span>,
    },
    {
      title: thTitle('Ações'),
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <ActionIconButton
            title="Editar"
            icon={<EditOutlined />}
            hoverColor={C.indigo600}
            hoverBg={C.indigo50}
            onClick={() => openEditModal(record)}
          />
          <ActionIconButton
            title="Excluir"
            icon={<DeleteOutlined />}
            hoverColor={C.rose600}
            hoverBg={C.rose50}
            onClick={() => setDeleteTarget(record)}
          />
        </Space>
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
          Form: {
            labelColor: C.slate500,
            verticalLabelPadding: '0 0 8px',
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
                <TeamOutlined />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.slate900, letterSpacing: '-0.025em' }}>
                  Gestão de Usuários
                </h2>
                <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.slate500 }}>
                  Cadastro e controle de acessos para instrutores, líderes e administradores.
                </p>
              </div>
            </div>

            <Button
              type="primary"
              icon={<UserAddOutlined />}
              block={isMobile}
              onClick={openCreateModal}
              style={{
                backgroundColor: C.indigo600,
                borderColor: C.indigo600,
                borderRadius: 12,
                height: 46,
                padding: '0 20px',
                fontWeight: 600,
                boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
              }}
            >
              Novo Usuário
            </Button>
          </div>

          <Spin spinning={loading} description="Carregando usuários...">
            {/* 4 Cards de KPI */}
            <Row gutter={isMobile ? [12, 12] : [16, 16]}>
              <Col xs={12} md={6}>
                <KpiCard
                  kind="ALL"
                  compact={isMobile}
                  label="Total"
                  value={users.length}
                  icon={<TeamOutlined />}
                />
              </Col>
              <Col xs={12} md={6}>
                <KpiCard
                  kind="INSTRUCTOR"
                  compact={isMobile}
                  label="Instrutores"
                  value={users.filter(u => u.role === 'INSTRUCTOR').length}
                  icon={<SafetyCertificateOutlined />}
                />
              </Col>
              <Col xs={12} md={6}>
                <KpiCard
                  kind="LEADER"
                  compact={isMobile}
                  label="Líderes"
                  value={users.filter(u => u.role === 'LEADER').length}
                  icon={<UserOutlined />}
                />
              </Col>
              <Col xs={12} md={6}>
                <KpiCard
                  kind="RH"
                  compact={isMobile}
                  label="Administração"
                  value={users.filter(u => u.role === 'RH').length}
                  icon={<TeamOutlined />}
                />
              </Col>
            </Row>
          </Spin>
        </div>

        {/* Tabela de Usuários */}
        {showCards ? (
          <div style={{ ...surfaceCardStyle, padding: isMobile ? 12 : 16 }}>
            <div style={{ marginBottom: 12 }}>{toolbar}</div>
            <Spin spinning={loading}>
              {filteredUsers.length === 0 && !loading ? (
                <Empty description="Nenhum usuário encontrado" style={{ padding: '24px 0' }} />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  {pagedUsers.map((user) => (
                    <div
                      key={user.id}
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
                          src={user.photo_url}
                          style={{
                            flexShrink: 0,
                            backgroundColor: C.indigo50,
                            color: C.indigo600,
                            border: `1px solid ${C.indigo100}`,
                            borderRadius: 12,
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          {user.name.charAt(0)}
                        </Avatar>

                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>
                            {user.name}
                          </Text>
                          <Text ellipsis style={{ color: C.slate500, fontSize: 13, display: 'block' }}>
                            {user.email || 'Sem login vinculado'}
                          </Text>
                          <div>{getRoleTag(user.role)}</div>
                        </div>

                        <div style={{ display: 'flex', flexShrink: 0 }}>
                          <ActionIconButton
                            size={40}
                            title="Editar"
                            icon={<EditOutlined />}
                            hoverColor={C.indigo600}
                            hoverBg={C.indigo50}
                            onClick={() => openEditModal(user)}
                          />
                          <ActionIconButton
                            size={40}
                            title="Excluir"
                            icon={<DeleteOutlined />}
                            hoverColor={C.rose600}
                            hoverBg={C.rose50}
                            onClick={() => setDeleteTarget(user)}
                          />
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
                          <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>CPF</div>
                          <div style={{ color: C.slate600, fontSize: 14, whiteSpace: 'nowrap' }}>{formatCpf(user.cpf)}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Setor</div>
                          <div style={{ color: C.slate600, fontSize: 14, wordBreak: 'break-word' }}>{user.department || 'Geral'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Spin>

            {filteredUsers.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={filteredUsers.length}
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
              dataSource={filteredUsers}
              loading={loading}
              locale={{ emptyText: <Empty description="Nenhum usuário encontrado" /> }}
              pagination={{
                current: currentPage,
                onChange: (p) => setPage(p),
                pageSize: PAGE_SIZE,
                size: 'small',
                showSizeChanger: false,
                style: { padding: '16px 24px', margin: 0, background: 'rgba(248,250,252,0.5)', borderTop: `1px solid ${C.slate100}` },
              }}
              scroll={{ x: 1260 }}
            />
          </div>
        </Card>
        )}

        {/* Modal de Adicionar / Editar Usuário */}
        <Modal
          title={
            <span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </span>
          }
          open={isModalOpen}
          onCancel={closeModal}
          footer={null}
          destroyOnHidden={false}
          width="min(880px, calc(100vw - 32px))"
          centered
          styles={{
            header: {
              padding: isMobile ? 16 : 24,
              margin: 0,
              borderBottom: `1px solid ${C.slate100}`,
              background: 'rgba(248,250,252,0.5)',
              borderRadius: '16px 16px 0 0',
            },
            body: { padding: isMobile ? 16 : 32, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' },
          }}
        >
          <Form
            key={editingUser ? editingUser.id : 'new_user'}
            form={form}
            preserve={false}
            autoComplete="off"
            layout="vertical"
            size="large"
            requiredMark={false}
            onFinish={handleSubmit}
            initialValues={
              editingUser
                ? {
                    name: editingUser.name,
                    cpf: maskCpf(editingUser.cpf || ''),
                    email: editingUser.email || '',
                    role: editingUser.role,
                    department: editingUser.department,
                  }
                : { role: 'INSTRUCTOR' }
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <Avatar
                  size={100}
                  src={photoPreview}
                  icon={!photoPreview && <UserOutlined />}
                  style={{
                    backgroundColor: C.slate100,
                    color: C.slate400,
                    border: `2px dashed ${C.slate200}`,
                  }}
                />
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleSelectPhoto(file);
                    return false;
                  }}
                  accept="image/*"
                >
                  <Button
                    shape="circle"
                    icon={<UploadOutlined />}
                    size="small"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: C.indigo600,
                      color: 'white',
                      border: 'none',
                    }}
                  />
                </Upload>
              </div>
              <span style={{ marginTop: 8, fontSize: 12, color: C.slate500 }}>Foto de Perfil</span>
              {photoPreview && (
                <Button type="link" danger size="small" onClick={handleRemovePhoto} style={{ marginTop: 2, fontSize: 12 }}>
                  Remover foto
                </Button>
              )}
            </div>

            <Row gutter={formGutter}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label={thTitle('Nome Completo')} rules={[{ required: true, message: 'Informe o nome completo' }]} style={{ marginBottom: fieldGap }}>
                  <Input prefix={<UserOutlined style={prefixIconStyle} />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="cpf"
                  label={thTitle('CPF')}
                  normalize={(value) => maskCpf(value)}
                  rules={[
                    { required: true, message: 'Informe o CPF' },
                    {
                      validator: (_, value) =>
                        !value || String(value).replace(/\D/g, '').length === 11
                          ? Promise.resolve()
                          : Promise.reject(new Error('CPF incompleto')),
                    },
                  ]}
                  style={{ marginBottom: fieldGap }}
                >
                  <Input
                    prefix={<IdcardOutlined style={prefixIconStyle} />}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </Form.Item>
              </Col>
            </Row>

            {(!editingUser || !editingUser.hasLogin) && (
              <Row gutter={formGutter}>
                <Col xs={24} md={12}>
                  <Form.Item name="email" label={thTitle('E-mail de Acesso')} rules={[{ required: true, type: 'email', message: 'E-mail inválido' }]} style={{ marginBottom: fieldGap }}>
                    <Input prefix={<MailOutlined style={prefixIconStyle} />} autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                 <Form.Item
                    name="tempPassword"
                    label={thTitle('Senha Temporária')}
                    rules={[{ required: true, min: 8, message: 'Mínimo de 8 caracteres' }]}
                    style={{ marginBottom: fieldGap }}
                  >
                    <Input.Password prefix={<LockOutlined style={prefixIconStyle} />} autoComplete="new-password" />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {editingUser && editingUser.hasLogin && (
              <Row gutter={formGutter}>
                <Col xs={24} md={12}>
                  <Form.Item name="email" label={thTitle('E-mail de Acesso')} style={{ marginBottom: fieldGap }}>
                    <Input prefix={<MailOutlined style={prefixIconStyle} />} disabled />
                  </Form.Item>
                </Col>
              </Row>
            )}

            <Row gutter={formGutter}>
              <Col xs={24} md={12}>
                <Form.Item name="role" label={thTitle('Cargo')} rules={[{ required: true, message: 'Selecione o cargo' }]} style={{ marginBottom: fieldGap }}>
                  <Select placeholder="Selecione...">
                    <Option value="RH">Administração</Option>
                    <Option value="LEADER">Líder</Option>
                    <Option value="INSTRUCTOR">Instrutor</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="department" label={thTitle('Setor')} rules={[{ required: true, message: 'Informe o setor' }]} style={{ marginBottom: fieldGap }}>
                  <Input prefix={<ApartmentOutlined style={prefixIconStyle} />} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              style={{
                textAlign: 'right',
                marginBottom: 0,
                paddingTop: 24,
                borderTop: `1px solid ${C.slate100}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  onClick={closeModal}
                  style={{
                    flex: isMobile ? 1 : undefined,
                    background: C.slate100,
                    borderColor: C.slate100,
                    color: C.slate600,
                    borderRadius: 12,
                    height: 46,
                    padding: '0 20px',
                    fontWeight: 600,
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={actionLoading}
                  style={{
                    flex: isMobile ? 1 : undefined,
                    backgroundColor: C.indigo600,
                    borderColor: C.indigo600,
                    borderRadius: 12,
                    height: 46,
                    padding: '0 20px',
                    fontWeight: 600,
                    boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
                  }}
                >
                  {editingUser ? 'Salvar Alterações' : 'Salvar Usuário'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>Credenciais de Acesso</span>}
          open={!!credentials}
          onCancel={() => setCredentials(null)}
          footer={null}
          destroyOnHidden
          centered
          width="min(520px, calc(100vw - 32px))"
          styles={{
            header: {
              padding: isMobile ? 16 : 24,
              margin: 0,
              borderBottom: `1px solid ${C.slate100}`,
              background: 'rgba(248,250,252,0.5)',
              borderRadius: '16px 16px 0 0',
            },
            body: { padding: isMobile ? 16 : 24 },
          }}
        >
          <p style={{ margin: '0 0 16px', fontSize: 15, color: C.slate600 }}>
            Login criado para{' '}
            <strong style={{ color: C.slate800 }}>{credentials?.name}</strong>. Entregue estes dados ao usuário.
          </p>

          {[
            { label: 'E-mail', value: credentials?.email || '-' },
            { label: 'Senha temporária', value: credentials?.password || '' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 16px',
                marginBottom: 12,
                borderRadius: 12,
                background: C.slate50,
                border: `1px solid ${C.slate100}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>{item.label}</div>
                <div style={{ color: C.slate800, fontSize: 16, fontFamily: 'monospace', wordBreak: 'break-all' }}>{item.value}</div>
              </div>
              <Button
                type="text"
                aria-label={`Copiar ${item.label}`}
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(item.value)}
                style={{ color: C.indigo600, flexShrink: 0 }}
              />
            </div>
          ))}

          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.slate500 }}>
            Por segurança, a senha não poderá ser vista novamente. Anote ou copie agora.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.slate100}` }}>
            <Button
              type="primary"
              onClick={() => setCredentials(null)}
              style={{
                flex: isMobile ? 1 : undefined,
                backgroundColor: C.indigo600,
                borderColor: C.indigo600,
                borderRadius: 12,
                height: 46,
                padding: '0 20px',
                fontWeight: 600,
                boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)',
              }}
            >
              Concluir
            </Button>
          </div>
        </Modal>

        <Modal
          title={<span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>Excluir Usuário</span>}
          open={!!deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          footer={null}
          centered
          width="min(440px, calc(100vw - 32px))"
          styles={{
            header: {
              padding: isMobile ? 16 : 24,
              margin: 0,
              borderBottom: `1px solid ${C.slate100}`,
              background: 'rgba(248,250,252,0.5)',
              borderRadius: '16px 16px 0 0',
            },
            body: { padding: isMobile ? 16 : 24 },
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: C.slate600, wordBreak: 'break-word' }}>
            Deseja apagar permanentemente o usuário{' '}
            <strong style={{ color: C.slate800 }}>{deleteTarget?.name}</strong>?
          </p>

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
            <Button
              onClick={() => setDeleteTarget(null)}
              style={{
                flex: isMobile ? 1 : undefined,
                background: C.slate100,
                borderColor: C.slate100,
                color: C.slate600,
                borderRadius: 12,
                height: 46,
                padding: '0 20px',
                fontWeight: 600,
              }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={actionLoading}
              onClick={confirmDelete}
              style={{
                flex: isMobile ? 1 : undefined,
                backgroundColor: C.rose600,
                borderColor: C.rose600,
                borderRadius: 12,
                height: 46,
                padding: '0 20px',
                fontWeight: 600,
                boxShadow: '0 10px 15px -3px rgba(225,29,72,0.25)',
              }}
            >
              Excluir
            </Button>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};