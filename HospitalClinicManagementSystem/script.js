// --- Firebase SDKs & Configuration ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, getDoc, setDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase configuration from the user's prompt
const firebaseConfig = {
    apiKey: "AIzaSyA1TU9EifXHLdfnciNqAQB8pBVnBQ9ZIZ4",
    authDomain: "hospitalclinicmanagement-d71d0.firebaseapp.com",
    databaseURL: "https://hospitalclinicmanagement-d71d0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hospitalclinicmanagement-d71d0",
    storageBucket: "hospitalclinicmanagement-d71d0.firebasestorage.app",
    messagingSenderId: "754208694410",
    appId: "1:754208694410:web:a46c8288af9e4eb86c8d73",
    measurementId: "G-114B5ZMX4S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables for Firebase and app state
window.app = app;
window.auth = auth;
window.db = db;
window.isLoggedIn = false;
window.currentUser = null;
window.userRole = null; // 'admin', 'doctor', or 'patient'
window.selectedPatient = null;
window.selectedPatientId = null;
window.currentPatientId = null; // For the patient portal

// Global app ID variable from the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- DOM Elements & Global UI/Utility Functions ---

/**
 * Displays a custom message modal.
 * @param {string} message The message to display.
 */
window.showMessageModal = (message) => {
    const modal = document.getElementById('message-modal');
    document.getElementById('message-text').textContent = message;
    modal.classList.remove('hidden');
};

/**
 * Hides the message modal.
 */
window.hideMessageModal = () => {
    document.getElementById('message-modal').classList.add('hidden');
};

// Language translation dictionary
const translations = {
    'en': {
        'login': 'Login',
        'register': 'Register',
        'signOut': 'Sign Out',
        'noPatients': 'No patients found.',
        'noAppointments': 'No appointments found.',
        'noInvoices': 'No invoices found.',
        'noRecords': 'No records found.',
        'noInventory': 'No inventory items.',
        'patientRegisteredSuccess': 'Patient registered successfully!',
        'appointmentScheduledSuccess': 'Appointment scheduled successfully!',
        'invoiceCreatedSuccess': 'Invoice created successfully!',
        'recordSavedSuccess': 'Medical record saved successfully!',
        'itemAddedSuccess': 'Inventory item added successfully!',
        'loginSuccess': 'Login successful!',
        'registerSuccess': 'Registration successful!',
        'symptomCheckerDisclaimer': 'This is for informational purposes only and not a substitute for professional medical advice.',
        'analyzingSymptoms': 'Analyzing symptoms...',
        'checkSymptomsBtn': 'Check Symptoms',
        'symptomResultHeading': 'Results',
    },
    'es': {
        'login': 'Iniciar sesión',
        'register': 'Registrarse',
        'signOut': 'Cerrar sesión',
        'noPatients': 'No se encontraron pacientes.',
        'noAppointments': 'No se encontraron citas.',
        'noInvoices': 'No se encontraron facturas.',
        'noRecords': 'No se encontraron registros.',
        'noInventory': 'No hay artículos en el inventario.',
        'patientRegisteredSuccess': '¡Paciente registrado exitosamente!',
        'appointmentScheduledSuccess': '¡Cita programada exitosamente!',
        'invoiceCreatedSuccess': '¡Factura creada exitosamente!',
        'recordSavedSuccess': '¡Registro médico guardado exitosamente!',
        'itemAddedSuccess': '¡Artículo de inventario agregado exitosamente!',
        'loginSuccess': '¡Inicio de sesión exitoso!',
        'registerSuccess': '¡Registro exitoso!',
        'symptomCheckerDisclaimer': 'Esto es solo para fines informativos y no sustituye el consejo médico profesional.',
        'analyzingSymptoms': 'Analizando síntomas...',
        'checkSymptomsBtn': 'Verificar Síntomas',
        'symptomResultHeading': 'Resultados',
    }
};

/**
 * Applies translations based on the selected language.
 * @param {string} lang The language code (e.g., 'en', 'es').
 */
function applyTranslations(lang) {
    // This is a simplified example; a real-world app would have more comprehensive i18n
    const authTitle = document.getElementById('auth-title');
    const authBtn = document.getElementById('auth-btn');
    const toggleAuth = document.getElementById('toggle-auth');
    
    if (authTitle) authTitle.textContent = isLoginMode ? translations[lang].login : translations[lang].register;
    if (authBtn) authBtn.textContent = isLoginMode ? translations[lang].login : translations[lang].register;
    if (toggleAuth) toggleAuth.textContent = isLoginMode ? "Don't have an account? Register" : "Already have an account? Login";
}

// --- Event Listeners and Handlers ---

// Initial setup for dark mode and language
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.className = savedTheme;
const savedLanguage = localStorage.getItem('language') || 'en';
const languageSwitcher = document.getElementById('language-switcher');
if (languageSwitcher) {
    languageSwitcher.value = savedLanguage;
    applyTranslations(savedLanguage);
    languageSwitcher.addEventListener('change', (e) => {
        const lang = e.target.value;
        localStorage.setItem('language', lang);
        applyTranslations(lang);
    });
}

const darkModeToggle = document.getElementById('dark-mode-toggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// --- Authentication Logic ---
let isLoginMode = true;
const toggleAuthLink = document.getElementById('toggle-auth');
if (toggleAuthLink) {
    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        applyTranslations(languageSwitcher.value);
    });
}

