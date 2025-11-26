/**
 * Projects Map - Leaflet.js ilə interaktiv xəritə
 * JSON faylından layihə məlumatlarını yükləyir və xəritədə göstərir
 */

let map;
let markers = [];

/**
 * Xəritəni başlat
 */
function initProjectsMap() {
    // Bakı mərkəzi koordinatları
    const defaultCenter = [40.4093, 49.8671];
    
    // Loading indicator-u gizlət
    const loadingElement = document.getElementById('map-loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Xəritəni yarat
    map = L.map('projects-map').setView(defaultCenter, 11);
    
    // OpenStreetMap tile layer əlavə et
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // JSON faylını yüklə və markerləri əlavə et
    loadProjectsFromJSON();
}

/**
 * Layihə məlumatları (JSON faylından və ya birbaşa)
 */
const projectsData = [
  {
    "id": 1,
    "title": "Böyük Kənd Təsərrüfatı Sahəsi",
    "description": "500 hektar sahə üçün mərkəzi pivot suvarma sistemi quraşdırılması. Müasir texnologiyalar və avtomatik idarəetmə sistemi ilə təchiz olunub.",
    "date": "2024-01-15",
    "location": {
      "lat": 40.4093,
      "lng": 49.8671
    },
    "images": [
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop"
    ]
  },
  {
    "id": 2,
    "title": "Bağ Sahəsi Drip Suvarma",
    "description": "Bağ üçün avtomatik drip suvarma sistemi layihələndirməsi və quraşdırılması. Su səmərəliliyi və keyfiyyətli məhsul hasilatı təmin edilir.",
    "date": "2024-02-20",
    "location": {
      "lat": 40.3777,
      "lng": 49.8920
    },
    "images": [
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=600&fit=crop"
    ]
  },
  {
    "id": 3,
    "title": "Park və Yaşıllıq Sahəsi",
    "description": "Şəhər parkı üçün sprinkler suvarma sistemi quraşdırılması. Estetik görünüş və effektiv suvarma təmin edilir.",
    "date": "2024-03-10",
    "location": {
      "lat": 40.3953,
      "lng": 49.8822
    },
    "images": [
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&h=600&fit=crop"
    ]
  },
  {
    "id": 4,
    "title": "Tərəvəz Sahəsi",
    "description": "Tərəvəz yetişdirmə üçün drip suvarma sistemi layihələndirməsi. Məhsuldarlığın artırılması və su ehtiyatlarının qənaətli istifadəsi.",
    "date": "2024-04-05",
    "location": {
      "lat": 40.4189,
      "lng": 49.8519
    },
    "images": [
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=600&fit=crop"
    ]
  },
  {
    "id": 5,
    "title": "Golf Meydanı",
    "description": "Golf meydanı üçün peşəkar suvarma sistemi quraşdırılması. Yüksək keyfiyyətli çəmən örtüyü və avtomatik suvarma.",
    "date": "2024-05-12",
    "location": {
      "lat": 40.3650,
      "lng": 49.8350
    },
    "images": [
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=600&fit=crop"
    ]
  },
  {
    "id": 6,
    "title": "Sənaye Sahəsi",
    "description": "Sənaye müəssisəsi üçün suvarma sistemi layihələndirməsi və quraşdırılması. Geniş sahə üçün effektiv həll.",
    "date": "2024-06-18",
    "location": {
      "lat": 40.3822,
      "lng": 49.8186
    },
    "images": [
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&h=600&fit=crop"
    ]
  }
];

/**
 * JSON faylından layihələri yüklə və xəritədə göstər
 */
async function loadProjectsFromJSON() {
    try {
        let projects = [];
        
        // Əvvəlcə JSON faylını yükləməyə cəhd et
        try {
            const response = await fetch('projects.json');
            if (response.ok) {
                projects = await response.json();
            } else {
                throw new Error('JSON faylı tapılmadı');
            }
        } catch (fetchError) {
            // Əgər JSON faylı yüklənməzsə, daxili məlumatları istifadə et
            console.log('JSON faylı yüklənə bilmədi, daxili məlumatlar istifadə olunur');
            projects = projectsData;
        }
        
        // Əvvəlki markerləri sil
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        // Hər layihə üçün marker yarat
        projects.forEach(project => {
            if (project.location && project.location.lat && project.location.lng) {
                const marker = createProjectMarker(project);
                markers.push(marker);
            }
        });
        
        // Bütün markerləri əhatə edən viewport təyin et
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        } else {
            showMapError('Layihə məlumatları tapılmadı.');
        }
        
    } catch (error) {
        console.error('Xəta:', error);
        // Daxili məlumatları istifadə et
        try {
            const projects = projectsData;
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
            
            projects.forEach(project => {
                if (project.location && project.location.lat && project.location.lng) {
                    const marker = createProjectMarker(project);
                    markers.push(marker);
                }
            });
            
            if (markers.length > 0) {
                const group = new L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
        } catch (fallbackError) {
            console.error('Fallback xətası:', fallbackError);
            showMapError('Xəritə yüklənə bilmədi. Zəhmət olmasa səhifəni yeniləyin.');
        }
    }
}

/**
 * Layihə üçün marker yarat
 */
function createProjectMarker(project) {
    // Custom marker icon (yaşıl rəng)
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background-color: #2d8659;
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
                <div style="
                    transform: rotate(45deg);
                    color: white;
                    font-weight: bold;
                    text-align: center;
                    line-height: 26px;
                    font-size: 16px;
                ">📍</div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
    
    // Marker yarat
    const marker = L.marker(
        [project.location.lat, project.location.lng],
        { icon: customIcon }
    ).addTo(map);
    
    // Popup məzmunu yarat
    const popupContent = createPopupContent(project);
    marker.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'project-popup'
    });
    
    return marker;
}

