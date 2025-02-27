// Initialize the map
const map = L.map('map', {
    center: [40.6928, -73.9180], // Adjust as needed
    zoom: 14,
    zoomControl: false
});

// Add a dark mode tile layer with no labels
const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 19,
   
}).addTo(map);

// Store nodes and edges
let nodes = {};
let edges = {}; // Store edges for each node

// Function to load CSV using PapaParse
async function loadCSV(file) {
    const response = await fetch(file);
    const text = await response.text();
    return new Promise(resolve => {
        Papa.parse(text, {
            header: true,  // Treat first row as headers
            skipEmptyLines: true, // Ignore empty rows
            complete: results => resolve(results.data)
        });
    });
}

// Load nodes and add markers
async function loadNodes() {
    const data = await loadCSV("Nodes1.csv");
    data.forEach(row => {
        const id = row.Id;
        const name = row.Label.replace(/"/g, ""); // Remove unnecessary quotes
        const lat = parseFloat(row.Latitude);
        const lon = parseFloat(row.Longitude);
        const tags = [row.Tag01, row.Tag02, row.Tag03, row.Tag04, row.Tag05, row.Tag06, row.Tag07];

        if (!id || isNaN(lat) || isNaN(lon)) return; // Skip invalid rows

        // Create a circle marker for each node
        const marker = L.circleMarker([lat, lon], {
            radius: 2,
            color: "#ccc",
            fillColor: "#ccc",
            fillOpacity: 1
        }).addTo(map);

        // Create a text label for each node positioned below the marker
        const label = L.divIcon({
            className: 'node-label',
            html: `<p style="color: #888; font-size: 3pt; line-height: 1.3; margin-top: 5px; width: 300px;" data-id="${id}">${name}</p>`,
            iconSize: [100, 20],
            iconAnchor: [50, -10] // Adjust anchor to position text below the marker
        });

        const textMarker = L.marker([lat, lon], { icon: label });

        // Add the text marker only if the zoom level is greater than 14
        map.on('zoomend', function() {
            if (map.getZoom() > 14) {
                if (!map.hasLayer(textMarker)) {
                    textMarker.addTo(map);
                }
            } else {
                if (map.hasLayer(textMarker)) {
                    map.removeLayer(textMarker);
                }
            }
        });

        nodes[id] = { lat, lon, marker, tags };
    });
}

// Load edges and prepare for hover display
async function loadEdges() {
    const data = await loadCSV("Edges1.csv");

    data.forEach(row => {
        const Source = row.Source;
        const Target = row.Target;
        const Weight = parseFloat(row.Weight);
        if (nodes[Source] && nodes[Target]) {
            let strokeWeight;
            switch (Weight) {
                case 1:
                    strokeWeight = 0;
                    break;
                case 2:
                    strokeWeight = 0;
                    break;
                case 3:
                    strokeWeight = 0.5;
                    break;
                case 4:
                    strokeWeight = 0.75;
                    break;
                case 5:
                    strokeWeight = 1;
                    break;
                case 6:
                    strokeWeight = 2;
                    break;
                case 7:
                    strokeWeight = 3;
                    break;
                default:
                    strokeWeight = 1; // Default weight if not in the range 1-7
            }
            const polyline = L.polyline([[nodes[Source].lat, nodes[Source].lon], [nodes[Target].lat, nodes[Target].lon]], {
                color: "#ff6600",
                weight: strokeWeight,
                opacity: 0.7
            });

            // Store the polyline in both source and target nodes
            if (!edges[Source]) edges[Source] = [];
            if (!edges[Target]) edges[Target] = [];
            edges[Source].push(polyline);
            edges[Target].push(polyline);
        }
    });

    // Add hover event listeners to nodes
    Object.keys(nodes).forEach(nodeId => {
        const node = nodes[nodeId];
        node.marker.on('mouseover', () => {
            // Change font color to #fff on hover for the current node
            document.querySelectorAll(`.node-label p[data-id="${nodeId}"]`).forEach(span => {
                span.style.color = "#fff";
            });

            // Change font color to #555 for other nodes
            document.querySelectorAll(`.node-label p:not([data-id="${nodeId}"])`).forEach(span => {
                span.style.color = "#222";
            });

            // Display tags on hover only when map zoom > 16
            if (map.getZoom() > 16) {
                const tags = node.tags.filter(tag => tag).join(', ');
                const hoverLabel = L.divIcon({
                    className: 'hover-label',
                    html: `<p style="color: #aaa; font-size: 7pt; line-height: 1.3; margin-top: 5px; width: 300px; font-family: garamond; font-style: italic;">${tags}</p>`,
                    iconSize: [100, 20],
                    iconAnchor: [50, 50]
                });
                const hoverTextMarker = L.marker([node.lat, node.lon], { icon: hoverLabel }).addTo(map);
                node.hoverTextMarker = hoverTextMarker;
            }

            // Display edges on hover
            if (edges[nodeId]) {
                edges[nodeId].forEach(edge => {
                    edge.addTo(map);
                });
            }
        });
        node.marker.on('mouseout', () => {
            // Revert font color back to #888 for all nodes on mouse out
            document.querySelectorAll('.node-label p').forEach(span => {
                span.style.color = "#888";
            });

            // Remove the hover text marker
            if (node.hoverTextMarker) {
                map.removeLayer(node.hoverTextMarker);
                delete node.hoverTextMarker;
            }

            // Remove edges on mouse out
            if (edges[nodeId]) {
                edges[nodeId].forEach(edge => {
                    map.removeLayer(edge);
                });
            }
        });
    });
}

// Adjust tooltip font size based on zoom level
function adjustTooltipFontSize() {
    const zoomLevel = map.getZoom();
    let fontSize;

    // Define font size rules based on zoom level
    switch (zoomLevel) {
        case 15:
            fontSize = "3pt";
            
            break;
        case 16:
            fontSize = "5pt";
           
            break;
        case 17:
            fontSize = "6pt";
           
            break;
        case 18:
            fontSize = "8pt";
           
            break;
        case 19:
            fontSize = "10pt";
            document.querySelectorAll('.node-label p').forEach(span => {
                span.style.width = "400px";
            });
            break;
       
        default:
            fontSize = "3pt"; // Default to smallest font if zoom is below 14
    }

    // Apply font size to all tooltip labels
    document.querySelectorAll('.node-label p').forEach(span => {
        span.style.fontSize = fontSize;
    });
}

// Attach function to zoom event
map.on("zoomend", adjustTooltipFontSize);


// Listen for zoom events to adjust tooltip font size
map.on('zoomend', adjustTooltipFontSize);

// Run loading function
(async () => {
    await loadNodes();
    await loadEdges();
    adjustTooltipFontSize(); // Initial adjustment
})();

// Create a title for the page
const title = document.createElement('p');
title.innerText = 'The City and the Construction of Words';
title.style.position = 'absolute';
title.style.top = '20px';
title.style.left = '30px';
title.style.zIndex = '1000';
title.style.color = '#fff';
title.style.fontFamily = 'Garamond';
title.style.fontSize = '18px';

document.body.appendChild(title);

// Create a toggle button to switch between map on and off
const toggleButton = document.createElement('button');
toggleButton.innerText = 'Toggle Map';
toggleButton.style.position = 'absolute';
toggleButton.style.top = '90px';
toggleButton.style.left = '30px';
toggleButton.style.zIndex = '1000';
toggleButton.style.backgroundColor = '#fff';
toggleButton.style.border = 'none';
toggleButton.style.padding = '10px';
toggleButton.style.cursor = 'pointer';
toggleButton.style.borderRadius = '3px'; // Added rounded corners
toggleButton.addEventListener('mouseover', () => {
    toggleButton.style.backgroundColor = '#FF6900';
    toggleButton.style.color = '#fff';
});
toggleButton.addEventListener('mouseout', () => {
    toggleButton.style.backgroundColor = '#fff';
    toggleButton.style.color = '#000';
});
document.body.appendChild(toggleButton);

toggleButton.addEventListener('click', () => {
    const mapContainer = document.getElementById('map');
    if (map.hasLayer(tileLayer)) {
        map.removeLayer(tileLayer);
        mapContainer.style.backgroundColor = '#000';
    } else {
        tileLayer.addTo(map);
        mapContainer.style.backgroundColor = '';
    }
});