const handleAuth = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            showMessageModal(translations[languageSwitcher.value]['loginSuccess']);
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const userProfileRef = doc(db, `/artifacts/${appId}/users/${userCredential.user.uid}/userProfile/profile`);
            await setDoc(userProfileRef, { role: 'patient', email: email }); // Default role
            showMessageModal(translations[languageSwitcher.value]['registerSuccess']);
        }
    } catch (error) {
        showMessageModal(`Authentication error: ${error.message}`);
        console.error("Auth error:", error);
    }
};
const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', handleAuth);
}

/**
 * Signs the current user out of the application.
 */
window.signOutUser = () => {
    signOut(auth).then(() => {
        // Redirect to the login page after signing out
        window.location.href = 'index.html';
    }).catch(error => console.error("Sign out error:", error));
};

// --- Firebase Authentication and Data Logic ---

/**
 * Function to handle initial sign-in with a custom token or anonymously.
 */
async function handleSignIn() {
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Error signing in:", error);
    }
}

// Authentication state change listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.isLoggedIn = true;
        window.currentUser = user;
        const userDocRef = doc(db, `/artifacts/${appId}/users/${user.uid}/userProfile/profile`);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                window.userRole = userData.role;
            } else {
                window.userRole = 'patient';
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            window.userRole = 'patient';
        }

        // Redirect based on user role and current page
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'index.html' || currentPage === '') {
            if (window.userRole === 'admin' || window.userRole === 'doctor') {
                window.location.href = 'staff-dashboard.html';
            } else {
                window.location.href = 'patient-portal.html';
            }
        }
        
        // Load data for the current page
        if (currentPage === 'staff-dashboard.html') {
            loadPatients();
            loadAppointments();
            loadBilling();
        } else if (currentPage === 'patient-portal.html') {
            window.currentPatientId = user.uid;
            loadMyPatients();
            loadPatientRecords(window.currentPatientId);
        } else if (currentPage === 'inventory.html') {
            loadInventory();
        }

    } else {
        window.isLoggedIn = false;
        window.currentUser = null;
        window.userRole = null;
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
    }
});

// Event listener for window load to handle initial sign-in
window.addEventListener('load', handleSignIn);

// --- Form & Data Logic (for staff-dashboard.html) ---
window.showForm = (formId) => {
    const formsContainer = document.getElementById('forms-container');
    const allForms = document.querySelectorAll('.form-content');
    formsContainer.classList.remove('hidden');
    allForms.forEach(form => form.classList.add('hidden'));
    document.getElementById(formId).classList.remove('hidden');
    if (formId === 'medical-record-form' && window.selectedPatient) {
        document.getElementById('record-patient-name').textContent = window.selectedPatient.name;
        window.loadPatientHistory(window.selectedPatientId);
    }
};

window.hideForm = () => {
    const formsContainer = document.getElementById('forms-container');
    formsContainer.classList.add('hidden');
};

