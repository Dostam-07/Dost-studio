FILE: src/pages/ReportExport.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import useReportStore from '../stores/useReportStore';

interface ExportOption {
  id: string;
  label: string;
  icon: JSX.Element;
  format: 'pdf' | 'csv' | 'json';
}

export default function ReportExport() {
  const navigate = useNavigate();
  const { reportData } = useReportStore();
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');

  const exportOptions: ExportOption[] = [
    {
      id: 'pdf',
      label: 'PDF Document',
      icon: <FileText className="w-6 h-6" />,
      format: 'pdf'
    },
    {
      id: 'csv',
      label: 'CSV Spreadsheet',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      format: 'csv'
    },
    {
      id: 'json',
      label: 'JSON Data',
      icon: <FileJson className="w-6 h-6" />,
      format: 'json'
    }
  ];

  const handleExport = () => {
    if (!reportData) {
      alert('No report data available');
      return;
    }

    let content: string;
    let mimeType: string;
    let fileName: string;

    switch (selectedFormat) {
      case 'pdf':
        // Mock PDF export implementation
        content = JSON.stringify(reportData);
        mimeType = 'application/pdf';
        fileName = 'report.pdf';
        break;
      case 'csv':
        // Convert report data to CSV format
        const headers = Object.keys(reportData[0]).join(',');
        const rows = reportData.map(row => Object.values(row).join(','));
        content = [headers, ...rows].join('\n');
        mimeType = 'text/csv';
        fileName = 'report.csv';
        break;
      case 'json':
        content = JSON.stringify(reportData, null, 2);
        mimeType = 'application/json';
        fileName = 'report.json';
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Export Report</h1>
        <Link
          to="/reports"
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          Back to Reports
        </Link>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Select Export Format</h2>

        <div className="space-y-4 mb-8">
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedFormat(option.format)}
              className={`w-full flex items-center p-4 rounded-lg border transition-all ${
                selectedFormat === option.format
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="mr-4 text-blue-600">{option.icon}</div>
              <div className="text-left">
                <p className="font-medium">{option.label}</p>
                <p className="text-sm text-gray-500">
                  Export report as {option.format.toUpperCase()}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5 mr-2" />
          Export Report
        </button>
      </div>
    </div>
  );
}