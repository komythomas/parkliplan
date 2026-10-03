'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, X } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

export const LocationSearch: React.FC = () => {
  const { panToLocation } = usePlanner();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search via OpenStreetMap Nominatim
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query.trim()
          )}&limit=5`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        // Silently handle offline / rate limit
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      panToLocation(lon, lat);
      setIsOpen(false);
      setQuery(item.display_name.split(',')[0]);
    }
  };

  return (
    <div className="location-search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        {isLoading ? (
          <Loader2 size={13} className="search-icon spinner" />
        ) : (
          <Search size={13} className="search-icon" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.length >= 3) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search location or parking..."
          className="search-input"
          aria-label="Search location"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="search-clear-btn"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="search-results-dropdown" role="listbox">
          {results.map((item) => {
            const primaryName = item.display_name.split(',')[0];
            const secondaryName = item.display_name.split(',').slice(1, 3).join(',').trim();

            return (
              <li
                key={item.place_id}
                onClick={() => handleSelect(item)}
                className="search-result-item"
                role="option"
                aria-selected={false}
              >
                <MapPin size={13} className="result-pin" />
                <div className="result-text">
                  <span className="result-primary">{primaryName}</span>
                  {secondaryName && (
                    <span className="result-secondary">{secondaryName}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