const registerPatient = async (e) => {
    e.preventDefault();
    const patient = {
        name: document.getElementById('patient-name').value,
        dob: document.getElementById('patient-dob').value,
        contact: document.getElementById('patient-contact').value,
        email: document.getElementById('patient-email').value,
        medicalHistory: document.getElementById('patient-medical-history').value,
    };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/patients`), patient);
        showMessageModal(translations[languageSwitcher.value]['patientRegisteredSuccess']);
        hideForm();
    } catch (error) {
        showMessageModal(`Error registering patient: ${error.message}`);
        console.error("Error adding document: ", error);
    }
};
const registerPatientForm = document.getElementById('register-patient-form');
if (registerPatientForm) registerPatientForm.addEventListener('submit', registerPatient);

window.loadPatients = () => {
    const patientsList = document.getElementById('patients-list');
    const appointmentPatientSelect = document.getElementById('appointment-patient');
    const billingPatientSelect = document.getElementById('billing-patient');
    if (!patientsList || !appointmentPatientSelect || !billingPatientSelect) return;
    onSnapshot(collection(db, `/artifacts/${appId}/public/data/patients`), (snapshot) => {
        patientsList.innerHTML = '';
        appointmentPatientSelect.innerHTML = '<option value="">Select a patient</option>';
        billingPatientSelect.innerHTML = '<option value="">Select a patient</option>';
        if (snapshot.empty) {
            patientsList.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${translations[languageSwitcher.value]['noPatients']}</p>`;
            return;
        }
        snapshot.forEach(doc => {
            const patient = doc.data();
            const patientId = doc.id;
            patientsList.innerHTML += `
                <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md flex justify-between items-center">
                    <div>
                        <p class="font-medium">${patient.name}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${patient.dob}</p>
                    </div>
                    <button class="btn-secondary" onclick="viewMedicalRecord('${patientId}', '${patient.name}')">Records</button>
                </div>
            `;
            appointmentPatientSelect.innerHTML += `<option value="${patientId}">${patient.name}</option>`;
            billingPatientSelect.innerHTML += `<option value="${patientId}">${patient.name}</option>`;
        });
    });
};

window.viewMedicalRecord = (patientId, patientName) => {
    window.selectedPatientId = patientId;
    window.selectedPatient = { name: patientName };
    showForm('medical-record-form');
};

window.loadPatientHistory = (patientId) => {
    const historyList = document.getElementById('patient-history-list');
    if (!historyList) return;
    const q = query(collection(db, `/artifacts/${appId}/public/data/medicalRecords`), where("patientId", "==", patientId));
    
    onSnapshot(q, (snapshot) => {
        historyList.innerHTML = '';
        if (snapshot.empty) {
            historyList.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${translations[languageSwitcher.value]['noRecords']}</p>`;
            return;
        }
        snapshot.forEach(doc => {
            const record = doc.data();
            historyList.innerHTML += `
                <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
                    <p class="text-sm text-gray-500 dark:text-gray-400">${record.date}</p>
                    <p class="font-medium">Notes:</p>
                    <p class="text-gray-700 dark:text-gray-300">${record.notes}</p>
                    <p class="font-medium mt-2">Prescription:</p>
                    <p class="text-gray-700 dark:text-gray-300">${record.prescription || 'N/A'}</p>
                </div>
            `;
        });
    });
};

const saveMedicalRecord = async (e) => {
    e.preventDefault();
    const recordNotes = document.getElementById('record-notes');
    const recordPrescription = document.getElementById('record-prescription');
    const record = {
        patientId: window.selectedPatientId,
        doctorId: window.currentUser.uid,
        notes: recordNotes.value,
        prescription: recordPrescription.value,
        date: new Date().toISOString().split('T')[0],
    };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/medicalRecords`), record);
        showMessageModal(translations[languageSwitcher.value]['recordSavedSuccess']);
        recordNotes.value = '';
        recordPrescription.value = '';
    } catch (error) {
        showMessageModal(`Error saving record: ${error.message}`);
        console.error("Error adding document: ", error);
    }
};
const saveRecordForm = document.getElementById('save-record-form');
if (saveRecordForm) saveRecordForm.addEventListener('submit', saveMedicalRecord);

const scheduleAppointment = async (e) => {
    e.preventDefault();
    const appointment = {
        patientId: document.getElementById('appointment-patient').value,
        doctorId: document.getElementById('appointment-doctor').value,
        date: document.getElementById('appointment-date').value,
        time: document.getElementById('appointment-time').value,
        status: 'scheduled'
    };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/appointments`), appointment);
        showMessageModal(translations[languageSwitcher.value]['appointmentScheduledSuccess']);
        hideForm();
        console.log(`[Automated Reminder System]: A reminder has been queued for patient ${appointment.patientId} for their appointment on ${appointment.date}.`);
    } catch (error) {
        showMessageModal(`Error scheduling appointment: ${error.message}`);
        console.error("Error adding document: ", error);
    }
};
const scheduleAppointmentForm = document.getElementById('schedule-appointment-form');
if (scheduleAppointmentForm) scheduleAppointmentForm.addEventListener('submit', scheduleAppointment);

window.loadAppointments = () => {
    const appointmentsList = document.getElementById('appointments-list');
    if (!appointmentsList) return;
    onSnapshot(collection(db, `/artifacts/${appId}/public/data/appointments`), (snapshot) => {
        appointmentsList.innerHTML = '';
        if (snapshot.empty) {
            appointmentsList.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${translations[languageSwitcher.value]['noAppointments']}</p>`;
            return;
        }
        snapshot.forEach(doc => {
            const appt = doc.data();
            appointmentsList.innerHTML += `
                <li class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p class="font-medium">Patient: ${appt.patientId}</p>
                    <p class="text-sm">Doctor: ${appt.doctorId}</p>
                    <p class="text-sm">Date: ${appt.date} at ${appt.time}</p>
                </li>
            `;
        });
    });
};

