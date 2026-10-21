import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, ConfigProvider, Grid } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ArrowRightOutlined } from '@ant-design/icons';
import logo from '../../assets/iconLinsAgro.webp';
import bgImage from '../../assets/background.png';
import { useAuthAPI, useRegisterAPI } from './useAuthScreen';

const { useBreakpoint } = Grid;

// Paleta (azul corporativo Lins + verde-água da logo + neutros slate)
const C = {
    brand: '#0032A0',
    brandLight: '#3063D6',
    brandDark: '#00246f',
    teal: '#00B5AD',
    slate50: '#f8fafc',
    slate200: '#e2e8f0',
    slate400: '#94a3b8',
    slate500: '#64748b',
    slate800: '#1e293b',
    slate900: '#0f172a',
};

const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: C.slate800,
};

const fieldLabel = (text: string) => <span style={labelStyle}>{text}</span>;

const prefixIconStyle: React.CSSProperties = { color: C.slate400, fontSize: 16, marginRight: 6 };

const primaryButtonStyle: React.CSSProperties = {
    height: 48,
    borderRadius: 12,
    fontWeight: 700,
    backgroundColor: C.brand,
    borderColor: C.brand,
    boxShadow: '0 10px 18px -6px rgba(0,50,160,0.45)',
};

// Triângulo de cantos arredondados, no mesmo formato do símbolo da logo
const LogoTriangle = ({ color, opacity, style }: { color: string; opacity: number; style: React.CSSProperties }) => (
    <svg
        viewBox="0 0 1000 900"
        aria-hidden="true"
        style={{ position: 'absolute', pointerEvents: 'none', ...style }}
    >
        <polygon
            points="500,90 910,810 90,810"
            fill={color}
            stroke={color}
            strokeWidth={90}
            strokeLinejoin="round"
            opacity={opacity}
        />
    </svg>
);

