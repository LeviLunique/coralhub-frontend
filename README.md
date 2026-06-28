# CoralHub Frontend

Front-end operacional para o CoralHub Backend.

## Stack

- React
- TypeScript
- Vite
- CSS próprio com design tokens
- lucide-react para iconografia

## Design System

O sistema visual foi derivado da marca anexada:

- bordô para navegação, identidade e superfícies de marca
- dourado para ações primárias, foco e destaques
- versões clara e escura controladas por `data-theme`
- componentes base em `src/design-system/components.tsx`
- tokens principais em `src/index.css`

## Integração com o Backend

O app tenta consumir o backend em:

```bash
http://127.0.0.1:8080/api/v1
```

Para mudar a URL:

```bash
cp .env.example .env
```

Depois ajuste `VITE_CORALHUB_API_URL`.

O backend atual usa os headers:

- `X-Tenant-Slug`
- `X-User-Email`

Esses valores podem ser alterados diretamente na barra de contexto do app.

Quando a API não está disponível, o front-end usa dados de demonstração para manter a experiência navegável.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```
