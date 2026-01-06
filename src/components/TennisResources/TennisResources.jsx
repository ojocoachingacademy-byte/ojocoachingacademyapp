import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, Clock, Phone, Globe } from 'lucide-react'
import './TennisResources.css'

// San Diego tennis clubs/clinics data
const TENNIS_CLINICS = [
  {
    id: 1,
    name: 'Barnes Tennis Center',
    address: '4490 W Point Loma Blvd, San Diego, CA 92107',
    lat: 32.7273,
    lng: -117.2500,
    phone: '(619) 221-9000',
    website: 'https://www.barnestenniscenter.com',
    clinicDays: 'Monday, Wednesday, Friday',
    clinicTime: '6:00 PM - 8:00 PM'
  },
  {
    id: 2,
    name: 'Balboa Tennis Club',
    address: '2221 Morley Field Dr, San Diego, CA 92104',
    lat: 32.7400,
    lng: -117.1420,
    phone: '(619) 295-9278',
    website: 'https://www.balboatennisclub.org',
    clinicDays: 'Tuesday, Thursday',
    clinicTime: '5:30 PM - 7:30 PM'
  },
  {
    id: 3,
    name: 'La Jolla Beach & Tennis Club',
    address: '2000 Spindrift Dr, La Jolla, CA 92037',
    lat: 32.8567,
    lng: -117.2578,
    phone: '(858) 454-7126',
    website: 'https://www.ljbtc.com',
    clinicDays: 'Monday, Wednesday, Saturday',
    clinicTime: '9:00 AM - 11:00 AM'
  },
  {
    id: 4,
    name: 'Rancho Bernardo Swim & Tennis Club',
    address: '16955 Bernardo Oaks Dr, San Diego, CA 92128',
    lat: 33.0214,
    lng: -117.0744,
    phone: '(858) 487-5002',
    website: 'https://www.rbstc.com',
    clinicDays: 'Tuesday, Thursday',
    clinicTime: '6:00 PM - 8:00 PM'
  },
  {
    id: 5,
    name: 'San Diego Tennis & Racquet Club',
    address: '4848 Tecolote Rd, San Diego, CA 92110',
    lat: 32.7894,
    lng: -117.2017,
    phone: '(619) 275-3270',
    website: 'https://www.sdtrc.com',
    clinicDays: 'Monday, Wednesday, Friday',
    clinicTime: '7:00 PM - 9:00 PM'
  },
  {
    id: 6,
    name: 'Pacific Beach Tennis Club',
    address: '2525 Soledad Rd, San Diego, CA 92109',
    lat: 32.8000,
    lng: -117.2400,
    phone: '(858) 272-3380',
    website: 'https://www.pbtennis.com',
    clinicDays: 'Saturday, Sunday',
    clinicTime: '10:00 AM - 12:00 PM'
  },
  {
    id: 7,
    name: 'Point Loma Tennis Club',
    address: '2606 Chatsworth Blvd, San Diego, CA 92106',
    lat: 32.7200,
    lng: -117.2300,
    phone: '(619) 222-1636',
    website: 'https://www.pointlomatennis.com',
    clinicDays: 'Tuesday, Thursday',
    clinicTime: '6:30 PM - 8:30 PM'
  },
  {
    id: 8,
    name: 'Mission Bay Tennis Club',
    address: '2633 Grand Ave, San Diego, CA 92109',
    lat: 32.7900,
    lng: -117.2500,
    phone: '(858) 488-0055',
    website: 'https://www.missionbaytennis.com',
    clinicDays: 'Monday, Wednesday',
    clinicTime: '5:00 PM - 7:00 PM'
  }
]

