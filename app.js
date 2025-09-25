/* app.js - shared site logic: auth, navbar, jobs storage, search, modal, applications */

// --- INITIALIZATION: seed admin and some initial jobs if not present ---
(function init() {
  // seed admin account if none
  const users = JSON.parse(localStorage.getItem('users')) || [];
  if (!users.find(u => u.email === 'admin@jobportal.com')) {
    users.push({ name: 'Admin', email: 'admin@jobportal.com', password: 'admin123', role: 'admin' });
    localStorage.setItem('users', JSON.stringify(users));
  }

  // seed some example jobs if none
  const existingJobs = JSON.parse(localStorage.getItem('jobs')) || [];
  if (existingJobs.length === 0) {
    const seedJobs = [
      { id: genId(), type: 'job', title: 'Software Engineer', company: 'Google', location: 'California, USA', duration: '', salary: '₹18 - 24 LPA', skills: 'Python, JavaScript, React', description: 'Work on scalable services and write clean production code. Collaborate across teams to design architecture, implement features and improve performance.' , postedBy:'system' , postedAt: new Date().toISOString(), applicants: [] },
      { id: genId(), type: 'internship', title: 'Data Analyst Intern', company: 'Microsoft', location: 'Remote', duration: '3 months', salary: '', skills: 'SQL, Excel, Power BI', description: 'Support data-driven decisions through analysis, reports and dashboards. Work closely with senior analysts on real projects.' , postedBy:'system', postedAt: new Date().toISOString(), applicants: [] },
      { id: genId(), type: 'freelance', title: 'UI/UX Designer (Freelance)', company: 'Amazon', location: 'Remote', duration: '1 month', salary: 'Fixed', skills: 'Figma, Prototyping, Visual Design', description: 'Design user-centered interfaces and produce high-fidelity prototypes for a new web product.' , postedBy:'system', postedAt: new Date().toISOString(), applicants: [] }
    ];
    localStorage.setItem('jobs', JSON.stringify(seedJobs));
  }
})();

// --- helpers ---
function genId() { return 'id_' + Math.random().toString(36).slice(2,9); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }
function logoutUser() { localStorage.removeItem('currentUser'); location.href = 'index.html'; }
function saveJobs(jobs) { localStorage.setItem('jobs', JSON.stringify(jobs)); }
function getJobs() { return JSON.parse(localStorage.getItem('jobs') || '[]'); }
function saveUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }
function getUsers() { return JSON.parse(localStorage.getItem('users') || '[]'); }
function saveApplications(apps) { localStorage.setItem('applications', JSON.stringify(apps)); }
function getApplications() { return JSON.parse(localStorage.getItem('applications') || '[]'); }

// --- NAVBAR / AUTH UI ---
function updateNavbarMain() {
  // This function should be called on every page load to configure links displayed in navbar.
  const user = getCurrentUser();
  // show login / logout link element is assumed present with id="authLink"
  const authLink = document.getElementById('authLink');
  if (!authLink) return;

  if (user) {
    authLink.textContent = `Logout`;
    authLink.href = '#';
    authLink.onclick = function(e) { e.preventDefault(); logoutUser(); };
  } else {
    authLink.textContent = 'Login / Sign Up';
    authLink.href = 'access.html';
    authLink.onclick = null;
  }
}

// Protect links in index that have class 'protected' (redirect to access.html if not logged in)
function enforceProtectedLinks() {
  document.querySelectorAll('.protected').forEach(el => {
    el.addEventListener('click', function(e) {
      const user = getCurrentUser();
      if (!user) {
        e.preventDefault();
        alert('Please login first!');
        location.href = 'access.html';
      }
    });
  });
}

// Admin link behaviour: admin.html will ask for admin login if not already admin
function enforceAdminLink() {
  const adminLink = document.querySelector('.protected-admin');
  if (!adminLink) return;
  adminLink.addEventListener('click', function(e) {
    const user = getCurrentUser();
    // if user is admin logged in, allow. Else redirect to admin.html which has admin login.
    if (user && user.role === 'admin') {
      // allow
    } else {
      // allow navigation to admin.html where admin login form is shown
    }
  });
}

// Call navbar updates if element present
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarMain();
  enforceProtectedLinks();
  enforceAdminLink();
});

// ------------------ SEARCH SUGGESTIONS (home + job pages) ------------------
const keywordSuggestions = ["Software Engineer", "Data Analyst", "UI/UX Designer", "Marketing Specialist", "Frontend Developer", "Backend Developer"];
const locationSuggestions = ["New York", "California", "London", "Remote", "Bangalore", "Hyderabad"];

