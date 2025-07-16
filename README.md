# DHIS2 Metadata Dictionary

A Next.js web application that connects to DHIS2 instances to analyze, assess, and document metadata quality. The application provides authentication, metadata exploration, quality assessment, and export capabilities for DHIS2 aggregate data elements, indicators, dashboards, and SQL views.

## Features

- **DHIS2 Authentication**: Connect to any DHIS2 instance with your credentials
- **Metadata Exploration**: Browse and search data elements, indicators, dashboards, and SQL views
- **Quality Assessment**: Automatically evaluate metadata quality based on defined criteria
- **Export Capabilities**: Export metadata in JSON or CSV format with quality assessment data
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: DHIS2 Basic Auth + Supabase Session Management
- **External API**: DHIS2 Web API (v2.40+)
- **UI Components**: Headless UI, Heroicons
- **Forms**: React Hook Form
- **Tables**: React Table

## Installation

### Prerequisites

- Node.js 18.17.0 or later
- npm or yarn
- Supabase account and project (for full functionality)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/metadata-dictionary.git
   cd metadata-dictionary
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # DHIS2 (optional defaults)
   NEXT_PUBLIC_DHIS2_BASE_URL=https://play.im.dhis2.org/stable-2-40-8-1/
   DHIS2_DEFAULT_USERNAME=admin
   DHIS2_DEFAULT_PASSWORD=district

   # App Configuration
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Initialize the Supabase database with the schema provided in `supabase/schema.sql`

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect to DHIS2**: Log in with your DHIS2 server URL, username, and password
2. **Browse Metadata**: Navigate through the different metadata types using the sidebar
3. **Search and Filter**: Use the search and filter options to find specific metadata
4. **View Details**: Click on any metadata item to view detailed information and quality assessment
5. **Export Data**: Use the export button to download metadata in JSON or CSV format

## Quality Assessment Criteria

The application evaluates metadata quality based on the following criteria:

1. **Description**: Metadata has a meaningful description
2. **Code**: Metadata has a defined code
3. **Activity Status**: Metadata is actively used in the system
4. **Recency**: Metadata has been updated within the past year

Each criterion contributes to an overall quality score (0-4), with visual indicators showing the quality level.

## Project Structure

The project follows the Next.js App Router structure:

- `app/`: Next.js App Router pages and API routes
- `components/`: Reusable UI components
- `lib/`: Core libraries and utilities
- `hooks/`: Custom React hooks
- `types/`: TypeScript type definitions
- `supabase/`: Database schema and functions
- `public/`: Static assets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [DHIS2](https://dhis2.org/) - Health Information Management System
- [Next.js](https://nextjs.org/) - React Framework
- [Supabase](https://supabase.io/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Headless UI](https://headlessui.dev/) - UI Components