export default function AuthScreen() {
    const navigate = useNavigate();
    const [isLoginView, setIsLoginView] = useState<boolean>(true);

    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const { login, loading: loginLoading } = useAuthAPI();
    const { register, loading: registerLoading } = useRegisterAPI(() => setIsLoginView(true));

    useEffect(() => {
        document.documentElement.classList.remove('dark');
        const token = localStorage.getItem('admin_token');
        if (token) navigate('/rh', { replace: true });
    }, [navigate]);

    const handleLoginSubmit = (values: any) => {
        const { email, password } = values;
        if (!email || !password) {
            return;
        }
        login(email.trim(), password.trim());
    };

    const handleRegisterSubmit = (values: any) => {
        const { name, email, password } = values;
        register(name.trim(), email.trim(), password.trim());
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: C.brand,
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
                        activeBorderColor: C.brand,
                        activeShadow: '0 0 0 4px rgba(0,50,160,0.12)',
                        controlHeight: 48,
                        paddingInline: 16,
                        // 16px no celular evita o zoom automático do iOS ao focar no campo
                        fontSize: isMobile ? 16 : 15,
                    },
                    Form: {
                        labelColor: C.slate800,
                        verticalLabelPadding: '0 0 6px',
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
                    position: 'relative',
                    minHeight: '100dvh',
                    width: '100%',
                    overflow: 'hidden',
                    backgroundColor: C.brandDark,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 20,
                    padding: isMobile ? '24px 16px' : '32px 48px',
                    boxSizing: 'border-box',
                }}
            >
                {/* Fundo: foto + degradê azul + formas inspiradas no símbolo da logo */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                    <img
                        src={bgImage}
                        alt=""
                        aria-hidden="true"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: `linear-gradient(135deg, rgba(0,36,111,0.94) 0%, rgba(0,50,160,0.86) 55%, rgba(0,36,111,0.92) 100%)`,
                        }}
                    />
                    <LogoTriangle color={C.teal} opacity={0.22} style={{ width: isMobile ? 420 : 760, left: isMobile ? -160 : -190, bottom: isMobile ? -140 : -250 }} />
                    <LogoTriangle color={C.brandLight} opacity={0.35} style={{ width: isMobile ? 300 : 520, right: isMobile ? -120 : -120, top: isMobile ? -90 : -170, transform: 'rotate(180deg)' }} />
                </div>

                {/* Conteúdo */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 10,
                        width: '100%',
                        maxWidth: 1160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Card do formulário */}
                    <div
                        style={{
                            width: '100%',
                            maxWidth: isMobile ? 440 : 460,
                            flexShrink: 0,
                            backgroundColor: '#ffffff',
                            borderRadius: 24,
                            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.55)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Faixa com as cores da logo */}
                        <div style={{ display: 'flex', height: 6 }}>
                            <div style={{ flex: 7, background: C.brand }} />
                            <div style={{ flex: 3, background: C.teal }} />
                        </div>

                        <div style={{ padding: isMobile ? '28px 22px 28px' : '36px 40px 32px' }}>
                            {/* Logo e título centralizados */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <img
                                    src={logo}
                                    alt="Lins Agroindustrial"
                                    style={{ display: 'block', height: 'auto', width: isMobile ? 200 : 240, maxWidth: '100%' }}
                                />
                                <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 600, color: C.slate500 }}>
                                    Gestão de Treinamentos Internos (RH)
                                </p>
                            </div>

                            <div style={{ height: isMobile ? 24 : 32 }} />

                            {isLoginView ? (
                                <Form
                                    key="login"
                                    name="login_form"
                                    layout="vertical"
                                    size="large"
                                    requiredMark={false}
                                    autoComplete="on"
                                    onFinish={handleLoginSubmit}
                                >
                                    <Form.Item
                                        name="email"
                                        label={fieldLabel('E-mail')}
                                        rules={[{ required: true, message: 'Por favor, insira seu e-mail!' }, { type: 'email', message: 'E-mail inválido!' }]}
                                        style={{ marginBottom: 20 }}
                                    >
                                        <Input
                                            prefix={<UserOutlined style={prefixIconStyle} />}
                                            autoComplete="username"
                                            inputMode="email"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="password"
                                        label={fieldLabel('Senha')}
                                        rules={[{ required: true, message: 'Por favor, insira sua senha!' }]}
                                        style={{ marginBottom: 26 }}
                                    >
                                        <Input.Password
                                            prefix={<LockOutlined style={prefixIconStyle} />}
                                            autoComplete="current-password"
                                        />
                                    </Form.Item>

                                    <Button type="primary" htmlType="submit" loading={loginLoading} block style={primaryButtonStyle}>
                                        Entrar <ArrowRightOutlined />
                                    </Button>
                                </Form>
                            ) : (
                                <Form
                                    key="register"
                                    name="register_form"
                                    layout="vertical"
                                    size="large"
                                    requiredMark={false}
                                    autoComplete="on"
                                    onFinish={handleRegisterSubmit}
                                >
                                    <Form.Item
                                        name="name"
                                        label={fieldLabel('Nome completo')}
                                        rules={[{ required: true, message: 'Informe seu nome completo!' }]}
                                        style={{ marginBottom: 16 }}
                                    >
                                        <Input prefix={<UserOutlined style={prefixIconStyle} />} autoComplete="name" />
                                    </Form.Item>

                                    <Form.Item
                                        name="email"
                                        label={fieldLabel('E-mail')}
                                        rules={[{ required: true, message: 'Informe seu e-mail!' }, { type: 'email', message: 'E-mail inválido!' }]}
                                        style={{ marginBottom: 16 }}
                                    >
                                        <Input
                                            prefix={<MailOutlined style={prefixIconStyle} />}
                                            autoComplete="email"
                                            inputMode="email"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="password"
                                        label={fieldLabel('Senha')}
                                        rules={[{ required: true, message: 'Crie uma senha!' }, { min: 8, message: 'Mínimo de 8 caracteres!' }]}
                                        style={{ marginBottom: 16 }}
                                    >
                                        <Input.Password
                                            prefix={<LockOutlined style={prefixIconStyle} />}
                                            autoComplete="new-password"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="confirmPassword"
                                        label={fieldLabel('Confirmar senha')}
                                        dependencies={['password']}
                                        rules={[
                                            { required: true, message: 'Confirme a senha!' },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    return !value || getFieldValue('password') === value
                                                        ? Promise.resolve()
                                                        : Promise.reject(new Error('As senhas não coincidem!'));
                                                },
                                            }),
                                        ]}
                                        style={{ marginBottom: 24 }}
                                    >
                                        <Input.Password
                                            prefix={<LockOutlined style={prefixIconStyle} />}
                                            autoComplete="new-password"
                                        />
                                    </Form.Item>

                                    <Button type="primary" htmlType="submit" loading={registerLoading} block style={primaryButtonStyle}>
                                        Criar conta <ArrowRightOutlined />
                                    </Button>
                                </Form>
                            )}

                            {/* <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.slate200}`, textAlign: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 14 }}>
                                    {isLoginView ? 'Não tem uma conta?' : 'Já possui uma conta?'}
                                </Text>{' '}
                                <Button
                                    type="link"
                                    onClick={() => switchView(!isLoginView)}
                                    style={{ padding: 0, height: 'auto', fontWeight: 700, color: C.brand }}
                                >
                                    {isLoginView ? 'Cadastre-se' : 'Faça login'}
                                </Button>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}