function showSuggestions(value, listId) {
  const suggestionsList = document.getElementById(listId);
  if (!suggestionsList) return;
  suggestionsList.innerHTML = '';
  if (value.length === 0) {
    suggestionsList.style.display = 'none';
    return;
  }

  const suggestions = listId.includes('keyword') ? keywordSuggestions : locationSuggestions;
  const filtered = suggestions.filter(item => item.toLowerCase().includes(value.toLowerCase()));

  filtered.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    li.onclick = () => {
      document.getElementById(listId.replace('-suggestions','')).value = item;
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
    };
    suggestionsList.appendChild(li);
  });
  if (filtered.length) suggestionsList.style.display = 'block';
  else suggestionsList.style.display = 'none';
}

// ------------------ SEARCH ACTION (home search bar) ------------------
function searchJobsFromHome() {
  const kwEl = document.getElementById('keyword');
  const locEl = document.getElementById('location');
  const catEl = document.getElementById('category');
  if (!kwEl || !locEl || !catEl) return;

  const keyword = kwEl.value.trim();
  const location = locEl.value.trim();
  const category = catEl.value;

  // redirect to right page with query params
  const params = new URLSearchParams();
  if (keyword) params.set('q', keyword);
  if (location) params.set('loc', location);

  if (category === 'jobs') window.location.href = 'jobs.html?' + params.toString();
  else if (category === 'internships') window.location.href = 'internships.html?' + params.toString();
  else if (category === 'freelancing') window.location.href = 'freelancing.html?' + params.toString();
}
window.searchJobs = searchJobsFromHome; // keep compatibility

// ------------------ JOBS / LISTING RENDERING ------------------
// Render jobs for a given page (typeFilter: 'job' | 'internship' | 'freelance')
function renderJobsOnPage(containerId, typeFilter, query = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const allJobs = getJobs();
  const filtered = allJobs.filter(j => j.type === typeFilter)
    .filter(j => {
      if (query.q && !j.title.toLowerCase().includes(query.q.toLowerCase()) && !j.company.toLowerCase().includes(query.q.toLowerCase())) return false;
      if (query.loc && !j.location.toLowerCase().includes(query.loc.toLowerCase())) return false;
      return true;
    });

  container.innerHTML = '';
  filtered.forEach(job => {
    const div = document.createElement('div');
    div.className = 'job-card';
    div.dataset.id = job.id;
    div.dataset.title = job.title;
    div.dataset.company = job.company;
    div.dataset.desc = job.description;
    div.dataset.skills = job.skills;
    div.innerHTML = `
      <img src="${job.logo || 'https://img.icons8.com/color/96/briefcase.png'}" alt="${job.company}">
      <h4>${job.title}</h4>
      <p>${job.company} • ${job.location} ${job.duration ? '• ' + job.duration : ''}</p>
      <button class="btn" onclick="openJobDetails('${job.id}')">See Details</button>
    `;
    container.appendChild(div);
  });

  if (filtered.length === 0) container.innerHTML = '<p style="text-align:center; width:100%;">No openings found.</p>';
}
window.renderJobsOnPage = renderJobsOnPage;

// Open details modal (common for jobs/intern/freelance)
function openJobDetails(jobId) {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return alert('Job not found');

  // Build details text (4-5 line style)
  const modal = document.getElementById('job-modal');
  if (!modal) {
    // open simple alert fallback
    alert(`${job.title}\n${job.company}\n${job.location} ${job.duration ? '• ' + job.duration : ''}\nSkills: ${job.skills}\n\n${job.description}`);
    return;
  }
  document.getElementById('modal-title').innerText = job.title;
  document.getElementById('modal-company').innerText = job.company;
  document.getElementById('modal-location').innerText = job.location;
  document.getElementById('modal-duration').innerText = job.duration || '-';
  document.getElementById('modal-salary').innerText = job.salary || '-';
  document.getElementById('modal-skills').innerText = job.skills;
  document.getElementById('modal-desc').innerText = job.description;
  document.getElementById('apply-btn').dataset.jobId = job.id;
  modal.style.display = 'flex';
}

// Close modal
function closeJobModal() {
  const modal = document.getElementById('job-modal');
  if (modal) modal.style.display = 'none';
  // reset apply form
  const form = document.getElementById('apply-form');
  if (form) {
    form.style.display = 'none';
    form.reset();
  }
  const applyBtn = document.getElementById('apply-btn');
  if (applyBtn) applyBtn.style.display = 'inline-block';
}

// Show apply form inside modal
function showApplyForm() {
  const form = document.getElementById('apply-form');
  if (form) {
    form.style.display = 'block';
    document.getElementById('apply-btn').style.display = 'none';
  }
}