const createInvoice = async (e) => {
    e.preventDefault();
    const invoice = {
        patientId: document.getElementById('billing-patient').value,
        service: document.getElementById('billing-service').value,
        amount: parseFloat(document.getElementById('billing-amount').value),
        date: new Date().toISOString().split('T')[0],
        status: 'unpaid'
    };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/bills`), invoice);
        showMessageModal(translations[languageSwitcher.value]['invoiceCreatedSuccess']);
        hideForm();
    } catch (error) {
        showMessageModal(`Error creating invoice: ${error.message}`);
        console.error("Error adding document: ", error);
    }
};
const createInvoiceForm = document.getElementById('create-invoice-form');
if (createInvoiceForm) createInvoiceForm.addEventListener('submit', createInvoice);

window.loadBilling = () => {
    const billingList = document.getElementById('billing-list');
    if (!billingList) return;
    onSnapshot(collection(db, `/artifacts/${appId}/public/data/bills`), (snapshot) => {
        billingList.innerHTML = '';
        if (snapshot.empty) {
            billingList.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${translations[languageSwitcher.value]['noInvoices']}</p>`;
            return;
        }
        snapshot.forEach(doc => {
            const bill = doc.data();
            billingList.innerHTML += `
                <li class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p class="font-medium">Patient: ${bill.patientId}</p>
                    <p class="text-sm">Service: ${bill.service} - $${bill.amount.toFixed(2)}</p>
                    <p class="text-sm">Status: ${bill.status}</p>
                </li>
            `;
        });
    });
};

// --- Patient Portal Logic (for patient-portal.html) ---
const requestAppointment = async (e) => {
    e.preventDefault();
    if (!window.currentUser || !window.currentPatientId) {
        showMessageModal("You must be logged in to request an appointment.");
        return;
    }
    const appointment = {
        patientId: window.currentPatientId,
        doctorId: null, // Staff will assign later
        date: document.getElementById('patient-appointment-date').value,
        time: document.getElementById('patient-appointment-time').value,
        reason: document.getElementById('patient-appointment-reason').value,
        status: 'pending'
    };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/appointments`), appointment);
        showMessageModal("Appointment request submitted successfully! Staff will contact you to confirm.");
        hideForm();
    } catch (error) {
        showMessageModal(`Error submitting request: ${error.message}`);
        console.error("Error adding document: ", error);
    }
};
const requestAppointmentForm = document.getElementById('request-appointment-form');
if (requestAppointmentForm) requestAppointmentForm.addEventListener('submit', requestAppointment);

window.loadMyPatients = () => {
    const myAppointmentsList = document.getElementById('my-appointments-list');
    if (!myAppointmentsList || !window.currentPatientId) return;
    const q = query(collection(db, `/artifacts/${appId}/public/data/appointments`), where("patientId", "==", window.currentPatientId));
    onSnapshot(q, (snapshot) => {
        myAppointmentsList.innerHTML = '';
        if (snapshot.empty) {
            myAppointmentsList.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${translations[languageSwitcher.value]['noAppointments']}</p>`;
            return;
        }
        snapshot.forEach(doc => {
            const appt = doc.data();
            myAppointmentsList.innerHTML += `
                <li class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p class="font-medium">Doctor: ${appt.doctorId || 'Pending'}</p>
                    <p class="text-sm">Date: ${appt.date} at ${appt.time}</p>
                    <p class="text-sm">Status: ${appt.status}</p>
                </li>
            `;
        });
    });
};

