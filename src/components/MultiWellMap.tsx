'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface Well {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'active' | 'inactive' | 'maintenance';
  production: number; // BBL/day
}

// Actual well data with real coordinates
const generateHoustonWells = (): Well[] => {
  const statuses: ('active' | 'inactive' | 'maintenance')[] = ['active', 'inactive', 'maintenance'];

  const wellData = [
    { name: "Cinco J Ranch LTD #1H", lat: 29.459734, lng: -97.303643 },
    { name: "Cinco J Ranch LTD #2H", lat: 29.459802, lng: -97.303466 },
    { name: "Garnet 1H", lat: 29.459765, lng: -97.303489 },
    { name: "L & J Lee #1H", lat: 29.447887, lng: -97.296519 },
    { name: "L & J Lee #2H", lat: 29.447925, lng: -97.296502 },
    { name: "L & J Lee #4H", lat: 29.450001, lng: -97.295796 },
    { name: "L & J Lee #5H", lat: 29.450052, lng: -97.295774 },
    { name: "L & J Lee #6H", lat: 29.450103, lng: -97.295751 },
    { name: "L & Lee Unit 7H", lat: 29.459729, lng: -97.30351 },
    { name: "Rock Creek Ranch #1H", lat: 29.437156, lng: -97.315931 },
    { name: "Rock Creek Ranch #2H", lat: 29.437179, lng: -97.315889 },
    { name: "Rock Creek Ranch #3H", lat: 29.437523, lng: -97.316163 },
    { name: "Rock Creek Ranch #4H", lat: 29.437542, lng: -97.316119 },
    { name: "Rock Creek Ranch #5H", lat: 29.437905, lng: -97.308892 },
    { name: "Rock Creek Ranch #6H", lat: 29.437926, lng: -97.308848 },
    { name: "Rock Creek Ranch #7H", lat: 29.438265, lng: -97.309122 },
    { name: "Rock Creek Ranch #8H", lat: 29.438049, lng: -97.30881 },
    { name: "Rock Creek Ranch #9H", lat: 29.442132, lng: -97.324619 },
    { name: "Rock Creek Ranch #10H", lat: 29.442381, lng: -97.32493 },
    { name: "Rock Creek Ranch #11H", lat: 29.433367, lng: -97.30067 },
    { name: "Rock Creek Ranch #12H", lat: 29.433377, lng: -97.301034 },
    { name: "Rock Creek Ranch #14H", lat: 29.44885, lng: -97.320069 },
    { name: "Rock Creek Ranch #15H", lat: 29.448889, lng: -97.320057 },
    { name: "Rock Creek Ranch #18H", lat: 29.4421611, lng: -97.3245786 },
    { name: "Rock Creek Ranch #20H", lat: 29.442201, lng: -97.3245671 },
    { name: "Rock Creek Ranch #25H", lat: 29.433346, lng: -97.301037 },
    { name: "Flane 1H", lat: 29.4280347, lng: -97.3244106 },
    { name: "RCR Jane 5H", lat: 29.4280717, lng: -97.3244326 },
    { name: "RCR Jane 8H", lat: 29.4281084, lng: -97.3244534 },
    { name: "RCR-Wyatt #1H", lat: 29.420706, lng: -97.331291 },
    { name: "RCR-Wyatt #2H", lat: 29.420717, lng: -97.331246 },
    { name: "RCR-Wyatt #3H", lat: 29.420729, lng: -97.331201 },
    { name: "RCR-Wyatt #4H", lat: 29.420741, lng: -97.331156 },
    { name: "RCRS-Jane #1H", lat: 29.418885, lng: -97.317251 },
    { name: "RCRS-Jane #2H", lat: 29.418892, lng: -97.317204 },
    { name: "RCRS-Jane #4H", lat: 29.418907, lng: -97.317112 },
    { name: "RCRS-Jane #6H", lat: 29.418899, lng: -97.317158 },
    { name: "RCRS-Jane #7H", lat: 29.418911, lng: -97.317086 },
    { name: "RCRS-Fletcher #1H", lat: 29.417278, lng: -97.321441 },
    { name: "RCRS-Fletcher #2H", lat: 29.417292, lng: -97.321397 },
    { name: "RCRS-Fletcher #3H", lat: 29.417307, lng: -97.321353 },
    { name: "RCR-Hinton #1H", lat: 29.415484, lng: -97.33428 },
    { name: "RCR-Hinton #2H", lat: 29.415502, lng: -97.33422 },
    { name: "RCR-Hinton #3H", lat: 29.415519, lng: -97.334161 },
    { name: "Quartz 1H", lat: 29.433312, lng: -97.301064 }
  ];

  return wellData.map((well, index) => ({
    id: `well-${index + 1}`,
    name: well.name,
    lat: well.lat,
    lng: well.lng,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    production: Math.floor(80 + Math.random() * 150),
  }));
};

