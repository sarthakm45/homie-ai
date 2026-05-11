const bioEl = document.getElementById("bio");
const aboutEl = document.getElementById("aboutText");
const projectListEl = document.getElementById("projectList");
const siteStatusEl = document.getElementById("siteStatus");
const formEl = document.getElementById("contactForm");
const formStatusEl = document.getElementById("formStatus");

document.getElementById("year").textContent = new Date().getFullYear();

async function loadProfile() {
  const res = await fetch("/api/profile");
  if (!res.ok) {
    throw new Error("Failed to load profile");
  }

  const data = await res.json();
  bioEl.textContent = data.bio;
  aboutEl.textContent = data.about;
}

async function loadProjects() {
  const res = await fetch("/api/projects");
  if (!res.ok) {
    throw new Error("Failed to load projects");
  }

  const projects = await res.json();
  projectListEl.innerHTML = "";

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h4>${project.title}</h4>
      <p>${project.description}</p>
      <small>${project.category}</small>
    `;
    projectListEl.appendChild(card);
  });
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatusEl.textContent = "Sending...";

  const payload = {
    name: formEl.name.value.trim(),
    email: formEl.email.value.trim(),
    message: formEl.message.value.trim(),
  };

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to send message");
    }

    formStatusEl.textContent = data.message;
    formEl.reset();
  } catch (error) {
    formStatusEl.textContent = error.message;
  }
});

Promise.all([loadProfile(), loadProjects()]).catch(() => {
  siteStatusEl.textContent = "Could not load website data from backend.";
});
