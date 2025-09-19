import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Users, Calendar, Settings, Save, Download, TrendingUp, FileText, Copy, CalendarDays, Edit2, Loader2 } from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';

const DeploymentManagementSystem = () => {
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
    cleaning: ''
  });
  const [showNewDateModal, setShowNewDateModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [salesData, setSalesData] = useState({
    hourlyData: '',
    weeklyData: ''
  });
  const [parsedSalesData, setParsedSalesData] = useState({
    today: [],
    lastYear: []
  });

  // Use Supabase hook
  const {
    staff,
    positions,
    deploymentsByDate,
    shiftInfoByDate,
    loading,
    error,
    addStaff,
    removeStaff,
    addDeployment,
    removeDeployment,
    updateDeployment,
    updateShiftInfo,
    deleteShiftInfo,
    duplicateDeployments,
    getPositionsByType,
    addPosition,
    removePosition,
    updatePosition,
    getPositionsWithAreas,
    getAreaPositions
  } = useSupabaseData();

  // Get current deployments and shift info
  const currentDeployments = deploymentsByDate[selectedDate] || [];
  const currentShiftInfo = shiftInfoByDate[selectedDate] || {
    date: selectedDate,
    forecast: '£0.00',
    day_shift_forecast: '£0.00',
    night_shift_forecast: '£0.00',
    weather: '',
    notes: ''
  };

  // Get positions by type
  const regularPositions = getPositionsByType('position');
  const packPositions = getPositionsByType('pack_position');
  const areas = getPositionsByType('area');
  const cleaningAreas = getPositionsByType('cleaning_area');
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
      return 30;
    } else {
      return 15;
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
          cleaning: newDeployment.cleaning || '',
          break_minutes: breakTime
        });
        
        setNewDeployment({
          staff_id: '',
          start_time: '',
          end_time: '',
          position: '',
          secondary: '',
          area: '',
          cleaning: ''
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
        await updateShiftInfo(newDate, {
          forecast: '£0.00',
          day_shift_forecast: '£0.00',
          night_shift_forecast: '£0.00',
          weather: '',
          notes: ''
        });
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

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? staffMember.name : 'Unknown';
  };

  const exportToPDF = () => {
    window.print();
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
        {[
          { id: 'deployment', label: 'Deployment', icon: Users },
          { id: 'staff', label: 'Staff Management', icon: Users },
          { id: 'positions', label: 'Position Management', icon: Settings },
          { id: 'sales', label: 'Sales Data', icon: TrendingUp },
          { id: 'reports', label: 'Reports', icon: FileText }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentPage(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentPage === id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
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
    <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Shift Information - {selectedDate}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Forecast</label>
          <input
            type="text"
            value={currentShiftInfo.forecast || ''}
            onChange={(e) => handleUpdateShiftInfo('forecast', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="£0.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Day Shift Forecast</label>
          <input
            type="text"
            value={currentShiftInfo.day_shift_forecast || ''}
            onChange={(e) => handleUpdateShiftInfo('day_shift_forecast', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="£0.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Night Shift Forecast</label>
          <input
            type="text"
            value={currentShiftInfo.night_shift_forecast || ''}
            onChange={(e) => handleUpdateShiftInfo('night_shift_forecast', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="£0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weather</label>
          <input
            type="text"
            value={currentShiftInfo.weather || ''}
            onChange={(e) => handleUpdateShiftInfo('weather', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Weather conditions"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={currentShiftInfo.notes || ''}
            onChange={(e) => handleUpdateShiftInfo('notes', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Shift notes and reminders"
            rows="2"
          />
        </div>
      </div>
    </div>
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select area</option>
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cleaning Area</label>
          <select
            value={newDeployment.cleaning}
            onChange={(e) => setNewDeployment(prev => ({ ...prev, cleaning: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select cleaning area</option>
            {cleaningAreas.map(area => (
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
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaning</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingDeployment === deployment.id ? (
                      <select
                        defaultValue={deployment.position || ''}
                        onChange={(e) => handleUpdateDeployment(deployment.id, { position: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        autoFocus
                      >
                        <option value="">Select position</option>
                        {regularPositions.map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {deployment.position || 'Not set'}
                        </span>
                        <button
                          onClick={() => setEditingDeployment(deployment.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingDeployment === deployment.id ? (
                      <select
                        defaultValue={deployment.secondary || ''}
                        onChange={(e) => handleUpdateDeployment(deployment.id, { secondary: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select secondary</option>
                        {secondaryPositions.map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{deployment.secondary || '-'}</span>
                        <button
                          onClick={() => setEditingDeployment(deployment.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deployment.area || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingDeployment === deployment.id ? (
                      <select
                        defaultValue={deployment.cleaning || ''}
                        onChange={(e) => handleUpdateDeployment(deployment.id, { cleaning: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select cleaning area</option>
                        {cleaningAreas.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{deployment.cleaning || '-'}</span>
                        <button
                          onClick={() => setEditingDeployment(deployment.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      {deployment.break_minutes || 0}min
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      {editingDeployment === deployment.id && (
                        <button
                          onClick={() => setEditingDeployment(null)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <span className="text-xs">Done</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveDeployment(deployment.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                                {position.name}
                              </span>
                              {position.area_name && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Area: {position.area_name}
                                </div>
                              )}
                              {type === 'area' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Positions: {getAreaPositions(position.id).map(p => p.name).join(', ') || 'None'}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingPosition(position.id)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemovePosition(position.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
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
        <p className="text-sm text-gray-600 mb-4">
          Paste hourly sales data from your POS system with columns: Minute, Forecast, Actual, Last Year, Forecast, Actual, Last Year (tab-separated)
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Sales Data (Today vs Last Year)</label>
            <textarea
              value={salesData.hourlyData}
              onChange={(e) => setSalesData(prev => ({ ...prev, hourlyData: e.target.value }))}
              className="w-full h-40 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="11:00	£120.00	£115.00	£110.00	£108.00	-£2.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: Minute | Today Forecast | Today Actual | Last Year Forecast | Last Year Actual | Last Year Variance
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Summary Data</label>
            <textarea
              value={salesData.weeklyData}
              onChange={(e) => setSalesData(prev => ({ ...prev, weeklyData: e.target.value }))}
              className="w-full h-40 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Monday	£1,450.00	£1,420.00	+£30.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: Day | Sales | Target | Variance (optional weekly data)
            </p>
          </div>
        </div>
      </div>

      {(parsedSalesData.today.length > 0 || parsedSalesData.lastYear.length > 0) && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Hourly Sales Comparison - Today vs Last Year</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today Forecast</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Year Forecast</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Year Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parsedSalesData.today.map((todayData, index) => {
                  const lastYearData = parsedSalesData.lastYear[index];
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {todayData.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {todayData.forecast}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {todayData.actual}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lastYearData?.forecast || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lastYearData?.actual || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lastYearData?.variance || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parsedSalesData.weekly && parsedSalesData.weekly.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Weekly Sales Summary</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parsedSalesData.weekly.map((weekData, index) => {
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {weekData.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {weekData.sales}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {weekData.target}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {weekData.variance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Reports & Analytics</h3>
      <p className="text-gray-600">Reports functionality coming soon...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">KFC Deployment Management System</h1>
        
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
        {currentPage === 'reports' && renderReports()}

        {/* New Date Modal */}
        {showNewDateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
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
              
              <div className="flex justify-end gap-3">
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

export default DeploymentManagementSystem;