/**
 * Popup məzmunu yarat
 */
function createPopupContent(project) {
    let content = `
        <div style="padding: 8px;">
            <h3 style="font-size: 18px; font-weight: bold; color: #2d8659; margin-bottom: 8px;">
                ${escapeHtml(project.title)}
            </h3>
    `;
    
    if (project.description) {
        content += `
            <p style="color: #666; margin-bottom: 8px; line-height: 1.5;">
                ${escapeHtml(project.description)}
            </p>
        `;
    }
    
    if (project.date) {
        const formattedDate = formatDate(project.date);
        content += `
            <p style="color: #888; font-size: 14px; margin-bottom: 8px;">
                <strong>Tarix:</strong> ${formattedDate}
            </p>
        `;
    }
    
    if (project.images && project.images.length > 0) {
        content += `
            <div style="margin-top: 12px;">
                <img src="${project.images[0]}" 
                     alt="${escapeHtml(project.title)}" 
                     style="width: 100%; border-radius: 4px; margin-top: 8px;"
                     loading="lazy">
            </div>
        `;
    }
    
    content += `</div>`;
    
    return content;
}

/**
 * Tarixi formatla
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('az-AZ', options);
}

/**
 * HTML escape
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Xəta mesajı göstər
 */
function showMapError(message) {
    const mapContainer = document.getElementById('projects-map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background-color: #f3f4f6;
                border-radius: 12px;
                color: #ef4444;
                font-weight: 500;
            ">
                ${escapeHtml(message)}
            </div>
        `;
    }
}

// DOM yükləndikdən sonra xəritəni başlat
document.addEventListener('DOMContentLoaded', function() {
    // Xəritə bölməsi varsa başlat
    const mapElement = document.getElementById('projects-map');
    if (mapElement) {
        // Kiçik gecikmə - Leaflet.js-in tam yüklənməsini gözlə
        setTimeout(function() {
            try {
                initProjectsMap();
            } catch (error) {
                console.error('Xəritə yüklənmə xətası:', error);
                showMapError('Xəritə yüklənə bilmədi. Zəhmət olmasa səhifəni yeniləyin.');
            }
        }, 100);
    }
});