window.loadPatientRecords = (patientId) => {
    const myRecordsContent = document.getElementById('my-records-content');
    if (!myRecordsContent || !patientId) return;
    const q = query(collection(db, `/artifacts/${appId}/public/data/medicalRecords`), where("patientId", "==", patientId));
    onSnapshot(q, (snapshot) => {
        myRecordsContent.innerHTML = '';
        if (snapshot.empty) {
            myRecordsContent.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${translations[languageSwitcher.value]['noRecords']}</p>`;
            return;
        }
        snapshot.forEach(doc => {
            const record = doc.data();
            myRecordsContent.innerHTML += `
                <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p class="text-sm text-gray-500 dark:text-gray-400">${record.date}</p>
                    <p class="font-medium">Doctor's Notes:</p>
                    <p class="text-gray-700 dark:text-gray-300">${record.notes}</p>
                    <p class="font-medium mt-2">Prescription:</p>
                    <p class="text-gray-700 dark:text-gray-300">${record.prescription || 'N/A'}</p>
                </div>
            `;
        });
    });
};

// --- Inventory Logic (for inventory.html) ---
const addInventoryItem = async (e) => {
    e.preventDefault();
    const inventoryName = document.getElementById('inventory-name');
    const inventoryQuantity = document.getElementById('inventory-quantity');
    const item = {
        name: inventoryName.value,
        quantity: parseInt(inventoryQuantity.value, 10),
        addedBy: window.currentUser.uid,
        addedAt: new Date().toISOString()
    };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/inventory`), item);
        showMessageModal(translations[languageSwitcher.value]['itemAddedSuccess']);
        inventoryName.value = '';
        inventoryQuantity.value = '';
    } catch (error) {
        showMessageModal(`Error adding item: ${error.message}`);
        console.error("Error adding document: ", error);
    }
};
const inventoryForm = document.getElementById('inventory-form');
if (inventoryForm) inventoryForm.addEventListener('submit', addInventoryItem);

window.loadInventory = () => {
    const inventoryTableBody = document.getElementById('inventory-table-body');
    if (!inventoryTableBody) return;
    onSnapshot(collection(db, `/artifacts/${appId}/public/data/inventory`), (snapshot) => {
        inventoryTableBody.innerHTML = '';
        if (snapshot.empty) {
            inventoryTableBody.innerHTML = `
                <tr>
                    <td colspan="2" class="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">${translations[languageSwitcher.value]['noInventory']}</td>
                </tr>
            `;
            return;
        }
        const inventoryMap = new Map();
        snapshot.forEach(doc => {
            const item = doc.data();
            const currentQuantity = inventoryMap.get(item.name) || 0;
            inventoryMap.set(item.name, currentQuantity + item.quantity);
        });

        inventoryMap.forEach((quantity, name) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${quantity}</td>
            `;
            inventoryTableBody.appendChild(row);
        });
    });
};

// --- Symptom Checker Logic (for symptom-checker.html) ---
const checkSymptoms = async (e) => {
    e.preventDefault();
    const symptomInput = document.getElementById('symptom-input');
    const resultDiv = document.getElementById('symptom-result');
    const resultText = document.getElementById('symptom-result-text');
    const loader = document.getElementById('symptom-loader');

    if (!symptomInput || !resultDiv || !resultText || !loader) return;

    resultDiv.classList.add('hidden');
    loader.classList.remove('hidden');

    const prompt = `Based on the following symptoms, provide a potential diagnosis and recommend a medical department to visit. Respond concisely and professionally. Symptoms: "${symptomInput.value}"`;
    
    try {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let response = null;
        let retries = 0;
        const maxRetries = 5;
        while (retries < maxRetries) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.status !== 429) {
                    break;
                }
                retries++;
                const delay = Math.pow(2, retries) * 1000;
                await new Promise(res => setTimeout(res, delay));
            } catch (err) {
                retries++;
                const delay = Math.pow(2, retries) * 1000;
                await new Promise(res => setTimeout(res, delay));
            }
        }

        if (response && response.ok) {
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                resultText.innerHTML = text;
            } else {
                resultText.textContent = "Could not get a diagnosis. Please try again.";
            }
        } else {
            resultText.textContent = `Error: ${response?.statusText || "Could not connect to the service."}`;
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        resultText.textContent = "An error occurred while checking symptoms. Please try again later.";
    } finally {
        loader.classList.add('hidden');
        resultDiv.classList.remove('hidden');
    }
};
const symptomCheckerForm = document.getElementById('symptom-checker-form');
if (symptomCheckerForm) symptomCheckerForm.addEventListener('submit', checkSymptoms);