export default function TennisResources() {
  const [activeTab, setActiveTab] = useState('clinics')
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const userMarkerRef = useRef(null)

  useEffect(() => {
    // Load Google Maps script
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setLocationError('Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.')
      return
    }

    if (!window.google || !window.google.maps) {
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setMapLoaded(true)
          initializeMap()
        })
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async`
      script.async = true
      script.defer = true
      script.onload = () => {
        // Wait for Google Maps to be fully initialized
        const checkMapsReady = () => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            setMapLoaded(true)
            initializeMap()
          } else {
            // Retry after a short delay
            setTimeout(checkMapsReady, 100)
          }
        }
        checkMapsReady()
      }
      script.onerror = () => {
        setLocationError('Failed to load Google Maps script. Please check your API key and internet connection.')
      }
      document.head.appendChild(script)
    } else if (window.google && window.google.maps && window.google.maps.Map) {
      setMapLoaded(true)
      // Small delay to ensure everything is ready
      setTimeout(() => {
        initializeMap()
      }, 100)
    } else {
      // Maps might still be loading, wait a bit
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          clearInterval(checkInterval)
          setMapLoaded(true)
          initializeMap()
        }
      }, 100)
      
      // Stop checking after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.google?.maps?.Map) {
          setLocationError('Google Maps API not available. Please check your API key configuration.')
        }
      }, 5000)
    }

    // Get user's location
    getCurrentLocation()

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => {
        if (marker.setMap) {
          marker.setMap(null)
        } else if (marker.map) {
          marker.map = null
        }
      })
      if (userMarkerRef.current) {
        if (userMarkerRef.current.setMap) {
          userMarkerRef.current.setMap(null)
        } else if (userMarkerRef.current.map) {
          userMarkerRef.current.map = null
        }
      }
    }
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
        if (mapInstanceRef.current) {
          updateUserMarker(location)
        }
      },
      (error) => {
        setLocationError('Unable to retrieve your location. Please enable location services.')
        console.error('Geolocation error:', error)
      }
    )
  }

  const initializeMap = () => {
    // Wait for Google Maps to be fully loaded
    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.error('Google Maps API not loaded properly')
      setLocationError('Google Maps failed to initialize. Please refresh the page.')
      return
    }

    if (!mapRef.current) {
      console.error('Map container not available')
      return
    }

    // Center on San Diego
    const sanDiegoCenter = { lat: 32.7157, lng: -117.1611 }

    try {
      // Double-check Map is available
      if (!window.google.maps.Map) {
        throw new Error('Google Maps Map constructor not available')
      }

      // Advanced Markers require a valid Map ID from Google Cloud Console
      // Only use Advanced Markers if mapId is provided via env var
      const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
      
      const mapConfig = {
        center: sanDiegoCenter,
        zoom: 11,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      }
      
      // Only add mapId if provided (required for Advanced Markers)
      // Without mapId, we'll use legacy markers which work fine
      if (mapId) {
        mapConfig.mapId = mapId
      }
      
      const map = new window.google.maps.Map(mapRef.current, mapConfig)

      mapInstanceRef.current = map
      // Store mapId for later use in marker creation
      mapInstanceRef.current._mapId = mapId

      // Check if we can use Advanced Markers (requires mapId and marker library)
      const useAdvancedMarkers = mapId && window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement

      // Add markers for tennis clinics
      TENNIS_CLINICS.forEach(clinic => {
        // Use AdvancedMarkerElement only if mapId is available, otherwise use legacy Marker
        let marker
        if (useAdvancedMarkers) {
          // Use AdvancedMarkerElement (new API)
          const pinElement = new window.google.maps.marker.PinElement({
            background: '#4B2C6C',
            borderColor: '#FFFFFF',
            glyphColor: '#FFFFFF',
            scale: 1.2
          })
          
          marker = new window.google.maps.marker.AdvancedMarkerElement({
            map: map,
            position: { lat: clinic.lat, lng: clinic.lng },
            title: clinic.name,
            content: pinElement.element
          })
        } else {
          // Fallback to legacy Marker
          marker = new window.google.maps.Marker({
            position: { lat: clinic.lat, lng: clinic.lng },
            map: map,
            title: clinic.name,
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/tennis.png',
              scaledSize: window.google.maps?.Size ? new window.google.maps.Size(32, 32) : undefined
            }
          })
        }

        if (window.google.maps.InfoWindow) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="map-info-window">
                <h3>${clinic.name}</h3>
                <p>${clinic.address}</p>
                <p><strong>Clinic Days:</strong> ${clinic.clinicDays}</p>
                <p><strong>Time:</strong> ${clinic.clinicTime}</p>
                <p><strong>Phone:</strong> <a href="tel:${clinic.phone}">${clinic.phone}</a></p>
                ${clinic.website ? `<p><a href="${clinic.website}" target="_blank">Visit Website</a></p>` : ''}
              </div>
            `
          })

          // Add click listener (works for both Marker and AdvancedMarkerElement)
          marker.addListener('click', () => {
            infoWindow.open(map, marker)
          })
        }

        markersRef.current.push(marker)
      })

    // Add user location marker if available
    if (userLocation) {
      updateUserMarker(userLocation)
    }

    } catch (error) {
      console.error('Error initializing map:', error)
      setLocationError('Failed to initialize map. Please check your API key and refresh the page.')
    }
  }

  const updateUserMarker = (location) => {
    if (!mapInstanceRef.current || !window.google?.maps) return

    // Remove existing user marker
    if (userMarkerRef.current) {
      if (userMarkerRef.current.setMap) {
        userMarkerRef.current.setMap(null)
      } else if (userMarkerRef.current.map) {
        userMarkerRef.current.map = null
      }
    }

    // Check if we can use Advanced Markers (requires mapId)
    const mapId = mapInstanceRef.current?._mapId
    const useAdvancedMarkers = mapId && window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement
    
    // Add new user marker - use AdvancedMarkerElement only if mapId is available
    if (useAdvancedMarkers) {
      const pinElement = new window.google.maps.marker.PinElement({
        background: '#4285F4',
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
        scale: 1.0
      })
      
      userMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: location,
        title: 'Your Location',
        content: pinElement.element
      })
    } else {
      // Fallback to legacy Marker
      userMarkerRef.current = new window.google.maps.Marker({
        position: location,
        map: mapInstanceRef.current,
        title: 'Your Location',
        icon: window.google.maps.SymbolPath ? {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        } : {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: window.google.maps?.Size ? new window.google.maps.Size(16, 16) : undefined
        }
      })
    }

    // Add circle to show accuracy
    if (window.google.maps.Circle) {
      new window.google.maps.Circle({
        strokeColor: '#4285F4',
        strokeOpacity: 0.3,
        strokeWeight: 2,
        fillColor: '#4285F4',
        fillOpacity: 0.1,
        map: mapInstanceRef.current,
        center: location,
        radius: 500 // 500 meters
      })
    }
  }

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const getSortedClinics = () => {
    if (!userLocation) return TENNIS_CLINICS

    return [...TENNIS_CLINICS].map(clinic => ({
      ...clinic,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        clinic.lat,
        clinic.lng
      )
    })).sort((a, b) => a.distance - b.distance)
  }

  const handleClinicClick = (clinic) => {
    if (mapInstanceRef.current && window.google?.maps) {
      mapInstanceRef.current.setCenter({ lat: clinic.lat, lng: clinic.lng })
      mapInstanceRef.current.setZoom(15)
      
      // Trigger marker click to show info window
      const marker = markersRef.current.find(m => {
        return m.position && m.position.lat === clinic.lat && m.position.lng === clinic.lng
      })
      if (marker && window.google.maps.event) {
        window.google.maps.event.trigger(marker, 'click')
      }
    }
  }

  return (
    <div className="page-container">
      <div className="tennis-resources">
        <div className="resources-header">
          <h1>🎾 Tennis Resources</h1>
          <p>Find tennis clinics, courts, and resources near you</p>
        </div>

        <div className="resources-tabs">
          <button
            className={`tab-button ${activeTab === 'clinics' ? 'active' : ''}`}
            onClick={() => setActiveTab('clinics')}
          >
            <MapPin size={18} />
            Clinics Near Me
          </button>
          {/* Future tabs can be added here */}
        </div>

        {activeTab === 'clinics' && (
          <div className="clinics-content">
            <div className="clinics-sidebar">
              <div className="location-section">
                <h3>
                  <Navigation size={18} />
                  Your Location
                </h3>
                {userLocation ? (
                  <div className="location-status success">
                    <span>📍 Location detected</span>
                    <button onClick={getCurrentLocation} className="btn-refresh-location">
                      Refresh
                    </button>
                  </div>
                ) : locationError ? (
                  <div className="location-status error">
                    <span>{locationError}</span>
                    <button onClick={getCurrentLocation} className="btn-refresh-location">
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="location-status loading">
                    <span>Detecting location...</span>
                  </div>
                )}
              </div>

              <div className="clinics-list">
                <h3>Nearby Clinics ({getSortedClinics().length})</h3>
                <div className="clinics-scroll">
                  {getSortedClinics().map(clinic => (
                    <div
                      key={clinic.id}
                      className="clinic-card"
                      onClick={() => handleClinicClick(clinic)}
                    >
                      <div className="clinic-header">
                        <h4>{clinic.name}</h4>
                        {userLocation && clinic.distance && (
                          <span className="distance-badge">
                            {clinic.distance.toFixed(1)} km away
                          </span>
                        )}
                      </div>
                      <p className="clinic-address">
                        <MapPin size={14} />
                        {clinic.address}
                      </p>
                      <div className="clinic-details">
                        <div className="clinic-detail-item">
                          <Clock size={14} />
                          <span>
                            {clinic.clinicDays.split(', ').map((day, index, array) => (
                              <span key={day}>
                                <a 
                                  href={clinic.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="clinic-day-link"
                                >
                                  {day}
                                </a>
                                {index < array.length - 1 && ', '}
                              </span>
                            ))}
                            {' • '}
                            {clinic.clinicTime}
                          </span>
                        </div>
                        {clinic.phone && (
                          <div className="clinic-detail-item">
                            <Phone size={14} />
                            <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>
                          </div>
                        )}
                        {clinic.website && (
                          <div className="clinic-detail-item">
                            <Globe size={14} />
                            <a href={clinic.website} target="_blank" rel="noopener noreferrer">
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="clinics-map-container">
              <div ref={mapRef} className="clinics-map" />
              {!mapLoaded && (
                <div className="map-loading">
                  <p>Loading map...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

