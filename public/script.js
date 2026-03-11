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

let currentMode = "driving"
let cities = []

let startCity = null
let endCity = null
let routeLine = null
let startMarker = null
let endMarker = null
let realTimeHours = 0

const modeIcons = {
  driving: "🚗",
  walking: "🚶",
  cycling: "🚲",
  flying: "✈️"
}

const map = L.map("map", {
  minZoom: 1,   // how far you can zoom OUT
  maxZoom: 14,  // how far you can zoom IN
  worldCopyJump: true
}).setView([50, 10], 5)

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles © Esri",
    minZoom: 0,
    maxZoom: 19
  }
).addTo(map)

modeBadge.textContent = modeIcons[currentMode] || "📍"

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

async function loadCities() {
  const res = await fetch("cities.json")
  const data = await res.json()

  cities = data.filter(city => city.lat && city.lng)
  console.log("Loaded cities:", cities.length)
}

function pickRandomCities() {
  const a = cities[Math.floor(Math.random() * cities.length)]

  let b = cities[Math.floor(Math.random() * cities.length)]
  while (b === a) {
    b = cities[Math.floor(Math.random() * cities.length)]
  }

  startCity = {
    name: a.name,
    coords: [parseFloat(a.lat), parseFloat(a.lng)]
  }

  endCity = {
    name: b.name,
    coords: [parseFloat(b.lat), parseFloat(b.lng)]
  }
}

function resetRoundUI() {
  guessSlider.value = 0
  updateSliderDisplay()
}

function calculateAirDistanceKm(coords1, coords2) {
  const [lat1, lng1] = coords1
  const [lat2, lng2] = coords2

  const toRad = deg => deg * Math.PI / 180
  const R = 6371

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function chooseMode() {
  const distanceKm = calculateAirDistanceKm(startCity.coords, endCity.coords)

  if (distanceKm > 1800) {
    currentMode = "flying"
  } else {
    currentMode = "driving"
  }

  modeBadge.textContent = modeIcons[currentMode] || "📍"
}

async function loadRoute(profile = "driving") {
  try {
    if (routeLine) {
      map.removeLayer(routeLine)
    }

    if (startMarker) {
      map.removeLayer(startMarker)
    }

    if (endMarker) {
      map.removeLayer(endMarker)
    }

    startMarker = L.marker(startCity.coords).addTo(map)
    endMarker = L.marker(endCity.coords).addTo(map)

    if (profile === "flying") {
      const distanceKm = calculateAirDistanceKm(startCity.coords, endCity.coords)

      // rough estimate: flight time + airport overhead
      realTimeHours = distanceKm / 800 + 2

      routeLine = L.polyline([startCity.coords, endCity.coords], {
        color: "#ef4444",
        weight: 5,
        opacity: 0.9,
        dashArray: "10, 10"
      }).addTo(map)

      map.fitBounds(routeLine.getBounds(), {
        padding: [60, 60]
      })

      setTimeout(() => {
        map.invalidateSize()
      }, 100)

      return
    }

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

    routeLine = L.polyline(routeCoords, {
      color: "#ef4444",
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

    // retry the round if road route fails
    await startNewRound()
  }
}

async function startNewRound() {
  pickRandomCities()
  chooseMode()
  routeTitle.textContent = `${startCity.name} → ${endCity.name}`
  resetRoundUI()
  await loadRoute(currentMode)
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

closeModal.addEventListener("click", async () => {
  resultModal.classList.add("hidden")
  await startNewRound()
})

async function initGame() {
  await loadCities()
  await startNewRound()
}

initGame()