const getWellColor = (status: string): string => {
  switch (status) {
    case 'active':
      return '#10b981'; // Green
    case 'inactive':
      return '#ef4444'; // Red
    case 'maintenance':
      return '#f59e0b'; // Orange
    default:
      return '#6b7280'; // Gray
  }
};

// Component to handle map centering
function MapController() {
  const map = useMap();

  useEffect(() => {
    // Ensure map resizes properly
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}

interface MultiWellMapProps {
  onNext?: (selectedWells: string[]) => void;
}

export default function MultiWellMap({ onNext }: MultiWellMapProps) {
  const [mounted, setMounted] = useState(false);
  const [wells] = useState<Well[]>(generateHoustonWells());
  const [selectedWells, setSelectedWells] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const houstonCenter: [number, number] = [29.435, -97.31]; // Centered on well locations
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<boolean>(false);
  const featureGroupRef = useRef<any>(null);
  const polygonWellsMap = useRef<Map<any, string[]>>(new Map());
  const layersMap = useRef<Map<any, any>>(new Map());
  const deleteModeRef = useRef<boolean>(false);

  // Keep deleteModeRef in sync with deleteMode state
  useEffect(() => {
    deleteModeRef.current = deleteMode;
  }, [deleteMode]);

  // Handler for polygon creation
  const handlePolygonCreated = (e: any) => {
    const layer = e.layer;
    const polygon = layer.getLatLngs()[0];

    // Check which wells are inside the polygon
    const wellsInside = wells.filter((well) => {
      const point = L.latLng(well.lat, well.lng);
      // Create a polygon from the drawn coordinates
      const poly = L.polygon(polygon);
      return poly.getBounds().contains(point) && isPointInPolygon(point, polygon);
    });

    const wellIds = wellsInside.map(w => w.id);
    const wellNames = wellsInside.map(w => w.name);
    const layerId = layer._leaflet_id;

    // Store the mapping of this polygon to its wells (using well names for compatibility with analysis)
    polygonWellsMap.current.set(layerId, wellNames);
    layersMap.current.set(layerId, layer);

    // Add click handler to polygon for deletion
    layer.on('click', (event: any) => {
      // Stop event propagation to prevent map clicks
      L.DomEvent.stopPropagation(event);

      // Check if we're in delete mode and call the handler
      // We need to check the ref here since this is a closure
      if (deleteModeRef.current) {
        handlePolygonClick(layerId);
      }
    });

    // Accumulate wells (add to existing selection) - using well names
    setSelectedWells(prev => {
      const newWells = wellNames.filter(name => !prev.includes(name));
      return [...prev, ...newWells];
    });
  };

  // Handler for clicking on a polygon in delete mode
  const handlePolygonClick = (layerId: any) => {
    console.log('Polygon clicked with ID:', layerId);

    // Get the wells associated with this polygon (well names)
    const polygonWells = polygonWellsMap.current.get(layerId);
    const layer = layersMap.current.get(layerId);

    console.log('Polygon wells:', polygonWells);
    console.log('Layer:', layer);

    if (polygonWells && layer) {
      // Remove these wells from the selection (filter by well names)
      setSelectedWells(prev => prev.filter(name => !polygonWells.includes(name)));

      // Remove the polygon layer from the map
      if (featureGroupRef.current) {
        featureGroupRef.current.removeLayer(layer);
      }

      // Remove from the mappings
      polygonWellsMap.current.delete(layerId);
      layersMap.current.delete(layerId);
    }

    // Exit delete mode
    setDeleteMode(false);
  };

  // Handler for polygon deletion
  const handlePolygonDeleted = (e: any) => {
    console.log('Polygon deleted event:', e);
    setSelectedWells([]);
  };

  // Handler for edit stop (when save is clicked after deletion)
  const handleEditStop = (e: any) => {
    console.log('Edit stop event:', e);
  };


  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (point: L.LatLng, polygon: L.LatLng[]): boolean => {
    let inside = false;
    const x = point.lat, y = point.lng;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;

      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  };

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (mapInstanceRef.current) return;

    mapInstanceRef.current = true;
    setMounted(true);

    return () => {
      // Cleanup on unmount
      mapInstanceRef.current = false;
      if (mapContainerRef.current) {
        const container = mapContainerRef.current.querySelector('.leaflet-container');
        if (container) {
          // Remove all Leaflet elements
          container.remove();
        }
      }
    };
  }, []);

  // Prevent auto-scroll when clicking on Leaflet draw buttons
  useEffect(() => {
    if (!mounted) return;

    // Override scroll behavior temporarily when toolbar is used
    const handleToolbarClick = (e: Event) => {
      // Save current scroll position
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // Restore scroll position after a small delay (after Leaflet processes the click)
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 0);
    };

    // Find all Leaflet draw toolbar buttons
    const toolbarButtons = document.querySelectorAll('.leaflet-draw-toolbar a');
    toolbarButtons.forEach(button => {
      button.addEventListener('click', handleToolbarClick);
    });

    return () => {
      toolbarButtons.forEach(button => {
        button.removeEventListener('click', handleToolbarClick);
      });
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="h-[600px] flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Custom styles for polygon drawing */}
      <style jsx global>{`
        .leaflet-draw-tooltip {
          display: none !important;
        }
        .leaflet-draw-actions {
          display: none !important;
        }
        .leaflet-draw-edit-edit {
          display: none !important;
        }
        .leaflet-draw-edit-remove {
          display: none !important;
        }
        .leaflet-draw-toolbar a {
          pointer-events: auto !important;
        }
        ${deleteMode ? `
          .leaflet-interactive {
            cursor: pointer !important;
          }
        ` : ''}
      `}</style>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Houston Region
        </h3>
        <button
          onClick={() => {
            if (selectedWells.length > 0 && onNext) {
              onNext(selectedWells);
            }
          }}
          disabled={selectedWells.length === 0}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            selectedWells.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Next {selectedWells.length > 0 ? `(${selectedWells.length} wells)` : ''}
        </button>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="h-[600px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 relative">
        {/* Delete mode message */}
        {deleteMode && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[1000] bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold">
            Click on a polygon to delete it
          </div>
        )}

        {/* Custom delete button */}
        {selectedWells.length > 0 && (
          <button
            onClick={() => {
              setDeleteMode(!deleteMode);
            }}
            className={`absolute top-14 right-3 z-[1000] border-2 rounded w-8 h-8 flex items-center justify-center shadow-md transition-colors ${
              deleteMode
                ? 'bg-orange-500 border-orange-600 hover:bg-orange-600 text-white'
                : 'bg-white hover:bg-gray-100 border-gray-400 text-gray-700'
            }`}
            style={{ cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        )}
        <MapContainer
          center={houstonCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <MapController />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={handlePolygonCreated}
              onDeleted={handlePolygonDeleted}
              onEditStop={handleEditStop}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: {
                    color: '#f97316',
                    fillColor: '#fb923c',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.2,
                  },
                },
              }}
              edit={{
                edit: false,
                remove: false,
              }}
            />
          </FeatureGroup>

          {wells.map((well) => {
            const isSelected = selectedWells.includes(well.id);
            return (
              <CircleMarker
                key={well.id}
                center={[well.lat, well.lng]}
                radius={isSelected ? 10 : 8}
                fillColor={isSelected ? "#10b981" : "#3b82f6"}
                color="#fff"
                weight={isSelected ? 3 : 2}
                opacity={1}
                fillOpacity={isSelected ? 1 : 0.8}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <div className="p-2">
                    <h4 className="font-bold text-sm mb-1">{well.name}</h4>
                    <p className="text-xs text-gray-600">Status: <span className="font-semibold capitalize">{well.status}</span></p>
                    <p className="text-xs text-gray-600">Production: <span className="font-semibold">{well.production} BBL/day</span></p>
                    <p className="text-xs text-gray-600">Location: <span className="font-semibold">{well.lat.toFixed(4)}, {well.lng.toFixed(4)}</span></p>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
