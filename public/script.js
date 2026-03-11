const map = L.map("map").setView([50, 10], 5)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map)

const startCity = {
  name: "Paris",
  coords: [48.8566, 2.3522]
}

const endCity = {
  name: "Berlin",
  coords: [52.52, 13.405]
}

document.getElementById("routeTitle").textContent =
  `${startCity.name} → ${endCity.name}`

L.marker(startCity.coords).addTo(map)
L.marker(endCity.coords).addTo(map)

let routeLine = null
let realTimeHours = 0

async function loadRoute(profile = "walking") {
  const startLat = startCity.coords[0]
  const startLng = startCity.coords[1]
  const endLat = endCity.coords[0]
  const endLng = endCity.coords[1]

  const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

  console.log("Fetching route:", url)

  const response = await fetch(url)
  const data = await response.json()

  console.log("OSRM response:", data)

  const route = data.routes[0]

  realTimeHours = route.duration / 3600
  const realDistanceKm = route.distance / 1000

  console.log("Duration in seconds:", route.duration)
  console.log("Distance in meters:", route.distance)

  const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]])

  if (routeLine) {
    map.removeLayer(routeLine)
  }

  routeLine = L.polyline(routeCoords, {
    color: "red",
    weight: 5
  }).addTo(map)

  map.fitBounds(routeLine.getBounds())

  document.getElementById("result").textContent =
    `Route loaded. Distance: ${realDistanceKm.toFixed(1)} km | Time: ${realTimeHours.toFixed(2)} h`
}

document.getElementById("submitGuess").addEventListener("click", () => {
  const guess = parseFloat(document.getElementById("guessInput").value)

  if (isNaN(guess)) {
    document.getElementById("result").textContent = "Please enter a valid number."
    return
  }

  const errorPercent = Math.abs(guess - realTimeHours) / realTimeHours * 100

  document.getElementById("result").textContent =
    `Your guess: ${guess.toFixed(2)}h | Real time: ${realTimeHours.toFixed(2)}h | Error: ${errorPercent.toFixed(1)}%`
})

loadRoute()