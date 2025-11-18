# Design Guidelines: Employee Attendance Web App dengan Face Recognition

## Design Approach

**Selected Approach:** Design System with Material Design principles
**Justification:** Enterprise HR application requiring professional credibility, data clarity, and intuitive role-based dashboards. Drawing inspiration from Linear (clean data presentation), Notion (organized information hierarchy), and modern HR platforms.

## Typography

**Font Family:** Inter (via Google Fonts CDN)
- **Headings:** Font weight 700, sizes: 2xl-4xl for page titles, xl-2xl for section headers
- **Body Text:** Font weight 400, sizes: base for content, sm for labels/captions
- **Data/Numbers:** Font weight 600, size lg for statistics and metrics
- **Buttons:** Font weight 500, uppercase tracking-wide for primary actions

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-6, p-8
- Section margins: mb-8, mb-12
- Card spacing: p-6
- Button padding: px-6 py-3
- Grid gaps: gap-6, gap-8

**Container Widths:**
- Dashboard content: max-w-7xl
- Forms and centered content: max-w-2xl
- Full-width tables and data grids: w-full with px-6

## Component Library

### Landing Page (Face Recognition)
- **Camera Feed Display:** Large centered video element (w-full max-w-2xl) with rounded corners (rounded-xl) and subtle border
- **Detection Overlay:** Canvas layer showing face detection box with employee name when recognized
- **Status Card:** Prominent card above camera showing current status ("Belum Check-in", "Sudah Check-in", "Istirahat") with timestamp
- **Action Buttons:** Large, full-width buttons (w-full max-w-md) below camera:
  - Check-in (primary, solid background)
  - Istirahat (secondary, outlined)
  - Check-out (primary, solid background)
- **Instructions Panel:** Small text below showing "Posisikan wajah Anda di depan kamera"

### Navigation
- **Admin/HRD Sidebar:** Fixed left sidebar (w-64) with logo at top, menu items with icons from Heroicons, active state with background highlight
- **Employee Dashboard:** Top horizontal navigation bar with logo left, profile menu right
- **Mobile:** Collapsible hamburger menu

### Dashboard Components

**Statistics Cards (for all dashboards):**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Card structure: White background, rounded-lg, p-6, shadow-sm
- Content: Icon (h-12 w-12), Label (text-sm), Value (text-3xl font-bold), Trend indicator

**Data Tables:**
- Full-width with horizontal scroll on mobile
- Striped rows for readability
- Column headers with font-weight-600
- Action buttons (Edit, Delete) using icon-only buttons
- Pagination at bottom-right
- Search and filter controls above table

**Employee Schedule Calendar:**
- Week view grid showing employee shifts
- Color-coded shift types (Pagi, Siang, Malam)
- Month selector dropdown at top
- Legend showing shift type colors

**Forms:**
- Two-column layout on desktop (grid-cols-2)
- Label above input (text-sm font-medium mb-2)
- Input fields with border, rounded-lg, p-3
- Submit button full-width on mobile, auto-width on desktop (right-aligned)

**Face Registration Component (Admin):**
- Video preview (similar to landing page camera)
- Capture button to take 3-5 photos
- Thumbnail gallery showing captured faces
- Save button to register employee

### Data Displays

**Attendance Records:**
- Timeline view for individual employee
- List view with date, check-in time, break times, check-out time, total hours
- Export button (top-right) with download icon

**Employee List (Admin/HRD):**
- Card grid on desktop (grid-cols-3), list on mobile
- Each card: Profile photo placeholder, Name, Position, Employee ID, Status badge
- Quick action buttons on hover/tap

### Role-Based Content

**Admin Dashboard Sections:**
1. Statistics overview (4 cards: Total Karyawan, Hadir Hari Ini, Terlambat, Izin/Sakit)
2. Quick actions (Tambah Karyawan, Registrasi Wajah, Lihat Laporan)
3. Recent attendance table
4. Employee management section

**HRD Dashboard Sections:**
1. Attendance statistics (daily/weekly/monthly)
2. Export options (PDF, Excel)
3. Absence/leave requests
4. Department-wise breakdown

**Employee Dashboard Sections:**
1. Personal attendance summary (current month)
2. Today's schedule card
3. Attendance history table
4. Monthly calendar view

## Visual Hierarchy

**Priority Levels:**
1. **Critical Actions:** Face recognition status, Check-in/out buttons - largest, most prominent
2. **Primary Navigation:** Role-based menu items - clear, always accessible
3. **Data Display:** Tables and cards - organized, scannable
4. **Secondary Actions:** Filters, exports - accessible but not distracting

## Responsive Behavior

- **Desktop (lg):** Sidebar navigation, multi-column grids, full data tables
- **Tablet (md):** Collapsed sidebar with toggle, 2-column grids, horizontal scroll tables
- **Mobile (base):** Bottom navigation or hamburger menu, single column layouts, stacked cards

## Images

**Employee Profile Photos:**
- Circular avatars (w-12 h-12 for lists, w-24 h-24 for profiles)
- Placeholder with initials when no photo exists

**Camera/Video Feed:**
- Real-time camera feed for face recognition (not static images)
- Bordered container with subtle shadow

**No Hero Images:** This is a utility application - all imagery is functional (camera feeds, profile photos)