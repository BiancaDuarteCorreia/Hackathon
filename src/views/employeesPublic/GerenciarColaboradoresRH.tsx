import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  message,
  Avatar,
  Row,
  Col,
  Spin,
  ConfigProvider,
  Grid,
  Pagination,
  Empty,
  Select,
  Upload,
} from 'antd';
import {
  UserAddOutlined,
  TeamOutlined,
  UserOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useGerenciarColaboradores, MAX_PHOTO_SIZE } from './useGerenciarColaboradores';
import type { ColaboradorUser } from './useGerenciarColaboradores';

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

const thTitle = (text: string) => <span style={labelStyle}>{text}</span>;

const prefixIconStyle: React.CSSProperties = { color: C.slate400, fontSize: 16, marginRight: 6 };

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

const TotalBadge: React.FC<{ value: number }> = ({ value }) => {
  const animated = useCountUp(value);

  return (
    <div
      title="Total de colaboradores"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        height: 46,
        padding: '0 16px',
        borderRadius: 12,
        flexShrink: 0,
        background: `linear-gradient(135deg, #ffffff 0%, ${C.indigo50} 100%)`,
        border: `1px solid ${C.indigo200}`,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 10,
          fontSize: 15,
          color: '#fff',
          background: `linear-gradient(135deg, ${C.indigo500}, ${C.indigo700})`,
          flexShrink: 0,
        }}
      >
        <TeamOutlined />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.indigo700, opacity: 0.85 }}>Total</span>
        <span style={{ marginTop: 3, fontSize: 18, fontWeight: 800, color: C.indigo700, letterSpacing: '-0.03em' }}>{animated}</span>
      </div>
    </div>
  );
};

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
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size,
        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18, color: hover ? hoverColor : C.slate400,
        background: hover ? hoverBg : 'transparent', transition: 'all .2s ease',
      }}
    >
      {icon}
    </button>
  );
};

