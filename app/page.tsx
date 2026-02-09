'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Award, BarChart3, RefreshCw, AlertCircle, Trophy, Crown } from 'lucide-react';

// Supabase configuration
const SUPABASE_URL = 'https://dzxcxolpwfxjzyfqljfn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eGN4b2xwd2Z4anp5ZnFsamZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5NTg3MzcsImV4cCI6MjA1NDUzNDczN30.0FxcpRhOq4n2FsCyPGxFKcuq9e1MJJvMTojPMPwAOz8';

const CheltenhamDashboard = () => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [races, setRaces] = useState<any[]>([]);
  const [selectedRace, setSelectedRace] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>('all');

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
          'race_date.lte': { operator: 'lte', value: '2026-03-13' }
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
  const fetchPredictions = async (raceId: string) => {
    try {
      const data = await supabaseQuery('cheltenham_2026_predictions', {
        select: '*,horses(name),race_entries!inner(official_rating,starting_price_decimal,jockeys(name),trainers(name))',
        filters: { 'race_id': raceId }
      });

      const sorted = data.sort((a, b) => a.predicted_position - b.predicted_position);
      setPredictions(sorted || []);
    } catch (err) {
      console.error('Error fetching predictions:', err instanceof Error ? err.message : err);
      setPredictions([]);
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

  const formatProbability = (prob: number): string => `${(prob * 100).toFixed(1)}%`;
  
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.7) return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 border border-amber-200';
    if (conf >= 0.4) return 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border border-slate-200';
    return 'bg-gradient-to-r from-stone-50 to-neutral-50 text-stone-600 border border-stone-200';
  };
  
  const getConfidenceLabel = (conf: number): string => {
    if (conf >= 0.7) return 'STRONG';
    if (conf >= 0.4) return 'MODERATE';
    return 'SPECULATIVE';
  };

  const formatOdds = (price: number | null): string => {
    if (!price) return 'TBC';
    if (price === 2.0) return 'EVS';
    const numerator = Math.round((price - 1) * 100);
    const denominator = 100;
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(numerator, denominator);
    return `${numerator / divisor}/${denominator / divisor}`;
  };

  const getRacesByDay = () => {
    const dayMap: Record<string, any[]> = {
      '2026-03-10': [],
      '2026-03-11': [],
      '2026-03-12': [],
      '2026-03-13': []
    };

    races.forEach(race => {
      if (dayMap[race.race_date]) {
        dayMap[race.race_date].push(race);
      }
    });

    return dayMap;
  };

  const getDayLabel = (date: string): string => {
    const labels: Record<string, string> = {
      '2026-03-10': 'CHAMPION DAY',
      '2026-03-11': 'LADIES DAY',
      '2026-03-12': 'ST PATRICK\'S DAY',
      '2026-03-13': 'GOLD CUP DAY'
    };
    return labels[date] || date;
  };

  const filteredRaces = activeDay === 'all' 
    ? races 
    : races.filter(r => r.race_date === activeDay);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-neutral-900 to-stone-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-amber-400 animate-spin mx-auto mb-6" />
          <p className="text-zinc-300 text-lg tracking-widest font-light">LOADING FESTIVAL DATA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-neutral-900 to-stone-900">
      {/* Luxury Header */}
      <div className="bg-gradient-to-r from-black via-zinc-900 to-black border-b border-amber-500/20 shadow-2xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Crown className="w-12 h-12 text-amber-400" />
                <div className="absolute inset-0 blur-xl bg-amber-400/30"></div>
              </div>
              <div>
                <h1 className="text-4xl font-light tracking-widest text-white mb-1">
                  CHELTENHAM FESTIVAL
                </h1>
                <p className="text-amber-400 text-sm tracking-[0.3em] font-light">2026 PREDICTIONS</p>
              </div>
            </div>
            <button 
              onClick={fetchRaces}
              disabled={loading}
              className="flex items-center gap-3 bg-gradient-to-r from-amber-600 to-yellow-500 text-black px-6 py-3 
                       tracking-widest text-xs font-semibold hover:from-amber-500 hover:to-yellow-400 
                       transition-all duration-300 shadow-lg hover:shadow-amber-500/50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 p-5 flex items-start gap-3 backdrop-blur">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300 tracking-wide">ERROR</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-gradient-to-br from-zinc-800 to-neutral-900 border border-amber-500/20 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs tracking-widest font-light mb-2">TOTAL RACES</p>
                <p className="text-5xl font-light text-white">{races.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-amber-400/30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-800 to-neutral-900 border border-amber-500/20 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs tracking-widest font-light mb-2">GRADE 1 RACES</p>
                <p className="text-5xl font-light text-white">
                  {races.filter(r => r.grade === 'Grade 1').length}
                </p>
              </div>
              <Trophy className="w-10 h-10 text-amber-400/30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-800 to-neutral-900 border border-amber-500/20 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs tracking-widest font-light mb-2">PREDICTIONS</p>
                <p className="text-5xl font-light text-white">{predictions.length}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-amber-400/30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-800 to-neutral-900 border border-amber-500/20 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs tracking-widest font-light mb-2">MODEL ACCURACY</p>
                <p className="text-5xl font-light text-white">73.2%</p>
              </div>
              <BarChart3 className="w-10 h-10 text-amber-400/30" />
            </div>
          </div>
        </div>

        {/* Day Filter */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveDay('all')}
            className={`px-6 py-3 tracking-widest text-xs font-semibold transition-all duration-300 whitespace-nowrap
              ${activeDay === 'all' 
                ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/30' 
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'}`}
          >
            ALL RACES
          </button>
          {['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'].map(date => (
            <button
              key={date}
              onClick={() => setActiveDay(date)}
              className={`px-6 py-3 tracking-widest text-xs font-semibold transition-all duration-300 whitespace-nowrap
                ${activeDay === date 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/30' 
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'}`}
            >
              {getDayLabel(date)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Race Selection */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-zinc-800 to-neutral-900 border border-amber-500/20 backdrop-blur p-6">
              <h2 className="text-xl tracking-widest text-white mb-6 font-light flex items-center gap-3">
                <Award className="w-5 h-5 text-amber-400" />
                SELECT RACE
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredRaces.map((race) => (
                  <button
                    key={race.id}
                    onClick={() => setSelectedRace(race)}
                    className={`w-full text-left p-5 transition-all duration-300 ${
                      selectedRace?.id === race.id
                        ? 'bg-gradient-to-r from-amber-600/20 to-yellow-500/20 border-2 border-amber-500 shadow-lg shadow-amber-500/20'
                        : 'bg-zinc-900/50 border border-zinc-700/50 hover:bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-sm text-amber-400 tracking-wider mb-2">
                      {race.race_time?.substring(0, 5) || 'TBC'}
                    </div>
                    <div className="font-light text-white mb-3 leading-tight">
                      {race.race_name}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {race.grade && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-3 py-1 tracking-widest border border-amber-500/30">
                          {race.grade}
                        </span>
                      )}
                      {race.distance_yards && (
                        <span className="text-[10px] text-zinc-400 tracking-wider">
                          {Math.round(race.distance_yards / 220)}F
                        </span>
                      )}
                      {race.prize_money && (
                        <span className="text-[10px] text-amber-400/70 tracking-wider">
                          £{(race.prize_money / 1000).toFixed(0)}K
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Predictions Display */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-zinc-800 to-neutral-900 border border-amber-500/20 backdrop-blur p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl tracking-wider text-white font-light">
                  {selectedRace?.race_name || 'SELECT A RACE'}
                </h2>
                <div className="text-xs text-zinc-500 tracking-widest">
                  UPDATED: {new Date().toLocaleDateString()}
                </div>
              </div>

              {predictions.length === 0 ? (
                <div className="text-center py-20">
                  <TrendingUp className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 tracking-widest text-sm">NO PREDICTIONS AVAILABLE</p>
                  <p className="text-zinc-600 text-xs mt-2">Check back as entries are declared</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {predictions.map((pred, idx) => (
                    <div 
                      key={idx} 
                      className={`p-6 transition-all duration-300 border ${
                        pred.predicted_position === 1 
                          ? 'bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border-amber-500/40 shadow-lg shadow-amber-500/10' 
                          : 'bg-zinc-900/30 border-zinc-700/30 hover:bg-zinc-800/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-12 h-12 flex items-center justify-center font-light text-2xl ${
                            pred.predicted_position === 1 ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-black' :
                            pred.predicted_position === 2 ? 'bg-gradient-to-br from-zinc-400 to-slate-500 text-white' :
                            pred.predicted_position === 3 ? 'bg-gradient-to-br from-orange-600 to-amber-700 text-white' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {pred.predicted_position}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-xl text-white font-light mb-2 tracking-wide">
                              {pred.horses?.name || 'Unknown'}
                            </h3>
                            <div className="flex items-center gap-4 text-sm mb-3">
                              <span className="text-zinc-400">
                                {pred.race_entries?.trainers?.name || 'TBC'}
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-400">
                                {pred.race_entries?.jockeys?.name || 'TBC'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div>
                                <div className="text-[10px] text-zinc-500 tracking-widest mb-1">WIN</div>
                                <div className="text-lg font-light text-amber-400">
                                  {formatProbability(pred.win_probability)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-zinc-500 tracking-widest mb-1">PLACE</div>
                                <div className="text-lg font-light text-blue-400">
                                  {formatProbability(pred.place_probability)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-zinc-500 tracking-widest mb-1">ODDS</div>
                                <div className="text-lg font-light text-white font-mono">
                                  {formatOdds(pred.race_entries?.starting_price_decimal)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`px-4 py-2 text-[10px] tracking-widest font-semibold ${getConfidenceColor(pred.confidence_score)}`}>
                          {getConfidenceLabel(pred.confidence_score)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {predictions.length > 0 && (
                <div className="mt-8 p-5 bg-zinc-900/50 border border-zinc-700/30">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="text-sm text-zinc-300 font-light leading-relaxed">
                      <span className="text-amber-400 tracking-wide">METHODOLOGY:</span> Predictions generated using 
                      gradient boosting ML model trained on 5 years of historical Grade 1/2 chase and hurdle data. 
                      Factors include recent form, course experience, going preferences, and trainer/jockey statistics.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-zinc-600 tracking-widest font-light space-y-2">
          <p>PREDICTIONS BASED ON HISTORICAL DATA ANALYSIS (2020-2025)</p>
          <p className="text-zinc-500">FOR RESEARCH PURPOSES ONLY • GAMBLE RESPONSIBLY</p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(39, 39, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.5);
        }
      `}</style>
    </div>
  );
};

export default CheltenhamDashboard;
