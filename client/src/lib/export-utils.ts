import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename?: string;
  columns: ExportColumn[];
  data: any[];
}

export function exportToCSV({ filename = 'export', columns, data }: ExportOptions) {
  const csvContent = generateCSV(columns, data);
  downloadFile(csvContent, `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`, 'text/csv');
}

export function exportToJSON({ filename = 'export', columns, data }: ExportOptions) {
  const jsonData = data.map(row => {
    const formatted: any = {};
    columns.forEach(col => {
      formatted[col.label] = col.format ? col.format(row[col.key]) : row[col.key];
    });
    return formatted;
  });
  
  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`, 'application/json');
}

export function exportToExcel({ filename = 'export', columns, data }: ExportOptions) {
  // Create HTML table for Excel
  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(col => {
                  const value = col.format ? col.format(row[col.key]) : row[col.key];
                  return `<td>${escapeHtml(String(value ?? ''))}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  downloadFile(tableHtml, `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xls`, 'application/vnd.ms-excel');
}

function generateCSV(columns: ExportColumn[], data: any[]): string {
  const headers = columns.map(col => `"${col.label}"`).join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      const value = col.format ? col.format(row[col.key]) : row[col.key];
      return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Export attendance data
export function exportAttendanceData(attendances: any[], type: 'csv' | 'excel' | 'json' = 'csv') {
  const columns: ExportColumn[] = [
    { key: 'employee.employeeId', label: 'ID Karyawan', format: (val) => val || '-' },
    { key: 'employee.name', label: 'Nama Karyawan', format: (val) => val || '-' },
    { key: 'employee.position', label: 'Posisi', format: (val) => val || '-' },
    { 
      key: 'date', 
      label: 'Tanggal', 
      format: (val) => val ? format(new Date(val), 'dd MMMM yyyy', { locale: id }) : '-' 
    },
    { 
      key: 'checkIn', 
      label: 'Check-in', 
      format: (val) => val ? format(new Date(val), 'HH:mm:ss') : '-' 
    },
    { 
      key: 'breakStart', 
      label: 'Mulai Istirahat', 
      format: (val) => val ? format(new Date(val), 'HH:mm:ss') : '-' 
    },
    { 
      key: 'breakEnd', 
      label: 'Selesai Istirahat', 
      format: (val) => val ? format(new Date(val), 'HH:mm:ss') : '-' 
    },
    { 
      key: 'checkOut', 
      label: 'Check-out', 
      format: (val) => val ? format(new Date(val), 'HH:mm:ss') : '-' 
    },
    { 
      key: 'status', 
      label: 'Status', 
      format: (val) => {
        const statusMap: { [key: string]: string } = {
          present: 'Hadir',
          late: 'Terlambat',
          absent: 'Tidak Hadir',
          on_break: 'Istirahat'
        };
        return statusMap[val] || val || '-';
      }
    },
  ];

  const data = attendances.map(att => ({
    ...att,
    'employee.employeeId': att.employee?.employeeId,
    'employee.name': att.employee?.name,
    'employee.position': att.employee?.position,
  }));

  const options = { filename: 'laporan-absensi', columns, data };
  
  switch (type) {
    case 'excel':
      return exportToExcel(options);
    case 'json':
      return exportToJSON(options);
    default:
      return exportToCSV(options);
  }
}

// Export statistics report
export function exportStatisticsReport(stats: any, attendances: any[], type: 'csv' | 'excel' = 'csv') {
  const summary = [
    { metric: 'Total Karyawan', value: stats.totalEmployees || 0 },
    { metric: 'Hadir Hari Ini', value: stats.presentToday || 0 },
    { metric: 'Terlambat Hari Ini', value: stats.lateToday || 0 },
    { metric: 'Tidak Hadir Hari Ini', value: stats.absentToday || 0 },
    { metric: 'Tingkat Kehadiran', value: `${stats.attendanceRate || 0}%` },
  ];

  const columns: ExportColumn[] = [
    { key: 'metric', label: 'Metrik' },
    { key: 'value', label: 'Nilai' },
  ];

  const options = { filename: 'laporan-statistik', columns, data: summary };
  
  return type === 'excel' ? exportToExcel(options) : exportToCSV(options);
}