export const GerenciarColaboradoresRH: React.FC = () => {
  const handleAlert = useCallback((type: 'success' | 'error', title: string, msg: string) => {
    if (type === 'error') message.error(`${title}: ${msg}`);
    if (type === 'success') message.success(msg);
  }, []);

  const {
    colaboradores,
    filteredColaboradores,
    departmentOptions,
    search,
    setSearch,
    setorFilter,
    setSetorFilter,
    loading,
    actionLoading,
    fetchColaboradores,
    createColaborador,
    updateColaborador,
    deleteColaborador,
  } = useGerenciarColaboradores(handleAlert);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingColaborador, setEditingColaborador] = useState<ColaboradorUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ColaboradorUser | null>(null);
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

  const [form] = Form.useForm();
  const [page, setPage] = useState<number>(1);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showCards = !screens.lg;
  const fieldGap = isMobile ? 16 : 24;
  const formGutter = isMobile ? 0 : 24;

  const totalPages = Math.max(1, Math.ceil(filteredColaboradores.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedColaboradores = filteredColaboradores.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toolbar = (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
      <Input
        allowClear
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        prefix={<SearchOutlined style={prefixIconStyle} />}
        placeholder="Buscar por nome, e-mail ou CPF"
        style={{ flex: 1, minWidth: 0 }}
      />
      <Select
        allowClear
        value={setorFilter}
        onChange={(value) => { setSetorFilter(value); setPage(1); }}
        options={departmentOptions}
        placeholder="Todos os setores"
        style={{ width: isMobile ? '100%' : 280 }}
      />
    </div>
  );

  useEffect(() => {
    fetchColaboradores();
  }, [fetchColaboradores]);

  const revokeTempPreview = () => {
    if (tempUrlRef.current) {
      URL.revokeObjectURL(tempUrlRef.current);
      tempUrlRef.current = null;
    }
  };

  const openCreateModal = () => {
    setEditingColaborador(null);
    revokeTempPreview();
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemoveCurrentPhoto(false);
    setIsModalOpen(true);
  };

  const openEditModal = (colaborador: ColaboradorUser) => {
    setEditingColaborador(colaborador);
    revokeTempPreview();
    setPhotoFile(null);
    setPhotoPreview(colaborador.photo_url || null);
    setRemoveCurrentPhoto(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingColaborador(null);
    revokeTempPreview();
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemoveCurrentPhoto(false);
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
    // Se o colaborador já tinha foto salva, ela é removida ao clicar em Salvar
    if (editingColaborador?.photo_url) setRemoveCurrentPhoto(true);
  };

  const handleSubmit = async (values: any) => {
    let success = false;
    if (editingColaborador) {
      success = await updateColaborador(editingColaborador.id, {
        name: values.name,
        cpf: values.cpf,
        email: values.email,
        department: values.department,
        photoFile,
        removePhoto: removeCurrentPhoto,
      });
    } else {
      success = await createColaborador({
        name: values.name,
        cpf: values.cpf,
        email: values.email,
        department: values.department,
        photoFile,
      });
    }

    if (success) closeModal();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteColaborador(deleteTarget.id);
    setDeleteTarget(null);
  };

  const columns: ColumnsType<ColaboradorUser> = [
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
              backgroundColor: C.indigo50, color: C.indigo600, border: `1px solid ${C.indigo100}`,
              borderRadius: 12, fontSize: 14, fontWeight: 700,
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
      width: 240,
      render: (email) => <span style={{ color: C.slate500, fontSize: 15 }}>{email || '-'}</span>,
    },
    {
      title: thTitle('CPF'),
      dataIndex: 'cpf',
      key: 'cpf',
      width: 160,
      render: (cpf) => <span style={{ color: C.slate500, fontSize: 15, whiteSpace: 'nowrap' }}>{formatCpf(cpf)}</span>,
    },
    {
      title: thTitle('Setor'),
      dataIndex: 'department',
      key: 'department',
      width: 200,
      render: (dep) => <span style={{ color: C.slate500, fontSize: 15 }}>{dep || 'Geral'}</span>,
    },
    {
      title: thTitle('Ações'),
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <ActionIconButton title="Editar" icon={<EditOutlined />} hoverColor={C.indigo600} hoverBg={C.indigo50} onClick={() => openEditModal(record)} />
          <ActionIconButton title="Excluir" icon={<DeleteOutlined />} hoverColor={C.rose600} hoverBg={C.rose50} onClick={() => setDeleteTarget(record)} />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: C.indigo600, colorText: C.slate800, colorTextSecondary: C.slate500, colorBorder: C.slate200, colorTextPlaceholder: C.slate400, borderRadius: 12 },
        components: {
          Table: { headerBg: 'rgba(248,250,252,0.8)', headerColor: C.slate500, headerSplitColor: 'transparent', borderColor: C.slate100, rowHoverBg: 'rgba(248,250,252,0.5)', cellPaddingBlock: 20, cellPaddingInline: 20 },
          Input: { colorBgContainer: C.slate50, hoverBg: '#fff', activeBg: '#fff', hoverBorderColor: C.slate400, activeBorderColor: C.indigo500, activeShadow: '0 0 0 4px rgba(99,102,241,0.12)', controlHeight: 48, paddingInline: 16, fontSize: isMobile ? 16 : 15 },
          Select: { colorBgContainer: C.slate50, selectorBg: C.slate50, hoverBorderColor: C.slate400, activeBorderColor: C.indigo500, activeOutlineColor: 'rgba(99,102,241,0.12)', optionSelectedBg: C.indigo50, optionSelectedColor: C.indigo700, optionActiveBg: C.slate100, controlHeight: 48, fontSize: isMobile ? 16 : 15 },
          Form: { labelColor: C.slate500, verticalLabelPadding: '0 0 8px' },
          Modal: { contentBg: '#fff', headerBg: 'rgba(248,250,252,0.5)', borderRadiusLG: 16 },
          Button: { controlHeight: 46, fontWeight: 600 },
        },
      }}
    >
      <div style={{ width: '100%', minWidth: 0, maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
        <div style={{ ...surfaceCardStyle, padding: isMobile ? 16 : 32 }}>
          <div className="lins-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? 16 : 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 12, borderRadius: 16, background: C.indigo50, color: C.indigo600, border: `1px solid ${C.indigo100}`, fontSize: isMobile ? 20 : 24 }}>
                <TeamOutlined />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.slate900, letterSpacing: '-0.025em' }}>Gestão de Colaboradores</h2>
                <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.slate500 }}>Gerenciamento do quadro de colaboradores.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', width: isMobile ? '100%' : undefined }}>
              <TotalBadge value={colaboradores.length} />
              <Button type="primary" icon={<UserAddOutlined />} onClick={openCreateModal} style={{ flex: isMobile ? 1 : undefined, minWidth: isMobile ? 160 : undefined, backgroundColor: C.indigo600, borderColor: C.indigo600, borderRadius: 12, height: 46, padding: '0 20px', fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)' }}>
                Novo Colaborador
              </Button>
            </div>
          </div>
        </div>

        {showCards ? (
          <div style={{ ...surfaceCardStyle, padding: isMobile ? 12 : 16 }}>
            <div style={{ marginBottom: 12 }}>{toolbar}</div>
            <Spin spinning={loading}>
              {filteredColaboradores.length === 0 && !loading ? (
                <Empty description="Nenhum colaborador encontrado" style={{ padding: '24px 0' }} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  {pagedColaboradores.map((colaborador) => (
                    <div key={colaborador.id} style={{ minWidth: 0, padding: 14, borderRadius: 14, background: '#fff', border: `1px solid ${C.slate100}`, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar shape="square" size={40} src={colaborador.photo_url} style={{ flexShrink: 0, backgroundColor: C.indigo50, color: C.indigo600, border: `1px solid ${C.indigo100}`, borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
                          {colaborador.name.charAt(0)}
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Text strong ellipsis style={{ color: C.slate800, fontSize: 15, display: 'block' }}>{colaborador.name}</Text>
                          {colaborador.email && <Text ellipsis style={{ color: C.slate500, fontSize: 13, display: 'block' }}>{colaborador.email}</Text>}
                        </div>
                        <div style={{ display: 'flex', flexShrink: 0 }}>
                          <ActionIconButton size={40} title="Editar" icon={<EditOutlined />} hoverColor={C.indigo600} hoverBg={C.indigo50} onClick={() => openEditModal(colaborador)} />
                          <ActionIconButton size={40} title="Excluir" icon={<DeleteOutlined />} hoverColor={C.rose600} hoverBg={C.rose50} onClick={() => setDeleteTarget(colaborador)} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.slate100}` }}>
                        <div style={{ minWidth: 0 }}><div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>CPF</div><div style={{ color: C.slate600, fontSize: 14, whiteSpace: 'nowrap' }}>{formatCpf(colaborador.cpf)}</div></div>
                        <div style={{ minWidth: 0 }}><div style={{ ...labelStyle, fontSize: 10, marginBottom: 2 }}>Setor</div><div style={{ color: C.slate600, fontSize: 14, wordBreak: 'break-word' }}>{colaborador.department || 'Geral'}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Spin>
            {filteredColaboradores.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <Pagination current={currentPage} pageSize={PAGE_SIZE} total={filteredColaboradores.length} onChange={setPage} size="small" showSizeChanger={false} />
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
                dataSource={filteredColaboradores}
                loading={loading}
                locale={{ emptyText: <Empty description="Nenhum colaborador encontrado" /> }}
                pagination={{ current: currentPage, onChange: (p) => setPage(p), pageSize: PAGE_SIZE, size: 'small', showSizeChanger: false, style: { padding: '16px 24px', margin: 0, background: 'rgba(248,250,252,0.5)', borderTop: `1px solid ${C.slate100}` } }}
                scroll={{ x: 960 }}
              />
            </div>
          </Card>
        )}

        <Modal
          title={<span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>{editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}</span>}
          open={isModalOpen}
          onCancel={closeModal}
          footer={null}
          destroyOnHidden={false}
          width="min(880px, calc(100vw - 32px))"
          centered
          styles={{ header: { padding: isMobile ? 16 : 24, margin: 0, borderBottom: `1px solid ${C.slate100}`, background: 'rgba(248,250,252,0.5)', borderRadius: '16px 16px 0 0' }, body: { padding: isMobile ? 16 : 32, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' } }}
        >
          <Form
            key={editingColaborador ? editingColaborador.id : 'new_colaborador'}
            form={form}
            preserve={false}
            autoComplete="off"
            layout="vertical"
            size="large"
            requiredMark={false}
            onFinish={handleSubmit}
            initialValues={editingColaborador ? {
              name: editingColaborador.name,
              cpf: maskCpf(editingColaborador.cpf || ''),
              email: editingColaborador.email,
              department: editingColaborador.department,
            } : undefined}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <Avatar size={100} src={photoPreview} icon={!photoPreview && <UserOutlined />} style={{ backgroundColor: C.slate100, color: C.slate400, border: `2px dashed ${C.slate200}` }} />
                <Upload showUploadList={false} beforeUpload={(file) => { handleSelectPhoto(file); return false; }} accept="image/*">
                  <Button shape="circle" icon={<UploadOutlined />} size="small" style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: C.indigo600, color: 'white', border: 'none' }} />
                </Upload>
              </div>
              <span style={{ marginTop: 8, fontSize: 12, color: C.slate500 }}>Foto de Perfil (Opcional, até 10MB)</span>
              {photoPreview && (
                <Button type="link" danger size="small" onClick={handleRemovePhoto} style={{ marginTop: 2, fontSize: 12 }}>
                  Remover foto
                </Button>
              )}
            </div>

            <Row gutter={formGutter}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label={thTitle('Nome Completo')} rules={[{ required: true, message: 'Informe o nome completo' }]} style={{ marginBottom: fieldGap }}>
                  <Input prefix={<UserOutlined style={prefixIconStyle} />}  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="cpf" label={thTitle('CPF')} normalize={(value) => maskCpf(value)} rules={[{ required: true, message: 'Informe o CPF' }, { validator: (_, value) => !value || String(value).replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject(new Error('CPF incompleto')) }]} style={{ marginBottom: fieldGap }}>
                  <Input prefix={<IdcardOutlined style={prefixIconStyle} />} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={formGutter}>
              <Col xs={24} md={12}>
                <Form.Item name="email" label={thTitle('E-mail')} rules={[{ type: 'email', message: 'E-mail inválido' }]} style={{ marginBottom: fieldGap }}>
                  <Input prefix={<MailOutlined style={prefixIconStyle} />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="department" label={thTitle('Setor')} rules={[{ required: true, message: 'Informe o setor' }]} style={{ marginBottom: fieldGap }}>
                  <Input prefix={<ApartmentOutlined style={prefixIconStyle} />} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ textAlign: 'right', marginBottom: 0, paddingTop: 24, borderTop: `1px solid ${C.slate100}` }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button onClick={closeModal} style={{ flex: isMobile ? 1 : undefined, background: C.slate100, borderColor: C.slate100, color: C.slate600, borderRadius: 12, height: 46, padding: '0 20px', fontWeight: 600 }}>Cancelar</Button>
                <Button type="primary" htmlType="submit" loading={actionLoading} style={{ flex: isMobile ? 1 : undefined, backgroundColor: C.indigo600, borderColor: C.indigo600, borderRadius: 12, height: 46, padding: '0 20px', fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.25)' }}>
                  {editingColaborador ? 'Salvar Alterações' : 'Salvar Colaborador'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={<span style={{ color: C.slate800, fontWeight: 700, fontSize: 18 }}>Excluir Colaborador</span>}
          open={!!deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          footer={null}
          centered
          width="min(440px, calc(100vw - 32px))"
          styles={{ header: { padding: isMobile ? 16 : 24, margin: 0, borderBottom: `1px solid ${C.slate100}`, background: 'rgba(248,250,252,0.5)', borderRadius: '16px 16px 0 0' }, body: { padding: isMobile ? 16 : 24 } }}
        >
          <p style={{ margin: 0, fontSize: 15, color: C.slate600, wordBreak: 'break-word' }}>
            Deseja apagar permanentemente o colaborador <strong style={{ color: C.slate800 }}>{deleteTarget?.name}</strong>?
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: C.slate500 }}>
            As inscrições em treinamentos e os certificados deste colaborador também serão excluídos.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.slate100}` }}>
            <Button onClick={() => setDeleteTarget(null)} style={{ flex: isMobile ? 1 : undefined, background: C.slate100, borderColor: C.slate100, color: C.slate600, borderRadius: 12, height: 46, padding: '0 20px', fontWeight: 600 }}>Cancelar</Button>
            <Button type="primary" loading={actionLoading} onClick={confirmDelete} style={{ flex: isMobile ? 1 : undefined, backgroundColor: C.rose600, borderColor: C.rose600, borderRadius: 12, height: 46, padding: '0 20px', fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(225,29,72,0.25)' }}>Excluir</Button>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};