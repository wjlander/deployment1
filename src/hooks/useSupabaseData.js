import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useSupabaseData = () => {
  const [staff, setStaff] = useState([]);
  const [positions, setPositions] = useState([]);
  const [deploymentsByDate, setDeploymentsByDate] = useState({});
  const [shiftInfoByDate, setShiftInfoByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStaff(),
        loadPositions(),
        loadDeployments(),
        loadShiftInfo()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setStaff(data || []);
  };

  const loadPositions = async () => {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setPositions(data || []);
  };

  const loadDeployments = async () => {
    const { data, error } = await supabase
      .from('deployments')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Group deployments by date
    const grouped = {};
    data?.forEach(deployment => {
      if (!grouped[deployment.date]) {
        grouped[deployment.date] = [];
      }
      grouped[deployment.date].push(deployment);
    });
    
    setDeploymentsByDate(grouped);
  };

  const loadShiftInfo = async () => {
    const { data, error } = await supabase
      .from('shift_info')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Group shift info by date
    const grouped = {};
    data?.forEach(info => {
      grouped[info.date] = info;
    });
    
    setShiftInfoByDate(grouped);
  };

  // Staff operations
  const addStaff = async (staffData) => {
    const { data, error } = await supabase
      .from('staff')
      .insert([staffData])
      .select()
      .single();
    
    if (error) throw error;
    
    setStaff(prev => [...prev, data]);
    return data;
  };

  const removeStaff = async (id) => {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setStaff(prev => prev.filter(s => s.id !== id));
    
    // Remove from deployments state (cascade delete should handle DB)
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(d => d.staff_id !== id);
      });
      return updated;
    });
  };

  // Deployment operations
  const addDeployment = async (deploymentData) => {
    const { data, error } = await supabase
      .from('deployments')
      .insert([deploymentData])
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `)
      .single();
    
    if (error) throw error;
    
    setDeploymentsByDate(prev => ({
      ...prev,
      [data.date]: [...(prev[data.date] || []), data]
    }));
    
    return data;
  };

  const removeDeployment = async (id) => {
    const { error } = await supabase
      .from('deployments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Remove from state
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(d => d.id !== id);
      });
      return updated;
    });
  };

  const updateDeployment = async (id, updates) => {
    const { data, error } = await supabase
      .from('deployments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `)
      .single();
    
    if (error) throw error;
    
    // Update state
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(d => d.id === id ? { ...d, ...data } : d);
      });
      return updated;
    });
    
    return data;
  };

  // Shift info operations
  const updateShiftInfo = async (date, shiftData) => {
    const { data, error } = await supabase
      .from('shift_info')
      .upsert([{ ...shiftData, date }])
      .select()
      .single();
    
    if (error) throw error;
    
    setShiftInfoByDate(prev => ({
      ...prev,
      [date]: data
    }));
    
    return data;
  };

  const deleteShiftInfo = async (date) => {
    const { error } = await supabase
      .from('shift_info')
      .delete()
      .eq('date', date);
    
    if (error) throw error;
    
    setShiftInfoByDate(prev => {
      const updated = { ...prev };
      delete updated[date];
      return updated;
    });
  };

  // Position operations
  const addPosition = async (positionData) => {
    const { data, error } = await supabase
      .from('positions')
      .insert([positionData])
      .select()
      .single();
    
    if (error) throw error;
    
    setPositions(prev => [...prev, data]);
    return data;
  };

  const removePosition = async (id) => {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  const updatePosition = async (id, updates) => {
    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    setPositions(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  // Helper functions
  const getPositionsByType = (type) => {
    return positions.filter(p => p.type === type).map(p => p.name);
  };

  const getPositionsWithAreas = () => {
    return positions.map(position => {
      const area = positions.find(p => p.id === position.area_id);
      return {
        ...position,
        area_name: area ? area.name : null
      };
    });
  };

  const getAreaPositions = (areaId) => {
    return positions.filter(p => p.area_id === areaId);
  };

  const duplicateDeployments = async (fromDate, toDate) => {
    const deploymentsToCopy = deploymentsByDate[fromDate] || [];
    
    if (deploymentsToCopy.length === 0) return;
    
    // Create new deployments for the target date
    const newDeployments = deploymentsToCopy.map(d => ({
      date: toDate,
      staff_id: d.staff_id,
      start_time: d.start_time,
      end_time: d.end_time,
      position: d.position,
      secondary: d.secondary || '',
      area: d.area || '',
      cleaning: d.cleaning || '',
      break_minutes: d.break_minutes || 0
    }));
    
    const { data, error } = await supabase
      .from('deployments')
      .insert(newDeployments)
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `);
    
    if (error) throw error;
    
    setDeploymentsByDate(prev => ({
      ...prev,
      [toDate]: data
    }));
    
    // Also copy shift info if it exists
    const shiftInfoToCopy = shiftInfoByDate[fromDate];
    if (shiftInfoToCopy) {
      await updateShiftInfo(toDate, {
        forecast: shiftInfoToCopy.forecast,
        day_shift_forecast: shiftInfoToCopy.day_shift_forecast,
        night_shift_forecast: shiftInfoToCopy.night_shift_forecast,
        weather: shiftInfoToCopy.weather,
        notes: shiftInfoToCopy.notes
      });
    }
    
    return data;
  };

  return {
    // Data
    staff,
    positions,
    deploymentsByDate,
    shiftInfoByDate,
    loading,
    error,
    
    // Staff operations
    addStaff,
    removeStaff,
    
    // Deployment operations
    addDeployment,
    removeDeployment,
    updateDeployment,
    duplicateDeployments,
    
    // Shift info operations
    updateShiftInfo,
    deleteShiftInfo,
    
    // Position operations
    addPosition,
    removePosition,
    updatePosition,
    getPositionsByType,
    getPositionsWithAreas,
    getAreaPositions,
    
    // Utility
    loadAllData
  };
};