// Submit application
function submitApplication(e) {
  e.preventDefault();
  const name = document.getElementById('app-name').value.trim();
  const email = document.getElementById('app-email').value.trim();
  const jobId = document.getElementById('apply-btn').dataset.jobId;
  if (!name || !email) return alert('Please fill name and email');
  const applications = getApplications();
  applications.push({ id: genId(), jobId, name, email, appliedAt: new Date().toISOString() });
  saveApplications(applications);

  // update job applicants count
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job) {
    job.applicants = job.applicants || [];
    job.applicants.push({ name, email, at: new Date().toISOString() });
    saveJobs(jobs);
  }

  alert('✅ Applied successfully!');
  closeJobModal();
}

// ------------------ RECRUITER: Add job ------------------
function recruiterAddJob(formEl) {
  const title = formEl.querySelector('#r-title').value.trim();
  const company = formEl.querySelector('#r-company').value.trim();
  const location = formEl.querySelector('#r-location').value.trim();
  const type = formEl.querySelector('#r-type').value;
  const duration = formEl.querySelector('#r-duration').value.trim();
  const salary = formEl.querySelector('#r-salary').value.trim();
  const skills = formEl.querySelector('#r-skills').value.trim();
  const desc = formEl.querySelector('#r-desc').value.trim();
  const logo = formEl.querySelector('#r-logo').value.trim();

  if (!title || !company || !location || !type || !skills || !desc) {
    return alert('Please fill required fields.');
  }
  const user = getCurrentUser();
  if (!user || user.role !== 'recruiter') {
    alert('Recruiter login required to post jobs.');
    location.href = 'access.html';
    return;
  }

  const jobs = getJobs();
  const job = { id: genId(), type: type, title, company, location, duration, salary, skills, description: desc, logo: logo || '', postedBy: user.email, postedAt: new Date().toISOString(), applicants: []};
  jobs.unshift(job);
  saveJobs(jobs);
  alert('Job posted successfully!');
  formEl.reset();
  // redirect to appropriate listing page
  if (type === 'job') location.href = 'jobs.html';
  else if (type === 'internship') location.href = 'internships.html';
  else location.href = 'freelancing.html';
}

// ------------------ ADMIN: edit/delete jobs & users ------------------
function adminLoadTables() {
  const users = getUsers();
  const jobs = getJobs();
  const applications = getApplications();

  // users table
  const usersTbody = document.querySelector('#usersTable tbody');
  if (usersTbody) {
    usersTbody.innerHTML = '';
    users.forEach((u,idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td><td>${u.name || '-'}</td><td>${u.email}</td><td>${u.role}</td>
        <td><button onclick="adminDeleteUser('${u.email}')">Delete</button></td>`;
      usersTbody.appendChild(tr);
    });
  }

  // jobs table
  const jobsTbody = document.querySelector('#jobsTable tbody');
  if (jobsTbody) {
    jobsTbody.innerHTML = '';
    jobs.forEach((j,idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td>
        <td>${j.title}</td>
        <td>${j.company}</td>
        <td>${j.type}</td>
        <td>${j.location}</td>
        <td>${j.postedBy || '-'}</td>
        <td><button onclick="adminEditJob('${j.id}')">Edit</button> <button onclick="adminDeleteJob('${j.id}')">Delete</button></td>`;
      jobsTbody.appendChild(tr);
    });
  }

  // applications table
  const appsTbody = document.querySelector('#appsTable tbody');
  if (appsTbody) {
    appsTbody.innerHTML = '';
    applications.forEach((a,idx) => {
      const job = jobs.find(j=>j.id===a.jobId) || {};
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td><td>${a.name}</td><td>${a.email}</td><td>${job.title || '-'}</td><td>${new Date(a.appliedAt).toLocaleString()}</td>`;
      appsTbody.appendChild(tr);
    });
  }
}

function adminDeleteUser(email) {
  if (!confirm('Delete user ' + email + '?')) return;
  let users = getUsers();
  users = users.filter(u => u.email !== email);
  saveUsers(users);
  adminLoadTables();
}

function adminDeleteJob(id) {
  if (!confirm('Delete job?')) return;
  let jobs = getJobs();
  jobs = jobs.filter(j => j.id !== id);
  saveJobs(jobs);
  adminLoadTables();
}

function adminEditJob(id) {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) return alert('Job not found');
  // simple prompt-based edit for quick admin edit (title, company)
  const newTitle = prompt('Edit title', job.title);
  if (newTitle === null) return; // cancelled
  const newCompany = prompt('Edit company', job.company);
  if (newCompany === null) return;
  job.title = newTitle.trim() || job.title;
  job.company = newCompany.trim() || job.company;
  saveJobs(jobs);
  adminLoadTables();
}

// ------------------ UTILS FOR PAGE QUERIES ------------------
function parseQuery() {
  const p = {};
  (new URLSearchParams(location.search)).forEach((v,k) => p[k]=v);
  return p;
}
