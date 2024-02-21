("use strict");

console.log(
  "%c" + "😽ྀིྀི please don't look at this code, thanks 😽ྀིྀི",
  "text-align:center; background: peachpuff; color: black; padding: 20px 60px; font-family: sans-serif; font-size: 20px; border-radius: 7px;"
);

// Constants
const cmuLatLng = { lat: 40.443336, lng: -79.944023 };
var geocoder;

// Vars: Map & Markers
var active;
var map;
// Vars: User
var user_before;
var user = {
  latLng: {},
  name: localStorage.getItem("userName"),
  detail: localStorage.getItem("userDetail"),
  place: null,
  marker: null,
};
var promptedDetails = false;
// Vars: Edit Mode
var addMode = false;
var addChanged = false;

// Buttons Listeners
$("#edit_name").click(add_name);
$("#edit_detail").click(() => add_details(true));
$("#toggle_place_mode").click(save_changes);
$("#discard_place").click(discard_changes);
$("#edit_delete").click(() => {
  if (confirm("Are you sure you want to delete your marker?")) {
    removeMarker(user.marker);
    students.doc(user.uid).delete();
    user.marker = null;
    user.place = null;
    user.latLng = null;
  }
  $("#edit_delete").hide();
  addChanged = false;
  mark_changed(false);
  $("#discard_place").hide();
});

// Handlers for changing user fields
function add_details(require = false) {
  if (!require && promptedDetails) return user.detail;
  let after = prompt("Tell us a little about yourself");
  promptedDetails = true;
  if (user.detail === after)
    return after && alert("Detail is already set to " + after) && user.detail;
  user.detail = after;
  mark_changed(true);
  return user.detail;
}
function add_name() {
  let after = prompt("What's your name?");
  if (!after) return alert("Please enter a name") && false;
  if (user.name === after) return alert("Name is already set to " + after) && user.name;
  user.name = after;
  mark_changed(true);
  return user.name;
}
function add_place(place) {
  user.place = place;
  mark_changed(true);
}
// Handle Edit Mode & Changes
function mark_changed(changed) {
  addChanged = changed;
  if (changed) {
    if (user.marker) removeMarker(user.marker);
    user.marker = setupMarker(map, user);
  }
  $("#discard_place").toggle(!!changed);
  $("#toggle_place_mode").text(changed ? "Save Changes" : "Exit Edit");
}
// Server Save
async function save_changes() {
  if (addChanged) {
    localStorage.setItem("userName", user.name);
    localStorage.setItem("userDetail", user.detail);
    // Save to server
    console.log("⏫ Saving to server");
    await students.doc(user.uid).set({
      name: user.name,
      detail: user.detail,
      latLng: user.latLng,
      place: user.place,
    });
    console.log("✅ Saved to server");
    $("#edit_delete").show();
  }
  mark_changed(false);
  // Exit Add Mode
  addMode = !addMode;
  $("#toggle_place_mode").text(addMode ? "Exit Add/Edit" : "Add/Edit");
  if (addMode && !user.marker) {
    alert("Click on the map to add your marker");
  }
  $("#controls_wrapper").toggleClass("add_place", addMode);
  if (addMode) $(".student_marker").addClass("student_content__hidden");
}

// Map Handler
async function initMap() {
  // get Map and AdvancedMarkerElement

  await google.maps.importLibrary("maps");
  await google.maps.importLibrary("marker");
  geocoder = new google.maps.Geocoder();

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 4,
    center: cmuLatLng,
    mapId: "cmu-admit-map",
    streetViewControl: false,
  });
  // CMU Marker
  void new google.maps.marker.AdvancedMarkerElement({
    position: cmuLatLng,
    map: map,
    content: $('<div class="cmu_marker student_marker">CMU</div>').get(0),
  });
}
async function initMarkers() {
  // Load & setup all other markers
  console.log("⏬ Loading markers from server");
  let data = await students.get();
  console.log("✅ Loaded markers from server");
  data.forEach((doc) => {
    let is_user = doc.id === auth.currentUser.uid;
    if (is_user) {
      console.log("👤 Found existing user marker from server");
      user = {
        uid: doc.id,
        ...user,
        ...doc.data(),
      };
      user_before = { ...user };
      $("#edit_delete").show();
    }
    setupMarker(
      map,
      is_user
        ? user
        : {
            uid: doc.id,
            ...doc.data(),
          }
    );
  });

  console.log("📍 Setup all markers");

  // Marker Create Listener
  setupEditListener(map, geocoder);
}

function setupMarker(map, obj) {
  // check that fields are valid, if not warn
  if (!obj.latLng || !obj.name) {
    console.log("📍 %cInvalid Marker Object", "color: orange", obj);
    return;
  }
  // Setup marker
  try {
    let marker = new google.maps.marker.AdvancedMarkerElement({
      position: obj.latLng,
      map: map,
      content: makeContent(obj.name, obj.detail, obj.place || "Unknown Area"),
    });
    obj.marker = marker;
    marker.addListener("click", function () {
      toggleMarker(marker);
    });
    return marker;
  } catch (e) {
    console.log("📍 %cError creating marker from obj", "color: red", obj, e);
  }
}

function removeMarker(marker) {
  if (!marker) return console.log("📍 %cNo marker to remove", "color: orange");
  marker.setMap(null);
  return marker;
}

function makeContent(name, detail, location) {
  let own = user.uid === auth.currentUser.uid;
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

function discard_changes() {
  removeMarker(user.marker);
  user = { ...user_before };
  setupMarker(map, user);
  mark_changed(false);
  console.log("🛑 Discarded changes");
}

function setupEditListener(map, geocoder) {
  map.addListener("click", function (e) {
    // Only work in add mode
    if (!addMode) return;

    /* Get Details for Marker */
    // get location
    user.latLng = e.latLng.toJSON();
    // get username
    if (!user.name && !add_name()) return;
    // get user detail
    void !user.detail && !add_details(false);
    // remove old marker
    if (user.marker) user.marker.setMap(null);

    // get city name
    geocoder.geocode({ location: user.latLng }, (results, status) => {
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
