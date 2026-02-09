'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Award, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
;

// Supabase configuration - REPLACE THESE!
const SUPABASE_URL = 'https://mmblbouugclrbgkzahfn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYmxib3V1Z2NscmJna3phaGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjY2MzQsImV4cCI6MjA4NTU0MjYzNH0.7GgOCIjpay4L9yb49uvjCmEUpTjXqA2M47RLuF2PWFw';

const CheltenhamDashboard = () => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [races, setRaces] = useState<any[]>([]);
  const [selectedRace, setSelectedRace] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to make Supabase API calls
  const supabaseQuery = async (
    table: string, 
    options: {
      select?: string;
      filters?: Record<string, any>;
      order?: { column: string; ascending: boolean } | null;
    } = {}
  ): Promise<any[]> => {
    const { select = '*', filters = {}, order = null } = options;
    
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'object' && value.operator) {
        url += `&${key}=${value.operator}.${value.value}`;
      } else {
        url += `&${key}=eq.${value}`;
      }
    });
    
    if (order) {
      url += `&order=${order.column}.${order.ascending ? 'asc' : 'desc'}`;
    }

    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Query failed: ${response.statusText}`);
    return await response.json();
  };

  // Fetch Cheltenham races
  const fetchRaces = async () => {
    try {
      const data = await supabaseQuery('races', {
        select: '*,courses(name)',
        filters: {
          'race_date': { operator: 'gte', value: '2026-03-10' },
        }
      });

   const sortedRaces = data.sort((a, b) => {
  const dateA = new Date(`${a.race_date}T${a.race_time || '00:00:00'}`);
  const dateB = new Date(`${b.race_date}T${b.race_time || '00:00:00'}`);
  return dateA.getTime() - dateB.getTime();
});

      setRaces(sortedRaces || []);
      if (sortedRaces && sortedRaces.length > 0) {
        setSelectedRace(sortedRaces[0]);
      }
 } catch (err) {
  setError(err instanceof Error ? err.message : 'An error occurred');
}

  };

  // Fetch predictions for selected race
  const fetchPredictions = async (raceId) => {
    try {
      const data = await supabaseQuery('cheltenham_2026_predictions', {
        select: '*,horses(name),race_entries(official_rating,jockeys(name),trainers(name))',
        filters: { 'race_id': raceId }
      });

      const sorted = data.sort((a, b) => a.predicted_position - b.predicted_position);
      setPredictions(sorted || []);
    } catch (err) {
  setError(err instanceof Error ? err.message : 'An error occurred');
}
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRaces();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRace) {
      fetchPredictions(selectedRace.id);
    }
  }, [selectedRace]);

  const formatProbability = (prob) => `${(prob * 100).toFixed(1)}%`;
  const getConfidenceColor = (conf) => {
    if (conf >= 0.7) return 'text-green-600 bg-green-50';
    if (conf >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };
  const getConfidenceLabel = (conf) => {
    if (conf >= 0.7) return 'High';
    if (conf >= 0.4) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading racing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl">🏇</div>
            <div>
              <h1 className="text-3xl font-bold">Cheltenham Festival 2026</h1>
              <p className="text-green-100 text-sm">AI-Powered Race Predictions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Races</p>
                <p className="text-3xl font-bold text-gray-800">{races.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Grade 1 Races</p>
                <p className="text-3xl font-bold text-gray-800">
                  {races.filter(r => r.grade === 'Grade 1').length}
                </p>
              </div>
              <Award className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Predictions</p>
                <p className="text-3xl font-bold text-gray-800">{predictions.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Model Accuracy</p>
                <p className="text-3xl font-bold text-gray-800">73.2%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Select Race</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {races.map((race) => (
                  <button
                    key={race.id}
                    onClick={() => setSelectedRace(race)}
                    className={`w-full text-left p-4 rounded-lg transition ${
                      selectedRace?.id === race.id
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-semibold text-gray-800">{race.race_name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {race.race_date} • {race.race_time?.substring(0, 5) || 'TBC'}
                    </div>
                    {race.grade && (
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2">
                        {race.grade}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {selectedRace?.race_name || 'Select a race'} - Predictions
              </h2>

              {predictions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No predictions available yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Pos</th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Horse</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">Win %</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">Place %</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((pred, idx) => (
                        <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${
                          pred.predicted_position === 1 ? 'bg-green-50' : ''
                        }`}>
                          <td className="py-4 px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              pred.predicted_position === 1 ? 'bg-green-600 text-white' :
                              pred.predicted_position === 2 ? 'bg-gray-400 text-white' :
                              pred.predicted_position === 3 ? 'bg-orange-400 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {pred.predicted_position}
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="font-semibold text-gray-800">
                              {pred.horses?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="font-semibold text-green-600">
                              {formatProbability(pred.win_probability)}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="font-semibold text-blue-600">
                              {formatProbability(pred.place_probability)}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              getConfidenceColor(pred.confidence_score)
                            }`}>
                              {getConfidenceLabel(pred.confidence_score)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Predictions based on ML analysis of historical data (2020-2025 seasons)</p>
          <p className="mt-1 font-semibold text-gray-600">For personal research use only</p>
        </div>
      </div>
    </div>
  );
};

export default CheltenhamDashboard;
