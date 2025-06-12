// --- CONFIGURATION ---
// Paste the Client ID you got from the Google Cloud Console here.
const CLIENT_ID = 'PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';

// These are the 'permissions' we will ask the user for.
const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me';

// --- GLOBAL VARIABLES ---
let tokenClient;
let gapiInited = false;
let gisInited = false;

// --- DOM ELEMENTS ---
const classroomControls = document.getElementById('classroom-controls');
const coursesDropdown = document.getElementById('courses-dropdown');
const createAssignmentBtn = document.getElementById('create-assignment-btn');
const feedbackMessage = document.getElementById('feedback-message');

// --- INITIALIZATION ---

// This function is called by the Google Identity Services library after it loads.
window.onload = () => {
    // Initialize the Google Sign-In client.
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse // Function to handle the login response.
    });

    // This part initializes the token client for getting API access.
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: tokenCallback, // Function to handle the access token.
    });
    
    // Render the Google Sign-In button.
    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        { theme: 'outline', size: 'large' }
    );

    // Show the sign-in button and hide the controls.
    document.getElementById('g_id_signin').style.display = 'block';
    classroomControls.style.display = 'none';
};

// --- AUTHENTICATION HANDLERS ---

// This is called after the user signs in with the "Sign in with Google" button.
function handleCredentialResponse(response) {
    // Now that the user is signed in, we ask for permission to access Classroom.
    tokenClient.requestAccessToken();
}

// This is called after the user grants permission.
async function tokenCallback(tokenResponse) {
    if (tokenResponse.error) {
        console.error('Error getting access token:', tokenResponse.error);
        return;
    }
    
    // Hide the sign-in button and show the classroom controls.
    document.getElementById('g_id_signin').style.display = 'none';
    classroomControls.style.display = 'block';

    // The gapi library is what we use to make API calls.
    // We need to load it and set the access token.
    await loadGapiClient();
    gapi.client.setToken(tokenResponse);
    
    // Now, let's load the user's courses.
    listCourses();
}

// --- GOOGLE API CLIENT LOADING ---

// Loads the Google API client library.
function loadGapiClient() {
    return new Promise((resolve, reject) => {
        gapi.load('client', () => {
            gapi.client.init({})
                .then(() => resolve())
                .catch(err => reject(err));
        });
    });
}


// --- GOOGLE CLASSROOM FUNCTIONS ---

// Fetches the user's courses and populates the dropdown.
async function listCourses() {
    feedbackMessage.textContent = 'Loading courses...';
    try {
        const response = await gapi.client.classroom.courses.list({
            courseStates: 'ACTIVE'
        });

        // Clear previous options
        coursesDropdown.innerHTML = ''; 
        const courses = response.result.courses || [];

        if (courses.length > 0) {
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.name;
                coursesDropdown.appendChild(option);
            });
            feedbackMessage.textContent = '';
        } else {
            feedbackMessage.textContent = 'No active courses found.';
            createAssignmentBtn.disabled = true;
        }
    } catch (err) {
        console.error('Error listing courses:', err);
        feedbackMessage.textContent = 'Could not load courses.';
    }
}

// Creates an assignment in the selected course.
async function createClassroomAssignment() {
    const courseId = coursesDropdown.value;
    if (!courseId) {
        feedbackMessage.textContent = 'Please select a course first.';
        return;
    }

    feedbackMessage.textContent = 'Creating assignment...';
    createAssignmentBtn.disabled = true;

    try {
        const assignment = {
            title: '5-a-Day Sight Reading Practice',
            description: 'Please complete today\'s sight reading exercise using the link.',
            materials: [
                { link: { url: 'https://anderson506.github.io/sightreading5aday/' } } // Link to your tool
            ],
            workType: 'ASSIGNMENT',
            state: 'PUBLISHED'
        };

        await gapi.client.classroom.courses.courseWork.create({
            courseId: courseId,
            resource: assignment
        });

        feedbackMessage.textContent = 'Successfully created assignment!';
    } catch (err) {
        console.error('Error creating assignment:', err);
        feedbackMessage.textContent = 'Failed to create assignment.';
    } finally {
        createAssignmentBtn.disabled = false;
    }
}

// --- EVENT LISTENERS ---
createAssignmentBtn.addEventListener('click', createClassroomAssignment);
