import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToPDF = (deployments, shiftInfo, selectedDate, exportType = 'all') => {
  const doc = new jsPDF();
  
  // Set up document styling
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  
  // Title
  doc.text('KFC Deployment Schedule', 20, 20);
  
  // Date and shift info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${selectedDate}`, 20, 35);
  
  if (shiftInfo) {
    doc.text(`Forecast: ${shiftInfo.forecast || '£0.00'}`, 20, 45);
    if (shiftInfo.day_shift_forecast) {
      doc.text(`Day Shift Forecast: ${shiftInfo.day_shift_forecast}`, 20, 55);
    }
    if (shiftInfo.night_shift_forecast) {
      doc.text(`Night Shift Forecast: ${shiftInfo.night_shift_forecast}`, 20, 65);
    }
    if (shiftInfo.weather) {
      doc.text(`Weather: ${shiftInfo.weather}`, 20, 75);
    }
  }
  
  let yPosition = shiftInfo ? 85 : 55;
  
  // Filter deployments based on export type
  let deploymentsToExport = deployments;
  if (exportType === 'day') {
    deploymentsToExport = deployments.filter(d => d.shift_type === 'Day Shift');
  } else if (exportType === 'night') {
    deploymentsToExport = deployments.filter(d => d.shift_type === 'Night Shift');
  }
  
  // Group deployments by shift type
  const dayShiftDeployments = deploymentsToExport.filter(d => d.shift_type === 'Day Shift');
  const nightShiftDeployments = deploymentsToExport.filter(d => d.shift_type === 'Night Shift');
  
  // Helper function to calculate work hours
  const calculateWorkHours = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let start = startHour + startMin / 60;
    let end = endHour + endMin / 60;
    
    if (end < start) {
      end += 24;
    }
    
    return (end - start).toFixed(1);
  };
  
  // Helper function to create deployment table
  const createDeploymentTable = (deployments, shiftType, startY) => {
    if (deployments.length === 0) return startY;
    
    // Shift title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${shiftType} Deployments`, 20, startY);
    
    // Define columns based on shift type (hide Closing Position for Day Shift)
    const baseColumns = [
      { header: 'Staff Name', dataKey: 'staffName' },
      { header: 'Start Time', dataKey: 'startTime' },
      { header: 'End Time', dataKey: 'endTime' },
      { header: 'Hours', dataKey: 'hours' },
      { header: 'Position', dataKey: 'position' },
      { header: 'Secondary', dataKey: 'secondary' },
      { header: 'Area', dataKey: 'area' },
      { header: 'Break (min)', dataKey: 'breakMinutes' }
    ];
    
    // Add Closing Position column only for Night Shift (matching Excel logic)
    const columns = shiftType === 'Night Shift' 
      ? [...baseColumns, { header: 'Closing Position', dataKey: 'closing' }]
      : baseColumns;
    
    // Prepare data
    const tableData = deployments.map(deployment => {
      const baseData = {
        staffName: deployment.staff?.name || 'Unknown',
        startTime: deployment.start_time,
        endTime: deployment.end_time,
        hours: calculateWorkHours(deployment.start_time, deployment.end_time),
        position: deployment.position,
        secondary: deployment.secondary || '',
        area: deployment.area || '',
        breakMinutes: deployment.break_minutes || 0
      };
      
      // Add closing position only for Night Shift
      if (shiftType === 'Night Shift') {
        baseData.closing = deployment.closing || '';
      }
      
      return baseData;
    });
    
    // Create table
    doc.autoTable({
      columns: columns,
      body: tableData,
      startY: startY + 10,
      theme: 'grid',
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        staffName: { cellWidth: 25 },
        startTime: { cellWidth: 18, halign: 'center' },
        endTime: { cellWidth: 18, halign: 'center' },
        hours: { cellWidth: 15, halign: 'center' },
        position: { cellWidth: 20 },
        secondary: { cellWidth: 20 },
        area: { cellWidth: 25 },
        breakMinutes: { cellWidth: 18, halign: 'center' },
        closing: { cellWidth: 25 }
      },
      margin: { left: 20, right: 20 }
    });
    
    return doc.lastAutoTable.finalY + 15;
  };
  
  // Create tables for each shift type
  if (dayShiftDeployments.length > 0) {
    yPosition = createDeploymentTable(dayShiftDeployments, 'Day Shift', yPosition);
  }
  
  if (nightShiftDeployments.length > 0) {
    // Add new page if needed
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    yPosition = createDeploymentTable(nightShiftDeployments, 'Night Shift', yPosition);
  }
  
  // Add notes if available
  if (shiftInfo?.notes) {
    // Add new page if needed
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, yPosition);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Split long notes into multiple lines
    const splitNotes = doc.splitTextToSize(shiftInfo.notes, 170);
    doc.text(splitNotes, 20, yPosition + 10);
  }
  
  // Generate filename
  const dateStr = selectedDate.replace(/\//g, '-');
  const typeStr = exportType === 'all' ? 'All-Shifts' : 
                  exportType === 'day' ? 'Day-Shift' : 'Night-Shift';
  const filename = `Deployment-Schedule-${dateStr}-${typeStr}.pdf`;
  
  // Save the PDF
  doc.save(filename);
};