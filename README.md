# Manus Analytics Dashboard

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### Steps

```bash
npm install
npm run dev
```

## Project Structure

```
dashboard-template/
├── app/                    # Next.js 13+ app directory
│   ├── dashboard/         # Dashboard pages and layouts
│   ├── raw-data/         # Raw data visualization page
│   └── page.tsx          # Home page
├── components/           # Reusable React components
├── constants/           # Application constants and configuration
│   └── sidebar-links.ts  # Sidebar tabs 
├── layouts/            # Layout components
│   └── Main/           # Main layout with header, sidebar, footer
├── public/             # Static assets and mock data
│   ├── assets/         # Images and icons
│   └── mocks/          # JSON data files
├── routes/             # Route definitions
├── styles/             # Global CSS styles
├── theme/              # Mantine theme configuration
├── types/              # TypeScript type definitions
```

### Key Features

- **Analytics Dashboard**: Comprehensive dashboard with charts, tables, and KPIs
- **Theme Customization**: Built-in theme customizer for appearance and layout
- **Responsive Design**: Mobile-first responsive design using Mantine components
- **Data Visualization**: Multiple chart types including revenue, sales, and geographic data
- **TypeScript**: Full TypeScript support for type safety

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for full license text.