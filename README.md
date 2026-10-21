# Gestão Inteligente de Treinamentos Internos de RH — Frontend

Interface web moderna desenvolvida com **React 19, Vite, TypeScript e Ant Design (antd)** durante o Hackathon de 24 horas.

---

## 🚀 Tecnologias

- **React 19** + **Vite**
- **TypeScript** (Modo estrito)
- **Ant Design 5.x** (`antd` + `@ant-design/icons`)
- **React Router DOM 7.x**

---

## 📌 Funcionalidades Principais

1. **Dashboard do RH (`/rh`):** Indicadores estratégicos (KPIs), listagem de treinamentos corporativos e cadastro de novas turmas.
2. **Portal do Líder (`/lider`):** Catálogo de capacitações abertas, acompanhamento de vagas e reserva de equipe.
3. **Painel do Instrutor (`/instrutor`):** Chamada de presença com assistência visual por câmera/captura facial client-side.
4. **Certificados (`/certificados`):** Emissão, visualização com layout de diploma e exportação para impressão/PDF.
5. **Validação Pública (`/validar`):** Consulta aberta de autenticidade de certificados por código ou leitura de QR Code.

---

## 🛠️ Como Executar o Projeto

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento local
npm run dev

# 3. Compilação para produção
npm run build

# 4. Checagem de tipos e lint
npm run lint
```

---

## 📂 Documentação de Arquitetura e Governança

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — Visão do produto e requisitos.
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — Paleta de cores, tipografia e tokens Ant Design.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Estrutura de pastas, serviços e camada de mocks.
- [AGENTS.md](./AGENTS.md) — Diretrizes estritas de escopo (Frontend exclusivo).
