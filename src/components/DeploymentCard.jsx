import React, { useState } from 'react';
import { Trash2, Edit2, Save, X, Clock, User, MapPin, Chrome as Broom } from 'lucide-react';

const DeploymentCard = ({ deployment, onRemove, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    start_time: deployment.start_time,
    end_time: deployment.end_time,
    position: deployment.position,
    secondary: deployment.secondary || '',
    area: deployment.area || '',
    closing: deployment.closing || '',
    shift_type: deployment.shift_type
  });

  const positions = ['DT', 'DT2', 'Cook', 'Cook2', 'Burgers', 'Fries', 'Chick', 'Rst', 'Lobby', 'Front', 'Mid', 'Transfer', 'T1'];
  const packPositions = ['DT Pack', 'Rst Pack', 'Deliv Pack'];
  const secondaryPositions = [...positions, ...packPositions];
  const areas = ['Cooks', 'DT', 'Front', 'Mid', 'Lobby', 'Pck Mid', 'Float / Bottlenecks', 'Table Service / Lobby'];
  const cleaningAreas = ['Lobby / Toilets', 'Front', 'Staff Room / Toilet', 'Kitchen'];

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

  const workHours = calculateWorkHours(deployment.start_time, deployment.end_time);

  const handleSave = () => {
    onUpdate(deployment.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      start_time: deployment.start_time,
      end_time: deployment.end_time,
      position: deployment.position,
      secondary: deployment.secondary || '',
      area: deployment.area || '',
      closing: deployment.closing || '',
      shift_type: deployment.shift_type
    });
    setIsEditing(false);
  };

  const getShiftBadgeColor = (shiftType) => {
    return shiftType === 'Day Shift' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800';
  };

  if (isEditing) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Type</label>
            <select
              value={editData.shift_type}
              onChange={(e) => setEditData(prev => ({ ...prev, shift_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={editData.start_time}
              onChange={(e) => setEditData(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={editData.end_time}
              onChange={(e) => setEditData(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              value={editData.position}
              onChange={(e) => setEditData(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Position</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary</label>
            <select
              value={editData.secondary}
              onChange={(e) => setEditData(prev => ({ ...prev, secondary: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Secondary</option>
              {secondaryPositions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
            <select
              value={editData.area}
              onChange={(e) => setEditData(prev => ({ ...prev, area: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Area</option>
              {areas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Position</label>
            <select
              value={editData.closing}
              onChange={(e) => setEditData(prev => ({ ...prev, closing: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Closing</option>
              {cleaningAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-800">
              {deployment.staff?.name || 'Unknown Staff'}
            </span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShiftBadgeColor(deployment.shift_type)}`}>
            {deployment.shift_type}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit deployment"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(deployment.id)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Remove deployment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {deployment.start_time} - {deployment.end_time}
          </span>
        </div>
        
        <div>
          <span className="text-gray-500">Hours: </span>
          <span className="font-medium">{workHours.toFixed(1)}h</span>
        </div>

        <div>
          <span className="text-gray-500">Position: </span>
          <span className="font-medium">{deployment.position}</span>
        </div>

        <div>
          <span className="text-gray-500">Break: </span>
          <span className="font-medium">{deployment.break_minutes || 0}min</span>
        </div>
      </div>

      {(deployment.secondary || deployment.area || deployment.closing) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {deployment.secondary && (
              <div>
                <span className="text-gray-500">Secondary: </span>
                <span className="font-medium">{deployment.secondary}</span>
              </div>
            )}
            
            {deployment.area && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Area: </span>
                <span className="font-medium">{deployment.area}</span>
              </div>
            )}
            
            {deployment.closing && deployment.shift_type === 'Night Shift' && (
              <div className="flex items-center gap-1">
                <Broom className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Closing: </span>
                <span className="font-medium">{deployment.closing}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentCard;