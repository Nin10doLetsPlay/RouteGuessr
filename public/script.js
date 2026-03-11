const routeTitle = document.getElementById("routeTitle")
const guessSlider = document.getElementById("guessSlider")
const sliderValue = document.getElementById("sliderValue")
const submitGuessButton = document.getElementById("submitGuess")
const modeBadge = document.getElementById("modeBadge")

const resultModal = document.getElementById("resultModal")
const modalGuess = document.getElementById("modalGuess")
const modalReal = document.getElementById("modalReal")
const modalError = document.getElementById("modalError")
const modalScore = document.getElementById("modalScore")
const closeModal = document.getElementById("closeModal")

const currentMode = "driving"

const modeIcons = {
  driving: "🚗",
  walking: "🚶",
  cycling: "🚲",
  flying: "✈️"
}

const map = L.map("map", {
  zoomControl: true,
  minZoom: 2,
  maxZoom: 18
}).setView([50, 10], 5)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  minZoom: 2,
  maxZoom: 19,
  noWrap: false
}).addTo(map)

const startCity = {
  name: "Paris",
  coords: [48.8566, 2.3522]
}

const endCity = {
  name: "Berlin",
  coords: [52.52, 13.405]
}

routeTitle.textContent = `${startCity.name} → ${endCity.name}`
modeBadge.textContent = modeIcons[currentMode] || "📍"
modeBadge.title = currentMode

L.marker(startCity.coords).addTo(map)
L.marker(endCity.coords).addTo(map)

let routeLine = null
let realTimeHours = 0

function formatTimeDisplay(hours) {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} min`
  }

  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (minutes === 0) {
    return `${wholeHours} h`
  }

  return `${wholeHours} h ${minutes} min`
}

function updateSliderDisplay() {
  const currentValue = parseFloat(guessSlider.value)
  sliderValue.textContent = formatTimeDisplay(currentValue)
}

updateSliderDisplay()
guessSlider.addEventListener("input", updateSliderDisplay)

async function loadRoute(profile = "driving") {
  try {
    const startLat = startCity.coords[0]
    const startLng = startCity.coords[1]
    const endLat = endCity.coords[0]
    const endLng = endCity.coords[1]

    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

    const response = await fetch(url)
    const data = await response.json()

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found.")
    }

    const route = data.routes[0]
    realTimeHours = route.duration / 3600

    const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]])

    if (routeLine) {
      map.removeLayer(routeLine)
    }

    routeLine = L.polyline(routeCoords, {
      color: "#e90000",
      weight: 5,
      opacity: 0.9
    }).addTo(map)

    map.fitBounds(routeLine.getBounds(), {
      padding: [60, 60]
    })

    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  } catch (error) {
    console.error("Error loading route:", error)
  }
}

function calculateScore(errorPercent) {
  return Math.max(0, Math.round(1000 - errorPercent * 20))
}

submitGuessButton.addEventListener("click", () => {
  if (realTimeHours === 0) return

  const guess = parseFloat(guessSlider.value)
  const errorPercent = Math.abs(guess - realTimeHours) / realTimeHours * 100
  const score = calculateScore(errorPercent)

  modalGuess.textContent = `Your guess: ${formatTimeDisplay(guess)}`
  modalReal.textContent = `Real time: ${formatTimeDisplay(realTimeHours)}`
  modalError.textContent = `Error: ${errorPercent.toFixed(1)}%`
  modalScore.textContent = `Score: ${score}`

  resultModal.classList.remove("hidden")
})

closeModal.addEventListener("click", () => {
  resultModal.classList.add("hidden")
})

loadRoute(currentMode)