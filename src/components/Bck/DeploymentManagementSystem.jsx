import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Users, Calendar, Settings, Save, Download, TrendingUp, FileText, Copy, CalendarDays, Edit2, LogOut, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSupabaseData } from '../hooks/useSupabaseData';

const DeploymentManagementSystem = ({ onLogout }) => {
  // Call useSupabaseData hook first, before any other hooks
  const {
    staff,
    positions,
    deploymentsByDate,
    shiftInfoByDate,
    salesRecordsByDate,
    targets,
    loading,
    error,
    addStaff,
    removeStaff,
    addDeployment,
    removeDeployment,
    updateDeployment,
    updateShiftInfo,
    updateSalesRecords,
    calculateForecastTotals,
    deleteShiftInfo,
    duplicateDeployments,
    getPositionsByType,
    addPosition,
    removePosition,
    updatePosition,
    getPositionsWithAreas,
    getAreaPositions,
    addTarget,
    updateTarget,
    removeTarget,
    loadTargets
  } = useSupabaseData();

  const [currentPage, setCurrentPage] = useState('deployment');
  const [selectedDate, setSelectedDate] = useState('08/09/2025');
  const [newStaff, setNewStaff] = useState({ name: '', is_under_18: false });
  const [newPosition, setNewPosition] = useState({ name: '', type: 'position', area_id: '' });
  const [editingPosition, setEditingPosition] = useState(null);
  const [editingDeployment, setEditingDeployment] = useState(null);
  const [newDeployment, setNewDeployment] = useState({
    staff_id: '',
    start_time: '',
    end_time: '',
    position: '',
    secondary: '',
    area: '',
    closing: ''
  });
  const [showNewDateModal, setShowNewDateModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [tempSalesRecords, setTempSalesRecords] = useState([]);
  const [salesData, setSalesData] = useState({
    hourlyData: '',
    weeklyData: ''
  });
  const [parsedSalesData, setParsedSalesData] = useState({
    today: [],
    lastYear: []
  });

  const [newTarget, setNewTarget] = useState({
    name: '',
    value: '',
    priority: 0
  });

  // Get current deployments and shift info
  const currentDeployments = deploymentsByDate[selectedDate] || [];
  const currentShiftInfo = shiftInfoByDate[selectedDate] || {
    date: selectedDate,
    weather: '',
    notes: ''
  };
  
  const currentSalesRecords = salesRecordsByDate[selectedDate] || [];
  const forecastTotals = calculateForecastTotals(selectedDate);

  // Get positions by type
  const regularPositions = getPositionsByType('position');
  const packPositions = getPositionsByType('pack_position');
  const areas = getPositionsByType('area');
  const cleaningAreas = getPositionsByType('cleaning_area');
  const closingAreas = getPositionsByType('closing_area');
  const secondaryPositions = [...regularPositions, ...packPositions];

  const calculateWorkHours = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let start = startHour + startMin / 60;
    let end = endHour + endMin / 60;
    
    if (end < start) {
      end += 24;
    }
    
    return end - start;
  };

const calculateBreakTime = (staffMember, workHours) => {
    if (staffMember.is_under_18) {
      // Under 18: only get break if working 4.5+ hours
      if (workHours >= 4.5) {
        return 30;
      }
      return 0;
    }

    // Over 18: standard break rules
    if (workHours >= 6) {
      return 0;
    } else if (workHours >= 6) {
      if (workHours >= 4.5) {
        return 30;
      }
      return 0;
    } else {
      return 0;
    }
  };


  const parseSalesData = (data) => {
    if (!data || typeof data !== 'string') return [];
    
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const records = [];
    
    for (const line of lines) {
      // Match patterns like "10:00 £1,234.56" or "10:00 1234.56" or "10:00 1234"
      const match = line.match(/(\d{1,2}:\d{2})\s+£?([\d,]+(?:\.\d{2})?)/);
      if (match) {
        const [, time, amount] = match;
        // Remove commas and convert to number
        const numericAmount = parseFloat(amount.replace(/,/g, ''));
        records.push({
          time,
          forecast: isNaN(numericAmount) ? 0 : numericAmount
        });
      }
    }
    
    return records;
  };

  const updateSalesData = async (field, value) => {
    try {
      // Parse and update forecasts when sales data changes
      if (field === 'today_data') {
        const parsed = parseSalesData(value);
        if (parsed.length > 0) {
          const totalForecast = parsed[parsed.length - 1]?.total || '£0.00';
          const dayForecast = parsed.find(p => p.period?.includes('Day'))?.total || '£0.00';
          const nightForecast = parsed.find(p => p.period?.includes('Night'))?.total || '£0.00';
          
          await updateShiftInfo(selectedDate, {
            ...currentShiftInfo,
            forecast: `£${totalForecast.toFixed(2)}`,
            day_shift_forecast: `£${dayForecast.toFixed(2)}`,
            night_shift_forecast: `£${nightForecast.toFixed(2)}`
          });
        }
      }
      
      setSalesData(prev => ({
        ...prev,
        [field]: value
      }));
    } catch (error) {
      console.error('Error updating sales data:', error);
    }
  };

  const handleSalesDataChange = (field, value) => {
    setSalesData(prev => ({ ...prev, [field]: value }));
    
    if (value.trim()) {
      const parsed = parseSalesData(value);
      setParsedSalesData(prev => ({ ...prev, [field.replace('Data', '')]: parsed }));
    } else {
      setParsedSalesData(prev => ({ ...prev, [field.replace('Data', '')]: [] }));
    }
  };

  const handleSalesModalOpen = () => {
    // Initialize temp records with current data or default structure
    if (currentSalesRecords.length > 0) {
      setTempSalesRecords([...currentSalesRecords]);
    } else {
      // Create default time slots
      const defaultTimes = [];
      for (let hour = 6; hour < 24; hour++) {
        defaultTimes.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          forecast: 0
        });
      }
      setTempSalesRecords(defaultTimes);
    }
    setShowSalesModal(true);
  };

  const handleSalesRecordChange = (index, field, value) => {
    setTempSalesRecords(prev => prev.map((record, i) => 
      i === index ? { ...record, [field]: value } : record
    ));
  };

  const addSalesRecord = () => {
    setTempSalesRecords(prev => [...prev, { time: '12:00', forecast: 0 }]);
  };

  const removeSalesRecord = (index) => {
    setTempSalesRecords(prev => prev.filter((_, i) => i !== index));
  };

  const saveSalesRecords = async () => {
    try {
      await updateSalesRecords(selectedDate, tempSalesRecords);
      setShowSalesModal(false);
    } catch (error) {
      console.error('Error saving sales records:', error);
    }
  };

  const handleSalesDataSave = async () => {
    try {
      const parsedRecords = parseSalesData(salesDataInput);
      console.log('Parsed records:', parsedRecords); // Debug log
      
      if (parsedRecords.length > 0) {
        // Update sales records in database
        const savedRecords = await updateSalesRecords(selectedDate, parsedRecords);
        console.log('Saved records:', savedRecords); // Debug log
        
        // Calculate totals from the saved records
        const totals = calculateForecastTotals(selectedDate);
        console.log('Calculated totals:', totals); // Debug log
        
        // Update shift info with calculated totals
        await updateShiftInfo(selectedDate, {
          forecast: `£${totals.total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          day_shift_forecast: `£${totals.dayShift.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          night_shift_forecast: `£${totals.nightShift.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          weather: currentShiftInfo.weather || '',
          notes: currentShiftInfo.notes || ''
        });
        
        console.log('Shift info updated successfully'); // Debug log
      } else {
        console.log('No valid records parsed'); // Debug log
        // Clear sales records if no valid data
        await updateSalesRecords(selectedDate, []);
        
        // Reset forecasts to £0.00
        await updateShiftInfo(selectedDate, {
          forecast: '£0.00',
          day_shift_forecast: '£0.00',
          night_shift_forecast: '£0.00',
          weather: currentShiftInfo.weather || '',
          notes: currentShiftInfo.notes || ''
        });
      }
      
      setSalesDataInput('');
      setShowSalesModal(false);
      
      // Show success message
      alert('Sales data updated successfully!');
    } catch (error) {
      console.error('Error saving sales data:', error);
      alert('Error saving sales data: ' + error.message);
    }
  };

  const handleAddStaff = async () => {
    if (newStaff.name.trim()) {
      try {
        await addStaff({
          name: newStaff.name.trim(),
          is_under_18: newStaff.is_under_18
        });
        setNewStaff({ name: '', is_under_18: false });
      } catch (err) {
        console.error('Error adding staff:', err);
        alert('Failed to add staff member. Please try again.');
      }
    }
  };

  const handleRemoveStaff = async (id) => {
    if (confirm('Are you sure you want to remove this staff member? This will also remove all their deployments.')) {
      try {
        await removeStaff(id);
      } catch (err) {
        console.error('Error removing staff:', err);
        alert('Failed to remove staff member. Please try again.');
      }
    }
  };

  const handleAddDeployment = async () => {
    if (newDeployment.staff_id && newDeployment.start_time && newDeployment.end_time) {
      try {
        const staffMember = staff.find(s => s.id === newDeployment.staff_id);
        const workHours = calculateWorkHours(newDeployment.start_time, newDeployment.end_time);
        const breakTime = calculateBreakTime(staffMember, workHours);
        
        await addDeployment({
          date: selectedDate,
          staff_id: newDeployment.staff_id,
          start_time: newDeployment.start_time,
          end_time: newDeployment.end_time,
          position: newDeployment.position || '',
          secondary: newDeployment.secondary || '',
          area: newDeployment.area || '',
          closing: newDeployment.closing || '',
          break_minutes: breakTime
        });
        
        setNewDeployment({
          staff_id: '',
          start_time: '',
          end_time: '',
          position: '',
          secondary: '',
          area: '',
          closing: ''
        });
      } catch (err) {
        console.error('Error adding deployment:', err);
        alert('Failed to add deployment. Please try again.');
      }
    }
  };

  const handleRemoveDeployment = async (id) => {
    try {
      await removeDeployment(id);
    } catch (err) {
      console.error('Error removing deployment:', err);
      alert('Failed to remove deployment. Please try again.');
    }
  };

  const handleUpdateShiftInfo = async (field, value) => {
    try {
      const updates = { [field]: value };
      await updateShiftInfo(selectedDate, {
        ...currentShiftInfo,
        ...updates
      });
    } catch (err) {
      console.error('Error updating shift info:', err);
      alert('Failed to update shift information. Please try again.');
    }
  };

  const createNewDate = async () => {
    if (newDate && !deploymentsByDate[newDate]) {
      try {
        const newShiftInfo = {
          forecast: '£0.00',
          day_shift_forecast: '£0.00',
          night_shift_forecast: '£0.00',
          weather: '',
          notes: ''
        };
        
        await updateShiftInfo(newDate, newShiftInfo);
        
        setSelectedDate(newDate);
        setNewDate('');
        setShowNewDateModal(false);
      } catch (err) {
        console.error('Error creating new date:', err);
        alert('Failed to create new date. Please try again.');
      }
    }
  };

  const handleDuplicateDeployment = async (fromDate) => {
    if (fromDate && fromDate !== selectedDate) {
      try {
        await duplicateDeployments(fromDate, selectedDate);
      } catch (err) {
        console.error('Error duplicating deployment:', err);
        alert('Failed to duplicate deployment. Please try again.');
      }
    }
  };

  const deleteDate = async (dateToDelete) => {
    if (dateToDelete && Object.keys(deploymentsByDate).length > 1) {
      if (confirm('Are you sure you want to delete this date and all its deployments?')) {
        try {
          // Remove all deployments for this date
          const deploymentsToDelete = deploymentsByDate[dateToDelete] || [];
          await Promise.all(deploymentsToDelete.map(d => removeDeployment(d.id)));
          
          // Remove shift info
          await deleteShiftInfo(dateToDelete);
          
          if (selectedDate === dateToDelete) {
            const remainingDates = Object.keys(deploymentsByDate).filter(d => d !== dateToDelete);
            if (remainingDates.length > 0) {
              setSelectedDate(remainingDates[0]);
            }
          }
        } catch (err) {
          console.error('Error deleting date:', err);
          alert('Failed to delete date. Please try again.');
        }
      }
    }
  };

  const handleAddPosition = async () => {
    if (newPosition.name.trim()) {
      try {
        await addPosition({
          name: newPosition.name.trim(),
          type: newPosition.type,
          area_id: newPosition.area_id || null
        });
        setNewPosition({ name: '', type: 'position', area_id: '' });
      } catch (err) {
        console.error('Error adding position:', err);
        alert('Failed to add position. Please try again.');
      }
    }
  };

  const handleRemovePosition = async (id) => {
    if (confirm('Are you sure you want to remove this position?')) {
      try {
        await removePosition(id);
      } catch (err) {
        console.error('Error removing position:', err);
        alert('Failed to remove position. Please try again.');
      }
    }
  };

  const handleUpdatePosition = async (id, updates) => {
    try {
      await updatePosition(id, updates);
      setEditingPosition(null);
    } catch (err) {
      console.error('Error updating position:', err);
      alert('Failed to update position. Please try again.');
    }
  };

  const handleUpdateDeployment = async (id, updates) => {
    try {
      await updateDeployment(id, updates);
      setEditingDeployment(null);
    } catch (err) {
      console.error('Error updating deployment:', err);
      alert('Failed to update deployment. Please try again.');
    }
  };

  const handleAddTarget = async () => {
    if (!newTarget.name.trim()) return;
    
    try {
      await addTarget({
        name: newTarget.name.trim(),
        value: newTarget.value.trim(),
        priority: newTarget.priority || targets.length,
        is_active: true
      });
      
      setNewTarget({ name: '', value: '', priority: 0 });
    } catch (error) {
      console.error('Error adding target:', error);
    }
  };

  const handleUpdateTarget = async (id, updates) => {
    try {
      await updateTarget(id, updates);
    } catch (error) {
      console.error('Error updating target:', error);
    }
  };

  const handleRemoveTarget = async (id) => {
    try {
      await removeTarget(id);
    } catch (error) {
      console.error('Error removing target:', error);
    }
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? staffMember.name : 'Unknown';
  };

  const exportToPDF = () => {
    window.print();
  };

  const exportToExcel = () => {
    try {
      // Get current shift info with calculated forecasts
      const currentShiftInfo = shiftInfoByDate[selectedDate] || {};
      const forecastTotals = calculateForecastTotals(selectedDate);
      
      const wb = XLSX.utils.book_new();
      
      // Get day of week from date
      const dateObj = new Date(selectedDate.split('/').reverse().join('-'));
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = dateObj.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      // Create the data array starting with header information
      const wsData = [
        ['Day', dayOfWeek, 'Date', formattedDate, 'Total Forecast', `£${forecastTotals.total.toFixed(2)}`, 'Weather', currentShiftInfo.weather || '', ''],
        ['', '', 'Day Shift Forecast', `£${forecastTotals.dayShift.toFixed(2)}`, 
          'Night Shift Forecast', `£${forecastTotals.nightShift.toFixed(2)}`, '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['Staff Name', 'Start Time', 'End Time', 'Work Hours', 'Position', 'Secondary', 'Closing', 'Break Minutes', '']
      ];
      
      // Add deployment data
      currentDeployments.forEach(deployment => {
        const staffMember = staff.find(s => s.id === deployment.staff_id);
        const staffName = staffMember ? staffMember.name : 'Unknown';
        const workHours = deployment.start_time && deployment.end_time ? 
          calculateWorkHours(deployment.start_time, deployment.end_time) : 0;
        
        wsData.push([
          staffName,
          deployment.start_time || '',
          deployment.end_time || '',
          workHours.toFixed(2),
          deployment.position || '',
          deployment.secondary || '',
          deployment.closing || '',
          deployment.break_minutes || 0,
          ''
        ]);
      });
      
      // Add empty rows and targets/notes section
      wsData.push(['', '', '', '', '', '', '', '', '']);
      wsData.push(['', '', '', '', '', '', '', '', '']);
      
      // Add notes section
      const notesRowIndex = wsData.length;
      wsData.push(['Notes:', '', '', '', '', '', '', '', '']);
      wsData.push([currentShiftInfo.notes || '', '', '', '', '', '', '', '', '']);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // A - Staff Name
        { wch: 12 }, // B - Start Time
        { wch: 12 }, // C - End Time
        { wch: 12 }, // D - Work Hours
        { wch: 15 }, // E - Position
        { wch: 15 }, // F - Secondary
        { wch: 15 }, // G - Closing
        { wch: 15 }, // H - Break Minutes
        { wch: 10 }  // I - Extra column
      ];
      
      // Merge cells for notes (2 rows, A to H)
      ws['!merges'] = [
        { s: { r: notesRowIndex + 1, c: 0 }, e: { r: notesRowIndex + 2, c: 7 } }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Deployment Schedule');
      
      // Save file
      XLSX.writeFile(wb, `deployment-${selectedDate.replace(/\//g, '-')}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  const parseHourlySalesData = (data) => {
    if (!data) return [];
    
    const lines = data.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split('\t').map(part => part.trim());
      return {
        minute: parts[0] || '',
        todayForecast: parts[1] || '',
        todayActual: parts[2] || '',
        lastYearForecast: parts[3] || '',
        lastYearActual: parts[4] || '',
        lastYearVariance: parts[5] || ''
      };
    });
  };

  const parseWeeklySalesData = (data) => {
    if (!data) return [];
    
    const lines = data.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split('\t').map(part => part.trim());
      return {
        time: parts[0] || '',
        sales: parts[1] || '',
        target: parts[2] || '',
        variance: parts[3] || ''
      };
    });
  };

  useEffect(() => {
    const hourlyParsed = parseHourlySalesData(salesData.hourlyData);
    const weeklyParsed = parseWeeklySalesData(salesData.weeklyData);
    
    setParsedSalesData({
      today: hourlyParsed.map(row => ({
        time: row.minute,
        forecast: row.todayForecast,
        actual: row.todayActual
      })),
      lastYear: hourlyParsed.map(row => ({
        time: row.minute,
        forecast: row.lastYearForecast,
        actual: row.lastYearActual,
        variance: row.lastYearVariance
      })),
      weekly: weeklyParsed
    });
  }, [salesData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading deployment data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderNavigation = () => (
    <nav className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div className="flex flex-wrap gap-2">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setCurrentPage('deployment')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage === 'deployment'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Deployment
          </button>
          <button
            onClick={() => setCurrentPage('staff')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage === 'staff'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Staff Management
          </button>
          <button
            onClick={() => setCurrentPage('sales')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage === 'sales'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Sales Data
          </button>
          <button
            onClick={() => setCurrentPage('reports')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === 'reports'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Reports
          </button>
          <button
            onClick={() => setCurrentPage('targets')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage === 'targets'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Targets
          </button>
        </nav>
      </div>
    </nav>
  );

  const renderDateSelector = () => (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <label className="font-medium text-gray-700">Select Date:</label>
        </div>
        
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.keys(deploymentsByDate).sort().map(date => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>

        <button
          onClick={() => setShowNewDateModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Date
        </button>

        {Object.keys(deploymentsByDate).length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Copy from:</label>
            <select
              onChange={(e) => e.target.value && handleDuplicateDeployment(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              defaultValue=""
            >
              <option value="">Select date to copy</option>
              {Object.keys(deploymentsByDate)
                .filter(date => date !== selectedDate)
                .sort()
                .map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
            </select>
          </div>
        )}

        {Object.keys(deploymentsByDate).length > 1 && (
          <button
            onClick={() => deleteDate(selectedDate)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Date
          </button>
        )}
      </div>
    </div>
  );

  const renderShiftInfo = () => (
    <>
    <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Shift Information - {selectedDate}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Forecast</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
              £{forecastTotals.total.toFixed(2)}
            </div>
            <button
              onClick={handleSalesModalOpen}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Day Shift Forecast</label>
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
            £{forecastTotals.dayShift.toFixed(2)}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Night Shift Forecast</label>
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
            £{forecastTotals.nightShift.toFixed(2)}
          </div>
        </div>
      </div>

                {/* Targets Display */}
                {targets.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-3">Today's Targets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {targets.map(target => (
                        <div key={target.id} className="bg-white rounded-lg p-3 border border-yellow-300">
                          <div className="font-medium text-yellow-900">{target.name}</div>
                          {target.value && (
                            <div className="text-sm text-yellow-700 mt-1">{target.value}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weather</label>
          <input
            type="text"
            value={currentShiftInfo.weather || ''}
            onChange={(e) => updateShiftInfo(selectedDate, { ...currentShiftInfo, weather: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Weather conditions"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={currentShiftInfo.notes || ''}
            onChange={(e) => updateShiftInfo(selectedDate, { ...currentShiftInfo, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Shift notes and reminders"
            rows="2"
          />
        </div>
      </div>
      </div>

    {/* Sales Records Modal */}
    {showSalesModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Sales Records for {selectedDate}</h3>
                <button
                  onClick={() => setShowSalesModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              {/* Modal content would go here */}
            
            <div className="space-y-3 mb-4">
              {tempSalesRecords.map((record, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="time"
                    value={record.time}
                    onChange={(e) => handleSalesRecordChange(index, 'time', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={record.forecast}
                      onChange={(e) => handleSalesRecordChange(index, 'forecast', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={() => removeSalesRecord(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={addSalesRecord}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Time Slot</span>
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSalesModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSalesRecords}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );

  const renderDeploymentForm = () => (
    <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Deployment</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
          <select
            value={newDeployment.staff_id}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, staff_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select staff member</option>
            {staff.map(member => (
              <option key={member.id} value={member.id}>
                {member.name} {member.is_under_18 ? '(U18)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <input
            type="time"
            value={newDeployment.start_time}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, start_time: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <input
            type="time"
            value={newDeployment.end_time}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, end_time: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <select
            value={newDeployment.position}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, position: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select position (optional)</option>
            {regularPositions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Position</label>
          <select
            value={newDeployment.secondary}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, secondary: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select secondary position</option>
            {secondaryPositions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
          <select
            value={newDeployment.area}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, area: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Area</option>
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Closing Area</label>
          <select
            value={newDeployment.closing}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, closing: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Closing Area</option>
            {closingAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleAddDeployment}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Deployment
      </button>
    </div>
  );

  const renderDeploymentTable = () => (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Deployments - {selectedDate}</h3>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secondary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentDeployments.map((deployment) => {
              const staffMember = staff.find(s => s.id === deployment.staff_id);
              const workHours = calculateWorkHours(deployment.start_time, deployment.end_time);
              
              return (
                <tr key={deployment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {staffMember?.name || 'Unknown'}
                        </div>
                        {staffMember?.is_under_18 && (
                          <div className="text-xs text-orange-600">Under 18</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {deployment.start_time} - {deployment.end_time}
                    </div>
                    <div className="text-xs text-gray-500">
                      {workHours.toFixed(1)} hours
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deployment.position}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deployment.secondary || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deployment.area || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deployment.closing || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deployment.break_minutes || 0} mins</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{workHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRemoveDeployment(deployment.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {currentDeployments.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No deployments for this date</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStaffManagement = () => (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Staff Member</h3>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newStaff.name}
              onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter staff member name"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="under18"
              checked={newStaff.is_under_18}
              onChange={(e) => setNewStaff(prev => ({ ...prev, is_under_18: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="under18" className="text-sm text-gray-700">Under 18</label>
          </div>
          
          <button
            onClick={handleAddStaff}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Staff Members</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.is_under_18 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Under 18
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        18+
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveStaff(member.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {staff.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No staff members added yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPositionManagement = () => (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Position</h3>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Name</label>
            <input
              type="text"
              value={newPosition.name}
              onChange={(e) => setNewPosition(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter position name"
            />
          </div>
          
          <div className="min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Type</label>
            <select
              value={newPosition.type}
              onChange={(e) => setNewPosition(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="position">Regular Position</option>
              <option value="pack_position">Pack Position</option>
              <option value="area">Area</option>
              <option value="cleaning_area">Cleaning Area</option>
            </select>
          </div>

          {(newPosition.type === 'position' || newPosition.type === 'pack_position') && (
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Area</label>
              <select
                value={newPosition.area_id}
                onChange={(e) => setNewPosition(prev => ({ ...prev, area_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No area assignment</option>
                {positions.filter(p => p.type === 'area').map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={handleAddPosition}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Position
          </button>
        </div>
      </div>

      {/* Position Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { type: 'position', title: 'Regular Positions', color: 'blue' },
          { type: 'pack_position', title: 'Pack Positions', color: 'green' },
          { type: 'area', title: 'Areas', color: 'purple' },
          { type: 'cleaning_area', title: 'Cleaning Areas', color: 'orange' }
        ].map(({ type, title, color }) => {
          const positionsOfType = getPositionsWithAreas().filter(p => p.type === type);
          
          return (
            <div key={type} className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              </div>
              
              <div className="p-4">
                {positionsOfType.length > 0 ? (
                  <div className="space-y-2">
                    {positionsOfType.map((position) => (
                      <div key={position.id} className="p-3 bg-gray-50 rounded-lg">
                        {editingPosition === position.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              defaultValue={position.name}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdatePosition(position.id, { name: e.target.value });
                                } else if (e.key === 'Escape') {
                                  setEditingPosition(null);
                                }
                              }}
                              autoFocus
                            />
                            {(type === 'position' || type === 'pack_position') && (
                              <select
                                defaultValue={position.area_id || ''}
                                onChange={(e) => handleUpdatePosition(position.id, { area_id: e.target.value || null })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              >
                                <option value="">No area assignment</option>
                                {positions.filter(p => p.type === 'area').map(area => (
                                  <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                              </select>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingPosition(null)}
                                className="text-green-600 hover:text-green-900 text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPosition(null)}
                                className="text-gray-600 hover:text-gray-900 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{position.name}</div>
                              {position.area_name && (
                                <div className="text-xs text-gray-500">Area: {position.area_name}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingPosition(position.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemovePosition(position.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No {title.toLowerCase()} added yet</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSalesData = () => (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Data Input</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Sales Data (Today vs Last Year)
            </label>
            <textarea
              value={salesData.hourlyData}
              onChange={(e) => handleSalesDataChange('hourlyData', e.target.value)}
              className="w-full h-64 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste hourly sales data here (tab-separated)..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekly Sales Data
            </label>
            <textarea
              value={salesData.weeklyData}
              onChange={(e) => handleSalesDataChange('weeklyData', e.target.value)}
              className="w-full h-64 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste weekly sales data here (tab-separated)..."
            />
          </div>
        </div>
      </div>

      {/* Sales Data Display */}
      {(parsedSalesData.today.length > 0 || parsedSalesData.weekly?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {parsedSalesData.today.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Today's Hourly Data</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Forecast</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedSalesData.today.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.time}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.forecast}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parsedSalesData.weekly?.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Weekly Data</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedSalesData.weekly.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.time}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.sales}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.target}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.variance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Deployment Reports</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{currentDeployments.length}</div>
            <div className="text-sm text-blue-800">Total Deployments</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {currentDeployments.reduce((total, d) => {
                const hours = calculateWorkHours(d.start_time, d.end_time);
                return total + hours;
              }, 0).toFixed(1)}
            </div>
            <div className="text-sm text-green-800">Total Work Hours</div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {currentDeployments.reduce((total, d) => total + (d.break_minutes || 0), 0)}
            </div>
            <div className="text-sm text-orange-800">Total Break Minutes</div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );

  const renderReportsPage = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Staff Hours Report */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Staff Hours Report</h3>
              <p className="text-gray-600 mb-4">Generate detailed reports of staff working hours by date range.</p>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Generate Report
              </button>
            </div>

            {/* Position Coverage Report */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Position Coverage</h3>
              <p className="text-gray-600 mb-4">Analyze position coverage and identify gaps in scheduling.</p>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Generate Report
              </button>
            </div>

            {/* Sales vs Forecast Report */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Sales vs Forecast</h3>
              <p className="text-gray-600 mb-4">Compare actual sales performance against forecasts.</p>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Generate Report
              </button>
            </div>

            {/* Labor Cost Analysis */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Labor Cost Analysis</h3>
              <p className="text-gray-600 mb-4">Analyze labor costs and efficiency metrics.</p>
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Generate Report
              </button>
            </div>

            {/* Under 18 Compliance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Under 18 Compliance</h3>
              <p className="text-gray-600 mb-4">Monitor compliance with under 18 working hour regulations.</p>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Generate Report
              </button>
            </div>

            {/* Custom Report Builder */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Custom Report Builder</h3>
              <p className="text-gray-600 mb-4">Build custom reports with your own criteria and filters.</p>
              <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Build Report
              </button>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-blue-800 mb-2">Report Features</h4>
            <ul className="text-blue-700 space-y-1">
              <li>• Export to Excel, PDF, or CSV formats</li>
              <li>• Schedule automated report generation</li>
              <li>• Email reports to management team</li>
              <li>• Historical data comparison</li>
              <li>• Interactive charts and graphs</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Deployment Management System</h1>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {renderNavigation()}

        {currentPage === 'deployment' && (
          <>
            {renderDateSelector()}
            {renderShiftInfo()}
            {renderDeploymentForm()}
            {renderDeploymentTable()}
          </>
        )}

        {currentPage === 'staff' && renderStaffManagement()}
        {currentPage === 'positions' && renderPositionManagement()}
        {currentPage === 'sales' && renderSalesData()}
        {currentPage === 'reports' && renderReportsPage()}

          {/* Targets Management Page */}
          {currentPage === 'targets' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Target Management</h2>
                <p className="text-gray-600">Manage targets that appear above shift notes</p>
              </div>

              {/* Add New Target */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Target</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Name</label>
                    <input
                      type="text"
                      value={newTarget.name}
                      onChange={(e) => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Drive Thru Time"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                    <input
                      type="text"
                      value={newTarget.value}
                      onChange={(e) => setNewTarget(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="e.g., Under 90 seconds"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number"
                      value={newTarget.priority}
                      onChange={(e) => setNewTarget(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddTarget}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Target
                </button>
              </div>

              {/* Targets List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Current Targets</h3>
                {targets.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No targets configured yet. Add your first target above.</p>
                ) : (
                  <div className="space-y-3">
                    {targets.map(target => (
                      <TargetItem
                        key={target.id}
                        target={target}
                        onUpdate={handleUpdateTarget}
                        onRemove={handleRemoveTarget}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        {/* New Date Modal */}
        {showNewDateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Date</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowNewDateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewDate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Target Item Component
const TargetItem = ({ target, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: target.name,
    value: target.value,
    priority: target.priority
  });

  const handleSave = () => {
    onUpdate(target.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: target.name,
      value: target.value,
      priority: target.priority
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type="text"
              value={editData.value}
              onChange={(e) => setEditData(prev => ({ ...prev, value: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <input
              type="number"
              value={editData.priority}
              onChange={(e) => setEditData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center">
      <div>
        <h4 className="font-medium text-gray-900">{target.name}</h4>
        {target.value && <p className="text-sm text-gray-600">{target.value}</p>}
        <p className="text-xs text-gray-500">Priority: {target.priority}</p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => setIsEditing(true)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(target.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DeploymentManagementSystem;