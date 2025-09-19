import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Users, Calendar, Settings, Save, Download, TrendingUp, FileText, Copy, CalendarDays, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DeploymentManagementSystem = () => {
  const [currentPage, setCurrentPage] = useState('deployment');
  const [selectedDate, setSelectedDate] = useState('08/09/2025');
  const [staff, setStaff] = useState([]);

  const [positions, setPositions] = useState({
    areas: {},
    cleaning_area: ['Lobby / Toilets', 'Front', 'Staff Room / Toilet', 'Kitchen']
  });

  // Store deployments by date
  const [deploymentsByDate, setDeploymentsByDate] = useState({});

  // Store shift info by date
  const [shiftInfoByDate, setShiftInfoByDate] = useState({});

  const [salesData, setSalesData] = useState({
    todayData: '',
    lastWeekData: '',
    lastYearData: ''
  });

  const [parsedSalesData, setParsedSalesData] = useState({
    today: [],
    lastWeek: [],
    lastYear: []
  });

  const [newStaff, setNewStaff] = useState({ name: '', isUnder18: false });
  const [newDeployment, setNewDeployment] = useState({
    staffId: '',
    startTime: '',
    endTime: '',
    position: '',
    secondary: '',
    area: '',
    cleaning: ''
  });

  const [showNewDateModal, setShowNewDateModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [usingSupabase, setUsingSupabase] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newPositionName, setNewPositionName] = useState('');
  const [selectedAreaForPosition, setSelectedAreaForPosition] = useState('');

  // Get current deployments and shift info
  const currentDeployments = Array.isArray(deploymentsByDate[selectedDate]) ? deploymentsByDate[selectedDate] : [];
  const currentShiftInfo = shiftInfoByDate[selectedDate] || {
    date: selectedDate,
    forecast: '£0.00',
    dayShiftForecast: '£0.00',
    nightShiftForecast: '£0.00',
    weather: '',
    notes: ''
  };

  // Check if Supabase is configured
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.from('staff').select('count').limit(1);
        if (!error) {
          setUsingSupabase(true);
          await loadFromSupabase();
        } else {
          console.log('Supabase connection failed, using local storage');
          loadFromLocalStorage();
        }
      } catch (e) {
        console.log('Supabase error, using local storage:', e);
        loadFromLocalStorage();
      }
      setIsLoading(false);
    };
    
    checkSupabase();
  }, []);

  const loadFromSupabase = async () => {
    // Supabase is now always available
    
    try {
      setSaveStatus('Loading...');
      
      // Load staff
      const { data: fetchedStaffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, is_under_18');
      
      if (staffError) {
        console.error('Error loading staff:', staffError);
      } else if (fetchedStaffData && fetchedStaffData.length > 0) {
        const formattedStaff = fetchedStaffData.map(s => ({
          id: s.id,
          name: s.name,
          isUnder18: s.is_under_18
        }));
        setStaff(formattedStaff);
      }

      // Load positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*');
      
      if (positionsData && positionsData.length > 0) {
        // Group positions by type
        const positionsByType = positionsData.reduce((acc, position) => {
          if (position.type === 'cleaning_area') {
            acc.cleaningAreas.push(position.name);
          } else if (position.type === 'area') {
            acc.areas[position.name] = [];
          } else if (position.type === 'position') {
            // For positions, we need to find which area they belong to
            // Since we don't have area_name, we'll need to handle this differently
            if (!acc.positions[position.name]) {
              acc.positions[position.name] = position.name;
            }
          }
          return acc;
        }, { areas: {}, cleaningAreas: [], positions: {} });

        const groupedPositions = {
          areas: positionsByType.areas,
          cleaning_area: positionsByType.cleaningAreas
        };
        
        setPositions(groupedPositions);
      }

      // Load deployments
      const { data: deploymentsData, error: deploymentsError } = await supabase
        .from('deployments')
        .select('id, date, staff_id, start_time, end_time, position, secondary, area, cleaning, break_minutes');

      if (deploymentsData && deploymentsData.length > 0) {
        const groupedDeployments = {};
        deploymentsData.forEach(d => {
          if (!groupedDeployments[d.date]) {
            groupedDeployments[d.date] = [];
          }
          groupedDeployments[d.date].push({
            id: d.id,
            staffId: d.staff_id,
            startTime: d.start_time,
            endTime: d.end_time,
            position: d.position,
            secondary: d.secondary || '',
            area: d.area || '',
            cleaning: d.cleaning || '',
            breakMinutes: d.break_minutes || 0
          });
        });
        setDeploymentsByDate(groupedDeployments);
      }

      // Load shift info
      const { data: shiftData, error: shiftError } = await supabase
        .from('shift_info')
        .select('date, forecast, day_shift_forecast, night_shift_forecast, weather, notes');

      if (shiftData && shiftData.length > 0) {
        const groupedShiftInfo = {};
        shiftData.forEach(s => {
          groupedShiftInfo[s.date] = {
            date: s.date,
            forecast: s.forecast || '£0.00',
            dayShiftForecast: s.day_shift_forecast || '£0.00',
            nightShiftForecast: s.night_shift_forecast || '£0.00',
            weather: s.weather || '',
            notes: s.notes || ''
          };
        });
        setShiftInfoByDate(groupedShiftInfo);
      }

      // Load sales data
      const { data: salesDataResult } = await supabase.from('sales_data').select('*').maybeSingle();
      if (salesDataResult !== null) {
        setSalesData({
          todayData: salesDataResult.today_data || '',
          lastWeekData: salesDataResult.last_week_data || '',
          lastYearData: salesDataResult.last_year_data || ''
        });
      }

      setSaveStatus('Loaded ✓');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      setSaveStatus('Load failed ✗');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const saveToSupabase = async () => {
    if (!usingSupabase) return;
    
    try {
      setSaveStatus('Saving...');
      
      // Save staff
      const { error: staffError } = await supabase
        .from('staff')
        .upsert(staff.map(s => ({
          id: s.id,
          name: s.name,
          is_under_18: s.isUnder18
        })), { onConflict: 'id' });

      // Save positions
      await supabase.from('positions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const positionsToSave = [];
      
      // Save areas
      Object.keys(positions.areas).forEach(areaName => {
        positionsToSave.push({ name: areaName, type: 'area' });
      });
      
      // Save positions within areas
      Object.entries(positions.areas).forEach(([areaName, positionList]) => {
        positionList.forEach(positionName => {
          positionsToSave.push({ name: positionName, type: 'position' });
        });
      });
      
      // Save cleaning areas
      positions.cleaning_area.forEach(name => {
        positionsToSave.push({ name, type: 'cleaning_area' });
      });
      
      if (positionsToSave.length > 0) {
        await supabase.from('positions').insert(positionsToSave);
      }

      // Save deployments
      const { error: deploymentsError } = await supabase
        .from('deployments')
        .upsert(currentDeployments.map(d => ({
          id: d.id,
          date: selectedDate,
          staff_id: d.staffId,
          start_time: d.startTime,
          end_time: d.endTime,
          position: d.position,
          secondary: d.secondary || '',
          area: d.area || '',
          cleaning: d.cleaning || '',
          break_minutes: d.breakMinutes || 0
        })), { onConflict: 'id' });

      // Save shift info
      const { error: shiftError } = await supabase
        .from('shift_info')
        .upsert({
          date: currentShiftInfo.date,
          forecast: currentShiftInfo.forecast,
          day_shift_forecast: currentShiftInfo.dayShiftForecast,
          night_shift_forecast: currentShiftInfo.nightShiftForecast,
          weather: currentShiftInfo.weather,
          notes: currentShiftInfo.notes
        }, { onConflict: 'date' });

      // Save sales data
      await supabase.from('sales_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sales_data').insert({
        today_data: salesData.todayData,
        last_week_data: salesData.lastWeekData,
        last_year_data: salesData.lastYearData
      });

      setSaveStatus('Saved ✓');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      setSaveStatus('Save failed ✗');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const loadFromLocalStorage = () => {
    const savedData = localStorage.getItem('deploymentData');
    if (savedData) {
      try {
        const { staff: savedStaff, deploymentsByDate: savedDeployments, shiftInfoByDate: savedShiftInfo, positions: savedPositions, salesData: savedSalesData } = JSON.parse(savedData);
        if (Array.isArray(savedStaff)) setStaff(savedStaff);
        if (savedDeployments && typeof savedDeployments === 'object') setDeploymentsByDate(savedDeployments);
        if (savedShiftInfo && typeof savedShiftInfo === 'object') setShiftInfoByDate(savedShiftInfo);
        if (savedPositions && typeof savedPositions === 'object') setPositions(savedPositions);
        if (savedSalesData && typeof savedSalesData === 'object') setSalesData(savedSalesData);
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }
    
    // Initialize with default data if nothing was loaded
    setStaff(prev => prev.length > 0 ? prev : [
      { id: crypto.randomUUID(), name: 'Will Lander', isUnder18: false },
      { id: crypto.randomUUID(), name: 'Shane Whiteley', isUnder18: false },
      { id: crypto.randomUUID(), name: 'Craig Lloyd', isUnder18: false },
      { id: crypto.randomUUID(), name: 'Evan Anderson', isUnder18: true },
      { id: crypto.randomUUID(), name: 'Max Lloyd', isUnder18: false },
      { id: crypto.randomUUID(), name: 'Jessica Ford', isUnder18: false },
      { id: crypto.randomUUID(), name: 'Sam Edwards', isUnder18: false }
    ]);
    
    setDeploymentsByDate(prev => Object.keys(prev).length > 0 ? prev : {
      '08/09/2025': []
    });
    
    setShiftInfoByDate(prev => Object.keys(prev).length > 0 ? prev : {
      '08/09/2025': {
        date: '08/09/2025',
        forecast: '£0.00',
        dayShiftForecast: '£0.00',
        nightShiftForecast: '£0.00',
        weather: '',
        notes: ''
      }
    });
    
    setPositions(prev => Object.keys(prev.areas || {}).length > 0 ? prev : {
      areas: {},
      cleaning_area: ['Lobby / Toilets', 'Front', 'Staff Room / Toilet', 'Kitchen']
    });
  };

  const saveToLocalStorage = () => {
    localStorage.setItem('deploymentData', JSON.stringify({
      staff,
      deploymentsByDate,
      shiftInfoByDate,
      positions,
      salesData
    }));
  };

  // Save data whenever it changes
  useEffect(() => {
    if (!isLoading) {
      if (usingSupabase) {
        saveToSupabase();
      } else {
        saveToLocalStorage();
      }
    }
  }, [staff, deploymentsByDate, shiftInfoByDate, positions, salesData, isLoading, usingSupabase]);

  const calculateWorkHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    
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
    if (!staffMember) return 0;
    
    if (staffMember.isUnder18) {
      return 30;
    }
    
    if (workHours >= 6) {
      return 30;
    } else if (workHours >= 4.5) {
      return 15;
    }
    
    return 0;
  };

  const addStaff = () => {
    if (newStaff.name) {
      const newStaffMember = {
        id: crypto.randomUUID(),
        name: newStaff.name,
        isUnder18: newStaff.isUnder18
      };
      setStaff(prev => [...prev, newStaffMember]);
      setNewStaff({ name: '', isUnder18: false });
    }
  };

  const removeStaff = (id) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    // Remove from all deployments
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(d => d.staffId !== id);
      });
      return updated;
    });
  };

  const addDeployment = () => {
    if (newDeployment.staffId && newDeployment.startTime && newDeployment.endTime) {
      const staffMember = staff.find(s => s.id === newDeployment.staffId);
      const workHours = calculateWorkHours(newDeployment.startTime, newDeployment.endTime);
      const breakTime = calculateBreakTime(staffMember, workHours);
      
      const deployment = {
        id: crypto.randomUUID(),
        ...newDeployment,
        staffId: newDeployment.staffId,
        breakMinutes: breakTime,
        position: newDeployment.position || ''
      };
      
      setDeploymentsByDate(prev => ({
        ...prev,
        [selectedDate]: [...(prev[selectedDate] || []), deployment]
      }));
      
      setNewDeployment({
        staffId: '',
        startTime: '',
        endTime: '',
        position: '',
        secondary: '',
        area: '',
        cleaning: ''
      });
    }
  };

  const removeDeployment = (id) => {
    setDeploymentsByDate(prev => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).filter(d => d.id !== id)
    }));
  };

  const updateDeployment = (id, field, value) => {
    setDeploymentsByDate(prev => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).map(d => {
        if (d.id === id) {
          const updated = { ...d, [field]: value };
          
          // Recalculate break time if start/end time changes
          if (field === 'startTime' || field === 'endTime') {
            const staffMember = staff.find(s => s.id === d.staffId);
            const workHours = calculateWorkHours(
              field === 'startTime' ? value : d.startTime,
              field === 'endTime' ? value : d.endTime
            );
            updated.breakMinutes = calculateBreakTime(staffMember, workHours);
          }
          
          return updated;
        }
        return d;
      })
    }));
  };

  const updateShiftInfo = (field, value) => {
    setShiftInfoByDate(prev => ({
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        [field]: value
      }
    }));
  };

  const createNewDate = () => {
    if (newDate && !deploymentsByDate[newDate]) {
      setDeploymentsByDate(prev => ({
        ...prev,
        [newDate]: []
      }));
      setShiftInfoByDate(prev => ({
        ...prev,
        [newDate]: {
          date: newDate,
          forecast: '£0.00',
          dayShiftForecast: '£0.00',
          nightShiftForecast: '£0.00',
          weather: '',
          notes: ''
        }
      }));
      setSelectedDate(newDate);
      setNewDate('');
      setShowNewDateModal(false);
    }
  };

  const duplicateDeployment = (fromDate) => {
    if (fromDate && fromDate !== selectedDate && deploymentsByDate[fromDate]) {
      const deploymentsToCopy = deploymentsByDate[fromDate].map(d => ({
        ...d,
        id: crypto.randomUUID()
      }));
      
      setDeploymentsByDate(prev => ({
        ...prev,
        [selectedDate]: deploymentsToCopy
      }));
    }
  };

  const deleteDate = (dateToDelete) => {
    if (dateToDelete && Object.keys(deploymentsByDate).length > 1) {
      const newDeployments = { ...deploymentsByDate };
      const newShiftInfo = { ...shiftInfoByDate };
      delete newDeployments[dateToDelete];
      delete newShiftInfo[dateToDelete];
      
      setDeploymentsByDate(newDeployments);
      setShiftInfoByDate(newShiftInfo);
      
      if (selectedDate === dateToDelete) {
        const remainingDates = Object.keys(newDeployments);
        setSelectedDate(remainingDates[0]);
      }
    }
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? staffMember.name : 'Unknown';
  };

  const addArea = (areaName) => {
    if (areaName && !positions.areas[areaName]) {
      setPositions(prev => ({
        ...prev,
        areas: {
          ...prev.areas,
          [areaName]: []
        }
      }));
    }
  };

  const removeArea = (areaName) => {
    setPositions(prev => {
      const newAreas = { ...prev.areas };
      delete newAreas[areaName];
      return {
        ...prev,
        areas: newAreas
      };
    });
  };

  const addPositionToArea = (areaName, positionName) => {
    if (positionName && positions.areas[areaName] && !positions.areas[areaName].includes(positionName)) {
      setPositions(prev => ({
        ...prev,
        areas: {
          ...prev.areas,
          [areaName]: [...prev.areas[areaName], positionName]
        }
      }));
    }
  };

  const removePositionFromArea = (areaName, positionName) => {
    setPositions(prev => ({
      ...prev,
      areas: {
        ...prev.areas,
        [areaName]: prev.areas[areaName].filter(p => p !== positionName)
      }
    }));
  };

  const removeCleaningArea = (name) => {
    setPositions(prev => ({
      ...prev,
      cleaning_area: prev.cleaning_area.filter(p => p !== name)
    }));
  };

  const addCleaningArea = (name) => {
    if (name && !positions.cleaning_area.includes(name)) {
      setPositions(prev => ({
        ...prev,
        cleaning_area: [...prev.cleaning_area, name]
      }));
    }
  };

  // Get all positions from all areas for dropdowns
  const getAllPositions = () => {
    const allPositions = [];
    Object.values(positions.areas).forEach(areaPositions => {
      allPositions.push(...areaPositions);
    });
    return allPositions;
  };

  // Get all area names for dropdowns
  const getAllAreas = () => {
    return Object.keys(positions.areas);
  };

  const getAreaForPosition = (positionName) => {
    for (const [areaName, areaPositions] of Object.entries(positions.areas)) {
      if (areaPositions.includes(positionName)) {
        return areaName;
      }
    }
    return '';
  };

  const addPosition = (type, name) => {
    if (type === 'cleaning_area') {
      addCleaningArea(name);
    }
  };

  const removePosition = (type, name) => {
    if (type === 'cleaning_area') {
      removeCleaningArea(name);
    }
  };

  const addPositionOld = (type, name) => {
    if (name && positions[type] && !positions[type].includes(name)) {
      setPositions(prev => ({
        ...prev,
        [type]: [...prev[type], name]
      }));
    }
  };

  const removePositionOld = (type, name) => {
    if (positions[type]) {
      setPositions(prev => ({
        ...prev,
        [type]: prev[type].filter(p => p !== name)
      }));
    }
  };

  const addPositionLegacy = (type, name) => {
    if (type === 'cleaning_area') {
      addCleaningArea(name);
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const newStaff = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= 2 && values[0]) {
            const staffMember = {
              id: crypto.randomUUID(),
              name: values[0],
              isUnder18: values[1]?.toLowerCase() === 'true' || values[1]?.toLowerCase() === 'yes'
            };
            newStaff.push(staffMember);
          }
        }
        
        if (newStaff.length > 0) {
          setStaff(prev => [...prev, ...newStaff]);
          alert(`Successfully imported ${newStaff.length} staff members`);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid CSV file');
    }
    event.target.value = '';
  };

  const parseSalesData = (data) => {
    if (!data) return [];
    
    const lines = data.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        return {
          time: parts[0],
          sales: parts[1],
          transactions: parts[2] || '',
          average: parts[3] || ''
        };
      }
      return null;
    }).filter(Boolean);
  };

  useEffect(() => {
    setParsedSalesData({
      today: parseSalesData(salesData.todayData),
      lastWeek: parseSalesData(salesData.lastWeekData),
      lastYear: parseSalesData(salesData.lastYearData)
    });
  }, [salesData]);

  const exportToPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Deployment Management System...</p>
        </div>
      </div>
    );
  }

  const renderNavigation = () => (
    <nav className="bg-white shadow-sm border-b mb-6">
      <div className="flex space-x-8 px-6">
        {[
          { id: 'deployment', label: 'Deployment', icon: Calendar },
          { id: 'staff', label: 'Staff Management', icon: Users },
          { id: 'positions', label: 'Position Management', icon: Settings },
          { id: 'sales', label: 'Sales Analysis', icon: TrendingUp }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentPage(id)}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
              currentPage === id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  const renderDeploymentPage = () => (
    <div className="space-y-6">
      {/* Header with date selection and actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">Deployment Schedule</h2>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(deploymentsByDate).map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {saveStatus && (
              <span className={`text-sm px-2 py-1 rounded ${
                saveStatus.includes('✓') ? 'bg-green-100 text-green-700' :
                saveStatus.includes('✗') ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {saveStatus}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {usingSupabase ? '☁️ Cloud Storage' : '💾 Local Storage'}
            </span>
            <button
              onClick={() => setShowNewDateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Date</span>
            </button>
            <button
              onClick={exportToPDF}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Shift Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Forecast</label>
            <input
              type="text"
              value={currentShiftInfo.forecast}
              onChange={(e) => updateShiftInfo('forecast', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="£0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day Shift</label>
            <input
              type="text"
              value={currentShiftInfo.dayShiftForecast}
              onChange={(e) => updateShiftInfo('dayShiftForecast', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="£0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Night Shift</label>
            <input
              type="text"
              value={currentShiftInfo.nightShiftForecast}
              onChange={(e) => updateShiftInfo('nightShiftForecast', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="£0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weather</label>
            <input
              type="text"
              value={currentShiftInfo.weather}
              onChange={(e) => updateShiftInfo('weather', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Weather conditions"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift Notes</label>
          <textarea
            value={currentShiftInfo.notes}
            onChange={(e) => updateShiftInfo('notes', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Add shift notes, goals, or important information..."
          />
        </div>
      </div>

      {/* Add Staff to Shift */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Staff to Shift</h3>
        <p className="text-sm text-gray-600 mb-4">Add staff first, then fill in positions and details in the table below.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
            <select
              value={newDeployment.staffId}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, staffId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select staff member</option>
              {staff.filter(s => !currentDeployments.some(d => d.staffId === s.id)).map(staffMember => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name} {staffMember.isUnder18 ? '(U18)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
            <input
              type="time"
              value={newDeployment.startTime}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, startTime: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
            <input
              type="time"
              value={newDeployment.endTime}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, endTime: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={addDeployment}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff to Shift</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Deployments */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Current Deployments</h3>
            <div className="flex items-center space-x-2">
              <select
                onChange={(e) => duplicateDeployment(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Copy from another date...</option>
                {Object.keys(deploymentsByDate).filter(date => date !== selectedDate).map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
              {Object.keys(deploymentsByDate).length > 1 && (
                <button
                  onClick={() => deleteDate(selectedDate)}
                  className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Date</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {currentDeployments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No staff deployed for this date</p>
            <p className="text-sm">Add staff members using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
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
                  const staffMember = staff.find(s => s.id === deployment.staffId);
                  const workHours = calculateWorkHours(deployment.startTime, deployment.endTime);
                  
                  return (
                    <tr key={deployment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getStaffName(deployment.staffId)}
                            </div>
                            {staffMember?.isUnder18 && (
                              <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full inline-block mt-1">
                                Under 18
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <input
                            type="time"
                            value={deployment.startTime}
                            onChange={(e) => updateDeployment(deployment.id, 'startTime', e.target.value)}
                            className="block w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="time"
                            value={deployment.endTime}
                            onChange={(e) => updateDeployment(deployment.id, 'endTime', e.target.value)}
                            className="block w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {workHours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={deployment.position}
                          onChange={(e) => updateDeployment(deployment.id, 'position', e.target.value)}
                          className={`text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            !deployment.position ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select position</option>
                          {getAllPositions().map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={deployment.secondary}
                          onChange={(e) => updateDeployment(deployment.id, 'secondary', e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">None</option>
                          {getAllPositions().map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={deployment.area}
                          onChange={(e) => updateDeployment(deployment.id, 'area', e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">None</option>
                          {getAllAreas().map(area => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={deployment.cleaning}
                          onChange={(e) => updateDeployment(deployment.id, 'cleaning', e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">None</option>
                          {positions.cleaning_area.map(area => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deployment.breakMinutes}min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => removeDeployment(deployment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderStaffPage = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Staff Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Name</label>
            <input
              type="text"
              value={newStaff.name}
              onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter staff name"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isUnder18"
              checked={newStaff.isUnder18}
              onChange={(e) => setNewStaff(prev => ({ ...prev, isUnder18: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isUnder18" className="ml-2 block text-sm text-gray-900">
              Under 18 years old
            </label>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={addStaff}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Staff
            </button>
            
            <div className="flex items-center gap-2">
              <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                <Download className="w-4 h-4 mr-2 inline" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-500">Format: Name, Under18 (true/false)</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(staff) && staff.map((staffMember) => (
                <tr key={staffMember.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {staffMember.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staffMember.isUnder18 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Under 18
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        18+
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => removeStaff(staffMember.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPositionsPage = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Position Management</h2>
        
        {/* Areas Management */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Areas</h3>
          
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="Add new area (e.g., Kitchen, Front Counter)"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addArea(newAreaName);
                  setNewAreaName('');
                }
              }}
            />
            <button
              onClick={() => {
                addArea(newAreaName);
                setNewAreaName('');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(positions.areas).map(([areaName, areaPositions]) => (
              <div key={areaName} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">{areaName}</h4>
                  <button
                    onClick={() => removeArea(areaName)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 mb-3">
                  {areaPositions.map((position) => (
                    <div key={position} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                      <span className="text-sm text-gray-700">{position}</span>
                      <button
                        onClick={() => removePositionFromArea(areaName, position)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-1">
                  <input
                    type="text"
                    placeholder="Add position"
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addPositionToArea(areaName, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      addPositionToArea(areaName, input.value);
                      input.value = '';
                    }}
                    className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Cleaning Areas */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Cleaning Areas</h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {positions.cleaning_area.map((area) => (
              <div key={area} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                <span className="text-sm text-gray-700">{area}</span>
                <button
                  onClick={() => removeCleaningArea(area)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add new cleaning area"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addCleaningArea(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousElementSibling;
                addCleaningArea(input.value);
                input.value = '';
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPositionsPageOld = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Position Management</h2>
        
        {Object.entries(positions).map(([type, positionList]) => (
          <div key={type} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 capitalize">
              {type.replace('_', ' ')} Positions
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.isArray(positionList) && positionList.map((position) => (
                <div key={position} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm text-gray-700">{position}</span>
                  <button
                    onClick={() => removePositionOld(type, position)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder={`Add new ${type.replace('_', ' ')} position`}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addPositionOld(type, e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.target.previousElementSibling;
                  addPositionOld(type, input.value);
                  input.value = '';
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSalesPage = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Sales Analysis</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Today's Data</label>
            <textarea
              value={salesData.todayData}
              onChange={(e) => setSalesData(prev => ({ ...prev, todayData: e.target.value }))}
              className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              placeholder="Paste today's sales data here..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Week Data</label>
            <textarea
              value={salesData.lastWeekData}
              onChange={(e) => setSalesData(prev => ({ ...prev, lastWeekData: e.target.value }))}
              className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              placeholder="Paste last week's sales data here..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Year Data</label>
            <textarea
              value={salesData.lastYearData}
              onChange={(e) => setSalesData(prev => ({ ...prev, lastYearData: e.target.value }))}
              className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              placeholder="Paste last year's sales data here..."
            />
          </div>
        </div>
        
        {(parsedSalesData.today.length > 0 || parsedSalesData.lastWeek.length > 0 || parsedSalesData.lastYear.length > 0) && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Week</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Year</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from(new Set([
                  ...parsedSalesData.today.map(d => d.time),
                  ...parsedSalesData.lastWeek.map(d => d.time),
                  ...parsedSalesData.lastYear.map(d => d.time)
                ])).sort().map(time => {
                  const todayData = parsedSalesData.today.find(d => d.time === time);
                  const lastWeekData = parsedSalesData.lastWeek.find(d => d.time === time);
                  const lastYearData = parsedSalesData.lastYear.find(d => d.time === time);
                  
                  return (
                    <tr key={time}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {todayData ? todayData.sales : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lastWeekData ? lastWeekData.sales : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lastYearData ? lastYearData.sales : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Deployment Management System</h1>
          <p className="mt-2 text-gray-600">Manage staff deployments, positions, and analyze sales data</p>
        </div>
        
        {renderNavigation()}
        
        {/* New Date Modal */}
        {showNewDateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Date</h3>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={createNewDate}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewDateModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {currentPage === 'deployment' && renderDeploymentPage()}
        {currentPage === 'staff' && renderStaffPage()}
        {currentPage === 'positions' && renderPositionsPage()}
        {currentPage === 'sales' && renderSalesPage()}
      </div>
    </div>
  );
};

export default DeploymentManagementSystem;