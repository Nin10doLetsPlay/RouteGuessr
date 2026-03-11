const map = L.map('map').setView([50, 10], 5)

const paris = [48.8566, 2.3522]
const berlin = [52.52, 13.405]
const realTime = 9.2

L.marker(paris).addTo(map)
L.marker(berlin).addTo(map)

L.polyline([paris, berlin], {color: 'red'}).addTo(map)

map.fitBounds([paris, berlin])

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
 attribution: '&copy; OpenStreetMap contributors'
}).addTo(map)

document.getElementById("submitGuess").onclick = () => {

  const guess = parseFloat(
    document.getElementById("guessInput").value
  )

  const error = Math.abs(guess - realTime)

  document.getElementById("result").innerText =
    "Real time: " + realTime + " hours"
}