var students;
var auth;
var ready;

/* Run Before Map */
async function preInit() {
  await prepLogin();
  initMap();
}

async function prepLogin() {
  // Firebase
  const config = {
    apiKey: "AIzaSyBhjFzVBUfSgCRUnRN94p5AzrRrrRuGL5o",
    authDomain: "cmu-admit.firebaseapp.com",
    projectId: "cmu-admit",
    storageBucket: "cmu-admit.appspot.com",
    messagingSenderId: "663827804233",
    appId: "1:663827804233:web:b467b666555b88c212cf98",
  };

  firebase.initializeApp(config);

  const db = firebase.firestore();
  students = db.collection("students");

  auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.onAuthStateChanged(stateChange);

  // Start bg map
  initMap();

  // Prep for login if needed
  $("#login_btn").click(await login);
  $("#logout_btn").click(() => auth.signOut());

  async function login() {
    // Use oauth to get user info
    try {
      await auth.signInWithPopup(provider);
      if (!auth.currentUser) {
        alert("Please login to continue");
        window.location.reload();
      }
    } catch (e) {
      console.log("👤 %cLogin failure:", "color: red", e);
      alert("Login failed. Please try again\n\n(See console for details)");
    }

    ready = true;
  }

  async function stateChange(obj) {
    $("#logout_btn").toggle(!!obj);
    console.log("🔑 Auth updated to logged", obj ? "in" : "out");
    // Login
    if (obj) {
      ready = true;
      $("#auth_wrapper").hide();
      user.name = user.name || obj.displayName;
      user.uid = obj.uid;
      initMarkers();
    }
    // Logout
    else if (!obj && ready) {
      localStorage.clear();
      alert("You have been logged out");
      location.reload();
    }
  }
}
