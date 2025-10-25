import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle && projects) {
  const count = projects.length;
  projectsTitle.textContent = ` ${count} ${count === 1 ? 'project' : 'Projects'}`;
}