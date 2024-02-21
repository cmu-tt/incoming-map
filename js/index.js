("use strict");

console.log(
  "%c" + "😽ྀིྀི please don't look at this code, thanks 😽ྀིྀི",
  "text-align:center; background: peachpuff; color: black; padding: 20px 60px; font-family: sans-serif; font-size: 20px; border-radius: 7px;"
);

// Constants

const cmuLatLng = { lat: 40.443336, lng: -79.944023 };

// Variables
var markers = [];
var active;
var map;
// Vars: User
var userLatLng = {};
var userName = localStorage.getItem("userName");
var userDetail = localStorage.getItem("userDetail");
var userPlace;
var userMarker = null;
// Vars: Edit Mode
var addMode = false;
var addChanged = false;

// Edit Mode
$("#toggle_place_mode").click(save_changes);

// Name and Details
$("#edit_name").click(add_name);
$("#edit_detail").click(add_details);
function add_details() {
  let after = prompt("Tell us a little about yourself");
  if (!after) return alert("Please enter some details");
  if (userDetail === after) return alert("Detail is already set to " + after);
  userDetail = after;
  mark_changed(true);
}
function add_name() {
  let after = prompt("What's your name?");
  if (!after) return alert("Please enter a name");
  if (userName === after) return alert("Name is already set to " + after);
  userName = after;
  mark_changed(true);
}
function add_place(place) {
  userPlace = place;
  mark_changed(true);
}

function mark_changed(changed) {
  addChanged = changed;
  if (changed) {
    if (userMarker) removeMarker(userMarker);
    userMarker = setupMarker(map, userLatLng, userName, userDetail, userPlace);
  }
  $("#toggle_place_mode").text(changed ? "Save Changes" : "Exit Edit");
}
function save_changes() {
  if (addChanged) {
    localStorage.setItem("userName", userName);
    localStorage.setItem("userDetail", userDetail);
    // TODO: Save to server
    console.log("Saving to server...");
  }
  mark_changed(false);
  addMode = !addMode;
  $("#toggle_place_mode").text(addMode ? "Exit Add/Edit" : "Add/Edit");
  $("#controls_wrapper").toggleClass("add_place", addMode);
  // Collapse all Markers
  if (addMode) $(".student_marker").addClass("student_content__hidden");
}

// Map Handler
async function initMap() {
  // get Map and AdvancedMarkerElement

  await google.maps.importLibrary("maps");
  await google.maps.importLibrary("marker");
  const geocoder = new google.maps.Geocoder();

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 4,
    center: cmuLatLng,
    mapId: "cmu-admit-map",
  });
  // CMU Marker
  void new google.maps.marker.AdvancedMarkerElement({
    position: cmuLatLng,
    map: map,
    content: $('<div class="cmu_marker student_marker">CMU</div>').get(0),
  });

  // Marker Create Listener
  map.addListener("click", function (e) {
    // Only work in add mode
    if (!addMode) return;

    /* Get Details for Marker */
    // get location
    userLatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    // get username
    if (!userName && !add_name()) return;
    // get user detail
    if (!userDetail && !add_details()) return;
    // remove old marker
    if (userMarker) userMarker.setMap(null);

    // get city name
    geocoder.geocode({ location: userLatLng }, (results, status) => {
      let place;
      if (status === google.maps.GeocoderStatus.OK) {
        if (results[0]) {
          // get City, State (if applicable), Country via administrative_area_level_1 and locality
          const reigion = results[0].address_components
            .filter((component) => component.types.includes("administrative_area_level_1"))
            .map((component) => component.long_name)
            .join(", ");
          const locality = results[0].address_components
            .filter((component) => component.types.includes("locality"))
            .map((component) => component.long_name)
            .join(", ");
          place = [locality, reigion].filter(Boolean).join(", ");
        }
      }
      /* Create Marker */
      add_place(place);
      mark_changed(true);
    });
  });
}

function setupMarker(map, latLng, name, detail, place) {
  let marker = new google.maps.marker.AdvancedMarkerElement({
    position: latLng,
    map: map,
    content: makeContent(name, detail, place || "Unknown Area"),
  });
  marker.addListener("click", function () {
    toggleMarker(marker);
  });
  markers.push(marker);
  return marker;
}

function removeNamedMarker(name) {
  let marker = markers
    .reverse()
    .find((m) => m.content.querySelector(".student_name").textContent === name);
  if (marker) return removeMarker(marker);
}

function removeMarker(marker) {
  marker.setMap(null);
  markers = markers.filter((m) => m !== marker);
  return marker;
}

function makeContent(name, detail, location) {
  let own = userName == name;
  name = $("<div>").text(name).html();
  detail = $("<div>").text(detail).html();
  return $(
    `<div class="student_marker student_content__hidden ${
      own ? "own_marker" : ""
    }"><div class="student_name">${name}</div><div class="student_content"><h2>${
      name + (own ? " (you)" : "")
    }</h2><p>${location}</p><p>${detail}</p></div></div>`
  ).get(0);
}

function toggleMarker(marker) {
  active = marker;
  $(marker.content).toggleClass("student_content__hidden");
  // remove all other
  $(".student_marker").not(marker.content).addClass("student_content__hidden");
}
